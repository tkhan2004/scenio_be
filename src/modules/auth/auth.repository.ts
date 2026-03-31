import { prisma } from "../../config/database";

/**
 * Repository - Auth
 * Summary: Quản lý truy cập dữ liệu cho User và RefreshToken.
 */

// --- User Operations ---

export async function findUserByEmail(email: string) {
  return await prisma.user.findUnique({ where: { email } });
}

export async function createUser(data: any) {
  return await prisma.user.create({ data });
}

// --- RefreshToken Operations ---

export async function createRefreshToken(data: { token: string; userId: string; expiresAt: Date }) {
  return await prisma.refreshToken.create({ data });
}

export async function findRefreshToken(token: string) {
  return await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true }
  });
}

export async function deleteRefreshToken(token: string) {
  return await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function deleteRefreshTokenById(id: string) {
  return await prisma.refreshToken.delete({ where: { id } });
}
