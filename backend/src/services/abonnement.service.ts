// Service — paiements d'abonnement SaaS + génération facture PDF
import prisma from '../utils/prisma';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';
import logger from '../utils/logger';
import { getIo } from '../utils/socketRegistry';

function formatMontant(n: number | string): string {
  return Number(n).toLocaleString('fr-SN') + ' FCFA';
}

function formatDateFr(d: Date | string): string {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatPeriode(p: string): string {
  const [year, month] = p.split('-');
  const mois = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  return `${mois[parseInt(month) - 1]} ${year}`;
}

const METHODE_LABELS: Record<string, string> = {
  ESPECES: 'Espèces', WAVE: 'Wave', ORANGE_MONEY: 'Orange Money',
  FREE_MONEY: 'Free Money', VIREMENT: 'Virement bancaire', CHEQUE: 'Chèque',
};

export const abonnementService = {
  async list(tenantId: string) {
    return prisma.paiementAbonnement.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async create(tenantId: string, data: {
    montant: number;
    methode: string;
    reference?: string;
    periode: string;
    notes?: string;
  }) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { nomEntreprise: true, slug: true, planType: true },
    });
    if (!tenant) throw new Error('Tenant introuvable');

    const paiement = await prisma.paiementAbonnement.create({
      data: { tenantId, ...data },
    });

    // Notification socket Super Admin
    getIo()?.emit('superadmin:paiement_recu', {
      tenantId,
      nomEntreprise: tenant.nomEntreprise,
      montant: data.montant,
      periode: data.periode,
    });

    // Génération automatique de la facture PDF
    try {
      const pdfUrl = await abonnementService.generateFacture(paiement.id, tenant, paiement);
      return prisma.paiementAbonnement.update({
        where: { id: paiement.id },
        data: { pdfUrl },
      });
    } catch (err) {
      logger.error('[ABONNEMENT] Erreur génération PDF facture:', err);
      return paiement;
    }
  },

  async delete(id: string, tenantId: string) {
    return prisma.paiementAbonnement.deleteMany({ where: { id, tenantId } });
  },

  async generateFacture(
    paiementId: string,
    tenant: { nomEntreprise: string; slug: string; planType: string },
    paiement: { montant: unknown; methode: string; reference?: string | null; periode: string; notes?: string | null; createdAt: Date }
  ): Promise<string> {
    const numero = `FAC-${tenant.slug.toUpperCase()}-${new Date(paiement.createdAt).getFullYear()}-${paiementId.slice(0, 6).toUpperCase()}`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a2e; background: white; }
    .page { padding: 48px 56px; min-height: 100vh; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo-block .company { font-size: 22px; font-weight: 800; color: #1B5E20; letter-spacing: -0.5px; }
    .logo-block .tagline { font-size: 12px; color: #666; margin-top: 3px; }
    .logo-block .platform { font-size: 11px; color: #aaa; margin-top: 2px; }
    .facture-meta { text-align: right; }
    .facture-meta .numero { font-size: 11px; color: #999; text-transform: uppercase; letter-spacing: 1px; }
    .facture-meta .value { font-size: 14px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
    .facture-meta .date { font-size: 12px; color: #666; margin-top: 4px; }
    .divider { border: none; border-top: 2px solid #1B5E20; margin: 24px 0; }
    .section-title { font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px; color: #999; font-weight: 600; margin-bottom: 8px; }
    .info-grid { display: flex; gap: 40px; margin-bottom: 32px; }
    .info-block { flex: 1; }
    .info-block .label { font-size: 11px; color: #999; }
    .info-block .val { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-top: 2px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-starter { background: #f3f4f6; color: #666; }
    .badge-pro { background: #dbeafe; color: #1d4ed8; }
    .badge-enterprise { background: #ede9fe; color: #6d28d9; }
    .amount-card { background: linear-gradient(135deg, #1B5E20 0%, #2e7d32 100%); color: white; border-radius: 12px; padding: 28px 32px; margin: 24px 0; display: flex; justify-content: space-between; align-items: center; }
    .amount-card .label { font-size: 12px; opacity: .8; letter-spacing: 1px; text-transform: uppercase; }
    .amount-card .amount { font-size: 32px; font-weight: 800; margin-top: 4px; }
    .amount-card .period { font-size: 14px; opacity: .9; margin-top: 6px; }
    .amount-card .right { text-align: right; }
    .amount-card .methode-label { font-size: 11px; opacity: .7; }
    .amount-card .methode-val { font-size: 16px; font-weight: 600; margin-top: 4px; }
    .details-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    .details-table th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #999; padding: 8px 12px; border-bottom: 1px solid #eee; }
    .details-table td { padding: 10px 12px; font-size: 13px; border-bottom: 1px solid #f5f5f5; }
    .details-table td.amount { font-weight: 700; color: #1B5E20; }
    .notes-box { background: #f9fafb; border-left: 3px solid #1B5E20; padding: 12px 16px; border-radius: 0 6px 6px 0; margin-top: 16px; }
    .notes-box p { font-size: 12px; color: #555; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-end; }
    .footer .left { font-size: 11px; color: #bbb; line-height: 1.7; }
    .footer .status { background: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-block">
      <div class="company">ASM Multi-Services</div>
      <div class="tagline">Plateforme SaaS — Gestion de location de véhicules</div>
      <div class="platform">Dakar, Sénégal</div>
    </div>
    <div class="facture-meta">
      <div class="numero">Facture</div>
      <div class="value">${numero}</div>
      <div class="date">${formatDateFr(paiement.createdAt)}</div>
    </div>
  </div>

  <hr class="divider">

  <div class="info-grid">
    <div class="info-block">
      <div class="section-title">Facturé à</div>
      <div class="val">${tenant.nomEntreprise}</div>
      <div class="label" style="margin-top:4px">${tenant.slug}.votre-plateforme.sn</div>
      <div style="margin-top:8px">
        <span class="badge badge-${tenant.planType.toLowerCase()}">${tenant.planType}</span>
      </div>
    </div>
    <div class="info-block">
      <div class="section-title">Période facturée</div>
      <div class="val">${formatPeriode(paiement.periode)}</div>
    </div>
    <div class="info-block">
      <div class="section-title">Référence paiement</div>
      <div class="val">${paiement.reference || '—'}</div>
    </div>
  </div>

  <div class="amount-card">
    <div>
      <div class="label">Montant payé</div>
      <div class="amount">${formatMontant(Number(paiement.montant))}</div>
      <div class="period">Abonnement ${tenant.planType} — ${formatPeriode(paiement.periode)}</div>
    </div>
    <div class="right">
      <div class="methode-label">Mode de paiement</div>
      <div class="methode-val">${METHODE_LABELS[paiement.methode] ?? paiement.methode}</div>
    </div>
  </div>

  <table class="details-table">
    <thead>
      <tr>
        <th>Désignation</th>
        <th>Période</th>
        <th>Méthode</th>
        <th style="text-align:right">Montant</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Abonnement ${tenant.planType} — ${tenant.nomEntreprise}</td>
        <td>${formatPeriode(paiement.periode)}</td>
        <td>${METHODE_LABELS[paiement.methode] ?? paiement.methode}</td>
        <td class="amount" style="text-align:right">${formatMontant(Number(paiement.montant))}</td>
      </tr>
    </tbody>
  </table>

  ${paiement.notes ? `
  <div class="notes-box">
    <div class="section-title">Notes</div>
    <p>${paiement.notes}</p>
  </div>` : ''}

  <div class="footer">
    <div class="left">
      <div>ASM Multi-Services Platform</div>
      <div>Facture générée automatiquement le ${formatDateFr(new Date())}</div>
      <div>Réf: ${paiementId}</div>
    </div>
    <div class="status">✓ Paiement reçu</div>
  </div>
</div>
</body>
</html>`;

    const dir = './uploads/abonnements';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filename = `facture-${paiementId}.pdf`;
    const filepath = path.join(dir, filename);

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({ path: filepath, format: 'A4', printBackground: true });
    await browser.close();

    return `/uploads/abonnements/${filename}`;
  },
};
