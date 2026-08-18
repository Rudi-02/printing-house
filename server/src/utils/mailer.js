const nodemailer = require('nodemailer');

let transporterPromise = null;

async function getTransporter() {
  if (transporterPromise) return transporterPromise;
  transporterPromise = (async () => {
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    }
    // fallback: Ethereal test nalog (poruke se ne isporucuju, ali dobijate preview URL)
    const test = await nodemailer.createTestAccount();
    console.log('[mail] koristi se Ethereal test nalog:', test.user);
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: test.user, pass: test.pass }
    });
  })();
  return transporterPromise;
}

async function sendMail({ to, subject, html, text, attachments }) {
  try {
    const t = await getTransporter();
    const info = await t.sendMail({
      from: process.env.MAIL_FROM || 'Printing House <no-reply@printing-house.rs>',
      to, subject, text, html, attachments
    });
    const url = nodemailer.getTestMessageUrl(info);
    if (url) console.log('[mail] preview:', url);
    return info;
  } catch (e) {
    console.error('[mail] slanje nije uspelo:', e.message);
  }
}

module.exports = { sendMail };
