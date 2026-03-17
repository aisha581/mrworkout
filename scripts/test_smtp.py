import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

def test_hostinger_smtp():
    print("--- MR. WORKOUT: SMTP CONNECTIVITY TEST ---")
    
    SERVER = "smtps.hostinger.com"
    PORT = 465
    USER = os.getenv("HOSTINGER_SMTP_USER") or "coach@mrworkout.pro"
    PASS = os.getenv("HOSTINGER_SMTP_PASS")

    if not PASS:
        print("ERROR: HOSTINGER_SMTP_PASS not found in .env")
        return

    print(f"Targeting: {SERVER}:{PORT}")
    print(f"Auth Identity: {USER}")

    try:
        print("Initiating SSL Connection...")
        with smtplib.SMTP_SSL(SERVER, PORT) as server:
            print("Server handshake successful.")
            server.login(USER, PASS)
            print("AUTHENTICATION SECURED.")
            
            # Send test probe
            msg = MIMEText("SMTP Pipe Operational. Vectors secure.")
            msg['Subject'] = "Protocol Test: SMTP"
            msg['From'] = USER
            msg['To'] = USER
            
            server.send_message(msg)
            print("TEST PROBE DISPATCHED.")
            print("--- TEST COMPLETE: SUCCESS ---")
            
    except Exception as e:
        print(f"CRITICAL FAILURE: {e}")

if __name__ == "__main__":
    test_hostinger_smtp()
