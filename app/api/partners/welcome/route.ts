import { NextRequest, NextResponse } from 'next/server';
import { UnifiedMailer } from '@/lib/mailer';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { email, firstName, refCode } = await req.json();

  if (!email || !refCode) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const name = firstName || 'Partner';
  const dashboardLink = `https://mrworkout.pro/partners?ref=${refCode}`;
  const refLink = `https://mrworkout.pro/?ref=${refCode}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin:0; padding:0; background:#050505; font-family:'Helvetica Neue',Arial,sans-serif; color:#e5e5e5; }
    .wrap { max-width:560px; margin:0 auto; padding:48px 24px; }
    .badge { display:inline-block; background:rgba(0,229,204,0.1); border:1px solid rgba(0,229,204,0.25); color:#00E5CC; font-size:11px; font-weight:700; letter-spacing:0.15em; text-transform:uppercase; padding:6px 14px; border-radius:99px; margin-bottom:28px; }
    h1 { font-size:28px; font-weight:900; letter-spacing:-0.02em; margin:0 0 12px; color:#fff; }
    p  { font-size:15px; line-height:1.7; color:#888; margin:0 0 24px; }
    .card { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:16px; padding:24px; margin-bottom:24px; }
    .label { font-size:10px; color:#444; text-transform:uppercase; letter-spacing:0.12em; margin-bottom:6px; }
    .value { font-family:'Courier New',monospace; font-size:15px; color:#00E5CC; font-weight:700; word-break:break-all; }
    .cta { display:block; text-align:center; background:linear-gradient(135deg,#00E5CC,#00bfa5); color:#050505; font-size:15px; font-weight:700; text-decoration:none; padding:16px 32px; border-radius:12px; margin-bottom:16px; }
    .cta-secondary { display:block; text-align:center; border:1px solid rgba(0,229,204,0.25); color:#00E5CC; font-size:14px; font-weight:700; text-decoration:none; padding:14px 32px; border-radius:12px; margin-bottom:28px; }
    .demo { background:rgba(232,121,249,0.04); border:1px solid rgba(232,121,249,0.12); border-radius:12px; padding:20px; margin-bottom:28px; }
    .demo .value { color:#e879f9; }
    .footer { font-size:11px; color:#333; text-align:center; line-height:1.8; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="badge">Partner Approved</div>

    <h1>you're in, ${name}.</h1>
    <p>bookmark this email — it's your permanent access to your partner dashboard and affiliate link.</p>

    <div class="card">
      <div class="label">Your Affiliate Link</div>
      <div class="value">${refLink}</div>
      <div style="font-size:12px;color:#444;margin-top:8px;">every signup through this link earns you 30% recurring — forever.</div>
    </div>

    <a href="${dashboardLink}" class="cta">View My Dashboard →</a>
    <a href="${refLink}" class="cta-secondary">Open Affiliate Link</a>

    <div class="demo">
      <div style="font-size:11px;color:#555;text-transform:uppercase;letter-spacing:0.12em;font-weight:700;margin-bottom:14px;">Explore the App — Demo Account</div>
      <div style="margin-bottom:10px;">
        <div class="label">Email</div>
        <div class="value">demo@mrworkout.pro</div>
      </div>
      <div>
        <div class="label">Password</div>
        <div class="value">Savage2026</div>
      </div>
    </div>

    <div class="footer">
      MR. WORKOUT · mrworkout.pro · partner program<br/>
      questions? reply to this email.
    </div>
  </div>
</body>
</html>`;

  const result = await UnifiedMailer.send(
    { to: email, subject: `you're in, ${name}. here's your partner link.`, html },
    'signup',
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
