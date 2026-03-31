import bcrypt from 'bcryptjs';
import { RegisterInput, LoginInput } from "../../schemas/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import * as authRepo from './auth.repository';

/**
 * Function Objective - register
 * Summary: Đăng ký người dùng và cấp bộ đôi token.
 * Behavior: Validate -> Repo.findUserByEmail -> Repo.createUser -> Repo.createRefreshToken.
 */
export async function register(input: RegisterInput) {
    const { email, password, displayName, avatarUrl } = input;

    const existingUser = await authRepo.findUserByEmail(email);
    if (existingUser) {
        throw Object.assign(new Error('Email đã được sử dụng'), { code: 'BAD_REQUEST', status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await authRepo.createUser({
        email,
        password: hashedPassword,
        displayName: displayName ?? null,
        avatarUrl: avatarUrl ?? null,
    });

    return await generateAuthResponse(user);
}

/**
 * Function Objective - login
 * Summary: Đăng nhập lấy bộ đôi token mới.
 */
export async function login(input: LoginInput) {
    const { email, password } = input;

    const user = await authRepo.findUserByEmail(email);
    if (!user || !user.password) {
        throw Object.assign(new Error('Email hoặc mật khẩu không chính xác'), { code: 'UNAUTHORIZED', status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw Object.assign(new Error('Email hoặc mật khẩu không chính xác'), { code: 'UNAUTHORIZED', status: 401 });
    }

    return await generateAuthResponse(user);
}

/**
 * Function Objective - refresh
 * Summary: Đổi RefreshToken lấy AccessToken mới.
 */
export async function refresh(token: string) {
    try {
        const payload = verifyRefreshToken(token);
        const storedToken = await authRepo.findRefreshToken(token);

        if (!storedToken || storedToken.expiresAt < new Date()) {
            if (storedToken) await authRepo.deleteRefreshTokenById(storedToken.id);
            throw new Error('Token không hợp lệ hoặc đã hết hạn');
        }

        const accessToken = signAccessToken({ id: payload.id, email: payload.email, isAdmin: payload.isAdmin });
        return { accessToken };
    } catch (error) {
        throw Object.assign(new Error('Refresh token không hợp lệ'), { code: 'UNAUTHORIZED', status: 401 });
    }
}

/**
 * Function Objective - logout
 */
export async function logout(token: string) {
    await authRepo.deleteRefreshToken(token);
    return true;
}

/**
 * Helper - Tạo AccessToken và RefreshToken, lưu vào Repo
 */
async function generateAuthResponse(user: any) {
    const payload = { id: user.id, email: user.email, isAdmin: user.isAdmin };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await authRepo.createRefreshToken({
        token: refreshToken,
        userId: user.id,
        expiresAt,
    });

    const { password: _, ...safeUser } = user;
    return { user: safeUser, accessToken, refreshToken };
}
