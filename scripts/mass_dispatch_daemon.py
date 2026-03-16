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

def send_via_resend(lead, sanitized_name, html, subject):
    """Primary provider: Resend."""
    if not RESEND_API_KEY:
        return False, "KEY_MISSING", "Resend API Key missing"
    
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "from": "Mr. Workout <coach@mrworkout.pro>",
        "to": [lead["email"]],
        "reply_to": "thebillion9@gmail.com",
        "subject": subject,
        "html": html
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            return True, "SUCCESS", f"Sent via Resend to {sanitized_name}"
        elif response.status_code == 429 or "rate limit" in response.text.lower() or "quota" in response.text.lower():
            return False, "QUOTA_EXCEEDED", f"Resend Quota: {response.text}"
        else:
            return False, "ERROR", f"Resend Error: {response.text}"
    except Exception as e:
        return False, "CRITICAL", f"Resend Connection Failure: {e}"

def send_via_brevo(lead, sanitized_name, html, subject):
    """Secondary provider: Brevo."""
    if not BREVO_API_KEY:
        return False, "KEY_MISSING", "Brevo API Key missing"
    
    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    payload = {
        "sender": {"name": "Mr. Workout", "email": "coach@mrworkout.pro"},
        "to": [{"email": lead["email"], "name": sanitized_name}],
        "replyTo": {"email": "thebillion9@gmail.com"},
        "subject": subject,
        "htmlContent": html
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            return True, "SUCCESS", f"Sent via Brevo to {sanitized_name}"
        elif response.status_code == 429 or "quota" in response.text.lower():
            return False, "QUOTA_EXCEEDED", f"Brevo Quota: {response.text}"
        else:
            return False, "ERROR", f"Brevo Error: {response.text}"
    except Exception as e:
        return False, "CRITICAL", f"Brevo Connection Failure: {e}"

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
            
            # PROVIDER TIER 1: Resend
            if state["resend_count"] < LIMIT_RESEND:
                success, code, msg = send_via_resend(lead, sanitized_name, html, subject)
                if success:
                    state["resend_count"] += 1
                    log_status(f"STATUS_SENT (RESEND): {msg}")
                    dispatched = True
                elif code == "QUOTA_EXCEEDED":
                    log_status(f"FAILOVER_TRIGGERED: Resend Quota Exceeded. Moving to Brevo.")
                    state["resend_count"] = LIMIT_RESEND # Force limit hit to skip next time
                else:
                    log_status(f"PROVIDER_ERROR (RESEND): {msg}")

            # PROVIDER TIER 2: Brevo
            if not dispatched and state["brevo_count"] < LIMIT_BREVO:
                success, code, msg = send_via_brevo(lead, sanitized_name, html, subject)
                if success:
                    state["brevo_count"] += 1
                    log_status(f"STATUS_SENT (BREVO): {msg}")
                    dispatched = True
                elif code == "QUOTA_EXCEEDED":
                    log_status(f"FALLBACK_TRIGGERED: Brevo Quota Exceeded. Final Fallback.")
                    state["brevo_count"] = LIMIT_BREVO
                else:
                    log_status(f"PROVIDER_ERROR (BREVO): {msg}")

            # RECOVERY: Overflow
            if not dispatched:
                if state["overflow_count"] < OVERFLOW_LIMIT:
                    log_overflow(lead)
                    state["overflow_count"] += 1
                    log_status(f"STATUS_OVERFLOW: Staged to pending_tomorrow.csv | {name}")
                else:
                    log_status(f"STATUS_DROPPED: Capacity Full (500/day exceeded) | {name}")

            save_daily_state(state)
            time.sleep(DRIP_INTERVAL_SECONDS)
        else:
            time.sleep(60)

if __name__ == "__main__":
    try:
        run_daemon()
    except KeyboardInterrupt:
        log_status("DAEMON_STOPPED")
