import { Request, Response, NextFunction } from "express";
import { ok, fail } from "../../utils/response";
import { getHome } from "./home.service";

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
