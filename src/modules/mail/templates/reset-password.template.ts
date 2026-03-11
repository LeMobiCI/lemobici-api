export function resetPasswordTemplate(params: {
  firstName: string;
  resetUrl:  string;
  expiryMinutes: number;
}): { subject: string; html: string; text: string } {
  const { firstName, resetUrl, expiryMinutes } = params;

  const subject = 'Réinitialisation de votre mot de passe LeMobici';

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFF;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table width="560" cellpadding="0" cellspacing="0"
               style="background:#FFFFFF;border-radius:10px;
                      box-shadow:0 2px 8px rgba(0,0,0,0.08);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#1A73E8;padding:32px;text-align:center;">
              <h1 style="margin:0;color:#FFFFFF;font-size:26px;font-weight:bold;">
                LeMobici
              </h1>
              <p style="margin:6px 0 0;color:#D0E4FF;font-size:14px;">
                Plateforme de gestion locative
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 32px;">
              <p style="margin:0 0 16px;font-size:16px;color:#212121;">
                Bonjour <strong>${firstName}</strong>,
              </p>
              <p style="margin:0 0 16px;font-size:15px;color:#444;line-height:1.6;">
                Nous avons reçu une demande de réinitialisation du mot de passe
                associé à votre compte LeMobici.
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#444;line-height:1.6;">
                Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe.
                Ce lien est valable pendant <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center">
                    <a href="${resetUrl}"
                       style="display:inline-block;background:#1A73E8;color:#FFFFFF;
                              text-decoration:none;padding:14px 36px;border-radius:6px;
                              font-size:15px;font-weight:bold;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Lien texte fallback -->
              <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.6;">
                Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br/>
                <a href="${resetUrl}" style="color:#1A73E8;word-break:break-all;">
                  ${resetUrl}
                </a>
              </p>

              <hr style="margin:32px 0;border:none;border-top:1px solid #EEE;"/>

              <p style="margin:0;font-size:13px;color:#999;line-height:1.6;">
                Si vous n'êtes pas à l'origine de cette demande, ignorez simplement
                cet email. Votre mot de passe restera inchangé.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#F8FAFF;padding:20px 32px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#AAA;">
                © ${new Date().getFullYear()} LeMobici — Côte d'Ivoire<br/>
                Cet email a été envoyé automatiquement, merci de ne pas y répondre.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Bonjour ${firstName},

Nous avons reçu une demande de réinitialisation du mot de passe de votre compte LeMobici.

Cliquez sur le lien suivant pour choisir un nouveau mot de passe (valable ${expiryMinutes} minutes) :
${resetUrl}

Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

— L'équipe LeMobici
  `.trim();

  return { subject, html, text };
}
