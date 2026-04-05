import { Level } from '@prisma/client';

export type AuthJwtPayload = {
  id: string;
  email: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
};

export type AuthUserRecord = {
  id: string;
  email: string;
  password: string | null;
  googleId: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: Level;
  learningGoal: string | null;
  studyFrequency: string | null;
  selfAssessment: string | null;
  needsLevelTest: boolean;
  levelTestedAt: Date | null;
  onboardingCompletedAt: Date | null;
  totalXp: number;
  streakDays: number;
  lastActiveDate: Date | null;
  isAdmin: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type SafeAuthUser = Omit<AuthUserRecord, 'password'> & {
  needsOnboarding: boolean;
};

export type AuthResponse = {
  user: SafeAuthUser;
  accessToken: string;
  refreshToken: string;
  isNewUser: boolean;
  needsLevelTest: boolean;
  needsOnboarding: boolean;
};
