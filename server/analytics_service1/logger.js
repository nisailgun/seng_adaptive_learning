// analytics_service/logger.js
const fs = require('fs');
const path = require('path');

class SystemLogger {
    
    /**
     * Simulates an asynchronous logging task.
     * It uses a slight delay to prove it runs in the "background".
     */
    logAccessAsync(userId, action) {
        
        // 1. Way of log file
        const logFilePath = path.join(__dirname, 'security_audit.log');
        
        // 2. Log format (Add timestamp)
        const timestamp = new Date().toISOString();
        const logEntry = `[SECURITY TRAIL] Time: ${timestamp} | User: ${userId} | Action: ${action}\n`;

        // 3. ASYNC WRITE (Diagram Rule: Without freezing the screen)
        // 'appendFile' runs asynchronously, it does not block the rest of the program.
        fs.appendFile(logFilePath, logEntry, (err) => {
            if (err) {
                console.error(" Logging error occurred:", err);
            } else {
                // Let's give the terminal information so you see it working
                console.log(` Event logged to file: ${action}`);
            }
        });
    }
}

module.exports = new SystemLogger();