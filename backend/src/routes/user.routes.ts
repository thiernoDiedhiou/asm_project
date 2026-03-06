import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateToken, authorize } from '../middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Toutes les routes utilisateurs nécessitent ADMIN
router.get('/', authenticateToken, authorize(Role.ADMIN), userController.getAll.bind(userController));
router.post('/', authenticateToken, authorize(Role.ADMIN), userController.create.bind(userController));
router.put('/:id', authenticateToken, authorize(Role.ADMIN), userController.update.bind(userController));

export default router;
