import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { Role } from '@prisma/client';
import { checkPlanLimit } from '../utils/planLimits';



interface CreateUserDto {
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  role: Role;
  motDePasse: string;
}

interface UpdateUserDto {
  actif?: boolean;
  nom?: string;
  prenom?: string;
  telephone?: string;
  role?: Role;
}

export class UserService {
  async getAll(tenantId: string) {
    if (!tenantId) throw new Error('TenantId requis');
    return prisma.user.findMany({
      where: { tenantId, role: { not: Role.SUPER_ADMIN } },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(data: CreateUserDto, tenantId: string) {
    // Vérifier les limites du plan avant création
    await checkPlanLimit(tenantId, 'agents');

    const existing = await prisma.user.findFirst({ where: { email: data.email, tenantId } });
    if (existing) throw new Error('Un utilisateur avec cet email existe déjà');

    const hash = await bcrypt.hash(data.motDePasse, 12);
    return prisma.user.create({
      data: {
        tenantId,
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        telephone: data.telephone,
        role: data.role,
        motDePasse: hash,
      },
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: UpdateUserDto, tenantId: string) {
    const existing = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!existing) throw new Error('Utilisateur introuvable');

    return prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        nom: true,
        prenom: true,
        email: true,
        telephone: true,
        role: true,
        actif: true,
        createdAt: true,
      },
    });
  }
}

export const userService = new UserService();
