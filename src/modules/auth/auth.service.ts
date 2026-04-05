import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { RegisterInput, LoginInput } from "../../schemas/auth";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../utils/jwt";
import * as authRepo from './auth.repository';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
 * Function Objective - verifyTokenUser
 * Summary: Lấy thông tin user hiện tại từ access token đã được verify ở middleware.
 */
export async function verifyTokenUser(userId: string) {
    const user = await authRepo.findUserById(userId);
    if (!user) {
        throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
    }

    const { password: _, ...safeUser } = user;
    return safeUser;
}

/**
 * Function Objective - loginWithGoogle
 * Summary: Xác thực Google ID token và đăng nhập/đăng ký tự động.
 */
export async function loginWithGoogle(idToken: string) {
    if (!process.env.GOOGLE_CLIENT_ID) {
        throw Object.assign(new Error('Thiếu cấu hình GOOGLE_CLIENT_ID'), { code: 'INTERNAL_ERROR', status: 500 });
    }
    if (!idToken || idToken.split('.').length !== 3) {
        throw Object.assign(
            new Error('idToken không hợp lệ. Hãy gửi Google ID token (JWT), không phải Google API key.'),
            { code: 'BAD_REQUEST', status: 400 }
        );
    }

    let ticket;
    try {
        ticket = await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
    } catch (error) {
        throw Object.assign(new Error('Google ID token không hợp lệ hoặc đã hết hạn'), {
            code: 'UNAUTHORIZED',
            status: 401,
        });
    }
    const payload = ticket.getPayload();

    if (!payload || !payload.sub || !payload.email) {
        throw Object.assign(new Error('Google token không hợp lệ'), { code: 'UNAUTHORIZED', status: 401 });
    }
    if (!payload.email_verified) {
        throw Object.assign(new Error('Email Google chưa được xác minh'), { code: 'UNAUTHORIZED', status: 401 });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const displayName = payload.name ?? null;
    const avatarUrl = payload.picture ?? null;

    let user = await authRepo.findUserByGoogleId(googleId);

    if (!user) {
        const existingByEmail = await authRepo.findUserByEmail(email);
        if (existingByEmail) {
            user = await authRepo.updateUserById(existingByEmail.id, {
                googleId: existingByEmail.googleId ?? googleId,
                displayName: existingByEmail.displayName ?? displayName,
                avatarUrl: existingByEmail.avatarUrl ?? avatarUrl,
            });
        } else {
            user = await authRepo.createUser({
                email,
                password: null,
                googleId,
                displayName,
                avatarUrl,
            });
        }
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
