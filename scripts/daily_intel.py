import os
import csv
import json
import time
import datetime
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
REPORT_TARGET = "coach@mrworkout.pro" # Personal address

# Paths
OPENS_LOG = "data/opens_log.csv"
CLICKS_LOG = "data/clicks_log.csv"
UPLOADS_DIR = "data/uploads"
TEMPLATE_FILE = "templates/intel_report_template.html"

def get_counts_24h():
    now = datetime.datetime.now()
    twenty_four_hours_ago = now - datetime.timedelta(hours=24)
    
    opens = 0
    clicks = 0
    activity_rows = []

    # Process Opens
    if os.path.exists(OPENS_LOG):
        with open(OPENS_LOG, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if not row: continue
                try:
                    ts = datetime.datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
                    if ts > twenty_four_hours_ago:
                        opens += 1
                        activity_rows.append((ts, row[1], "OPENED"))
                except: continue

    # Process Clicks
    if os.path.exists(CLICKS_LOG):
        with open(CLICKS_LOG, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if not row: continue
                try:
                    ts = datetime.datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
                    if ts > twenty_four_hours_ago:
                        clicks += 1
                        activity_rows.append((ts, row[1], "CLICKED"))
                except: continue

    # Process Uploads
    uploads = 0
    if os.path.exists(UPLOADS_DIR):
        for filename in os.listdir(UPLOADS_DIR):
            fpath = os.path.join(UPLOADS_DIR, filename)
            mtime = datetime.datetime.fromtimestamp(os.path.getmtime(fpath))
            if mtime > twenty_four_hours_ago:
                uploads += 1
                activity_rows.append((mtime, filename, "UPLOADED"))

    # Sort activity by time desc
    activity_rows.sort(key=lambda x: x[0], reverse=True)
    
    formatted_rows = ""
    for ts, entity, action in activity_rows[:15]: # Show last 15
        time_str = ts.strftime("%H:%M")
        formatted_rows += f"<tr><td>{time_str}</td><td>{entity[:25]}</td><td><span class='status-pill'>{action}</span></td></tr>"

    return opens, clicks, uploads, formatted_rows

def send_report():
    print("--- MR. WORKOUT: GENERATING DAILY INTEL REPORT ---")
    
    opens, clicks, uploads, activity_rows = get_counts_24h()
    
    with open(TEMPLATE_FILE, 'r') as f:
        html = f.read()
    
    date_str = datetime.datetime.now().strftime("%Y-%m-%d")
    html = html.replace("{{date}}", date_str)
    html = html.replace("{{opens}}", str(opens))
    html = html.replace("{{clicks}}", str(clicks))
    html = html.replace("{{uploads}}", str(uploads))
    html = html.replace("{{activity_rows}}", activity_rows)

    subject = f"Mr. Workout 3D | Daily Intel Report - {date_str}"
    
    msg = MIMEMultipart()
    msg['From'] = f"Mr. Workout HQ <{SMTP_USER}>"
    msg['To'] = REPORT_TARGET
    msg['Subject'] = subject
    msg.attach(MIMEText(html, 'html'))

    try:
        with smtplib.SMTP_SSL(SMTP_SERVER, SMTP_PORT) as server:
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        print(f"REPORT DISPATCHED TO {REPORT_TARGET}")
    except Exception as e:
        print(f"FAILED TO DISPATCH REPORT: {e}")

if __name__ == "__main__":
    send_report()
