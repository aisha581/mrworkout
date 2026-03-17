import os
import json
import time
import csv
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

# Load env vars
load_dotenv()

# Hostinger SMTP Config
SMTP_SERVER = "smtp.hostinger.com"
SMTP_PORT = 465
SMTP_USER = os.getenv("HOSTINGER_SMTP_USER") or "coach@mrworkout.pro"
SMTP_PASS = os.getenv("HOSTINGER_SMTP_PASS")

# Campaign Settings
SEGMENT_FILE = "ig_leads.log"
LOG_FILE = "campaign_log.csv"
TEMPLATE_FILE = "templates/godfather_partnership.html"
DRIP_INTERVAL = 120  # 2 minutes in seconds
MAX_LEADS = 50

def load_leads():
    leads = []
    if not os.path.exists(SEGMENT_FILE):
        return []
    with open(SEGMENT_FILE, 'r') as f:
        for line in f:
            if line.strip():
                leads.append(json.loads(line))
    return leads[:MAX_LEADS]

def load_template():
    with open(TEMPLATE_FILE, 'r') as f:
        return f.read()

def send_email(lead, html_content):
    if not SMTP_PASS:
        return False, "KEY_MISSING"

    # Replace placeholders
    name = lead.get("username", "Coach")
    # Basic name extraction from username if it's like Scott_Runs -> Scott
    if "_" in name:
        first_part = name.split("_")[0]
        if first_part:
            name = first_part

    # If username is Athlete_785, say "Athlete"
    if name.lower().startswith("athlete"):
        name = "Athlete"

    subject = "The Godfather Offer"
    
    # Template variable injection
    tracking_id = lead.get("id", "PROBE_" + str(int(time.time())))
    html = html_content.replace("{{name}}", name)
    html = html.replace("{{platform}}", "Instagram")
    html = html.replace("{{topic}}", lead.get("topic", "Strength & Conditioning"))
    html = html.replace("{{tracking_id}}", tracking_id)

    msg = MIMEMultipart()
    msg['From'] = f"Mr. Workout <{SMTP_USER}>"
    msg['To'] = lead["business_email"]
    msg['Subject'] = subject
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True, "SUCCESS"
    except Exception as e:
        return False, str(e)

def log_campaign(lead, status, error=""):
    file_exists = os.path.isfile(LOG_FILE)
    with open(LOG_FILE, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(["timestamp", "id", "username", "email", "status", "error"])
        writer.writerow([
            time.strftime("%Y-%m-%d %H:%M:%S"),
            lead.get("id"),
            lead.get("username"),
            lead.get("business_email"),
            status,
            error
        ])

def run_outreach():
    print(f"--- MR. WORKOUT: PHASE 1 OUTREACH INITIATED ---")
    print(f"Targeting: {MAX_LEADS} Rising Stars")
    print(f"Interval: {DRIP_INTERVAL}s")
    
    leads = load_leads()
    template_html = load_template()
    
    if not leads:
        print("ERROR: No leads found in ig_leads.log")
        return

    for i, lead in enumerate(leads):
        if not lead.get("business_email") or lead["business_email"] == "N/A":
            print(f"[{i+1}/{MAX_LEADS}] Skipping {lead['username']} (No email)")
            log_campaign(lead, "SKIPPED", "No business email")
            continue

        print(f"[{i+1}/{MAX_LEADS}] Dispatching to {lead['username']} ({lead['business_email']})...")
        success, result = send_email(lead, template_html)
        
        if success:
            print(f"    - SUCCESS")
            log_campaign(lead, "SENT")
        else:
            print(f"    - FAILED: {result}")
            log_campaign(lead, "FAILED", result)

        if i < len(leads) - 1:
            print(f"Waiting {DRIP_INTERVAL}s for next vector...")
            time.sleep(DRIP_INTERVAL)

    print("--- CAMPAIGN COMPLETE ---")

if __name__ == "__main__":
    run_outreach()
