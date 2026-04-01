import { Router } from "express";
import { auth } from "../../middleware/auth";
import { getHomeController } from "./home.controller";

const router = Router();

/**
 * @route   GET /api/home/dashboard
 * @desc    Lấy dữ liệu dashboard home theo user hiện tại
 */
router.get('/dashboard', auth, getHomeController);

export default router;
