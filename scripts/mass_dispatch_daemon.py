import os
import json
import requests
import time
import csv
from datetime import datetime
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env.local")
load_dotenv(".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

DRIP_INTERVAL_SECONDS = 180  # 3 minutes
LIMIT_RESEND = 100
LIMIT_BREVO = 300
TOTAL_CAPACITY = LIMIT_RESEND + LIMIT_BREVO
OVERFLOW_LIMIT = 100 # After 400 total, log 100 to overflow

STATE_FILE = "outreach_state.json"

def normalize_name(name):
    """Sanitizes username for premium greeting."""
    if not name: return "Athlete"
    if name.startswith("Athlete_"): return "Athlete"
    if "_" in name: return name.split("_")[0]
    return name

def get_daily_state():
    """Tracks daily counts across providers."""
    today = datetime.now().strftime("%Y-%m-%d")
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
            if state.get("date") == today:
                return state
    
    # New day reset
    return {"date": today, "resend_count": 0, "brevo_count": 0, "overflow_count": 0}

def save_daily_state(state):
    with open(STATE_FILE, 'w') as f:
        json.dump(state, f)

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

HOSTINGER_SMTP_SERVER = "smtps.hostinger.com"
HOSTINGER_SMTP_PORT = 465
HOSTINGER_SMTP_USER = os.getenv("HOSTINGER_SMTP_USER") or "coach@mrworkout.pro"
HOSTINGER_SMTP_PASS = os.getenv("HOSTINGER_SMTP_PASS")
LIMIT_HOSTINGER = 1000

def send_via_hostinger(lead, sanitized_name, html, subject):
    """Unified Hostinger SMTP Pipe (1,000/day cap)."""
    if not HOSTINGER_SMTP_PASS:
        return False, "KEY_MISSING", "Hostinger SMTP Password missing in .env"
    
    msg = MIMEMultipart()
    msg['From'] = f"Mr. Workout <{HOSTINGER_SMTP_USER}>"
    msg['To'] = lead["email"]
    msg['Subject'] = subject
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL(HOSTINGER_SMTP_SERVER, HOSTINGER_SMTP_PORT) as server:
            server.login(HOSTINGER_SMTP_USER, HOSTINGER_SMTP_PASS)
            server.send_message(msg)
        return True, "SUCCESS", f"Sent via Hostinger SMTP to {sanitized_name}"
    except smtplib.SMTPAuthenticationError:
        return False, "AUTH_ERROR", "Hostinger SMTP Authentication Failed"
    except Exception as e:
        return False, "ERROR", f"Hostinger SMTP Failure: {e}"

def log_overflow(lead):
    """Logs leads to pending_tomorrow.csv when both providers are exhausted."""
    file_exists = os.path.isfile("pending_tomorrow.csv")
    with open("pending_tomorrow.csv", "a", newline='') as f:
        writer = csv.DictWriter(f, fieldnames=lead.keys())
        if not file_exists:
            writer.writeheader()
        writer.writerow(lead)

def log_status(status_msg):
    """Logs status to outreach_log.txt."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {status_msg}\n"
    with open("outreach_log.txt", "a") as f:
        f.write(log_entry)
    print(log_entry.strip())

def run_daemon():
    print(f"[DAEMON] Multi-Provider Outreach Engine Started. Drip: {DRIP_INTERVAL_SECONDS}s")
    log_status("DAEMON_STARTED")

    while True:
        state = get_daily_state()
        lead = None
        
        # Ingestion logic
        if KV_REST_API_URL and KV_REST_API_TOKEN:
            url = f"{KV_REST_API_URL}/rpop/MASS_OUTREACH_QUEUE"
            headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
            try:
                response = requests.get(url, headers=headers)
                if response.status_code == 200 and response.json():
                    lead = json.loads(response.json())
            except Exception as e:
                log_status(f"KV_FETCH_ERROR: {e}")

        if not lead and os.path.exists("mass_leads.log"):
            with open("mass_leads.log", "r") as f:
                lines = f.readlines()
            if lines:
                lead = json.loads(lines[0])
                with open("mass_leads.log", "w") as f:
                    f.writelines(lines[1:])

        if lead:
            email = lead.get("email")
            name = lead.get("name") or lead.get("username", "Athlete")
            segment = lead.get("segment", "athlete")
            topic = lead.get("topic", "3D Biomechanics")
            
            if not email:
                log_status(f"SKIP_NULL_EMAIL: {name}")
                continue

            sanitized_name = normalize_name(name)
            
            # Dynamic Template and Subject Selection
            if segment == "partner" or segment == "godfather_partnership":
                template_name = "godfather_partnership"
                subject = "THE GODFATHER PARTNERSHIP: Mr. Workout Founder Status"
            elif segment == "athlete":
                template_name = "enlistment"
                subject = "PROPOSAL: Mr. Workout Phase 1 Enlistment"
            else:
                template_name = "influencer_outreach"
                subject = "FOUNDER EQUITY: Mr. Workout Influencer Status"
            
            # Load template
            template_path = f"/Users/fs/Downloads/Mr. Workout/templates/{template_name}.html"
            try:
                with open(template_path, 'r') as f:
                    html = f.read().replace("{{name}}", sanitized_name).replace("{{topic}}", topic)
                    # Support for additional variables like platform if present in lead
                    html = html.replace("{{platform}}", lead.get("platform", "Instagram"))
            except Exception as e:
                log_status(f"TEMPLATE_ERROR: {e} | Path: {template_path}")
                continue

            dispatched = False
            
            # PRIMARY PIPE: Hostinger SMTP (1,000/day cap)
            if state.get("hostinger_count", 0) < LIMIT_HOSTINGER:
                success, code, msg = send_via_hostinger(lead, sanitized_name, html, subject)
                if success:
                    state["hostinger_count"] = state.get("hostinger_count", 0) + 1
                    log_status(f"STATUS_SENT (HOSTINGER): {msg}")
                    dispatched = True
                elif code == "AUTH_ERROR":
                    log_status(f"CRITICAL_AUTH_FAILURE: Hostinger SMTP Authentication failed. Check .env")
                    break # Stop daemon to prevent lockouts
                else:
                    log_status(f"PROVIDER_ERROR (HOSTINGER): {msg}")

            # RECOVERY: Overflow
            if not dispatched:
                if state["overflow_count"] < OVERFLOW_LIMIT:
                    log_overflow(lead)
                    state["overflow_count"] += 1
                    log_status(f"STATUS_OVERFLOW: Staged to pending_tomorrow.csv | {name}")
                else:
                    log_status(f"STATUS_DROPPED: Capacity Full (1,000/day exceeded) | {name}")

            save_daily_state(state)
            time.sleep(DRIP_INTERVAL_SECONDS)
        else:
            time.sleep(60)

if __name__ == "__main__":
    try:
        run_daemon()
    except KeyboardInterrupt:
        log_status("DAEMON_STOPPED")
