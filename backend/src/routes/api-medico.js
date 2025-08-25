import { Router } from 'express';
import medicoRoutes from './medico.js';

const router = Router();

// ...existing code...

router.use('/medico', medicoRoutes);

// ...existing code...

export default router;
