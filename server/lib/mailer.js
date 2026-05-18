import nodemailer from 'nodemailer'

const SITE_URL  = process.env.SITE_URL  || 'http://localhost:5174'
const EMAIL_FROM = process.env.EMAIL_FROM || 'ALPHORA <noreply@alphora.app>'

// ── Transporter ───────────────────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,  // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// ── Check if email is configured ─────────────────────────────────────────────
export function isEmailConfigured() {
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS &&
            process.env.EMAIL_USER !== 'your@gmail.com')
}

// ── Email template wrapper ────────────────────────────────────────────────────
function htmlTemplate(title, bodyHtml) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  body { margin:0; padding:0; background:#0d1117; font-family: 'Segoe UI', Arial, sans-serif; }
  .wrap { max-width:520px; margin:40px auto; background:#161b22; border-radius:12px; overflow:hidden; border:1px solid #30363d; }
  .header { background:linear-gradient(135deg,#1a2744 0%,#0d1117 100%); padding:32px 40px; text-align:center; }
  .logo { font-size:26px; font-weight:900; color:#3b6ff5; letter-spacing:-1px; }
  .body { padding:32px 40px; color:#e6edf3; }
  h2 { margin:0 0 16px; font-size:20px; color:#e6edf3; }
  p { margin:0 0 16px; line-height:1.6; color:#8b949e; font-size:14px; }
  .btn { display:inline-block; background:#3b6ff5; color:#fff !important; text-decoration:none;
         padding:12px 28px; border-radius:8px; font-weight:700; font-size:15px; margin:8px 0 24px; }
  .small { font-size:11px; color:#484f58; margin-top:24px; border-top:1px solid #30363d; padding-top:16px; }
  .footer { padding:16px 40px; text-align:center; font-size:11px; color:#484f58; }
</style></head>
<body>
  <div class="wrap">
    <div class="header"><div class="logo">ALPHORA</div></div>
    <div class="body">
      <h2>${title}</h2>
      ${bodyHtml}
    </div>
    <div class="footer">© ${new Date().getFullYear()} ALPHORA · כל הזכויות שמורות</div>
  </div>
</body></html>`
}

// ── Send verification email ───────────────────────────────────────────────────
export async function sendVerificationEmail(to, username, token) {
  const link = `${SITE_URL}/verify-email?token=${token}`
  const html = htmlTemplate('אמת את כתובת המייל שלך', `
    <p>שלום <strong style="color:#e6edf3">${username}</strong>,</p>
    <p>תודה שנרשמת ל-ALPHORA! לחץ על הכפתור לאישור המייל:</p>
    <div style="text-align:center">
      <a href="${link}" class="btn">✅ אמת את המייל</a>
    </div>
    <p>הקישור תקף ל-24 שעות.</p>
    <p class="small">אם לא נרשמת, התעלם מהודעה זו.<br>
    או העתק את הקישור: <span style="color:#3b6ff5;word-break:break-all">${link}</span></p>
  `)

  return transporter.sendMail({
    from:    EMAIL_FROM,
    to,
    subject: 'ALPHORA — אמת את המייל שלך',
    html,
    text: `שלום ${username},\n\nאמת את המייל שלך:\n${link}\n\nהקישור תקף ל-24 שעות.`,
  })
}

// ── Send password reset email ─────────────────────────────────────────────────
export async function sendPasswordResetEmail(to, username, token) {
  const link = `${SITE_URL}/reset-password?token=${token}`
  const html = htmlTemplate('איפוס סיסמא', `
    <p>שלום <strong style="color:#e6edf3">${username}</strong>,</p>
    <p>קיבלנו בקשה לאיפוס הסיסמא שלך. לחץ על הכפתור להמשך:</p>
    <div style="text-align:center">
      <a href="${link}" class="btn">🔑 אפס סיסמא</a>
    </div>
    <p>הקישור תקף לשעה אחת בלבד.</p>
    <p class="small">לא ביקשת לאפס את הסיסמא? התעלם מהודעה זו — הסיסמא לא תשתנה.<br>
    או העתק את הקישור: <span style="color:#3b6ff5;word-break:break-all">${link}</span></p>
  `)

  return transporter.sendMail({
    from:    EMAIL_FROM,
    to,
    subject: 'ALPHORA — איפוס סיסמא',
    html,
    text: `שלום ${username},\n\nאפס את הסיסמא שלך:\n${link}\n\nהקישור תקף לשעה אחת.`,
  })
}
