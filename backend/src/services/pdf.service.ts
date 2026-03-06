// Service de génération de PDF avec Puppeteer
import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { settingsService } from './settings.service';

interface EntrepriseInfo {
  nom: string;
  slogan: string;
  activite: string;
  adresse: string;
  telephone: string;
  telephone2: string;
  email: string;
  rccm: string;
  ninea: string;
}

interface ContratData {
  numeroContrat: string;
  dateSignature: Date;
  client: {
    nom: string;
    prenom: string;
    telephone: string;
    email?: string | null;
    adresse?: string | null;
    numeroCNI?: string | null;
    numeroPasseport?: string | null;
    permisConduire?: string | null;
    typeClient: string;
  };
  vehicule: {
    marque: string;
    modele: string;
    annee: number;
    immatriculation: string;
    couleur: string;
    categorie: string;
  };
  reservation: {
    dateDebut: Date;
    dateFin: Date;
    nombreJours: number;
    prixTotal: number;
    avance: number;
    lieuPriseEnCharge: string;
    lieuRetour: string;
    typeTrajet: string;
  };
  contrat: {
    kilometrageDepart: number;
    etatDepart: string;
    caution: number;
  };
  agent: {
    nom: string;
    prenom: string;
  };
  paiements: Array<{
    montant: number;
    methode: string;
    datePaiement: Date;
    reference?: string | null;
  }>;
}

export class PdfService {
  /**
   * Génère le HTML du contrat
   */
  private async generateContratHtml(data: ContratData, entreprise: EntrepriseInfo): Promise<string> {
    // Génération du QR code de vérification
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/contrats/verifier/${data.numeroContrat}`;
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 100,
      margin: 1,
    });

    // Formatage des dates
    const formatDate = (date: Date) => {
      return new Date(date).toLocaleDateString('fr-SN', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    };

    const formatMontant = (montant: number) =>
      `${Number(montant).toLocaleString('fr-SN')} FCFA`;

    // Calcul du total payé et du reste dû
    const totalPaye = data.paiements.reduce(
      (sum, p) => sum + Number(p.montant),
      0
    );
    const resteADu = Math.max(
      0,
      data.reservation.prixTotal - totalPaye
    );

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contrat de Location ${data.numeroContrat}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Arial', sans-serif;
      font-size: 11px;
      color: #333;
      background: white;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #1B5E20;
      padding-bottom: 15px;
      margin-bottom: 20px;
    }
    .logo-section {
      flex: 1;
    }
    .company-name {
      font-size: 22px;
      font-weight: bold;
      color: #1B5E20;
      text-transform: uppercase;
    }
    .company-tagline {
      font-size: 12px;
      color: #F9A825;
      font-weight: bold;
      margin-top: 2px;
    }
    .company-activity {
      font-size: 10px;
      color: #888;
      font-style: italic;
      margin-top: 1px;
    }
    .company-info {
      margin-top: 8px;
      font-size: 10px;
      color: #666;
      line-height: 1.7;
    }
    .company-legal {
      margin-top: 4px;
      font-size: 9px;
      color: #999;
      line-height: 1.5;
    }
    .contract-info {
      text-align: right;
    }
    .contract-number {
      font-size: 16px;
      font-weight: bold;
      color: #1B5E20;
      border: 2px solid #1B5E20;
      padding: 8px 15px;
      border-radius: 5px;
      display: inline-block;
    }
    .contract-date {
      font-size: 10px;
      color: #666;
      margin-top: 5px;
    }
    .qr-code {
      margin-top: 8px;
    }
    .title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      color: #1B5E20;
      margin: 20px 0;
      text-transform: uppercase;
      letter-spacing: 2px;
      border: 1px solid #1B5E20;
      padding: 8px;
      background-color: #f0f7f0;
    }
    .section {
      margin-bottom: 15px;
    }
    .section-title {
      background-color: #1B5E20;
      color: white;
      padding: 5px 10px;
      font-weight: bold;
      font-size: 11px;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
    }
    .info-table td {
      padding: 4px 8px;
      border-bottom: 1px solid #eee;
      font-size: 10px;
    }
    .info-table td:first-child {
      font-weight: bold;
      color: #555;
      width: 45%;
    }
    .price-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }
    .price-table th {
      background-color: #f5f5f5;
      padding: 5px 8px;
      text-align: left;
      font-size: 10px;
      border: 1px solid #ddd;
    }
    .price-table td {
      padding: 5px 8px;
      border: 1px solid #ddd;
      font-size: 10px;
    }
    .price-table .total-row {
      font-weight: bold;
      background-color: #e8f5e9;
    }
    .price-table .amount {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: bold;
    }
    .badge-green { background-color: #e8f5e9; color: #1B5E20; }
    .badge-orange { background-color: #fff3e0; color: #e65100; }
    .badge-blue { background-color: #e3f2fd; color: #1565c0; }
    .page-break {
      page-break-before: always;
    }
    .cg-page {
      padding: 20px;
    }
    .cg-header {
      text-align: center;
      border-bottom: 3px solid #1B5E20;
      padding-bottom: 12px;
      margin-bottom: 18px;
    }
    .cg-title {
      font-size: 15px;
      font-weight: bold;
      color: #1B5E20;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .cg-subtitle {
      font-size: 10px;
      color: #888;
      margin-top: 3px;
    }
    .article {
      margin-bottom: 14px;
    }
    .article-title {
      font-size: 11px;
      font-weight: bold;
      color: #1B5E20;
      text-transform: uppercase;
      margin-bottom: 5px;
      border-left: 3px solid #F9A825;
      padding-left: 8px;
    }
    .article p {
      font-size: 10px;
      color: #444;
      line-height: 1.65;
      text-align: justify;
    }
    .cg-footer {
      margin-top: 24px;
      border-top: 1px solid #eee;
      padding-top: 10px;
      text-align: center;
      font-size: 9px;
      color: #aaa;
    }
    .signature-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 20px;
    }
    .signature-box {
      border: 1px solid #ddd;
      padding: 15px;
      min-height: 80px;
      text-align: center;
    }
    .signature-title {
      font-weight: bold;
      font-size: 10px;
      margin-bottom: 5px;
      color: #555;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      margin-top: 50px;
      margin-bottom: 5px;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 9px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
    .highlight {
      color: #F9A825;
      font-weight: bold;
    }
    .due-amount {
      font-size: 14px;
      font-weight: bold;
      color: ${resteADu > 0 ? '#c62828' : '#1B5E20'};
    }
  </style>
</head>
<body>
  <!-- En-tête -->
  <div class="header">
    <div class="logo-section">
      <div class="company-name">${entreprise.nom}</div>
      <div class="company-tagline">${entreprise.slogan}</div>
      <div class="company-activity">${entreprise.activite}</div>
      <div class="company-info">
        📍 ${entreprise.adresse}<br>
        📞 ${entreprise.telephone}${entreprise.telephone2 ? ` / ${entreprise.telephone2}` : ''}<br>
        ✉️ ${entreprise.email}
      </div>
      ${(entreprise.rccm || entreprise.ninea) ? `<div class="company-legal">${entreprise.rccm ? `RCCM : ${entreprise.rccm}` : ''}${entreprise.rccm && entreprise.ninea ? ' &nbsp;|&nbsp; ' : ''}${entreprise.ninea ? `NINEA : ${entreprise.ninea}` : ''}</div>` : ''}
    </div>
    <div class="contract-info">
      <div class="contract-number">N° ${data.numeroContrat}</div>
      <div class="contract-date">Signé le: ${formatDate(data.dateSignature)}</div>
      <div class="qr-code">
        <img src="${qrCodeDataUrl}" alt="QR Code vérification" width="70" />
        <div style="font-size:8px; color:#999;">Scan pour vérifier</div>
      </div>
    </div>
  </div>

  <!-- Titre -->
  <div class="title">Contrat de Location de Véhicule</div>

  <!-- Section Client et Véhicule -->
  <div class="grid-2">
    <!-- Informations Client -->
    <div class="section">
      <div class="section-title">👤 Informations du Locataire</div>
      <table class="info-table">
        <tr>
          <td>Nom complet:</td>
          <td><strong>${data.client.prenom} ${data.client.nom}</strong></td>
        </tr>
        <tr>
          <td>Type:</td>
          <td><span class="badge badge-blue">${data.client.typeClient}</span></td>
        </tr>
        <tr>
          <td>Téléphone:</td>
          <td>${data.client.telephone}</td>
        </tr>
        ${data.client.email ? `<tr><td>Email:</td><td>${data.client.email}</td></tr>` : ''}
        ${data.client.adresse ? `<tr><td>Adresse:</td><td>${data.client.adresse}</td></tr>` : ''}
        ${data.client.numeroCNI ? `<tr><td>N° CNI:</td><td>${data.client.numeroCNI}</td></tr>` : ''}
        ${data.client.numeroPasseport ? `<tr><td>N° Passeport:</td><td>${data.client.numeroPasseport}</td></tr>` : ''}
        ${data.client.permisConduire ? `<tr><td>Permis:</td><td>${data.client.permisConduire}</td></tr>` : ''}
      </table>
    </div>

    <!-- Informations Véhicule -->
    <div class="section">
      <div class="section-title">🚗 Informations du Véhicule</div>
      <table class="info-table">
        <tr>
          <td>Marque / Modèle:</td>
          <td><strong>${data.vehicule.marque} ${data.vehicule.modele}</strong></td>
        </tr>
        <tr>
          <td>Année:</td>
          <td>${data.vehicule.annee}</td>
        </tr>
        <tr>
          <td>Immatriculation:</td>
          <td><strong class="highlight">${data.vehicule.immatriculation}</strong></td>
        </tr>
        <tr>
          <td>Couleur:</td>
          <td>${data.vehicule.couleur}</td>
        </tr>
        <tr>
          <td>Catégorie:</td>
          <td><span class="badge badge-green">${data.vehicule.categorie}</span></td>
        </tr>
        <tr>
          <td>Km départ:</td>
          <td>${data.contrat.kilometrageDepart.toLocaleString('fr-SN')} km</td>
        </tr>
        <tr>
          <td>État départ:</td>
          <td>${data.contrat.etatDepart}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Détails de la Location -->
  <div class="section">
    <div class="section-title">📅 Détails de la Location</div>
    <div class="grid-2">
      <table class="info-table">
        <tr>
          <td>Type de trajet:</td>
          <td><span class="badge badge-orange">${data.reservation.typeTrajet.replace('_', ' ')}</span></td>
        </tr>
        <tr>
          <td>Date de début:</td>
          <td><strong>${formatDate(data.reservation.dateDebut)}</strong></td>
        </tr>
        <tr>
          <td>Date de fin:</td>
          <td><strong>${formatDate(data.reservation.dateFin)}</strong></td>
        </tr>
        <tr>
          <td>Durée:</td>
          <td><strong>${data.reservation.nombreJours} jour(s)</strong></td>
        </tr>
      </table>
      <table class="info-table">
        <tr>
          <td>Lieu de départ:</td>
          <td>${data.reservation.lieuPriseEnCharge}</td>
        </tr>
        <tr>
          <td>Lieu de retour:</td>
          <td>${data.reservation.lieuRetour}</td>
        </tr>
        <tr>
          <td>Agent responsable:</td>
          <td>${data.agent.prenom} ${data.agent.nom}</td>
        </tr>
        <tr>
          <td>Caution versée:</td>
          <td><strong>${formatMontant(data.contrat.caution)}</strong></td>
        </tr>
      </table>
    </div>
  </div>

  <!-- Récapitulatif Financier -->
  <div class="section">
    <div class="section-title">💰 Récapitulatif Financier</div>
    <table class="price-table">
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Montant</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Location ${data.vehicule.marque} ${data.vehicule.modele} - ${data.reservation.nombreJours} jour(s)</td>
          <td class="amount">${formatMontant(data.reservation.prixTotal)}</td>
        </tr>
        ${data.paiements.map(p => `
        <tr>
          <td>Paiement ${p.methode.replace('_', ' ')} du ${formatDate(p.datePaiement)}${p.reference ? ` (Réf: ${p.reference})` : ''}</td>
          <td class="amount" style="color: #1B5E20;">- ${formatMontant(Number(p.montant))}</td>
        </tr>
        `).join('')}
        <tr class="total-row">
          <td>TOTAL DÛ</td>
          <td class="amount due-amount">${formatMontant(resteADu)}</td>
        </tr>
      </tbody>
    </table>
    ${resteADu === 0 ? '<div style="text-align:center; color:#1B5E20; font-weight:bold; margin-top:8px;">✅ CONTRAT ENTIÈREMENT RÉGLÉ</div>' : ''}
  </div>

  <!-- Zone de signature -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Le Locataire</div>
      <div style="font-size:9px; color:#999; margin-bottom:5px;">
        ${data.client.prenom} ${data.client.nom}
      </div>
      <div style="font-size:8px; color:#bbb; margin-bottom:40px;">Lu et approuvé — Bon pour accord</div>
      <div class="signature-line"></div>
      <div style="font-size:9px; color:#999;">Signature et date</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">${entreprise.nom}</div>
      <div style="font-size:9px; color:#999; margin-bottom:5px;">
        Agent: ${data.agent.prenom} ${data.agent.nom}
      </div>
      <div class="signature-line"></div>
      <div style="font-size:9px; color:#999;">Cachet et signature</div>
    </div>
  </div>
  <div style="text-align:center; font-size:8px; color:#aaa; margin-top:8px;">
    Les Conditions Générales de Location figurent en page 2 du présent contrat.
  </div>

  <!-- Pied de page page 1 -->
  <div class="footer">
    <p>${entreprise.nom} - ${entreprise.adresse} - Tél: ${entreprise.telephone}</p>
    <p>Document généré le ${formatDate(new Date())} | Contrat N° ${data.numeroContrat}</p>
    <p style="color: #1B5E20;">Ce document est un contrat légalement contraignant - Conservez-le précieusement</p>
  </div>

  <!-- ============================================================ -->
  <!-- PAGE 2 — CONDITIONS GÉNÉRALES DE LOCATION                    -->
  <!-- ============================================================ -->
  <div class="page-break cg-page">
    <div class="cg-header">
      <div class="cg-title">Conditions Générales de Location</div>
      <div class="cg-subtitle">${entreprise.nom} — ${entreprise.adresse}${entreprise.rccm ? ` — RCCM : ${entreprise.rccm}` : ''}${entreprise.ninea ? ` — NINEA : ${entreprise.ninea}` : ''}</div>
    </div>

    <div class="article">
      <div class="article-title">Article 1 — Conditions à remplir pour louer</div>
      <p>Pour louer un véhicule ${entreprise.nom}, le locataire doit : être âgé d'au moins 21 ans ; être titulaire d'un permis de conduire valide depuis au moins un (1) an ; présenter une pièce d'identité valide (CNI ou passeport) ; présenter son permis de conduire en cours de validité ; disposer d'une carte bancaire ou d'un chèque ; verser la caution fixée au contrat. Toute location implique l'acceptation sans réserve des présentes Conditions Générales.</p>
    </div>

    <div class="article">
      <div class="article-title">Article 2 — Conducteurs autorisés</div>
      <p>Le véhicule ne peut être conduit que par le(s) locataire(s) expressément mentionné(s) au contrat. Tout conducteur additionnel doit être déclaré à la signature et donnera lieu à un supplément journalier. Tout dommage causé par un conducteur non déclaré et non autorisé engage la pleine responsabilité du locataire principal et entraîne, en sus des frais de réparation, une amende forfaitaire de <strong>500 000 FCFA</strong>.</p>
    </div>

    <div class="article">
      <div class="article-title">Article 3 — État du véhicule</div>
      <p>Le carburant est à la charge exclusive du locataire. Le véhicule est remis avec le niveau de carburant indiqué au contrat ; il doit être restitué avec le même niveau, faute de quoi le complément sera facturé au prix du marché. Des plombs sont apposés sur les compteurs du véhicule lors de la remise des clés ; toute manipulation ou rupture de ces plombs entraîne une pénalité calculée sur la base de <strong>400 km par jour</strong> au tarif de <strong>500 FCFA/km</strong>.</p>
    </div>

    <div class="article">
      <div class="article-title">Article 4 — Conduite et usage du véhicule</div>
      <p>Il est strictement interdit d'utiliser le véhicule pour : exercer une activité de taxi ou de transport public rémunéré ; le sous-louer ou le prêter à un tiers non déclaré ; participer à des courses, compétitions ou rallyes ; conduire sous l'influence de l'alcool, de stupéfiants ou de tout médicament altérant la vigilance ; transporter des marchandises dangereuses, illicites ou des animaux sans accord préalable. Toute infraction à ces dispositions entraîne la résiliation immédiate du contrat, aux frais et risques exclusifs du locataire.</p>
    </div>

    <div class="article">
      <div class="article-title">Article 5 — Sécurité</div>
      <p>Le nombre maximum de passagers autorisés est celui indiqué sur la carte grise du véhicule ; il ne doit en aucun cas être dépassé. Le locataire est tenu de vérifier les niveaux d'huile moteur et d'eau de refroidissement : tous les <strong>1 000 km</strong> pour les véhicules de tourisme et tous les <strong>500 km</strong> pour les véhicules utilitaires. Tout défaut d'entretien ayant entraîné un dommage moteur est à la charge entière du locataire.</p>
    </div>

    <div class="article">
      <div class="article-title">Article 6 — Pannes, accidents et vols</div>
      <p>En cas de panne ou d'accident, le locataire doit contacter ${entreprise.nom} au ${entreprise.telephone}${entreprise.telephone2 ? ` ou ${entreprise.telephone2}` : ''} <strong>avant toute réparation</strong>. Un constat amiable est obligatoire en cas d'accident, même en l'absence de tiers impliqué. Le locataire ne doit reconnaître aucune responsabilité sans l'accord préalable de ${entreprise.nom}. En cas de vol du véhicule, le locataire est tenu de déposer une plainte auprès des autorités compétentes dans les 24 heures et d'en remettre une copie à ${entreprise.nom} ; à défaut de couverture assurance, le locataire est redevable du remboursement intégral de la valeur du véhicule.</p>
    </div>

    <div class="article">
      <div class="article-title">Article 7 — Indemnité de retard</div>
      <p>Une tolérance de <strong>60 minutes</strong> est accordée au-delà de l'heure de restitution prévue au contrat. Passé ce délai de grâce, une indemnité de retard de <strong>250 FCFA par minute</strong> sera automatiquement facturée au locataire jusqu'à la restitution effective du véhicule et des clés à ${entreprise.nom}. Les litiges non résolus à l'amiable seront portés devant les tribunaux compétents de Dakar.</p>
    </div>

    <div class="cg-footer">
      <p>Je soussigné(e) <strong>${data.client.prenom} ${data.client.nom}</strong>, déclare avoir lu, compris et accepté sans réserve les présentes Conditions Générales de Location.</p>
      <div style="display:flex; justify-content:space-between; margin-top:30px; padding:0 40px;">
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #333; width:180px; margin:0 auto 6px;"></div>
          <div>Signature du locataire</div>
        </div>
        <div style="text-align:center;">
          <div style="border-bottom:1px solid #333; width:180px; margin:0 auto 6px;"></div>
          <div>Cachet et signature ${entreprise.nom}</div>
        </div>
      </div>
      <p style="margin-top:20px;">${entreprise.nom} — ${entreprise.adresse} — Tél : ${entreprise.telephone}${entreprise.telephone2 ? ` / ${entreprise.telephone2}` : ''} — ${entreprise.email}</p>
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Génère le HTML du reçu de paiement
   */
  private generateRecuHtml(data: {
    paiement: { montant: number; methode: string; reference?: string | null; datePaiement: Date; notes?: string | null; valide: boolean };
    contrat: { numeroContrat: string };
    client: { prenom: string; nom: string; telephone: string; email?: string | null };
    vehicule: { marque: string; modele: string; immatriculation: string };
    reservation: { dateDebut: Date; dateFin: Date; prixTotal: number; nombreJours: number };
    resteADu: number;
  }, entreprise: EntrepriseInfo): string {
    const formatDate = (d: Date) => new Date(d).toLocaleDateString('fr-SN', { day: '2-digit', month: 'long', year: 'numeric' });
    const fmt = (n: number) => `${Number(n).toLocaleString('fr-SN')} FCFA`;
    const METHODE_LABELS: Record<string, string> = {
      ESPECES: 'Espèces', WAVE: 'Wave', ORANGE_MONEY: 'Orange Money',
      FREE_MONEY: 'Free Money', VIREMENT: 'Virement bancaire', CHEQUE: 'Chèque',
    };
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Reçu de Paiement</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:11px;color:#333;background:#fff;padding:30px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #1B5E20;padding-bottom:15px;margin-bottom:20px}
    .company-name{font-size:20px;font-weight:bold;color:#1B5E20;text-transform:uppercase}
    .company-tagline{font-size:11px;color:#F9A825;font-weight:bold;margin-top:2px}
    .company-activity{font-size:9px;color:#888;font-style:italic;margin-top:1px}
    .company-info{font-size:10px;color:#666;margin-top:6px;line-height:1.6}
    .company-legal{font-size:9px;color:#999;margin-top:3px;line-height:1.4}
    .doc-title{text-align:right}.doc-title h2{font-size:18px;color:#1B5E20;text-transform:uppercase;letter-spacing:1px}
    .doc-title .ref{font-size:10px;color:#888;margin-top:4px}
    .amount-badge{background:#1B5E20;color:#fff;font-size:22px;font-weight:bold;padding:12px 24px;border-radius:8px;text-align:center;margin:18px 0}
    .amount-badge .label{font-size:10px;font-weight:normal;opacity:.8}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
    .card{border:1px solid #e5e7eb;border-radius:6px;padding:10px 14px}
    .card-title{font-size:9px;font-weight:bold;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;border-bottom:1px solid #f3f4f6;padding-bottom:4px}
    .card-row{display:flex;justify-content:space-between;font-size:10px;margin-bottom:4px}
    .card-row .label{color:#6b7280}.card-row .value{font-weight:600;color:#111;text-align:right}
    .highlight{background:#f0fdf4;border-color:#bbf7d0}
    .method-badge{display:inline-block;background:#dbeafe;color:#1d4ed8;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:bold}
    .status-ok{color:#15803d;font-weight:bold}.status-pending{color:#b45309;font-weight:bold}
    .summary-table{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:10px}
    .summary-table th{background:#f9fafb;padding:7px 10px;text-align:left;font-size:9px;color:#6b7280;text-transform:uppercase;border-bottom:1px solid #e5e7eb}
    .summary-table td{padding:7px 10px;border-bottom:1px solid #f3f4f6}
    .summary-table .amount{text-align:right;font-weight:bold}
    .summary-table .total-row td{background:#f0fdf4;font-weight:bold;font-size:11px;border-top:2px solid #1B5E20}
    .paid-row td{color:#15803d}
    .seal{text-align:center;margin:16px 0}
    .seal-box{display:inline-block;border:2px dashed #1B5E20;padding:10px 24px;border-radius:8px;color:#1B5E20;font-size:10px;font-weight:bold}
    .footer{margin-top:20px;border-top:1px solid #e5e7eb;padding-top:10px;text-align:center;font-size:9px;color:#9ca3af;line-height:1.6}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="company-name">${entreprise.nom}</div>
      <div class="company-tagline">${entreprise.slogan}</div>
      <div class="company-activity">${entreprise.activite}</div>
      <div class="company-info">
        📍 ${entreprise.adresse}<br>
        📞 ${entreprise.telephone}${entreprise.telephone2 ? ` / ${entreprise.telephone2}` : ''}<br>
        ✉️ ${entreprise.email}
      </div>
      ${(entreprise.rccm || entreprise.ninea) ? `<div class="company-legal">${entreprise.rccm ? `RCCM : ${entreprise.rccm}` : ''}${entreprise.rccm && entreprise.ninea ? ' &nbsp;|&nbsp; ' : ''}${entreprise.ninea ? `NINEA : ${entreprise.ninea}` : ''}</div>` : ''}
    </div>
    <div class="doc-title">
      <h2>Reçu de Paiement</h2>
      <div class="ref">Contrat: ${data.contrat.numeroContrat}</div>
      <div class="ref">Date: ${formatDate(data.paiement.datePaiement)}</div>
    </div>
  </div>

  <div class="amount-badge">
    <div class="label">Montant encaissé</div>
    ${fmt(data.paiement.montant)}
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-title">Client</div>
      <div class="card-row"><span class="label">Nom</span><span class="value">${data.client.prenom} ${data.client.nom}</span></div>
      <div class="card-row"><span class="label">Téléphone</span><span class="value">${data.client.telephone}</span></div>
      ${data.client.email ? `<div class="card-row"><span class="label">Email</span><span class="value">${data.client.email}</span></div>` : ''}
    </div>
    <div class="card">
      <div class="card-title">Véhicule loué</div>
      <div class="card-row"><span class="label">Modèle</span><span class="value">${data.vehicule.marque} ${data.vehicule.modele}</span></div>
      <div class="card-row"><span class="label">Immatriculation</span><span class="value">${data.vehicule.immatriculation}</span></div>
      <div class="card-row"><span class="label">Durée</span><span class="value">${data.reservation.nombreJours} jour(s)</span></div>
    </div>
    <div class="card">
      <div class="card-title">Paiement</div>
      <div class="card-row"><span class="label">Méthode</span><span class="value"><span class="method-badge">${METHODE_LABELS[data.paiement.methode] || data.paiement.methode}</span></span></div>
      <div class="card-row"><span class="label">Date</span><span class="value">${formatDate(data.paiement.datePaiement)}</span></div>
      ${data.paiement.reference ? `<div class="card-row"><span class="label">Référence</span><span class="value">${data.paiement.reference}</span></div>` : ''}
      <div class="card-row"><span class="label">Statut</span><span class="value ${data.paiement.valide ? 'status-ok' : 'status-pending'}">${data.paiement.valide ? '✓ Validé' : '⏳ En attente'}</span></div>
    </div>
    <div class="card highlight">
      <div class="card-title">Contrat</div>
      <div class="card-row"><span class="label">Début</span><span class="value">${formatDate(data.reservation.dateDebut)}</span></div>
      <div class="card-row"><span class="label">Fin</span><span class="value">${formatDate(data.reservation.dateFin)}</span></div>
      <div class="card-row"><span class="label">Montant total</span><span class="value">${fmt(data.reservation.prixTotal)}</span></div>
    </div>
  </div>

  <table class="summary-table">
    <thead><tr><th>Description</th><th class="amount">Montant</th></tr></thead>
    <tbody>
      <tr><td>Montant total de la location</td><td class="amount">${fmt(data.reservation.prixTotal)}</td></tr>
      <tr class="paid-row"><td>✓ Ce paiement</td><td class="amount">- ${fmt(data.paiement.montant)}</td></tr>
      <tr class="total-row">
        <td>RESTE À PAYER</td>
        <td class="amount" style="color:${data.resteADu > 0 ? '#dc2626' : '#15803d'}">${data.resteADu > 0 ? fmt(data.resteADu) : '0 FCFA — SOLDÉ ✓'}</td>
      </tr>
    </tbody>
  </table>

  ${data.paiement.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:14px;font-size:10px;color:#92400e;"><strong>Note:</strong> ${data.paiement.notes}</div>` : ''}

  <div class="seal">
    <div class="seal-box">${data.resteADu === 0 ? '✅ CONTRAT ENTIÈREMENT RÉGLÉ' : '🔵 PAIEMENT PARTIEL REÇU'}</div>
  </div>

  <div class="footer">
    <p><strong>${entreprise.nom}</strong> — ${entreprise.adresse}</p>
    <p>Tél : ${entreprise.telephone}${entreprise.telephone2 ? ` / ${entreprise.telephone2}` : ''} · ${entreprise.email}</p>
    ${(entreprise.rccm || entreprise.ninea) ? `<p>${entreprise.rccm ? `RCCM : ${entreprise.rccm}` : ''}${entreprise.rccm && entreprise.ninea ? ' | ' : ''}${entreprise.ninea ? `NINEA : ${entreprise.ninea}` : ''}</p>` : ''}
    <p>Reçu généré le ${formatDate(new Date())} · Document certifiant la réception du paiement</p>
  </div>
</body>
</html>`;
  }

  /**
   * Génère le PDF reçu de paiement en mémoire (Buffer)
   */
  async generateRecuPaiementPdf(data: Parameters<PdfService['generateRecuHtml']>[0]): Promise<Buffer> {
    const s = await settingsService.get();
    const entreprise: EntrepriseInfo = {
      nom: s.nomEntreprise,
      slogan: s.slogan,
      activite: s.activite,
      adresse: `${s.adresse}, ${s.ville}`,
      telephone: s.telephone,
      telephone2: s.telephone2,
      email: s.email,
      rccm: s.rccm,
      ninea: s.ninea,
    };
    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });
      const page = await browser.newPage();
      await page.setContent(this.generateRecuHtml(data, entreprise), { waitUntil: 'networkidle0' });
      const buffer = await page.pdf({
        format: 'A4',
        margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        printBackground: true,
      });
      return Buffer.from(buffer);
    } finally {
      if (browser) await browser.close();
    }
  }

  /**
   * Génère le PDF du contrat et le sauvegarde
   */
  async generateContratPdf(data: ContratData): Promise<string> {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const pdfDir = path.join(uploadDir, 'contrats');

    // Créer le répertoire si nécessaire
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    const fileName = `contrat-${data.numeroContrat}-${Date.now()}.pdf`;
    const filePath = path.join(pdfDir, fileName);

    let browser;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const s = await settingsService.get();
      const entreprise: EntrepriseInfo = {
        nom: s.nomEntreprise,
        slogan: s.slogan,
        activite: s.activite,
        adresse: `${s.adresse}, ${s.ville}`,
        telephone: s.telephone,
        telephone2: s.telephone2,
        email: s.email,
        rccm: s.rccm,
        ninea: s.ninea,
      };
      const page = await browser.newPage();
      const html = await this.generateContratHtml(data, entreprise);

      await page.setContent(html, { waitUntil: 'networkidle0' });

      await page.pdf({
        path: filePath,
        format: 'A4',
        margin: {
          top: '15mm',
          right: '15mm',
          bottom: '15mm',
          left: '15mm',
        },
        printBackground: true,
      });

      logger.info(`PDF généré: ${fileName}`);

      // Retourner l'URL relative
      return `/uploads/contrats/${fileName}`;
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
}

export const pdfService = new PdfService();
