// Service email — alertes d'expiration + emails de bienvenue
import { createTransport } from 'nodemailer';
import logger from '../utils/logger';

interface TenantAlert {
  nomEntreprise: string;
  dateExpiration: Date | null;
}

const isConfigured = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = isConfigured
  ? createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

function formatDate(d: Date | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export const emailService = {
  async sendExpirationAlerts(tenantsJ30: TenantAlert[], tenantsJ7: TenantAlert[]): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!adminEmail) {
      logger.warn('[EMAIL] ADMIN_EMAIL non configuré — alertes non envoyées');
      return;
    }
    if (!transporter) {
      logger.warn('[EMAIL] SMTP non configuré — alertes non envoyées');
      tenantsJ7.forEach(t => logger.warn(`[EMAIL] ALERTE J-7: ${t.nomEntreprise} expire le ${formatDate(t.dateExpiration)}`));
      tenantsJ30.forEach(t => logger.warn(`[EMAIL] ALERTE J-30: ${t.nomEntreprise} expire le ${formatDate(t.dateExpiration)}`));
      return;
    }

    const lignesJ7 = tenantsJ7.map(t =>
      `<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#222"><strong>${t.nomEntreprise}</strong></td><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#E53935;font-weight:bold">${formatDate(t.dateExpiration)}</td></tr>`
    ).join('');

    const lignesJ30 = tenantsJ30.filter(t =>
      !tenantsJ7.find(j7 => j7.nomEntreprise === t.nomEntreprise)
    ).map(t =>
      `<tr><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#222"><strong>${t.nomEntreprise}</strong></td><td style="padding:10px 14px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#e67e22;font-weight:bold">${formatDate(t.dateExpiration)}</td></tr>`
    ).join('');

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

        <!-- Header Innosoft Creation -->
        <tr>
          <td style="background:#E53935;padding:24px 32px 18px;">
            <p style="margin:0;color:rgba(255,255,255,0.80);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">&lt;/&gt; Innosoft Creation</p>
            <h1 style="margin:10px 0 4px;color:#ffffff;font-size:22px;font-weight:800;">Alertes d'expiration d'abonnements</h1>
            <p style="margin:0;color:rgba(255,255,255,0.80);font-size:13px;">${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
          </td>
        </tr>

        <!-- Bandeau récap -->
        <tr>
          <td style="background:#222;padding:10px 32px;">
            <p style="margin:0;color:#fff;font-size:13px;">${tenantsJ7.length + tenantsJ30.length} abonnement(s) nécessitent votre attention</p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:28px 32px;">

            ${tenantsJ7.length > 0 ? `
            <!-- Urgence J-7 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td style="padding-bottom:10px;">
                  <span style="display:inline-block;background:#fff0f0;color:#E53935;font-weight:bold;font-size:13px;padding:5px 12px;border-radius:20px;border:1px solid #ffcdd2;">Expiration dans moins de 7 jours</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ffcdd2;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#fff0f0;">
                  <th style="padding:10px 14px;text-align:left;font-size:13px;color:#E53935;font-weight:bold;">Agence</th>
                  <th style="padding:10px 14px;text-align:left;font-size:13px;color:#E53935;font-weight:bold;">Date d'expiration</th>
                </tr>
              </thead>
              <tbody>${lignesJ7}</tbody>
            </table>` : ''}

            ${lignesJ30 ? `
            <!-- Attention J-30 -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
              <tr>
                <td style="padding-bottom:10px;">
                  <span style="display:inline-block;background:#fff8f0;color:#e67e22;font-weight:bold;font-size:13px;padding:5px 12px;border-radius:20px;border:1px solid #ffe0b2;">Expiration dans moins de 30 jours</span>
                </td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #ffe0b2;border-radius:8px;overflow:hidden;margin-bottom:24px;">
              <thead>
                <tr style="background:#fff8f0;">
                  <th style="padding:10px 14px;text-align:left;font-size:13px;color:#e67e22;font-weight:bold;">Agence</th>
                  <th style="padding:10px 14px;text-align:left;font-size:13px;color:#e67e22;font-weight:bold;">Date d'expiration</th>
                </tr>
              </thead>
              <tbody>${lignesJ30}</tbody>
            </table>` : ''}

            <p style="margin:8px 0 0;font-size:13px;color:#999;">Connectez-vous au panel Innosoft Creation pour renouveler ces abonnements.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#222;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa;">&lt;/&gt; <strong style="color:#fff;">Innosoft Creation</strong> — innosft.com</p>
            <p style="margin:6px 0 0;font-size:11px;color:#666;">Cet email a été généré automatiquement. Merci de ne pas y répondre directement.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Innosoft Creation" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `${tenantsJ7.length + tenantsJ30.length} abonnement(s) expirent bientôt — Innosoft Creation`,
        html,
      });
      logger.info(`[EMAIL] Alertes envoyées à ${adminEmail}`);
    } catch (err) {
      logger.error('[EMAIL] Erreur envoi:', err);
    }
  },

  async sendWelcomeEmail(params: {
    adminEmail: string;
    adminPrenom: string;
    adminNom: string;
    nomEntreprise: string;
    motDePasseTemporaire: string;
    loginUrl: string;
  }): Promise<void> {
    if (!transporter) {
      logger.warn(`[EMAIL] SMTP non configuré — email de bienvenue non envoyé pour ${params.nomEntreprise}`);
      return;
    }
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

        <!-- Header Innosoft Creation -->
        <tr>
          <td style="background:#E53935;padding:28px 32px 20px;">
            <p style="margin:0;color:rgba(255,255,255,0.80);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">&lt;/&gt; Innosoft Creation</p>
            <h1 style="margin:10px 0 4px;color:#ffffff;font-size:24px;font-weight:800;">Votre espace de gestion est prêt</h1>
            <p style="margin:0;color:rgba(255,255,255,0.85);font-size:14px;">Plateforme de location de véhicules</p>
          </td>
        </tr>

        <!-- Bandeau tenant -->
        <tr>
          <td style="background:#222;padding:10px 32px;">
            <p style="margin:0;color:#fff;font-size:13px;">Compte créé pour : <strong style="color:#ff6b6b;">${params.nomEntreprise}</strong></p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;">Bonjour <strong>${params.adminPrenom} ${params.adminNom}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Votre compte administrateur <strong>${params.nomEntreprise}</strong> a été créé avec succès sur notre plateforme de gestion de location de véhicules. Vous pouvez dès maintenant vous connecter et configurer votre espace.
            </p>

            <!-- Bloc identifiants -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;border:1px solid #e0e0e0;border-left:4px solid #E53935;border-radius:0 8px 8px 0;margin:0 0 24px;">
              <tr>
                <td style="padding:20px 24px;">
                  <p style="margin:0 0 12px;font-weight:bold;color:#222;font-size:14px;">Vos identifiants de connexion :</p>
                  <p style="margin:6px 0;font-size:14px;color:#333;">📧 <strong>Email :</strong> <a href="mailto:${params.adminEmail}" style="color:#E53935;">${params.adminEmail}</a></p>
                  <p style="margin:6px 0;font-size:14px;color:#333;">🔑 <strong>Mot de passe :</strong>
                    <code style="background:#fff0f0;color:#E53935;padding:3px 10px;border-radius:4px;font-size:15px;font-weight:bold;border:1px solid #ffcdd2;">${params.motDePasseTemporaire}</code>
                  </p>
                </td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="text-align:center;margin:28px 0;">
              <a href="${params.loginUrl}" style="display:inline-block;background:#E53935;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.5px;">
                Accéder à mon espace
              </a>
            </div>

            <!-- Avertissement sécurité -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:1px solid #ffcdd2;border-radius:8px;">
              <tr>
                <td style="padding:14px 18px;font-size:13px;color:#c62828;line-height:1.5;">
                  <strong>Important :</strong> Pour votre sécurité, veuillez changer ce mot de passe dès votre première connexion dans <em>Paramètres → Mon compte</em>.
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#999;">
              En cas de problème, contactez le support Innosoft Creation à <a href="mailto:innosoftcreation@gmail.com" style="color:#E53935;">innosoftcreation@gmail.com</a>
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#222;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa;">&lt;/&gt; <strong style="color:#fff;">Innosoft Creation</strong> — innosft.com</p>
            <p style="margin:6px 0 0;font-size:11px;color:#666;">Cet email a été généré automatiquement. Merci de ne pas y répondre directement.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Innosoft Creation" <${process.env.SMTP_USER}>`,
        to: params.adminEmail,
        subject: `Bienvenue — Votre espace ${params.nomEntreprise} est prêt`,
        html,
      });
      logger.info(`[EMAIL] Bienvenue envoyé à ${params.adminEmail}`);
    } catch (err) {
      logger.error('[EMAIL] Erreur envoi bienvenue:', err);
    }
  },

  async sendResetPasswordEmail(params: {
    to: string;
    prenom: string;
    nom: string;
    resetUrl: string;
  }): Promise<void> {
    if (!transporter) {
      logger.warn(`[EMAIL] SMTP non configuré — reset password non envoyé pour ${params.to}`);
      return;
    }
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">

        <tr>
          <td style="background:#E53935;padding:24px 32px 18px;">
            <p style="margin:0;color:rgba(255,255,255,0.80);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">&lt;/&gt; Innosoft Creation</p>
            <h1 style="margin:10px 0 4px;color:#ffffff;font-size:22px;font-weight:800;">Réinitialisation de mot de passe</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;color:#333;">Bonjour <strong>${params.prenom} ${params.nom}</strong>,</p>
            <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe.
            </p>

            <div style="text-align:center;margin:28px 0;">
              <a href="${params.resetUrl}" style="display:inline-block;background:#E53935;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:bold;font-size:15px;letter-spacing:0.5px;">
                Réinitialiser mon mot de passe
              </a>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0" style="background:#fff8f8;border:1px solid #ffcdd2;border-radius:8px;">
              <tr>
                <td style="padding:14px 18px;font-size:13px;color:#c62828;line-height:1.5;">
                  <strong>Important :</strong> Ce lien est valable <strong>1 heure</strong>. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                </td>
              </tr>
            </table>

            <p style="margin:24px 0 0;font-size:13px;color:#999;">
              En cas de problème, contactez le support à <a href="mailto:innosoftcreation@gmail.com" style="color:#E53935;">innosoftcreation@gmail.com</a>
            </p>
          </td>
        </tr>

        <tr>
          <td style="background:#222;padding:18px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa;">&lt;/&gt; <strong style="color:#fff;">Innosoft Creation</strong> — innosft.com</p>
            <p style="margin:6px 0 0;font-size:11px;color:#666;">Cet email a été généré automatiquement. Merci de ne pas y répondre directement.</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Innosoft Creation" <${process.env.SMTP_USER}>`,
        to: params.to,
        subject: 'Réinitialisation de votre mot de passe',
        html,
      });
      logger.info(`[EMAIL] Reset password envoyé à ${params.to}`);
    } catch (err) {
      logger.error('[EMAIL] Erreur envoi reset password:', err);
    }
  },

  async sendExpirationNotice(tenant: TenantAlert): Promise<void> {
    const adminEmail = process.env.ADMIN_EMAIL;
    if (!transporter || !adminEmail) return;
    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Innosoft Creation" <${process.env.SMTP_USER}>`,
        to: adminEmail,
        subject: `Abonnement expiré — ${tenant.nomEntreprise} désactivé automatiquement`,
        html: `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.10);">
        <tr>
          <td style="background:#E53935;padding:22px 28px 16px;">
            <p style="margin:0;color:rgba(255,255,255,0.80);font-size:12px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;">&lt;/&gt; Innosoft Creation</p>
            <h1 style="margin:8px 0 4px;color:#fff;font-size:20px;font-weight:800;">Abonnement expiré — Désactivation automatique</h1>
          </td>
        </tr>
        <tr>
          <td style="background:#222;padding:10px 28px;">
            <p style="margin:0;color:#fff;font-size:13px;">Agence concernée : <strong style="color:#ff6b6b;">${tenant.nomEntreprise}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px;">
            <p style="margin:0 0 16px;font-size:14px;color:#333;line-height:1.6;">
              Le compte <strong>${tenant.nomEntreprise}</strong> a été automatiquement désactivé car son abonnement a expiré le <strong style="color:#E53935;">${formatDate(tenant.dateExpiration)}</strong>.
            </p>
            <p style="margin:0;font-size:13px;color:#666;">Pour réactiver ce compte, renouvelez l'abonnement depuis le panel Innosoft Creation.</p>
          </td>
        </tr>
        <tr>
          <td style="background:#222;padding:16px 28px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#aaa;">&lt;/&gt; <strong style="color:#fff;">Innosoft Creation</strong> — innosft.com</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
      });
    } catch (err) {
      logger.error('[EMAIL] Erreur envoi notice expiration:', err);
    }
  },

};
