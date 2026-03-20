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

def normalize_name(name):
    """Sanitizes username for premium greeting."""
    if not name: return "Coach"
    if name.startswith("Athlete_") or name.startswith("Coach_") or name.startswith("Speed_") or name.startswith("Pro_"):
        parts = name.split("_")
        if len(parts) > 1:
            return parts[0]
    if "_" in name: return name.split("_")[0]
    return name

def send_founders_email(lead):
    """Sends the Founder's Circle email via Resend."""
    if not RESEND_API_KEY:
        print(f"[SKIP] API KEY MISSING for {lead['username']}")
        return False

    email = lead.get("business_email")
    if not email or email == "N/A":
        return False

    name = normalize_name(lead.get("username", "Coach"))
    topic = lead.get("topic", "Elite Performance")
    tracking_id = lead.get("id", "F_" + str(int(time.time())))

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Load Founder's Circle template
    template_path = "/Users/fs/Downloads/Mr. Workout/templates/godfather_partnership.html"
    try:
        with open(template_path, 'r') as f:
            html = f.read()
            html = html.replace("{{name}}", name)
            html = html.replace("{{topic}}", topic)
            html = html.replace("{{tracking_id}}", tracking_id)
            html = html.replace("{{email}}", email)
    except Exception as e:
        print(f"[ERROR] Template load failed: {e}")
        return False

    payload = {
        "from": "Mr. Workout <coach@mrworkout.pro>",
        "to": [email],
        "reply_to": "thebillion9@gmail.com",
        "subject": "The Godfather Offer: 3D Movement Client Audit & Founder Status",
        "html": html
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            return True
        else:
            print(f"[ERROR] {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print(f"[CRITICAL] Resend Failure: {e}")
        return False

def run_blast():
    print("--- MR. WORKOUT: FOUNDER'S CIRCLE WARM-UP BLAST ---")
    print(f"Time: {datetime.now()}")
    
    leads = []
    if os.path.exists("ig_leads.log"):
        with open("ig_leads.log", "r") as f:
            for line in f:
                if line.strip():
                    leads.append(json.loads(line))
    
    if not leads:
        print("ERROR: No leads found in ig_leads.log")
        return

    # Take first 50
    targets = leads[:50]
    print(f"Targeting first {len(targets)} influencers...")

    success_count = 0
    for i, lead in enumerate(targets):
        print(f"[{i+1}/50] Dispatching to {lead['username']} ({lead['business_email']})...", end=" ")
        if send_founders_email(lead):
            success_count += 1
            print("DONE")
        else:
            print("FAILED")
        
        # Small delay to respect API limits and look natural
        time.sleep(1)

    print(f"\n--- BLAST COMPLETE ---")
    print(f"Total Dispatched: {success_count}/50")
    print(f"Finish Time: {datetime.now()}")

if __name__ == "__main__":
    run_blast()
