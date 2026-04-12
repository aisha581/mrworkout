import os
import requests
import json
from dotenv import load_dotenv

# Load credentials
load_dotenv(".env.local")
load_dotenv(".env")

APIFY_API_TOKEN = os.getenv("APIFY_API_TOKEN")
APIFY_TASK_ID = os.getenv("APIFY_TASK_ID", "compass/crawler-google-places")

def trigger_austin_harvest(max_results=5):
    """
    Triggers the Apify Google Places Crawler for Gyms in Austin, TX.
    """
    if not APIFY_API_TOKEN:
        print("[ERROR] APIFY_API_TOKEN missing from environment.")
        return

    # Task Input optimized for Email & Contact Extraction
    payload = {
        "searchStringsArray": ["Gyms in Austin, TX"],
        "locationQuery": "Austin, Texas",
        "maxCrawledPlacesPerSearch": max_results,
        "scrapeContacts": True,
        "maximumLeadsEnrichmentRecords": 5,
        "contactExtractionDepth": 2,
        "scrapeSocialMediaProfiles": {
            "facebooks": True,
            "instagrams": True,
            "linkedins": True,
            "twitters": True
        }
    }

    # The Apify API expects owner~name for slugs in URLs
    actor_id_url = APIFY_TASK_ID.replace("/", "~")
    url = f"https://api.apify.com/v2/acts/{actor_id_url}/runs?token={APIFY_API_TOKEN}"
    
    print(f"[APIFY_ENGINE] Triggering '{APIFY_TASK_ID}' for Austin Harvest (Max: {max_results})...")
    
    try:
        response = requests.post(url, json=payload)
        if response.status_code in [200, 201]:
            run_data = response.json()
            run_id = run_data.get("data", {}).get("id")
            print(f"[SUCCESS] Run Started! ID: {run_id}")
            print(f"Check progress: https://console.apify.com/actors/{APIFY_TASK_ID}/runs/{run_id}")
            return run_id
        else:
            print(f"[ERROR] Trigger Failed ({response.status_code}): {response.text}")
    except Exception as e:
        print(f"[CRITICAL] API Failure: {e}")

if __name__ == "__main__":
    trigger_austin_harvest(5)
