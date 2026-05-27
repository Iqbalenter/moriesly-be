import nodemailer from "nodemailer";

/**
 * Create a nodemailer transporter from environment variables.
 * Supports Gmail SMTP and any generic SMTP provider
 * (Resend, Mailgun, Brevo, etc.).
 *
 * Required ENV:
 *   SMTP_HOST       – e.g. smtp.gmail.com
 *   SMTP_PORT       – e.g. 587
 *   SMTP_SECURE     – "true" / "false"  (true = port 465, false = STARTTLS)
 *   SMTP_USER       – sender email address
 *   SMTP_PASS       – password / app-password
 *   SMTP_FROM_NAME  – sender display name (optional, default "Moriesly Team")
 *   SMTP_FROM_EMAIL – from address (optional, falls back to SMTP_USER)
 */
const createTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true";
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Incomplete SMTP configuration. Make sure SMTP_HOST, SMTP_USER, and SMTP_PASS are set in .env",
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: {
      // Allow self-signed certs in development
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
};

/** Build the "From" header string */
const getSender = () => {
  const name = process.env.SMTP_FROM_NAME || "Moriesly Team";
  const email = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
  return `"${name}" <${email}>`;
};

// ─── HTML Template ────────────────────────────────────────────────────────────

/**
 * Build the waitlist ticket confirmation email HTML.
 *
 * @param {object} param
 * @param {string} param.ticketId – Ticket ID, e.g. "ABCD-12"
 * @param {string} param.email    – Recipient email address
 * @param {string} param.reason   – Registration reason
 */
const buildWaitlistEmailHtml = ({ ticketId, email, reason }) => {
  const year = new Date().getFullYear();

  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Waitlist Ticket – Moriesly</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1e293b;
    }
    a { color: #14b8a6; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background-color:#f1f5f9; padding:48px 16px;"
    role="presentation"
  >
    <tr>
      <td align="center">

        <!-- ───────────────────────── Card ───────────────────────── -->
        <table
          width="560"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:560px;
            width:100%;
            background:#ffffff;
            border-radius:24px;
            overflow:hidden;
            box-shadow:0 4px 32px rgba(0,0,0,0.08);
          "
          role="presentation"
        >

          <!-- Top accent bar -->
          <tr>
            <td
              height="5"
              style="background:linear-gradient(90deg,#0d9488 0%,#14b8a6 40%,#38bdf8 100%);"
            ></td>
          </tr>

          <!-- ── Header ── -->
          <tr>
            <td align="center" style="padding:48px 48px 36px;">

              <!-- Wordmark -->
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:28px;">
                <tr>
                  <td
                    style="
                      width: 52px;
                      height: 52px;
                      text-align: center;
                      vertical-align: middle;
                      font-size: 26px;
                      line-height: 52px;
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    "
                  ><img src="https://firebasestorage.googleapis.com/v0/b/project-cdfb53f0-89f3-4240-b91.firebasestorage.app/o/assets%2FLogo%20Moriesly%20remove%20bg.png?alt=media&token=73eb4c52-ce68-4fa5-92dc-73777aafb841" style="width: 100%; height: 100%; object-fit: contain; padding: 2px;"/></td>
                  <td style="padding-left:12px; vertical-align:middle;">
                    <p style="font-size:20px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; line-height:1;">
                      Moriesly
                    </p>
                    <p style="font-size:10px; font-weight:600; color:#14b8a6; letter-spacing:3px; text-transform:uppercase; margin-top:3px;">
                      AI Health Platform
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Badge -->
              <div style="
                display:inline-block;
                background:#f0fdf4;
                border:1px solid #86efac;
                border-radius:50px;
                padding:5px 14px;
                font-size:10px;
                font-weight:700;
                letter-spacing:3px;
                text-transform:uppercase;
                color:#16a34a;
                margin-bottom:18px;
              ">
                ✦ Registration Confirmed
              </div>

              <h1 style="
                font-size:30px;
                font-weight:900;
                color:#0f172a;
                letter-spacing:-0.8px;
                line-height:1.15;
                margin-bottom:14px;
              ">
                You're on the list! 🎉
              </h1>

              <p style="
                font-size:14px;
                color:#64748b;
                line-height:1.7;
                max-width:380px;
                margin:0 auto;
              ">
                Thank you for signing up for <strong style="color:#0f172a;">Moriesly</strong> early access.
                We'll reach out as soon as your spot is ready. Keep this email safe — it's your proof of registration.
              </p>

            </td>
          </tr>

          <!-- ── Ticket ID Box ── -->
          <tr>
            <td style="padding:0 48px 36px;">
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  background:linear-gradient(135deg,#f0fdfa 0%,#ecfeff 100%);
                  border:1.5px solid #5eead4;
                  border-radius:18px;
                "
                role="presentation"
              >
                <tr>
                  <td align="center" style="padding:28px 24px;">

                    <p style="
                      font-size:10px;
                      font-weight:700;
                      letter-spacing:4px;
                      text-transform:uppercase;
                      color:#0d9488;
                      margin-bottom:12px;
                    ">
                      🎫 &nbsp;Your Waitlist Ticket
                    </p>

                    <p style="
                      font-family:'Courier New', Courier, monospace;
                      font-size:36px;
                      font-weight:900;
                      color:#0f766e;
                      letter-spacing:8px;
                      line-height:1;
                      margin-bottom:14px;
                    ">
                      #${ticketId}
                    </p>

                    <!-- Dashed separator -->
                    <table width="200" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:0 auto 12px;">
                      <tr>
                        <td style="border-top:1.5px dashed #99f6e4; height:1px;"></td>
                      </tr>
                    </table>

                    <p style="font-size:11px; color:#5eead4; font-weight:600; letter-spacing:1px;">
                      Keep this ID as your registration reference
                    </p>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── Registration Details ── -->
          <tr>
            <td style="padding:0 48px 36px;">

              <p style="
                font-size:10px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:3px;
                color:#94a3b8;
                margin-bottom:12px;
              ">
                Registration Details
              </p>

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:14px; overflow:hidden;"
                role="presentation"
              >

                <!-- Registered Email -->
                <tr>
                  <td style="padding:16px 20px; border-bottom:1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="width:20px; font-size:16px; vertical-align:middle; line-height:1;">📧</td>
                        <td style="padding-left:12px; vertical-align:middle;">
                          <p style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#94a3b8; margin-bottom:3px;">
                            Registered Email
                          </p>
                          <p style="font-size:13px; font-weight:700; color:#1e293b;">${email}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Reason -->
                <tr>
                  <td style="padding:16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td style="width:20px; font-size:16px; vertical-align:top; padding-top:1px; line-height:1;">💬</td>
                        <td style="padding-left:12px; vertical-align:top;">
                          <p style="font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:2px; color:#94a3b8; margin-bottom:3px;">
                            Why You're Joining
                          </p>
                          <p style="font-size:13px; color:#334155; line-height:1.6;">${reason}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── What's Next ── -->
          <tr>
            <td style="padding:0 48px 36px;">

              <p style="
                font-size:10px;
                font-weight:700;
                text-transform:uppercase;
                letter-spacing:3px;
                color:#94a3b8;
                margin-bottom:16px;
              ">
                What Happens Next
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">

                <!-- Step 1 -->
                <tr>
                  <td style="vertical-align:top; width:34px; padding-bottom:16px;">
                    <div style="
                      width:30px; height:30px;
                      background:linear-gradient(135deg,#0d9488,#14b8a6);
                      border-radius:50%;
                      font-size:12px;
                      font-weight:800;
                      color:#fff;
                      text-align:center;
                      line-height:30px;
                    ">1</div>
                  </td>
                  <td style="padding-left:14px; padding-bottom:16px; vertical-align:top;">
                    <p style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:3px;">
                      Save Your Ticket ID
                    </p>
                    <p style="font-size:12px; color:#64748b; line-height:1.6;">
                      Screenshot or note down <strong style="color:#0d9488; font-family:'Courier New',monospace;">#${ticketId}</strong> — you'll need it when early access opens.
                    </p>
                  </td>
                </tr>

                <!-- Step 2 -->
                <tr>
                  <td style="vertical-align:top; width:34px; padding-bottom:16px;">
                    <div style="
                      width:30px; height:30px;
                      background:linear-gradient(135deg,#0d9488,#14b8a6);
                      border-radius:50%;
                      font-size:12px;
                      font-weight:800;
                      color:#fff;
                      text-align:center;
                      line-height:30px;
                    ">2</div>
                  </td>
                  <td style="padding-left:14px; padding-bottom:16px; vertical-align:top;">
                    <p style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:3px;">
                      Wait for Your Invitation
                    </p>
                    <p style="font-size:12px; color:#64748b; line-height:1.6;">
                      We'll send an exclusive early access invite to this email address once your slot is available.
                    </p>
                  </td>
                </tr>

                <!-- Step 3 -->
                <tr>
                  <td style="vertical-align:top; width:34px;">
                    <div style="
                      width:30px; height:30px;
                      background:linear-gradient(135deg,#0d9488,#14b8a6);
                      border-radius:50%;
                      font-size:12px;
                      font-weight:800;
                      color:#fff;
                      text-align:center;
                      line-height:30px;
                    ">3</div>
                  </td>
                  <td style="padding-left:14px; vertical-align:top;">
                    <p style="font-size:13px; font-weight:700; color:#1e293b; margin-bottom:3px;">
                      Start Your Health Journey
                    </p>
                    <p style="font-size:12px; color:#64748b; line-height:1.6;">
                      Be among the first to experience Moriesly's AI-powered health intelligence platform.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- ── CTA Button ── -->
          <tr>
            <td align="center" style="padding:0 48px 48px;">
              <a
                href="https://moriesly.com"
                style="
                  display:inline-block;
                  background:linear-gradient(135deg,#0d9488,#14b8a6);
                  color:#ffffff;
                  font-size:11px;
                  font-weight:800;
                  letter-spacing:2.5px;
                  text-transform:uppercase;
                  text-decoration:none;
                  padding:15px 40px;
                  border-radius:50px;
                  box-shadow:0 6px 24px rgba(20,184,166,0.35);
                "
              >
                Visit Moriesly &rarr;
              </a>
            </td>
          </tr>

          <!-- ── Divider ── -->
          <tr>
            <td style="padding:0 48px;">
              <div style="height:1px; background:#f1f5f9;"></div>
            </td>
          </tr>

          <!-- ── Footer ── -->
          <tr>
            <td align="center" style="padding:24px 48px 36px;">
              <p style="font-size:11px; color:#94a3b8; line-height:1.7; max-width:380px; margin:0 auto 10px;">
                You received this email because you signed up for the Moriesly waitlist at
                <a href="https://moriesly.com" style="color:#14b8a6; font-weight:600;">moriesly.com</a>.
                If you didn't register, you can safely ignore this email.
              </p>
              <p style="font-size:10px; color:#cbd5e1; font-weight:700; letter-spacing:2px; text-transform:uppercase;">
                &copy; ${year} Moriesly &middot; All rights reserved
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Send a waitlist ticket confirmation email to the user.
 *
 * @param {object} param
 * @param {string} param.toEmail  – Recipient email address
 * @param {string} param.ticketId – Waitlist ticket ID
 * @param {string} param.reason   – Registration reason
 * @returns {Promise<{ success: boolean; messageId?: string; error?: string }>}
 */
export async function sendWaitlistTicketEmail({ toEmail, ticketId, reason }) {
  try {
    const transporter = createTransporter();
    const html = buildWaitlistEmailHtml({
      ticketId,
      email: toEmail,
      reason,
    });

    const info = await transporter.sendMail({
      from: getSender(),
      to: toEmail,
      subject: `🎫 Your Waitlist Ticket: #${ticketId} – Moriesly Early Access`,
      html,
      // Plain-text fallback for clients that don't render HTML
      text: [
        `Hey there!`,
        ``,
        `Your Moriesly waitlist registration is confirmed.`,
        ``,
        `Ticket ID : #${ticketId}`,
        `Email     : ${toEmail}`,
        ``,
        `Keep this ticket ID safe — you'll need it when early access opens.`,
        `We'll send an invitation to this email address once your slot is available.`,
        ``,
        `– Moriesly Team`,
        `https://moriesly.com`,
      ].join("\n"),
    });

    console.log(
      `📧 Waitlist ticket email sent → ${toEmail} | messageId: ${info.messageId}`,
    );

    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Do NOT re-throw — let the controller return 201 even if email delivery fails
    console.error(
      `❌ Failed to send waitlist ticket email to ${toEmail}:`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

// ─── Approved Email Template ──────────────────────────────────────────────────

const buildWaitlistApprovedHtml = ({ ticketId, email, note, password }) => {
  const year = new Date().getFullYear();
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Waitlist Approved – Moriesly</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1e293b;
    }
    a { color: #14b8a6; text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f1f5f9; padding:48px 16px;" role="presentation">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);"
          role="presentation">

          <!-- Top accent bar - green -->
          <tr>
            <td height="5"
              style="background:linear-gradient(90deg,#16a34a 0%,#22c55e 50%,#4ade80 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:48px 48px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:28px;">
                <tr>
                  <td style="width:52px;height:52px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/project-cdfb53f0-89f3-4240-b91.firebasestorage.app/o/assets%2FLogo%20Moriesly%20remove%20bg.png?alt=media&token=73eb4c52-ce68-4fa5-92dc-73777aafb841"
                      style="width:100%;height:100%;object-fit:contain;" />
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <p style="font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1;">Moriesly</p>
                    <p style="font-size:10px;font-weight:600;color:#14b8a6;letter-spacing:3px;text-transform:uppercase;margin-top:3px;">AI Health Platform</p>
                  </td>
                </tr>
              </table>

              <!-- Badge approved -->
              <div style="display:inline-block;background:#f0fdf4;border:1px solid #86efac;border-radius:50px;padding:5px 14px;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#16a34a;margin-bottom:18px;">
                ✅ Waitlist Approved
              </div>

              <h1 style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.8px;line-height:1.2;margin-bottom:14px;">
                Congratulations! You're In! 🎉
              </h1>
              <p style="font-size:14px;color:#64748b;line-height:1.7;max-width:380px;margin:0 auto;">
                Great news! Your waitlist application has been <strong style="color:#16a34a;">approved</strong>.
                Welcome to the Moriesly early access program!
              </p>
            </td>
          </tr>

          <!-- Ticket Box -->
          <tr>
            <td style="padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:18px;"
                role="presentation">
                <tr>
                  <td align="center" style="padding:24px;">
                    <p style="font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#16a34a;margin-bottom:8px;">
                      🎫 Your Ticket
                    </p>
                    <p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:900;color:#15803d;letter-spacing:8px;line-height:1;">
                      #${ticketId}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${password
      ? `
          <!-- Account Details Box -->
          <tr>
            <td style="padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:linear-gradient(135deg,#f8fafc,#f1f5f9);border:1.5px solid #cbd5e1;border-radius:18px;"
                role="presentation">
                <tr>
                  <td align="center" style="padding:24px;">
                    <p style="font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#475569;margin-bottom:8px;">
                      🔐 Detail Akun Login
                    </p>
                    <p style="font-size:14px;color:#334155;margin-bottom:8px;">
                      Email: <strong>${email}</strong>
                    </p>
                    <p style="font-size:14px;color:#334155;margin-bottom:8px;">
                      Password: <strong style="font-family:monospace; font-size:18px;">${password}</strong>
                    </p>
                    <p style="font-size:11px;color:#64748b;margin-top:12px;">
                      <em>Disarankan untuk segera mengganti password Anda setelah login pertama kali.</em>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
      : ""
    }

          ${note
      ? `
          <!-- Admin Note -->
          <tr>
            <td style="padding:0 48px 32px;">
              <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#94a3b8;margin-bottom:10px;">
                Note from Admin
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #22c55e;border-radius:10px;padding:16px 20px;">
                <p style="font-size:13px;color:#334155;line-height:1.7;">${note}</p>
              </div>
            </td>
          </tr>`
      : ""
    }

          <!-- What's Next -->
          <tr>
            <td style="padding:0 48px 32px;">
              <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#94a3b8;margin-bottom:14px;">
                What Happens Next
              </p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                <tr>
                  <td style="vertical-align:top;width:34px;padding-bottom:14px;">
                    <div style="width:30px;height:30px;background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:50%;font-size:12px;font-weight:800;color:#fff;text-align:center;line-height:30px;">1</div>
                  </td>
                  <td style="padding-left:14px;vertical-align:top;padding-bottom:14px;">
                    <p style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:3px;">Check your email for access details</p>
                    <p style="font-size:12px;color:#64748b;line-height:1.6;">We'll send your login credentials and onboarding instructions shortly.</p>
                  </td>
                </tr>
                <tr>
                  <td style="vertical-align:top;width:34px;">
                    <div style="width:30px;height:30px;background:linear-gradient(135deg,#16a34a,#22c55e);border-radius:50%;font-size:12px;font-weight:800;color:#fff;text-align:center;line-height:30px;">2</div>
                  </td>
                  <td style="padding-left:14px;vertical-align:top;">
                    <p style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:3px;">Start your health journey</p>
                    <p style="font-size:12px;color:#64748b;line-height:1.6;">Be among the first to experience Moriesly's AI-powered health intelligence platform.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 48px 48px;">
              <a href="https://moriesly.com"
                style="display:inline-block;background:linear-gradient(135deg,#16a34a,#22c55e);color:#ffffff;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none;padding:15px 40px;border-radius:50px;box-shadow:0 6px 24px rgba(34,197,94,0.35);">
                Visit Moriesly &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0 48px 36px;border-top:1px solid #f1f5f9;">
              <p style="font-size:11px;color:#94a3b8;line-height:1.7;margin-top:24px;">
                &copy; ${year} Moriesly &middot; All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
};

// ─── Rejected Email Template ──────────────────────────────────────────────────

const buildWaitlistRejectedHtml = ({ ticketId, email, note }) => {
  const year = new Date().getFullYear();
  return /* html */ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Waitlist Update – Moriesly</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      color: #1e293b;
    }
    a { color: #14b8a6; text-decoration: none; }
  </style>
</head>
<body>
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background-color:#f1f5f9; padding:48px 16px;" role="presentation">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" border="0"
          style="max-width:560px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);"
          role="presentation">

          <!-- Top accent bar - slate/gray -->
          <tr>
            <td height="5"
              style="background:linear-gradient(90deg,#475569 0%,#64748b 50%,#94a3b8 100%);"></td>
          </tr>

          <!-- Header -->
          <tr>
            <td align="center" style="padding:48px 48px 32px;">
              <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:28px;">
                <tr>
                  <td style="width:52px;height:52px;">
                    <img src="https://firebasestorage.googleapis.com/v0/b/project-cdfb53f0-89f3-4240-b91.firebasestorage.app/o/assets%2FLogo%20Moriesly%20remove%20bg.png?alt=media&token=73eb4c52-ce68-4fa5-92dc-73777aafb841"
                      style="width:100%;height:100%;object-fit:contain;" />
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <p style="font-size:20px;font-weight:900;color:#0f172a;letter-spacing:-0.5px;line-height:1;">Moriesly</p>
                    <p style="font-size:10px;font-weight:600;color:#14b8a6;letter-spacing:3px;text-transform:uppercase;margin-top:3px;">AI Health Platform</p>
                  </td>
                </tr>
              </table>

              <!-- Badge -->
              <div style="display:inline-block;background:#f8fafc;border:1px solid #cbd5e1;border-radius:50px;padding:5px 14px;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#64748b;margin-bottom:18px;">
                📋 Waitlist Update
              </div>

              <h1 style="font-size:28px;font-weight:900;color:#0f172a;letter-spacing:-0.8px;line-height:1.2;margin-bottom:14px;">
                Thank You for Your Interest
              </h1>
              <p style="font-size:14px;color:#64748b;line-height:1.7;max-width:400px;margin:0 auto;">
                After reviewing your application, we're unable to offer early access at this time.
                We genuinely appreciate your interest in Moriesly.
              </p>
            </td>
          </tr>

          <!-- Ticket Box -->
          <tr>
            <td style="padding:0 48px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0"
                style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:18px;"
                role="presentation">
                <tr>
                  <td align="center" style="padding:24px;">
                    <p style="font-size:10px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#94a3b8;margin-bottom:8px;">
                      🎫 Your Ticket Reference
                    </p>
                    <p style="font-family:'Courier New',Courier,monospace;font-size:32px;font-weight:900;color:#475569;letter-spacing:8px;line-height:1;">
                      #${ticketId}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${note
      ? `
          <!-- Admin Note -->
          <tr>
            <td style="padding:0 48px 32px;">
              <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#94a3b8;margin-bottom:10px;">
                Note from Admin
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;border-radius:10px;padding:16px 20px;">
                <p style="font-size:13px;color:#334155;line-height:1.7;">${note}</p>
              </div>
            </td>
          </tr>`
      : ""
    }

          <!-- Stay Connected -->
          <tr>
            <td style="padding:0 48px 32px;">
              <div style="background:linear-gradient(135deg,#f0fdfa,#ecfeff);border:1px solid #5eead4;border-radius:14px;padding:24px;">
                <p style="font-size:13px;font-weight:700;color:#0f172a;margin-bottom:8px;">Stay Connected 🌐</p>
                <p style="font-size:12px;color:#64748b;line-height:1.7;">
                  We're continuously expanding our early access. Follow our updates at
                  <a href="https://moriesly.com" style="color:#0d9488;font-weight:600;">moriesly.com</a>
                  and you may be invited in a future batch.
                </p>
              </div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="padding:0 48px 48px;">
              <a href="https://moriesly.com"
                style="display:inline-block;background:linear-gradient(135deg,#0d9488,#14b8a6);color:#ffffff;font-size:11px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;text-decoration:none;padding:15px 40px;border-radius:50px;box-shadow:0 6px 24px rgba(20,184,166,0.35);">
                Visit Moriesly &rarr;
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:0 48px 36px;border-top:1px solid #f1f5f9;">
              <p style="font-size:11px;color:#94a3b8;line-height:1.7;margin-top:24px;">
                &copy; ${year} Moriesly &middot; All rights reserved
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
};

// ─── Send Approved Email ──────────────────────────────────────────────────────

/**
 * Kirim email notifikasi waitlist APPROVED ke user.
 * @param {object} param
 * @param {string} param.toEmail  - Recipient email
 * @param {string} param.ticketId - Waitlist ticket ID
 * @param {string|null} param.note - Catatan dari admin (opsional)
 */
export async function sendWaitlistApprovedEmail({ toEmail, ticketId, note, password }) {
  try {
    const transporter = createTransporter();
    const html = buildWaitlistApprovedHtml({ ticketId, email: toEmail, note, password });

    const info = await transporter.sendMail({
      from: getSender(),
      to: toEmail,
      subject: `🎉 You're Approved! Welcome to Moriesly Early Access – Ticket #${ticketId}`,
      html,
      text: [
        `Congratulations!`,
        ``,
        `Your waitlist application has been APPROVED.`,
        ``,
        `Ticket ID : #${ticketId}`,
        `Email     : ${toEmail}`,
        password ? `Password  : ${password}` : "",
        note ? `Note      : ${note}` : "",
        ``,
        `You can now login with the credentials above. Please change your password after logging in.`,
        `Welcome to Moriesly!`,
        ``,
        `– Moriesly Team`,
        `https://moriesly.com`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    console.log(
      `📧 Approved email sent → ${toEmail} | messageId: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(
      `❌ Failed to send approved email to ${toEmail}:`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}

// ─── Send Rejected Email ──────────────────────────────────────────────────────

/**
 * Kirim email notifikasi waitlist REJECTED ke user.
 * @param {object} param
 * @param {string} param.toEmail  - Recipient email
 * @param {string} param.ticketId - Waitlist ticket ID
 * @param {string|null} param.note - Catatan dari admin (opsional)
 */
export async function sendWaitlistRejectedEmail({ toEmail, ticketId, note }) {
  try {
    const transporter = createTransporter();
    const html = buildWaitlistRejectedHtml({ ticketId, email: toEmail, note });

    const info = await transporter.sendMail({
      from: getSender(),
      to: toEmail,
      subject: `Moriesly Waitlist Update – Ticket #${ticketId}`,
      html,
      text: [
        `Thank you for your interest in Moriesly.`,
        ``,
        `After reviewing your application, we're unable to offer early access at this time.`,
        ``,
        `Ticket ID : #${ticketId}`,
        `Email     : ${toEmail}`,
        note ? `Note      : ${note}` : "",
        ``,
        `We're continuously expanding our early access. Stay tuned at moriesly.com.`,
        ``,
        `– Moriesly Team`,
        `https://moriesly.com`,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    console.log(
      `📧 Rejected email sent → ${toEmail} | messageId: ${info.messageId}`,
    );
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(
      `❌ Failed to send rejected email to ${toEmail}:`,
      err.message,
    );
    return { success: false, error: err.message };
  }
}
