const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
    }
});

const sendEmail = async ({ to, subject, text, html }) => {

    if (!to) {
        return;
    }

    await transporter.sendMail({
        from: `"${process.env.MAIL_FROM_NAME || "Event Management System"}" <${process.env.MAIL_USER}>`,
        to,
        subject,
        text,
        html
    });

};

module.exports = sendEmail;