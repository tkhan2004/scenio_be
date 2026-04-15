import { Router } from 'express';
import { auth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as adminController from './admin.controller';
import { getAllUsersSchema } from '../../schemas/admin';

const router = Router();

/**
 * @route   GET /api/admin/users
 * @desc    Lấy danh sách learner cho admin dashboard
 */
router.get('/users', auth, validate(getAllUsersSchema), adminController.getAllUsers);

export default router;
