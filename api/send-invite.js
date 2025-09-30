// api/send-invite.js - FIXED for Vercel
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// ✅ IMPORTANT: Vercel requires default export
export default async function handler(req, res) {
  // ✅ Set CORS headers FIRST
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // ✅ Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // ✅ Only allow POST
  if (req.method !== "POST") {
    console.log(`❌ Method ${req.method} not allowed`);
    return res.status(405).json({ 
      success: false, 
      error: `Method ${req.method} Not Allowed. Use POST.` 
    });
  }

  try {
    const { to, link, teamName, invitedBy, role } = req.body;

    // Validate required fields
    if (!to || !link || !teamName) {
      console.log("❌ Missing required fields");
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: to, link, teamName" 
      });
    }

    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY not configured");
      return res.status(500).json({ 
        success: false, 
        error: "Email service not configured" 
      });
    }

    console.log(`📧 Sending email to: ${to} for team: ${teamName}`);

    // Send email
    const emailData = await resend.emails.send({
      from: "Prompt Teams <onboarding@resend.dev>",
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
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
            <h1 style="color: white; margin: 0; font-size: 32px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              🚀 You've been invited!
            </h1>
          </div>

          <!-- Main Content -->
          <div style="background: white; padding: 30px; border-radius: 12px; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <p style="font-size: 18px; margin: 0 0 20px 0; color: #2c3e50;">
              Hello! 👋
            </p>
            <p style="font-size: 16px; margin: 0 0 20px 0; color: #34495e; line-height: 1.8;">
              <strong style="color: #667eea;">${invitedBy || 'A team member'}</strong> has invited you to join 
              <strong style="color: #764ba2;">${teamName}</strong> as a 
              <strong style="color: #667eea;">${role || 'member'}</strong>.
            </p>
            <p style="font-size: 15px; color: #7f8c8d; margin: 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #667eea; border-radius: 4px;">
              💡 Join your team to start collaborating on AI prompts and boost productivity together.
            </p>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 40px 0;">
            <a href="${link}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; 
                      padding: 18px 40px; 
                      text-decoration: none; 
                      border-radius: 10px; 
                      font-weight: 700; 
                      font-size: 16px;
                      display: inline-block;
                      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                      transition: all 0.3s ease;">
              ✨ Accept Invitation
            </a>
            <p style="margin-top: 15px; font-size: 13px; color: #95a5a6;">
              This invitation is personal and cannot be shared
            </p>
          </div>

          <!-- Link Fallback -->
          <div style="background: white; padding: 20px; border-radius: 8px; margin-top: 30px; border: 1px solid #e1e8ed;">
            <p style="font-size: 13px; color: #7f8c8d; margin: 0 0 10px 0; font-weight: 600;">
              📎 Can't click the button? Copy this link:
            </p>
            <p style="font-size: 12px; color: #3498db; word-break: break-all; margin: 0; padding: 10px; background-color: #f8f9fa; border-radius: 4px; font-family: monospace;">
              ${link}
            </p>
          </div>

          <!-- Footer -->
          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #e1e8ed;">
            <p style="font-size: 13px; color: #95a5a6; margin: 0 0 8px 0;">
              If you don't want to join this team, you can safely ignore this email.
            </p>
            <p style="font-size: 12px; color: #bdc3c7; margin: 0;">
              Sent by <strong>Prompt Teams</strong> • Powered by AI collaboration
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("✅ Email sent successfully:", emailData.id);
    
    return res.status(200).json({ 
      success: true, 
      emailId: emailData.id,
      message: "Invitation email sent successfully"
    });
    
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    
    // Provide specific error messages
    let errorMessage = "Failed to send email";
    let statusCode = 500;
    
    if (error.message?.includes("API key")) {
      errorMessage = "Invalid email service configuration";
      statusCode = 500;
    } else if (error.message?.includes("rate limit") || error.message?.includes("quota")) {
      errorMessage = "Email rate limit exceeded. Please try again later.";
      statusCode = 429;
    } else if (error.message?.includes("domain")) {
      errorMessage = "Email domain not verified";
      statusCode = 500;
    } else if (error.message?.includes("invalid") && error.message?.includes("email")) {
      errorMessage = "Invalid email address";
      statusCode = 400;
    }
    
    return res.status(statusCode).json({ 
      success: false, 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}
