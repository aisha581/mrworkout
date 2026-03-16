import os
import json
import requests
import time
from datetime import datetime

# Load credentials from environment
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
KV_REST_API_URL = os.getenv("KV_REST_API_URL")
KV_REST_API_TOKEN = os.getenv("KV_REST_API_TOKEN")

def send_outreach_email(email, name, topic):
    """Calls Resend API to send the personalized outreach email."""
    if not RESEND_API_KEY:
        print(f"[SKIP] Resend API Key missing. Simulating outreach to {name} ({email}).")
        return True

    url = "https://api.resend.com/emails"
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json"
    }
    
    # Personalization logic: Extract niche from topic (e.g., "3D biomechanics | basketball")
    niche = topic.split("|")[-1].strip() if "|" in topic else topic
    
    payload = {
        "from": "Mr. Workout <coach@mrworkout.pro>",
        "to": [email],
        "reply_to": "thebillion9@gmail.com",
        "subject": "PROPOSAL: Mr. Workout Founder Equity Status",
        "html": f"""
            <div style="font-family: sans-serif; background: #060606; color: #ffffff; padding: 40px; border-radius: 20px; border: 1px solid #333;">
                <div style="background: linear-gradient(135deg, #00ffff, #39ff14); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #000; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 2px;">Founder Equity Protocol</h1>
                </div>
                <div style="padding: 30px;">
                    <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 2px; color: #39ff14; margin-bottom: 20px;">Priority: Level Alpha</p>
                    <p style="font-weight: bold;">Athlete {name},</p>
                    <p>We've been tracking your impact in the biomechanics and mobility space. Your recent insights on <strong>{topic}</strong> align perfectly with the mission we're building at Mr. Workout.</p>
                    <p>I've been following your work in the <strong>{niche}</strong> vertical, and it's clear you understand the kinetic chain better than most.</p>
                    <p>We are officially extending a <span style="color: #00ffff; font-weight: bold;">Founder Equity Status</span> offer for you to join our inner circle.</p>
                    <p>This isn't a sponsorship—it's an initiation into the Alpha Squad that will define the future of 3D Movement training.</p>
                    <center>
                        <a href="https://www.mrworkout.pro/welcome" style="display: inline-block; background: #39ff14; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: 900; text-transform: uppercase; margin: 20px 0;">Claim Access</a>
                    </center>
                    <p>Your Day 01 Directive is ready. The 3D revolution doesn't wait for late adopters.</p>
                    <p>Stay Savage,<br /><strong>MR. WORKOUT</strong></p>
                </div>
                <div style="text-align: center; font-size: 10px; color: #666; padding-top: 20px; border-top: 1px solid #333;">
                    Savage Protocol v.1 | Confidential Outreach | 3D Movement Clinic
                </div>
            </div>
        """
    }

    try:
        response = requests.post(url, headers=headers, json=payload)
        if response.status_code in [200, 201]:
            print(f"[DISPATCH_SUCCESS] Email sent to {name} ({email})")
            return True
        else:
            print(f"[DISPATCH_ERROR] Failed to send to {name}: {response.text}")
            return False
    except Exception as e:
        print(f"[DISPATCH_CRITICAL] error: {e}")
        return False

def execute_wave_1():
    """Pops 5 leads from STAGING_QUEUE and dispatches them."""
    if not (KV_REST_API_URL and KV_REST_API_TOKEN):
        print("[HUD_LOG] KV credentials missing. Checking local log for simulation...")
        if os.path.exists("staging_leads.log"):
            with open("staging_leads.log", "r") as f:
                leads = [json.loads(line) for line in f.readlines()[:5]]
        else:
            print("[ERROR] No leads found to dispatch.")
            return
    else:
        # Fetch 5 leads from Upstash
        url = f"{KV_REST_API_URL}/lrange/STAGING_QUEUE/0/4"
        headers = {"Authorization": f"Bearer {KV_REST_API_TOKEN}"}
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                leads = [json.loads(l) for l in response.json()]
            else:
                print(f"[KV_ERROR] Failed to fetch leads: {response.text}")
                return
        except Exception as e:
            print(f"[KV_CRITICAL] error: {e}")
            return

    if not leads:
        print("[HUD] No leads available in the staging queue.")
        return

    print(f"[WAR_ROOM] Initiating WAVE 1 Outreach to {len(leads)} athletes...\n")

    contacted_leads = []
    
    for lead in leads:
        # Using a fallback email for simulation/safety if not provided in lead
        email = lead.get("email", "thebillion9@gmail.com") # Redirecting to user's reply-to for safety during testing if no real email
        name = lead.get("username", "Athlete")
        topic = lead.get("topic", "3D Biomechanics")
        
        success = send_outreach_email(email, name, topic)
        
        if success:
            lead["status"] = "CONTACTED"
            lead["contacted_at"] = str(datetime.now())
            contacted_leads.append(lead)
            
            # Update KV: Remove from STAGING_QUEUE and add to CONTACTED_LEADS
            if KV_REST_API_URL and KV_REST_API_TOKEN:
                # LREM from staging
                requests.post(f"{KV_REST_API_URL}/lrem/STAGING_QUEUE/1/{json.dumps(lead)}")
                # LPUSH to contacted
                requests.post(f"{KV_REST_API_URL}/lpush/CONTACTED_LEADS", headers=headers, data=json.dumps(lead))

    print(f"\n[MISSION_COMPLETE] Wave 1 Dispatch finished. {len(contacted_leads)} athletes contacted.")

if __name__ == "__main__":
    execute_wave_1()
