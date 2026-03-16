import os
import json
import requests
import time
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env.local")
load_dotenv(".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

def normalize_name(name):
    """Sanitizes username for premium greeting (Mirroring core logic)."""
    if not name: return "Athlete"
    if name.startswith("Athlete_"): return "Athlete"
    if "_" in name: return name.split("_")[0]
    return name

def send_godfather_offer(email, name, niche):
    """Dispatches the high-conversion Godfather Offer."""
    if not RESEND_API_KEY:
        print(f"[SIMULATE] Godfather Offer -> {name} ({email})")
        return True

    sanitized_name = normalize_name(name)
    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Load dedicated template
    template_path = "/Users/fs/Downloads/Mr. Workout/templates/influencer_outreach.html"
    try:
        with open(template_path, 'r') as f:
            html = f.read()
            html = html.replace("{{name}}", sanitized_name).replace("{{topic}}", niche)
    except Exception as e:
        print(f"[ERROR] Template load failed: {e}")
        return False

    payload = {
        "from": "Mr. Workout <founder@mrworkout.pro>",
        "to": [email],
        "reply_to": "thebillion9@gmail.com",
        "subject": "FOUNDER EQUITY STATUS: Invitation for Elite Performance Leaders",
        "html": html
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"[CRITICAL] Resend Failure: {e}")
        return False

def execute_wave_02():
    """Pops leads from STAGING_QUEUE and dispatches the Godfather Offer."""
    print("[HUD] Initiating Wave 02 Outreach: The Godfather Protocol...")
    
    leads = []
    if (KV_REST_API_URL and KV_REST_API_TOKEN):
        # Fetch from KV
        url = f"{KV_REST_API_URL}/lrange/STAGING_QUEUE/0/49"
        headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                leads = [json.loads(l) for l in response.json()]
        except:
            pass

    if not leads and os.path.exists("ig_leads.log"):
        with open("ig_leads.log", "r") as f:
            leads = [json.loads(line) for line in f.readlines()]

    if not leads:
        print("[HUD] No leads found. Aborting mission.")
        return

    success_count = 0
    for lead in leads:
        email = lead.get("business_email") or lead.get("email")
        name = lead.get("username", "Athlete")
        niche = lead.get("topic", "Elite Performance")
        
        if email and send_godfather_offer(email, name, niche):
            success_count += 1
            print(f"[DISPATCHED] {name} | {email}")
            
            # Update status in KV
            if KV_REST_API_URL and KV_REST_API_TOKEN:
                requests.post(f"{KV_REST_API_URL}/lrem/STAGING_QUEUE/1/{json.dumps(lead)}", headers=headers)
                lead["status"] = "CONTACTED"
                requests.post(f"{KV_REST_API_URL}/lpush/CONTACTED_LEADS", headers=headers, data=json.dumps(lead))
                
                # Track metric
                requests.post(f"{KV_REST_API_URL}/hincrby/marketing_metrics/total_outreach/1", headers=headers)

    print(f"\n[MISSION_COMPLETE] Wave 02 Dispatched. {success_count} influencers contacted.")

if __name__ == "__main__":
    execute_wave_02()
