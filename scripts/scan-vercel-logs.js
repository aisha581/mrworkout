const fs = require('fs');
const { execSync } = require('child_process');

/**
 * Historical Log Scan Script
 * This script attempts to scan Vercel logs and extract "WAITLIST_ENTRY:" patterns.
 */
function scanLogs() {
    console.log('--- Starting Vercel Log Scan ---');
    try {
        // We use 'vercel logs' command. Requires user to be logged in.
        // It fetches the most recent logs.
        const logs = execSync('npx vercel logs mr-workout --prod -n 100').toString();
        
        const emailPattern = /WAITLIST_ENTRY: ([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
        let match;
        const emails = new Set();

        while ((match = emailPattern.exec(logs)) !== null) {
            emails.add(match[1]);
        }

        if (emails.size > 0) {
            console.log('Found Emails:');
            console.table(Array.from(emails).map(email => ({ email })));
        } else {
            console.log('No waitlist entries found in the last 100 log lines.');
            console.log('Tip: If you just deployed, recent logs might not have entries yet.');
        }

    } catch (error) {
        console.error('Scan failed. Ensure you are logged into Vercel CLI (npx vercel login).');
        console.error(error.message);
    }
}

scanLogs();
