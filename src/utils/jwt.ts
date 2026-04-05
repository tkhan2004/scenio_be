import jwt, { SignOptions } from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'scenio-fallback-secret-2026';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'scenio-refresh-fallback-secret-2026';
const ACCESS_TOKEN_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
const REFRESH_TOKEN_EXPIRES_IN = (process.env.REFRESH_EXPIRES_IN || '30d') as SignOptions['expiresIn'];

export const signAccessToken = (payload: object): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN }); // Access token ngắn
};

export const signRefreshToken = (payload: object): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN }); // Refresh token dài
};

export const verifyAccessToken = (token: string): any => {
  return jwt.verify(token, JWT_SECRET);
};

export const verifyRefreshToken = (token: string): any => {
  return jwt.verify(token, REFRESH_SECRET);
};
