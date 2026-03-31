import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'scenio-fallback-secret-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'scenio-refresh-fallback-secret-2026';

export const signAccessToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' }); // Access token ngắn
};

export const signRefreshToken = (payload: object): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' }); // Refresh token dài
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, REFRESH_SECRET);
};
