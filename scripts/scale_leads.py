import os
import csv
import random
from datetime import datetime

# Keywords for bio-scraping reconnaissance
KEYWORDS = ["Soccer Coach", "Track Athlete", "Sprinting"]
PLATFORMS = ["Instagram", "X", "LinkedIn"]
NICHES = ["Biomechanics", "Fast Twitch", "Acceleration", "Injury Prevention"]

def simulate_bio_scraping(count=500):
    """Simulates the harvesting of 500 leads from bios based on keywords."""
    print(f"[RECON] Initiating bio-scraping for {count} leads...")
    
    leads = []
    for i in range(count):
        keyword = random.choice(KEYWORDS)
        platform = random.choice(PLATFORMS)
        niche = random.choice(NICHES)
        
        leads.append({
            "lead_id": f"RECON_{int(datetime.now().timestamp())}_{i}",
            "platform": platform,
            "username": f"Pro_{keyword.replace(' ', '_')}_{i}",
            "bio_keyword": keyword,
            "niche": niche,
            "profile_url": f"https://{platform.lower()}.com/profile_{i}",
            "scanned_at": str(datetime.now())
        })
        
    return leads

def save_to_csv(leads, output_path):
    """Saves the harvested leads to a tactical CSV file."""
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    keys = leads[0].keys()
    with open(output_path, 'w', newline='') as f:
        dict_writer = csv.DictWriter(f, fieldnames=keys)
        dict_writer.writeheader()
        dict_writer.writerows(leads)
        
    print(f"[SUCCESS] {len(leads)} leads exported to {output_path}")

if __name__ == "__main__":
    harvested_leads = simulate_bio_scraping(500)
    save_to_csv(harvested_leads, "/Users/fs/Downloads/Mr. Workout/marketing/wave_02_leads.csv")
