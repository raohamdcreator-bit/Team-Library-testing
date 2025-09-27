// STEP 1: Create api/send-invite.js in your project root
// File: api/send-invite.js

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // Enable CORS for your domain
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      error: "Method not allowed" 
    });
  }

  const { to, link, teamName, invitedBy, role } = req.body;

  // Validate required fields
  if (!to || !link || !teamName) {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields: to, link, teamName" 
    });
  }

  // Check if Resend API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error("❌ RESEND_API_KEY environment variable is not set");
    return res.status(500).json({ 
      success: false, 
      error: "Email service not configured - missing API key" 
    });
  }

  try {
    console.log(`📧 Sending email to: ${to} for team: ${teamName}`);

    const emailData = await resend.emails.send({
      from: "team-invites@resend.dev", // Use Resend's default domain or your verified domain
      to: to,
      subject: `🎉 You've been invited to join ${teamName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🚀 You've been invited!</h1>
          </div>

          <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
            <p style="font-size: 16px; margin: 0 0 15px 0;">Hello there! 👋</p>
            <p style="font-size: 16px; margin: 0 0 15px 0;">
              <strong>${invitedBy || 'Someone'}</strong> has invited you to join 
              <strong style="color: #667eea;">${teamName}</strong> as a 
              <strong>${role || 'member'}</strong>.
            </p>
            <p style="font-size: 14px; color: #666; margin: 0;">
              Join your team to start collaborating on AI prompts and boost productivity together.
            </p>
          </div>

          <div style="text-align: center; margin: 40px 0;">
            <a href="${link}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 15px 30px; 
                      text-decoration: none; 
                      border-radius: 8px; 
                      font-weight: 600; 
                      font-size: 16px;
                      display: inline-block;
                      transition: transform 0.2s;">
              Accept Invitation
            </a>
          </div>

          <div style="background: #e9ecef; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 10px 0;">
              <strong>Can't click the button?</strong> Copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #007bff; word-break: break-all; margin: 0;">
              ${link}
            </p>
          </div>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <p style="font-size: 12px; color: #868e96; margin: 0;">
              If you don't want to join this team, you can safely ignore this email.
              <br>
              This invitation was sent from Prompt Teams.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Email sent successfully:", emailData.id);
    
    return res.status(200).json({ 
      success: true, 
      data: emailData,
      message: "Invitation email sent successfully"
    });
    
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    
    // Provide specific error messages based on common issues
    let errorMessage = "Failed to send email";
    let statusCode = 500;
    
    if (error.message.includes("API key")) {
      errorMessage = "Invalid email service configuration";
      statusCode = 500;
    } else if (error.message.includes("rate limit") || error.message.includes("quota")) {
      errorMessage = "Email rate limit exceeded. Please try again later.";
      statusCode = 429;
    } else if (error.message.includes("domain")) {
      errorMessage = "Email domain not verified";
      statusCode = 500;
    } else if (error.message.includes("invalid") && error.message.includes("email")) {
      errorMessage = "Invalid email address format";
      statusCode = 400;
    }
    
    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// // STEP 2: Create vercel.json in your project root
// // File: vercel.json
// {
//   "functions": {
//     "api/*.js": {
//       "runtime": "nodejs18.x"
//     }
//   },
//   "rewrites": [
//     {
//       "source": "/api/(.*)",
//       "destination": "/api/$1"
//     }
//   ]
// }

// STEP 3: Update your package.json
// Add resend to dependencies:
// {
//   "dependencies": {
//     "resend": "^2.0.0";
//   }
// }

// // STEP 4: Environment Variables Setup
// // Create .env.local file in your project root:
// RESEND_API_KEY=your_resend_api_key_here

// // STEP 5: For production deployment on Vercel:
// // 1. Go to Vercel dashboard > Your project > Settings > Environment Variables
// // 2. Add: RESEND_API_KEY with your actual Resend API key
// // 3. Make sure it's available for Production, Preview, and Development

// // STEP 6: Get your Resend API Key
// // 1. Go to https://resend.com/
// // 2. Sign up for a free account
// // 3. Go to API Keys section
// // 4. Create a new API key
// // 5. Copy the key to your environment variables

// // STEP 7: Updated TeamInviteForm.jsx (if you want better error handling)
// // This is optional - your current fixed version should work fine