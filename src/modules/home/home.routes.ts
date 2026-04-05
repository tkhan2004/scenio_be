import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validate } from "../../middleware/validate";
import { getHomeController } from "./home.controller";
import { getHomeSchema } from "../../schemas/home";

const router = Router();

/**
 * @route   GET /api/home/dashboard
 * @desc    Lấy dữ liệu dashboard home theo user hiện tại
 */
router.get('/dashboard', auth, validate(getHomeSchema), getHomeController);

export default router;
