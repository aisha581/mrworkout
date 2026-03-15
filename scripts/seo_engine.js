/**
 * SEO Engine: Dynamic Landing Page Configuration Generator
 * Generates 50 niche-specific SEO profiles for the Mr. Workout Clinic.
 */

const fs = require('fs');
const path = require('path');

const NICHES = [
    { name: "Basketball", hook: "Vertical Jump & Landing Stability" },
    { name: "Powerlifting", hook: "Scapular Health & Squat Biomechanics" },
    { name: "Running", hook: "Gait Analysis & Knee Longevity" },
    { name: "Soccer", hook: "Agility & Hip Rotation Power" },
    { name: "CrossFit", hook: "Handstand Stability & Shoulder Health" }
];

const SECONDARY_KEYWORDS = ["ACL prevention", "3D movement", "Kinetic chain", "Mobility deficit"];

function generateSEOProfiles() {
    console.log("[SEO_WAR_ROOM] Generating 50 niche-specific landing page configs...");
    
    const profiles = [];
    
    for (let i = 1; i <= 50; i++) {
        const niche = NICHES[i % NICHES.length];
        const keyword = SECONDARY_KEYWORDS[i % SECONDARY_KEYWORDS.length];
        const slug = `${niche.name.toLowerCase()}-${keyword.toLowerCase().replace(/ /g, '-')}-${i}`;
        
        profiles.push({
            id: i,
            slug: slug,
            title: `Mr. Workout Clinic | ${niche.name} Optimized: ${niche.hook}`,
            meta_description: `Join the Alpha Squad for elite ${niche.name} 3D biomechanics. Resolve ${keyword} with advanced clinic protocols.`,
            canonical: `https://mrworkout.pro/lp/${slug}`,
            keywords: [`${niche.name} workout`, "3D movement", keyword, "alpha squad clinic"]
        });
    }

    const outputPath = path.join(__dirname, '../data/seo_profiles.json');
    if (!fs.existsSync(path.dirname(outputPath))) {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(profiles, null, 2));
    console.log(`[SUCCESS] 50 SEO profiles generated at ${outputPath}`);
}

generateSEOProfiles();
