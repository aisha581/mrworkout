import os
import json
import requests
import sys
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env.local")
load_dotenv(".env")

KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

def generate_partner_id(name):
    """Generates a unique partner ID from the name."""
    clean_name = "".join(e for e in name if e.isalnum()).upper()
    return f"PARTNER_{clean_name[:8]}"

def on_board_partner(lead_email, partner_name):
    """Marks a lead as a partner and generates their unique referral link."""
    if not KV_REST_API_URL or not KV_REST_API_TOKEN:
        print("[ERROR] Upstash KV credentials missing.")
        return None

    partner_id = generate_partner_id(partner_name)
    referral_link = f"https://mrworkout.pro/{partner_id}"
    
    headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
    
    partner_data = {
        "email": lead_email,
        "name": partner_name,
        "partner_id": partner_id,
        "referral_link": referral_link,
        "commission_rate": "20%",
        "status": "ACTIVE"
    }

    # Store in KV
    try:
        # Save partner registry
        requests.post(f"{KV_REST_API_URL}/hset/partner_registry/{partner_id}/{json.dumps(partner_data)}", headers=headers)
        # Update lead status
        requests.post(f"{KV_REST_API_URL}/hset/lead_status/{lead_email}/PRO_PARTNER", headers=headers)
        
        print(f"[SUCCESS] Partner Onboarded: {partner_name}")
        print(f"ID: {partner_id}")
        print(f"LINK: {referral_link}")
        return referral_link
    except Exception as e:
        print(f"[ERROR] Failed to onboard partner: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python3 scripts/reflink_gen.py <email> <name>")
    else:
        on_board_partner(sys.argv[1], sys.argv[2])
