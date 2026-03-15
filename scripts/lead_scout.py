import os
import json
import requests
import random
from datetime import datetime

# KV Connection via REST API
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

# Tactical Keywords for 3D Biomechanics & Mobility
KEYWORDS = [
    "3D biomechanics", "knee pain sports", "workout mobility",
    "hip internal rotation", "kinetic chain basketball", "ankle dorsiflexion fix"
]

def stage_lead(lead_data):
    """Adds a discovered lead to the STAGING_QUEUE for manual approval."""
    if not (KV_REST_API_URL and KV_REST_API_TOKEN):
        print("[HUD_LOG] KV environment variables missing. Staging to local log...")
        with open("staging_leads.log", "a") as f:
            f.write(json.dumps(lead_data) + "\n")
        return

    # Using LPUSH for STAGING_QUEUE
    url = f"{KV_REST_API_URL}/lpush/STAGING_QUEUE"
    headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
    
    try:
        response = requests.post(url, headers=headers, data=json.dumps(lead_data))
        if response.status_code == 200:
            print(f"[STAGE_SECURED] {lead_data.get('platform', '???')} Lead: {lead_data.get('username')}")
        else:
            print(f"[HUD_ERROR] Staging failed: {response.text}")
    except Exception as e:
        print(f"[HUD_CRITICAL] Storage Failure: {e}")

def simulate_high_volume_scout():
    """Simulates capturing 50 high-intent leads daily across Reddit and X."""
    print(f"[WAR_ROOM] Initiating scouting protocol for {len(KEYWORDS)} sectors...")
    
    platforms = ["reddit", "x", "threads"]
    niches = ["basketball", "powerlifting", "running", "soccer"]
    
    for i in range(50):
        platform = random.choice(platforms)
        niche = random.choice(niches)
        keyword = random.choice(KEYWORDS)
        
        lead = {
            "id": f"LEAD_{int(datetime.now().timestamp())}_{i}",
            "platform": platform,
            "username": f"Athlete_{random.randint(100, 999)}",
            "topic": f"{keyword} | {niche}",
            "confidence": f"{random.randint(85, 99)}%",
            "timestamp": str(datetime.now()),
            "status": "STAGED",
            "outreach_template": "influencer_equity"
        }
        
        stage_lead(lead)
        # Random sleep to avoid detection pattern
        time.sleep(random.uniform(0.1, 0.5))

if __name__ == "__main__":
    import time
    simulate_high_volume_scout()
    print("[WAR_ROOM] Scouting cycle complete. 50 leads staged for human approval.")
