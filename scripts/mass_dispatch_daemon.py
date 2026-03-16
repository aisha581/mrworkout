import os
import json
import requests
import time
from datetime import datetime
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env.local")
load_dotenv(".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

DRIP_INTERVAL_SECONDS = 180  # 3 minutes

def normalize_name(name):
    """Sanitizes username for premium greeting."""
    if not name: return "Athlete"
    if name.startswith("Athlete_"): return "Athlete"
    if "_" in name: return name.split("_")[0]
    return name

def send_outreach_email(lead):
    """Dispatches email based on lead segment."""
    email = lead.get("email")
    name = lead.get("name") or lead.get("username", "Athlete")
    segment = lead.get("segment", "athlete")
    topic = lead.get("topic", "3D Biomechanics")
    
    if not email:
        return False, "Missing email"

    sanitized_name = normalize_name(name)
    
    if not RESEND_API_KEY:
        return True, f"[SIMULATED] Sent to {sanitized_name} ({email})"

    # Select template based on segment
    template_name = "influencer_outreach" if segment == "influencer" else "influencer_outreach" # Defaulting to influencer for now as per previous scripts
    # Note: If specific 'enlistment' template exists, use it. For now, we use the core influencer one.
    
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    template_path = f"/Users/fs/Downloads/Mr. Workout/templates/{template_name}.html"
    try:
        with open(template_path, 'r') as f:
            html = f.read()
            html = html.replace("{{name}}", sanitized_name).replace("{{topic}}", topic)
    except Exception as e:
        return False, f"Template error: {e}"

    payload = {
        "from": "Mr. Workout <outreach@mrworkout.pro>",
        "to": [email],
        "reply_to": "thebillion9@gmail.com",
        "subject": "PROPOSAL: Mr. Workout Phase 1 Enlistment" if segment == "athlete" else "FOUNDER EQUITY: Mr. Workout Influencer Status",
        "html": html
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            return True, f"Sent to {sanitized_name} ({email})"
        else:
            return False, f"Resend Error: {response.text}"
    except Exception as e:
        return False, f"Critical Request Error: {e}"

def log_status(status_msg):
    """Logs status to outreach_log.txt."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_entry = f"[{timestamp}] {status_msg}\n"
    with open("outreach_log.txt", "a") as f:
        f.write(log_entry)
    print(log_entry.strip())

def run_daemon():
    """Main execution loop."""
    print(f"[DAEMON] Mass Outreach Engine Started. Interval: {DRIP_INTERVAL_SECONDS}s")
    log_status("DAEMON_STARTED")

    while True:
        lead = None
        
        # 1. Attempt to pop lead from Upstash KV
        if KV_REST_API_URL and KV_REST_API_TOKEN:
            url = f"{KV_REST_API_URL}/rpop/MASS_OUTREACH_QUEUE"
            headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
            try:
                response = requests.get(url, headers=headers)
                if response.status_code == 200 and response.json():
                    lead = json.loads(response.json())
            except Exception as e:
                log_status(f"KV_FETCH_ERROR: {e}")

        # 2. Fallback to local mass_leads.log if queue is empty
        if not lead and os.path.exists("mass_leads.log"):
            with open("mass_leads.log", "r") as f:
                lines = f.readlines()
            if lines:
                lead = json.loads(lines[0])
                with open("mass_leads.log", "w") as f:
                    f.writelines(lines[1:])

        # 3. Process Lead
        if lead:
            success, msg = send_outreach_email(lead)
            if success:
                log_status(f"STATUS_SENT: {msg}")
                # Track metrics
                if KV_REST_API_URL and KV_REST_API_TOKEN:
                    requests.post(f"{KV_REST_API_URL}/hincrby/marketing_metrics/total_outreach/1", headers=headers)
            else:
                log_status(f"STATUS_ERROR: {msg} | Lead: {json.dumps(lead)}")
            
            # 4. Hibernate
            time.sleep(DRIP_INTERVAL_SECONDS)
        else:
            # Queue empty - Wait longer before checking again
            print("[DAEMON] Queue empty. Sleeping for 60s...")
            time.sleep(60)

if __name__ == "__main__":
    try:
        run_daemon()
    except KeyboardInterrupt:
        log_status("DAEMON_STOPPED_BY_USER")
        print("\n[DAEMON] Shutdown Complete.")
