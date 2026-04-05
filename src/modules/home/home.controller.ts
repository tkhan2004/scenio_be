import { Request, Response, NextFunction } from "express";
import { ok, fail } from "../../utils/response";
import { getHome } from "./home.service";

/**
 * HTTP Handler - getHomeController
 * Summary: Trả về dữ liệu dashboard cho user hiện tại.
 * Inputs: req, res, next.
 * Behavior: Lấy userId từ access token -> gọi service -> trả response chuẩn.
 */
export const getHomeController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return fail(res, "Thiếu thông tin người dùng", "UNAUTHORIZED", 401);
    }

    const homeData = await getHome(userId);
    ok(res, homeData);
  } catch (error) {
    next(error);
  }
};
