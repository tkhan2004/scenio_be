import { UpdateMeInput, UpdateOnboardingInput } from '../../schemas/users';
import * as usersRepo from './users.repository';

function buildUserProfile(user: NonNullable<Awaited<ReturnType<typeof usersRepo.findPublicUserProfileById>>>) {
  return {
    ...user,
    needsOnboarding: user.onboardingCompletedAt === null,
  };
}

/**
 * Function Objective - getMe
 * Summary: Lấy profile public đầy đủ của user hiện tại.
 * Inputs: userId từ access token đã verify.
 * Behavior: Query profile client-safe -> throw nếu không tồn tại -> bổ sung needsOnboarding.
 * Returns: Object user profile dùng cho màn hình profile hoặc settings.
 */
export async function getMe(userId: string) {
  const user = await usersRepo.findPublicUserProfileById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  return {
    user: buildUserProfile(user),
  };
}

/**
 * Function Objective - updateOnboarding
 * Summary: Lưu kết quả hoặc trạng thái skip của onboarding survey.
 * Inputs: userId và payload onboarding đã validate.
 * Behavior: Kiểm tra user tồn tại -> update survey fields -> đánh dấu onboarding completed.
 * Returns: Cờ updated để client xác nhận lưu thành công.
 */
export async function updateOnboarding(userId: string, input: UpdateOnboardingInput) {
  const user = await usersRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  await usersRepo.updateUserById(userId, {
    learningGoal: input.learningGoal ?? null,
    studyFrequency: input.studyFrequency ?? null,
    selfAssessment: input.selfAssessment ?? null,
    onboardingCompletedAt: new Date(),
  });

  return { updated: true };
}

/**
 * Function Objective - updateMe
 * Summary: Cập nhật profile cơ bản của user hiện tại.
 * Inputs: userId và payload profile đã validate.
 * Behavior: Kiểm tra user tồn tại -> update displayName/avatarUrl -> trả profile mới.
 * Returns: User profile mới sau khi cập nhật thành công.
 */
export async function updateMe(userId: string, input: UpdateMeInput) {
  const user = await usersRepo.findUserById(userId);
  if (!user) {
    throw Object.assign(new Error('Người dùng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  const updatedUser = await usersRepo.updateUserById(userId, {
    displayName: input.displayName,
    avatarUrl: input.avatarUrl,
  });

  return {
    user: buildUserProfile({
      id: updatedUser.id,
      email: updatedUser.email,
      googleId: updatedUser.googleId,
      displayName: updatedUser.displayName,
      avatarUrl: updatedUser.avatarUrl,
      level: updatedUser.level,
      learningGoal: updatedUser.learningGoal,
      studyFrequency: updatedUser.studyFrequency,
      selfAssessment: updatedUser.selfAssessment,
      needsLevelTest: updatedUser.needsLevelTest,
      levelTestedAt: updatedUser.levelTestedAt,
      onboardingCompletedAt: updatedUser.onboardingCompletedAt,
      totalXp: updatedUser.totalXp,
      streakDays: updatedUser.streakDays,
      lastActiveDate: updatedUser.lastActiveDate,
      isAdmin: updatedUser.isAdmin,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    }),
  };
}
