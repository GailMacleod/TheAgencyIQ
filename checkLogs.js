#!/usr/bin/env node

const fs = require('fs');
const nodemailer = require('nodemailer');

// SMTP configuration for email alerts
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'alerts@theagencyiq.ai',
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD
  }
});

async function checkLogs() {
  try {
    console.log(`[${new Date().toISOString()}] Starting log check...`);
    
    // Check if logs.txt exists
    if (!fs.existsSync('logs.txt')) {
      console.log('No logs.txt file found, creating empty file...');
      fs.writeFileSync('logs.txt', '');
      return;
    }
    
    // Read the logs
    const logContent = fs.readFileSync('logs.txt', 'utf8');
    
    if (!logContent.trim()) {
      console.log('Logs file is empty, no alerts needed.');
      return;
    }
    
    // Check for error keywords
    const errorKeywords = ['error', '500', 'failed', 'failure', 'exception'];
    const hasErrors = errorKeywords.some(keyword => 
      logContent.toLowerCase().includes(keyword)
    );
    
    if (hasErrors) {
      console.log('Errors detected in logs, sending alert email...');
      
      // Send email alert
      const mailOptions = {
        from: process.env.SMTP_USER || 'alerts@theagencyiq.ai',
        to: 'gailm@macleodglba.com.au',
        subject: `🚨 TheAgencyIQ System Alert - Errors Detected`,
        html: `
          <h2>System Alert: Errors Detected</h2>
          <p><strong>Time:</strong> ${new Date().toISOString()}</p>
          <p><strong>Server:</strong> TheAgencyIQ Production</p>
          
          <h3>Full Log Content:</h3>
          <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-family: monospace;">
${logContent}
          </pre>
          
          <hr>
          <p><small>This is an automated alert from TheAgencyIQ monitoring system.</small></p>
        `,
        text: `
TheAgencyIQ System Alert - Errors Detected

Time: ${new Date().toISOString()}
Server: TheAgencyIQ Production

Full Log Content:
${logContent}

This is an automated alert from TheAgencyIQ monitoring system.
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Alert email sent successfully to gailm@macleodglba.com.au');
      
      // Archive the logs after sending alert
      const archiveFileName = `logs_archive_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
      fs.writeFileSync(archiveFileName, logContent);
      
      // Clear the logs file for next monitoring cycle
      fs.writeFileSync('logs.txt', '');
      console.log(`Logs archived to ${archiveFileName} and cleared for next cycle.`);
      
    } else {
      console.log('No errors found in logs, system running normally.');
    }
    
  } catch (error) {
    console.error('Error in checkLogs script:', error);
    
    // Try to send an email about the monitoring system failure
    try {
      const mailOptions = {
        from: process.env.SMTP_USER || 'alerts@theagencyiq.ai',
        to: 'gailm@macleodglba.com.au',
        subject: `🚨 TheAgencyIQ Monitoring System Failure`,
        text: `
TheAgencyIQ monitoring system encountered an error:

Error: ${error.message}
Time: ${new Date().toISOString()}

Please check the monitoring system configuration.
        `
      };
      
      await transporter.sendMail(mailOptions);
      console.log('Monitoring system failure alert sent.');
    } catch (emailError) {
      console.error('Failed to send monitoring failure alert:', emailError);
    }
  }
}

// Run the check
checkLogs().then(() => {
  console.log(`[${new Date().toISOString()}] Log check completed.`);
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error in checkLogs:', error);
  process.exit(1);
});