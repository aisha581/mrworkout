const fs = require('fs');
const crypto = require('crypto');

const exercises = [
    "Barbell Bench Press", "Incline Dumbbell Press", "Cable Crossovers", 
    "Pull-Ups", "Barbell Rows", "Lat Pulldowns",
    "Overhead Press", "Lateral Raises", "Front Raises",
    "Barbell Squats", "Leg Press", "Romanian Deadlifts",
    "Leg Extensions", "Hamstring Curls", "Calf Raises",
    "Bicep Curls", "Hammer Curls", "Tricep Pushdowns", "Overhead Tricep Extensions",
    "Hanging Leg Raises", "Cable Crunches", "Russian Twists"
];

let csv = "AssetID,Exercise Name,Target Muscle,Savage Tip,Default Rest (s)\n";

exercises.forEach((ex) => {
    const assetId = crypto.randomUUID();
    let muscle = "Chest";
    if (ex.includes("Pull") || ex.includes("Rows") || ex.includes("Lat")) muscle = "Back";
    else if (ex.includes("Press") && ex.includes("Overhead") || ex.includes("Raises") && !ex.includes("Calf")) muscle = "Shoulders";
    else if (ex.includes("Squats") || ex.includes("Leg") || ex.includes("Deadlifts") || ex.includes("Curls") && ex.includes("Hamstring")) muscle = "Legs";
    else if (ex.includes("Bicep") || ex.includes("Hammer") || ex.includes("Tricep")) muscle = "Arms";
    else if (ex.includes("Raises") && ex.includes("Leg") || ex.includes("Crunches") || ex.includes("Twists")) muscle = "Core";
    
    csv += `${assetId},${ex},${muscle},,60\n`;
});

fs.writeFileSync('../data/asset_mapping.csv', csv);
console.log("Generated asset_mapping.csv with", exercises.length, "entries.");
