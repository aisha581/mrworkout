import os
import json
import requests

# KV Connection via REST API
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

def get_staged_leads():
    """Fetches all leads from the STAGING_QUEUE."""
    if not (KV_REST_API_URL and KV_REST_API_TOKEN):
        print("[ERROR] KV credentials missing.")
        return []

    url = f"{KV_REST_API_URL}/lrange/STAGING_QUEUE/0/-1"
    headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            return response.json()
        return []
    except Exception as e:
        print(f"[CRITICAL] Failed to fetch queue: {e}")
        return []

def approve_leads():
    """Manual approval loop for staged leads."""
    leads = get_staged_leads()
    if not leads:
        print("[HUD] Staging queue is empty. Run 'scripts/lead_scout.py' first.")
        return

    print(f"\n[WAR_ROOM] {len(leads)} LEADS STAGED. MANUALLY APPROVE FOR OUTREACH.\n")

    for i, lead_str in enumerate(leads):
        lead = json.loads(lead_str)
        print(f"[{i}] {lead['platform'].upper()} | {lead['username']} | Topic: {lead['topic']}")
        
        choice = input("Approve Outreach? (y/n/skip): ").lower()
        
        if choice == 'y':
            print(f"[ACTION] Outreach authorized for {lead['username']}. (Logic: sendInfluencerOutreachEmail via API)")
            # Here we would call the actual API endpoint or use a server action
        elif choice == 'n':
            print(f"[ACTION] Lead {lead['username']} rejected. Permanent black-list.")
        else:
            print(f"[ACTION] Skipping lead.")

if __name__ == "__main__":
    approve_leads()
