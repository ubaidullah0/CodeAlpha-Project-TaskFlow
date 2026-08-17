const nodemailer = require('nodemailer');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { email, name, otp, smtpUser, smtpPass } = req.body;

    if (!email || !otp || !smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: `"TaskFlow" <${smtpUser}>`,
      to: email,
      subject: 'TaskFlow Password Reset Verification',
      text: `Hello ${name || 'User'},\n\nYour TaskFlow verification code is:\n\n${otp}\n\nThis code expires in 2 minutes.\nIf you did not request this, please ignore this email.`,
    });

    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('Error sending email from Vercel API:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
