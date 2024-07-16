require("dotenv").config();

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: process.env.EMAIL_PORT || 587,
  secure: process.env?.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async (recieversList, subject, text) => {
  const info = await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: recieversList,
    subject: subject,
    text: text,
  });

  return info;
};

module.exports = { sendEmail };
