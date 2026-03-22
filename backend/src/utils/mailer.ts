// Utilitaire d'envoi d'emails — notifications réservations vitrine
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true', // true = SSL/TLS (port 465), false = STARTTLS (port 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface DemandeReservationMailData {
  numeroReservation: string;
  nomEntreprise: string;
  couleurPrimaire: string;   // Couleur principale du tenant (ex: "#1B5E20")
  couleurSecondaire: string; // Couleur secondaire du tenant (ex: "#F9A825")
  client: { prenom: string; nom: string; telephone: string; email?: string };
  vehicule: { marque: string; modele: string };
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  prixTotal: number;
  lieuPriseEnCharge: string;
  typeTrajet: string;
  notes?: string;
  backofficeUrl?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function sendNotifNouvelleReservation(
  data: DemandeReservationMailData,
  to: string  // Email de l'admin du tenant — passé dynamiquement depuis le controller
): Promise<void> {
  if (!to || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // SMTP non configuré ou pas d'admin — notification ignorée silencieusement
    return;
  }

  const {
    numeroReservation,
    nomEntreprise,
    couleurPrimaire,
    couleurSecondaire,
    client,
    vehicule,
    dateDebut,
    dateFin,
    nombreJours,
    prixTotal,
    lieuPriseEnCharge,
    typeTrajet,
    notes,
    backofficeUrl,
  } = data;

  const ctaUrl = backofficeUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reservations`;
  const cp = couleurPrimaire || '#1B5E20';
  const cs = couleurSecondaire || '#F9A825';

  const subject = `[${nomEntreprise}] Nouvelle demande — ${numeroReservation} — ${client.prenom} ${client.nom}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${cp};padding:24px 32px;">
            <p style="margin:0;color:${cs};font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">${nomEntreprise}</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Nouvelle demande de réservation</h1>
          </td>
        </tr>

        <!-- Référence -->
        <tr>
          <td style="background:${cs};padding:12px 32px;">
            <p style="margin:0;color:${cp};font-size:15px;font-weight:bold;">Référence : ${numeroReservation}</p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- Client -->
            <h2 style="margin:0 0 12px;color:${cp};font-size:16px;border-bottom:2px solid ${cs};padding-bottom:6px;">Client</h2>
            <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#333;">
              <tr><td style="color:#666;width:40%;">Nom</td><td><strong>${client.prenom} ${client.nom}</strong></td></tr>
              <tr><td style="color:#666;">Téléphone</td><td><a href="tel:${client.telephone}" style="color:${cp};">${client.telephone}</a></td></tr>
              ${client.email ? `<tr><td style="color:#666;">Email</td><td><a href="mailto:${client.email}" style="color:${cp};">${client.email}</a></td></tr>` : ''}
            </table>

            <!-- Véhicule & dates -->
            <h2 style="margin:24px 0 12px;color:${cp};font-size:16px;border-bottom:2px solid ${cs};padding-bottom:6px;">Location</h2>
            <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#333;">
              <tr><td style="color:#666;width:40%;">Véhicule</td><td><strong>${vehicule.marque} ${vehicule.modele}</strong></td></tr>
              <tr><td style="color:#666;">Début</td><td>${formatDate(dateDebut)}</td></tr>
              <tr><td style="color:#666;">Fin</td><td>${formatDate(dateFin)}</td></tr>
              <tr><td style="color:#666;">Durée</td><td>${nombreJours} jour${nombreJours > 1 ? 's' : ''}</td></tr>
              <tr><td style="color:#666;">Lieu prise en charge</td><td>${lieuPriseEnCharge}</td></tr>
              <tr><td style="color:#666;">Type de trajet</td><td>${typeTrajet}</td></tr>
              ${notes ? `<tr><td style="color:#666;vertical-align:top;">Notes</td><td style="white-space:pre-wrap;">${notes}</td></tr>` : ''}
            </table>

            <!-- Prix estimé -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:16px;">
              <tr>
                <td style="font-size:14px;color:#666;">Prix total estimé</td>
                <td align="right" style="font-size:22px;font-weight:bold;color:${cp};">${prixTotal.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="margin-top:28px;text-align:center;">
              <a href="${ctaUrl}" style="display:inline-block;background:${cp};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">
                Voir dans le back-office →
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f4;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">${nomEntreprise}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#bbb;">Cet email a été généré automatiquement par le système de réservation en ligne.<br/>Propulsé par <strong>SenLocaDesk</strong> — Innosoft Creation</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Nouvelle demande de réservation — ${numeroReservation}
Client : ${client.prenom} ${client.nom} | ${client.telephone}
Véhicule : ${vehicule.marque} ${vehicule.modele}
Du ${formatDate(dateDebut)} au ${formatDate(dateFin)} (${nombreJours} jour${nombreJours > 1 ? 's' : ''})
Lieu : ${lieuPriseEnCharge}
Prix estimé : ${prixTotal.toLocaleString('fr-FR')} FCFA
${notes ? `Notes : ${notes}` : ''}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"${nomEntreprise}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}

// ─── Email de confirmation de réservation → client ────────────────────────

interface ConfirmationClientMailData {
  numeroReservation: string;
  nomEntreprise: string;
  couleurPrimaire: string;
  couleurSecondaire: string;
  telephoneAgence: string;
  adresseAgence: string;
  client: { prenom: string; nom: string; email: string };
  vehicule: { marque: string; modele: string };
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  prixTotal: number;
  lieuPriseEnCharge: string;
  typeTrajet: string;
  notes?: string;
}

export async function sendConfirmationClient(data: ConfirmationClientMailData): Promise<void> {
  if (!data.client.email || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const { numeroReservation, nomEntreprise, couleurPrimaire: cp, couleurSecondaire: cs,
    telephoneAgence, adresseAgence, client, vehicule, dateDebut, dateFin,
    nombreJours, prixTotal, lieuPriseEnCharge, typeTrajet, notes } = data;

  const subject = `[${nomEntreprise}] Votre réservation ${numeroReservation} est confirmée ✓`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:${cp};padding:24px 32px;">
            <p style="margin:0;color:${cs};font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">${nomEntreprise}</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Réservation confirmée ✓</h1>
          </td>
        </tr>

        <!-- Référence -->
        <tr>
          <td style="background:${cs};padding:12px 32px;">
            <p style="margin:0;color:${cp};font-size:15px;font-weight:bold;">Référence : ${numeroReservation}</p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:28px 32px;">

            <p style="font-size:15px;color:#333;margin:0 0 20px;">
              Bonjour <strong>${client.prenom}</strong>,<br/>
              Votre réservation a été <strong style="color:${cp};">confirmée</strong>. Voici le récapitulatif :
            </p>

            <!-- Détails location -->
            <h2 style="margin:0 0 12px;color:${cp};font-size:16px;border-bottom:2px solid ${cs};padding-bottom:6px;">Détails de la location</h2>
            <table width="100%" cellpadding="5" cellspacing="0" style="font-size:14px;color:#333;">
              <tr><td style="color:#666;width:42%;">Véhicule</td><td><strong>${vehicule.marque} ${vehicule.modele}</strong></td></tr>
              <tr><td style="color:#666;">Date de début</td><td>${formatDate(dateDebut)}</td></tr>
              <tr><td style="color:#666;">Date de fin</td><td>${formatDate(dateFin)}</td></tr>
              <tr><td style="color:#666;">Durée</td><td>${nombreJours} jour${nombreJours > 1 ? 's' : ''}</td></tr>
              <tr><td style="color:#666;">Lieu de récupération</td><td>${lieuPriseEnCharge}</td></tr>
              <tr><td style="color:#666;">Type de trajet</td><td>${typeTrajet}</td></tr>
              ${notes ? `<tr><td style="color:#666;vertical-align:top;">Notes</td><td style="white-space:pre-wrap;">${notes}</td></tr>` : ''}
            </table>

            <!-- Prix -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;background:#f9f9f9;border:1px solid #e0e0e0;border-radius:6px;padding:16px;">
              <tr>
                <td style="font-size:14px;color:#666;">Montant total</td>
                <td align="right" style="font-size:22px;font-weight:bold;color:${cp};">${prixTotal.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            </table>

            <!-- Contact agence -->
            <h2 style="margin:24px 0 12px;color:${cp};font-size:16px;border-bottom:2px solid ${cs};padding-bottom:6px;">Contact agence</h2>
            <table width="100%" cellpadding="5" cellspacing="0" style="font-size:14px;color:#333;">
              ${adresseAgence ? `<tr><td style="color:#666;width:42%;">Adresse</td><td>${adresseAgence}</td></tr>` : ''}
              ${telephoneAgence ? `<tr><td style="color:#666;">Téléphone</td><td><a href="tel:${telephoneAgence}" style="color:${cp};">${telephoneAgence}</a></td></tr>` : ''}
            </table>

            <p style="margin-top:24px;font-size:13px;color:#888;">
              Pour toute question, contactez-nous par téléphone ou répondez à cet email.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f4;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">${nomEntreprise}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#bbb;">Propulsé par <strong>SenLocaDesk</strong> — Innosoft Creation</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"${nomEntreprise}" <${process.env.SMTP_USER}>`,
    to: data.client.email,
    subject,
    text: `Réservation ${numeroReservation} confirmée\nVéhicule : ${vehicule.marque} ${vehicule.modele}\nDu ${formatDate(dateDebut)} au ${formatDate(dateFin)}\nLieu : ${lieuPriseEnCharge}\nMontant : ${prixTotal.toLocaleString('fr-FR')} FCFA\nContact : ${telephoneAgence}`,
    html,
  });
}

// ─── Email d'annulation de réservation → client ───────────────────────────

export async function sendAnnulationClient(data: {
  numeroReservation: string;
  nomEntreprise: string;
  couleurPrimaire: string;
  couleurSecondaire: string;
  telephoneAgence: string;
  client: { prenom: string; email: string };
  vehicule: { marque: string; modele: string };
  dateDebut: string;
}): Promise<void> {
  if (!data.client.email || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const { numeroReservation, nomEntreprise, couleurPrimaire: cp,
    telephoneAgence, client, vehicule, dateDebut } = data;

  const subject = `[${nomEntreprise}] Réservation ${numeroReservation} annulée`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background:#b91c1c;padding:24px 32px;">
          <p style="margin:0;color:rgba(255,255,255,.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;">${nomEntreprise}</p>
          <h1 style="margin:8px 0 0;color:#fff;font-size:22px;">Réservation annulée</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="font-size:15px;color:#333;margin:0 0 16px;">
            Bonjour <strong>${client.prenom}</strong>,<br/>
            Votre réservation <strong>${numeroReservation}</strong> pour le <strong>${vehicule.marque} ${vehicule.modele}</strong>
            prévue le ${formatDate(dateDebut)} a été annulée.
          </p>
          <p style="font-size:14px;color:#666;margin:0;">
            Pour en savoir plus ou faire une nouvelle réservation, contactez-nous${telephoneAgence ? ` au <a href="tel:${telephoneAgence}" style="color:${cp};">${telephoneAgence}</a>` : ''}.
          </p>
        </td></tr>
        <tr><td style="background:#f4f4f4;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:12px;color:#bbb;">Propulsé par <strong>SenLocaDesk</strong> — Innosoft Creation</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"${nomEntreprise}" <${process.env.SMTP_USER}>`,
    to: data.client.email,
    subject,
    text: `Réservation ${numeroReservation} annulée.\nVéhicule : ${vehicule.marque} ${vehicule.modele} — ${formatDate(dateDebut)}.\nContact : ${telephoneAgence}`,
    html,
  });
}

// ─── Email de contact depuis la landing page ───────────────────────────────

export interface ContactFormData {
  prenom: string;
  nom: string;
  email: string;
  telephone?: string;
  agence?: string;
  flotte?: string;
  message?: string;
}

export async function sendContactFormEmail(data: ContactFormData): Promise<void> {
  const to = process.env.CONTACT_EMAIL || process.env.SMTP_USER;
  if (!to || !process.env.SMTP_USER || !process.env.SMTP_PASS) return;

  const { prenom, nom, email, telephone, agence, flotte, message } = data;

  const subject = `[ASM Location] Nouvelle demande — ${prenom} ${nom}`;

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.09);">

        <tr>
          <td style="background:#2563eb;padding:24px 32px;">
            <p style="margin:0;color:rgba(255,255,255,.7);font-size:12px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">ASM Location · Essai gratuit</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Nouvelle demande de contact</h1>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 32px;">
            <h2 style="margin:0 0 14px;color:#2563eb;font-size:15px;border-bottom:2px solid #eff6ff;padding-bottom:6px;">Coordonnées</h2>
            <table width="100%" cellpadding="5" cellspacing="0" style="font-size:14px;color:#334155;">
              <tr><td style="color:#64748b;width:38%;">Nom</td><td><strong>${prenom} ${nom}</strong></td></tr>
              <tr><td style="color:#64748b;">Email</td><td><a href="mailto:${email}" style="color:#2563eb;">${email}</a></td></tr>
              ${telephone ? `<tr><td style="color:#64748b;">Téléphone</td><td><a href="tel:${telephone}" style="color:#2563eb;">${telephone}</a></td></tr>` : ''}
              ${agence ? `<tr><td style="color:#64748b;">Agence</td><td>${agence}</td></tr>` : ''}
              ${flotte ? `<tr><td style="color:#64748b;">Taille flotte</td><td>${flotte} véhicule(s)</td></tr>` : ''}
            </table>

            ${message ? `
            <h2 style="margin:24px 0 14px;color:#2563eb;font-size:15px;border-bottom:2px solid #eff6ff;padding-bottom:6px;">Message</h2>
            <p style="font-size:14px;color:#334155;white-space:pre-wrap;background:#f8fafc;padding:14px;border-radius:6px;border:1px solid #e2e8f0;">${message}</p>
            ` : ''}

            <div style="margin-top:28px;text-align:center;">
              <a href="mailto:${email}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:100px;font-size:14px;font-weight:bold;">
                Répondre à ${prenom} →
              </a>
            </div>
          </td>
        </tr>

        <tr>
          <td style="background:#f8fafc;padding:14px 32px;text-align:center;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:12px;color:#94a3b8;">ASM Location — Propulsé par <strong>Innosoft Creation</strong></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Nouvelle demande de contact — ASM Location
Nom : ${prenom} ${nom}
Email : ${email}
${telephone ? `Téléphone : ${telephone}\n` : ''}${agence ? `Agence : ${agence}\n` : ''}${flotte ? `Flotte : ${flotte}\n` : ''}${message ? `\nMessage :\n${message}` : ''}`;

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"ASM Location" <${process.env.SMTP_USER}>`,
    to,
    replyTo: email,
    subject,
    text,
    html,
  });
}
