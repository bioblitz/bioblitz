const SITE = process.env.NEXT_PUBLIC_SITE_URL || "bioblitz.net";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatSendDate(): string {
  const d = new Date();
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];
  return ` ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function generateNewsletterNotificationEmail(
  username: string,
  issueNumber: number,
  unsubscribeUid?: string,
): string {
  const newsletterUrl = `${SITE}/weekly-newsletter/${issueNumber}?uid=${unsubscribeUid}`;
  const unsubscribeUrl = unsubscribeUid
    ? `${SITE}/settings?unsubscribe=${unsubscribeUid}`
    : `${SITE}/settings`;

  const displayName = username || "there";
  const sendDate = formatSendDate();

  const f =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  const mono = "'Courier New',Courier,monospace";

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<meta name="x-apple-disable-message-reformatting"/>
<meta name="color-scheme" content="dark"/>
<meta name="supported-color-schemes" content="dark"/>
<title>BioBlitz Weekly &middot; Issue #${issueNumber}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<![endif]-->
<style>
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none;}
  body{margin:0!important;padding:0!important;width:100%!important;background-color:#09090b;}
  :root{color-scheme:dark;supported-color-schemes:dark;}
  u+.body{background-color:#09090b!important;}
  .ii a[href]{color:inherit!important;}
  @media only screen and (max-width:600px){
    .email-container{width:100%!important;padding:16px!important;}
    .card{padding:32px 24px!important;}
    .heading{font-size:28px!important;}
    .cta-btn{padding:14px 28px!important;}
  }
</style>
</head>

<body class="body" style="margin:0;padding:0;background-color:#09090b;-webkit-font-smoothing:antialiased;">

<!-- Preview text -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#09090b;">
  Your weekly BioBlitz briefing just dropped — new stats, top players &amp; personalized recommendations inside.
  &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847;
  &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847;
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#09090b;">
<tr>
<td align="center" style="padding:40px 16px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" class="email-container" style="max-width:520px;width:100%;">

    <!-- Card -->
    <tr>
    <td class="card" align="center" style="background-color:#09090b;
;border:1px solid rgba(250,204,21,0.25);border-radius:24px;padding:48px 40px 18px;">

      <!-- Date badge -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="background-color:rgba(250,204,21,0.1);border:1px solid rgba(250,204,21,0.22);border-radius:100px;padding:6px 18px;font-family:Verdana,Geneva,sans-serif;font-size:11px;font-weight:bold;letter-spacing:1px;color:#facc15;">
            ${sendDate}
          </td>
        </tr>
      </table>

      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:28px;line-height:28px;font-size:1px;">&nbsp;</td></tr>
      </table>

      <!-- Mail emoji -->
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center">
            <img src="${SITE}/images/mail.png" width="80" height="80" alt="" style="display:block;" />
          </td>
        </tr>
      </table>


      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:12px;line-height:12px;font-size:1px;">&nbsp;</td></tr>
      </table>


      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:24px;line-height:24px;font-size:1px;">&nbsp;</td></tr>
      </table>

      <!-- Heading -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" class="heading" style="font-family:Georgia,'Times New Roman',serif;font-size:34px;font-weight:bold;line-height:1.2;color:#ffffff;">
            Hi @${esc(displayName)}!
            </td>

        </tr>
      </table>

      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:12px;line-height:12px;font-size:1px;">&nbsp;</td></tr>
      </table>

      <!-- Subtext -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="font-family:Verdana,Geneva,sans-serif;font-size:16px;line-height:1.65;color:#a1a1aa;padding:0 12px;">
            Your weekly BioBlitz newsletter is here! Click below for new stats, top players, personalized Blitz recommendations, and&nbsp;more.
          </td>
        </tr>
      </table>

      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:15px;line-height:15px;font-size:1px;">&nbsp;</td></tr>
      </table>

      <!-- CTA Button -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
        <tr>
          <td align="center" style="border-radius:14px;background-color:#facc15;">
            <a href="${newsletterUrl}" target="_blank" class="cta-btn" style="display:inline-block;font-family:${f};font-size:16px;font-weight:800;color:#09090b;text-decoration:none;padding:16px 36px;border-radius:14px;">
              View Newsletter&nbsp;&nbsp;&#8594;
            </a>
          </td>
        </tr>
      </table>

      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:20px;line-height:20px;font-size:1px;">&nbsp;</td></tr>
      </table>

      <!-- Divider -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td style="border-top:1px solid rgba(250,204,21,0.08);height:1px;line-height:1px;font-size:1px;">&nbsp;</td>
        </tr>
      </table>

      <!-- Spacer -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr><td style="height:8px;line-height:8px;font-size:1px;">&nbsp;</td></tr>
      </table>

     <!-- Footer logo: favicon + BioBlitz wordmark -->
<!-- Footer logo: favicon + BioBlitz wordmark -->
      <!-- Footer: icon + copyright -->
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td align="center" style="padding-bottom:12px;">
            <div style="width:36px;height:36px;background-color:rgba(245,197,24,0.15);border-radius:9999px;text-align:center;line-height:36px;">
              <img src="${SITE}/icons/favicon.ico" width="20" height="20" alt="BioBlitz" style="display:inline-block;vertical-align:middle;"/>
            </div>
          </td>
        </tr>
        <tr>
          <td align="center" style="font-family:${f};font-size:13px;color:#52525b;line-height:1.6;">
            &copy; ${new Date().getFullYear()} BioBlitz. All rights reserved.
          </td>
        </tr>
      </table>
     

    </td>
    </tr>

   

  </table>

</td>
</tr>
</table>

</body>
</html>`;
}
