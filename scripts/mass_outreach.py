import os
import json
import csv
import requests
import random
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

# KV Connection via REST API
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

def stage_mass_lead(lead_data):
    """Adds a lead to the MASS_OUTREACH_QUEUE in Upstash."""
    if not (KV_REST_API_URL and KV_REST_API_TOKEN):
        print("[HUD_LOG] KV credentials missing. Staging to mass_leads.log")
        with open("mass_leads.log", "a") as f:
            f.write(json.dumps(lead_data) + "\n")
        return

    url = f"{KV_REST_API_URL}/lpush/MASS_OUTREACH_QUEUE"
    headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(lead_data))
        if response.status_code == 200:
            print(f"[MASS_STAGED] {lead_data['segment'].upper()}: {lead_data['name']}")
        else:
            print(f"[ERROR] failed to stage mass lead: {response.text}")
    except Exception as e:
        print(f"[CRITICAL] Storage Failure: {e}")

def process_leads(source_file=None):
    """
    Processes leads from a CSV or simulates Apollo.io API response.
    Segments into 'Influencer' (>10k followers) vs 'Athlete'.
    """
    print("[MASS_ENGINE] Initiating daily lead ingestion (Target: 500)...")
    
    leads_to_process = []
    
    if source_file and os.path.exists(source_file):
        # CSV ingestion logic
        with open(source_file, mode='r') as f:
            reader = csv.DictReader(f)
            for row in reader:
                leads_to_process.append(row)
    else:
        # Simulated Apollo.io / Scouting response
        for i in range(500):
            followers = random.randint(100, 50000)
            segment = "influencer" if followers > 10000 else "athlete"
            
            leads_to_process.append({
                "email": f"athlete_{i}@example.com",
                "name": f"Coach_{i}" if segment == "influencer" else f"Athlete_{i}",
                "platform": random.choice(["X", "Instagram", "LinkedIn"]),
                "followers": followers,
                "segment": segment,
                "topic": random.choice(["Biomechanics", "Mobility", "Knee Protection"]),
                "template": "godfather_offer" if segment == "influencer" else "enlistment"
            })

    for lead in leads_to_process:
        lead["id"] = f"MASS_{int(datetime.now().timestamp())}_{random.randint(1000, 9999)}"
        lead["staged_at"] = str(datetime.now())
        stage_mass_lead(lead)

if __name__ == "__main__":
    process_leads()
    print("[MASS_ENGINE] Ingestion complete. 500 leads staged for drip dispatch.")
