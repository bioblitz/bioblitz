// app/api/report/route.ts
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { reportedUser, reporterUser, category, description, url } =
      await req.json();

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"BioBlitz Security" <${process.env.EMAIL_USER}>`,
      to: "dipishasubedi@gmail.com,aarnavsuwal@gmail.com,elijah.feldman.sunshine.123@gmail.com,admin@bioblitz.net",
      subject: `🚨 Report: ${reportedUser} (${category})`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f5;">
          <div style="background-color: #ffffff; padding: 24px; border-radius: 12px; border: 1px solid #e4e4e7;">
            <h2 style="color: #ef4444; margin-top: 0;">New User Report</h2>
            <p><strong>Reported User:</strong> ${reportedUser}</p>
            <p><strong>Reported By:</strong> ${reporterUser}</p>
            <p><strong>Category:</strong> ${category}</p>
            <p><strong>Link:</strong> <a href="${url}">${url}</a></p>
            <hr style="border: 0; border-top: 1px solid #e4e4e7; margin: 20px 0;" />
            <blockquote style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 0;">
              "${description}"
            </blockquote>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Zoho SMTP Error:", error);
    return NextResponse.json(
      { error: "Failed to send email." },
      { status: 500 }
    );
  }
}
