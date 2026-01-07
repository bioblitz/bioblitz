import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.zoho.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

type EmailType = "friend_request" | "WELCOME" | "STREAK_REMINDER";

// Define strict types for our data so we don't forget fields
interface EmailData {
  senderName?: string;
  senderPhotoURL?: string;
  userName?: string;
  link?: string;
}

interface EmailPayload {
  to: string;
  type: EmailType;
  data: EmailData;
}

// 🎨 THEME CONSTANTS
const COLORS = {
  background: "#f9fafb", // Very light gray
  card: "#ffffff",
  indigo: "#818cf8", // Tailwind indigo-400 (Lighter, softer)
  indigoDark: "#6366f1", // Tailwind indigo-500 (For borders)
  textMain: "#1f2937", // Gray-900
  textMuted: "#6b7280", // Gray-500
  border: "#e5e7eb", // Gray-200
};

// 🖼️ RAW SVG ICONS (Embedded for email compatibility)
const ICONS = {
  logo: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 10px;"><path d="M12 12c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0 0c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12z"/></svg>`,
  userPlus: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>`,
  sparkles: `<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L12 3Z"></path></svg>`,
};

const getEmailContent = (type: EmailType, data: EmailData) => {
  // Base wrapper for consistent styling
  const wrapHtml = (content: string, title: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .container { width: 100% !important; padding: 20px 10px !important; }
          .button { width: 100% !important; box-sizing: border-box; }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: ${COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      
<div class="container" style="max-width: 500px; margin: 40px auto; background-color: ${COLORS.card}; border-radius: 20px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05); overflow: hidden; border: 1px solid ${COLORS.border};">        
       <div style="background-color: ${COLORS.indigo}; padding: 30px 20px; text-align: center;">
          <div style="color: white; font-size: 30px; font-weight: 800; display: inline-flex; align-items: center; letter-spacing: -0.5px;">
            ${ICONS.logo} 
            <span>BioBlitz</span>
          </div>
        </div>

        <div style="padding: 40px 30px; text-align: center; color: ${COLORS.textMain};">
          ${content}
        </div>

        <div style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid ${COLORS.border};">
          <p style="margin: 0; color: ${COLORS.textMuted}; font-size: 13px; line-height: 1.5;">
            © 2026 BioBlitz. All rights reserved.<br/>
            Keep Grinding.
          </p>
        </div>
      </div>
      
    </body>
    </html>
  `;

  switch (type) {
    case "friend_request":
      const actionLink = data.link?.startsWith("http")
        ? data.link
        : `https://www.youtube.com/@Cararra${data.link || "/dashboard"}`;

      // Logic: Show Profile Pic OR Fallback Icon
      const imageSection = data.senderPhotoURL
        ? `<img src="${data.senderPhotoURL}" alt="${data.senderName}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 4px solid ${COLORS.indigo}; margin-bottom: 20px; display: inline-block;">`
        : `<div style="background-color: ${COLORS.indigo}; width: 80px; height: 80px; border-radius: 50%; display: inline-block; margin-bottom: 20px; line-height: 95px;">${ICONS.userPlus}</div>`;

      return {
        subject: `Friend Request: ${data.senderName || "Someone"}`,
        html: wrapHtml(
          `
          ${imageSection}

          <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #111827;">Friend Request</h2>
          
          <p style="font-size: 16px; line-height: 1.5; color: ${COLORS.textMain}; margin-bottom: 30px;">
            <strong style="color: ${COLORS.indigo};">${data.senderName}</strong> wants to be friends. Click below to view their profile and add them back.
          </p>
          
          <a href="${actionLink}" class="button" style="
            background-color: ${COLORS.indigo}; 
            color: white; 
            padding: 14px 30px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: 600; 
            font-size: 15px;
            display: inline-block;
            box-shadow: 0 4px 10px rgba(129, 140, 248, 0.3);
            border: 1px solid ${COLORS.indigoDark};
          ">
            View Profile
          </a>
        `,
          "Friend Request"
        ),
      };

    case "WELCOME":
      return {
        subject: "Welcome to BioBlitz",
        html: wrapHtml(
          `
          <div style="background-color: ${COLORS.indigo}; width: 80px; height: 80px; border-radius: 50%; display: inline-block; margin-bottom: 24px; line-height: 95px;">
             ${ICONS.sparkles}
          </div>

          <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #111827;">Welcome, ${data.userName}!</h2>
          
          <p style="font-size: 16px; line-height: 1.5; color: ${COLORS.textMain}; margin-bottom: 30px;">
            Your account is ready. Good luck with your studies.
          </p>
          
          <a href="https://bioblitz.com/dashboard" class="button" style="
            background-color: ${COLORS.indigo}; 
            color: white; 
            padding: 14px 30px; 
            text-decoration: none; 
            border-radius: 50px; 
            font-weight: 600; 
            font-size: 15px;
            display: inline-block;
            box-shadow: 0 4px 10px rgba(129, 140, 248, 0.3);
            border: 1px solid ${COLORS.indigoDark};
          ">
            Start Quiz
          </a>
        `,
          "Welcome"
        ),
      };

    default:
      throw new Error("Invalid email type");
  }
};
export async function sendNotificationEmail({ to, type, data }: EmailPayload) {
  // Debug log to see incoming data
  console.log(`📧 Preparing email [${type}] for ${to}`);
  if (data.senderPhotoURL)
    console.log(
      `📸 Photo URL provided: ${data.senderPhotoURL.substring(0, 30)}...`
    );

  const { subject, html } = getEmailContent(type, data);

  try {
    await transporter.sendMail({
      from: `"BioBlitz" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return { success: true };
  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
}
