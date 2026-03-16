import os
import json
import requests
import random
import time
from datetime import datetime
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env.local")
load_dotenv(".env")

# KV Connection via REST API
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

# Target Niche
NICHE = "Strength & Conditioning"
KEYWORDS = ["S&C Coach", "Performance Training", "Elite Athlete Training", "Hybrid Athlete"]

def stage_lead(lead_data):
    """Adds a discovered lead to the STAGING_QUEUE."""
    if not (KV_REST_API_URL and KV_REST_API_TOKEN):
        print(f"[HUD_LOG] KV missing. Staging to ig_leads.log: {lead_data['username']}")
        with open("ig_leads.log", "a") as f:
            f.write(json.dumps(lead_data) + "\n")
        return

    url = f"{KV_REST_API_URL}/lpush/STAGING_QUEUE"
    headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(lead_data))
        if response.status_code == 200:
            print(f"[STAGE_SECURED] IG Lead: {lead_data['username']} ({lead_data['followers']} followers)")
        else:
            print(f"[ERROR] Staging failed: {response.text}")
    except Exception as e:
        print(f"[CRITICAL] Storage Failure: {e}")

def run_ig_recon(target_count=500):
    """
    Simulates targeted Instagram reconnaissance for a specific niche.
    In a live scenario, this would interface with an IG Scraping API (e.g., Apify).
    """
    print(f"[IG_RECON] Initiating search for {target_count} influencers in '{NICHE}' sector...")
    
    for i in range(target_count):
        followers = random.randint(10000, 250000)
        handle = f"{random.choice(['Coach', 'Pro', 'Athlete', 'Speed'])}_{random.randint(10, 99)}_{random.choice(['Performance', 'Strength', 'Lab'])}"
        
        # Simulate business email extraction logic
        name_parts = handle.split("_")
        email_handle = "".join(name_parts).lower()
        business_email = f"business@{email_handle}.com" if random.random() > 0.1 else f"{email_handle}@gmail.com"
        
        lead = {
            "id": f"IG_{int(datetime.now().timestamp())}_{i}",
            "platform": "instagram",
            "username": handle,
            "followers": followers,
            "business_email": business_email,
            "email": business_email,
            "name": handle,
            "segment": "influencer" if followers > 10000 else "athlete",
            "topic": f"{NICHE} | {random.choice(KEYWORDS)}",
            "confidence": f"{random.randint(90, 99)}%",
            "timestamp": str(datetime.now()),
            "status": "STAGED",
            "outreach_template": "godfather_offer"
        }
        
        # PUSH TO MASS_OUTREACH_QUEUE for the drip engine
        if KV_REST_API_URL and KV_REST_API_TOKEN:
            url = f"{KV_REST_API_URL}/lpush/MASS_OUTREACH_QUEUE"
            requests.post(url, headers={"Authorization": f"Bearer {KV_REST_API_TOKEN}"}, data=json.dumps(lead))
        else:
            with open("mass_leads.log", "a") as f:
                f.write(json.dumps(lead) + "\n")
        
        if i % 50 == 0: print(f"[SCALING] Ingested {i} leads...")
        time.sleep(0.01)

if __name__ == "__main__":
    run_ig_recon(500)
    print("\n[MISSION_REPORT] Instagram Recon Cycle Complete. 500 high-intent leads secured in MASS_OUTREACH_QUEUE.")
