const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOTPEmail(toEmail, otp) {
  const mailOptions = {
    from: `"Auth System" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: 'Your OTP Code',
    text: `Your 6-digit OTP is: ${otp}. It will expire in 5 minutes.`,
  };

  return await transporter.sendMail(mailOptions);
}

module.exports = { sendOTPEmail };