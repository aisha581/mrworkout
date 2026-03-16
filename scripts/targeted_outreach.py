import os
import json
import requests
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

def send_targeted_email(email, name, topic, template_name):
    """Sends a targeted email using a specific template."""
    if not RESEND_API_KEY:
        print(f"[SKIP] Resend API Key missing. Simulating outreach to {name} via {template_name}.")
        return True

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Load template
    template_path = f"/Users/fs/Downloads/Mr. Workout/templates/{template_name}.html"
    try:
        with open(template_path, 'r') as f:
            html = f.read()
            html = html.replace("{{name}}", name).replace("{{topic}}", topic).replace("{{niche}}", topic.split("|")[-1].strip() if "|" in topic else topic)
    except Exception as e:
        print(f"[ERROR] Failed to load template {template_name}: {e}")
        return False

    payload = {
        "from": "Mr. Workout <coach@mrworkout.pro>",
        "to": [email],
        "reply_to": "thebillion9@gmail.com",
        "subject": f"PROPOSAL: {template_name.replace('_', ' ').title()}",
        "html": html
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        return response.status_code in [200, 201]
    except Exception as e:
        print(f"[CRITICAL] Outreach Failure: {e}")
        return False

def execute_targeted_outreach():
    """Targets specific IDs from the staging log."""
    targets = {
        "LEAD_1773657217_8": "ankle_fix",      # ID 08
        "LEAD_1773657218_11": "ankle_fix",     # ID 11
        "LEAD_1773657217_6": "kinetic_chain",  # ID 06
        "LEAD_1773657217_7": "kinetic_chain"   # ID 07
    }
    
    found_leads = []
    remaining_leads = []
    
    if os.path.exists("staging_leads.log"):
        with open("staging_leads.log", "r") as f:
            for line in f:
                lead = json.loads(line)
                if lead["id"] in targets:
                    lead["template_to_use"] = targets[lead["id"]]
                    found_leads.append(lead)
                else:
                    remaining_leads.append(line)
        
        # Dispatch
        for lead in found_leads:
            intended_email = lead.get("email", "thebillion9+targeted@gmail.com")
            success = send_targeted_email(intended_email, lead["username"], lead["topic"], lead["template_to_use"])
            if success:
                print(f"[MATCHED] {lead['id']} -> {lead['template_to_use']} sent to {lead['username']}")
                # Update KV if available
                if KV_REST_API_URL and KV_REST_API_TOKEN:
                    headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
                    requests.post(f"{KV_REST_API_URL}/lrem/STAGING_QUEUE/1/{json.dumps(lead)}")
                    lead["status"] = "CONTACTED"
                    lead["contacted_at"] = str(datetime.now())
                    requests.post(f"{KV_REST_API_URL}/lpush/CONTACTED_LEADS", headers=headers, data=json.dumps(lead))
        
        # Update local log
        with open("staging_leads.log", "w") as f:
            f.writelines(remaining_leads)
            
    print(f"\n[MISSION] Targeted Outreach Wave complete. {len(found_leads)} strikes delivered.")

if __name__ == "__main__":
    execute_targeted_outreach()
