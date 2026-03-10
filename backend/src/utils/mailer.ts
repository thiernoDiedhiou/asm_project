// Utilitaire d'envoi d'emails — notifications réservations vitrine
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false, // STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface DemandeReservationMailData {
  numeroReservation: string;
  client: { prenom: string; nom: string; telephone: string; email?: string };
  vehicule: { marque: string; modele: string };
  dateDebut: string;
  dateFin: string;
  nombreJours: number;
  prixTotal: number;
  lieuPriseEnCharge: string;
  typeTrajet: string;
  notes?: string;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export async function sendNotifNouvelleReservation(data: DemandeReservationMailData): Promise<void> {
  const to = process.env.NOTIF_EMAIL_TO;
  if (!to || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // SMTP non configuré — notification ignorée silencieusement
    return;
  }

  const {
    numeroReservation,
    client,
    vehicule,
    dateDebut,
    dateFin,
    nombreJours,
    prixTotal,
    lieuPriseEnCharge,
    typeTrajet,
    notes,
  } = data;

  const subject = `[ASM] Nouvelle demande — ${numeroReservation} — ${client.prenom} ${client.nom}`;

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
          <td style="background:#1B5E20;padding:24px 32px;">
            <p style="margin:0;color:#F9A825;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:bold;">ASM Multi-Services</p>
            <h1 style="margin:8px 0 0;color:#ffffff;font-size:22px;">Nouvelle demande de réservation</h1>
          </td>
        </tr>

        <!-- Référence -->
        <tr>
          <td style="background:#F9A825;padding:12px 32px;">
            <p style="margin:0;color:#1B5E20;font-size:15px;font-weight:bold;">Référence : ${numeroReservation}</p>
          </td>
        </tr>

        <!-- Corps -->
        <tr>
          <td style="padding:28px 32px;">

            <!-- Client -->
            <h2 style="margin:0 0 12px;color:#1B5E20;font-size:16px;border-bottom:2px solid #F9A825;padding-bottom:6px;">Client</h2>
            <table width="100%" cellpadding="4" cellspacing="0" style="font-size:14px;color:#333;">
              <tr><td style="color:#666;width:40%;">Nom</td><td><strong>${client.prenom} ${client.nom}</strong></td></tr>
              <tr><td style="color:#666;">Téléphone</td><td><a href="tel:${client.telephone}" style="color:#1B5E20;">${client.telephone}</a></td></tr>
              ${client.email ? `<tr><td style="color:#666;">Email</td><td><a href="mailto:${client.email}" style="color:#1B5E20;">${client.email}</a></td></tr>` : ''}
            </table>

            <!-- Véhicule & dates -->
            <h2 style="margin:24px 0 12px;color:#1B5E20;font-size:16px;border-bottom:2px solid #F9A825;padding-bottom:6px;">Location</h2>
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
                <td align="right" style="font-size:22px;font-weight:bold;color:#1B5E20;">${prixTotal.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            </table>

            <!-- CTA -->
            <div style="margin-top:28px;text-align:center;">
              <a href="http://localhost:3000/reservations" style="display:inline-block;background:#1B5E20;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:6px;font-size:15px;font-weight:bold;">
                Voir dans le back-office →
              </a>
            </div>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f4f4f4;padding:16px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#999;">ASM Multi-Services — Grand Yoff, Zone de Captage, Dakar, Sénégal</p>
            <p style="margin:4px 0 0;font-size:12px;color:#bbb;">Cet email a été généré automatiquement par le système de réservation en ligne.</p>
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
    from: `"ASM Multi-Services" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
}
