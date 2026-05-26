import { Prisma, VoiceGender } from '@prisma/client';
import prisma from '../../config/database';

const voiceProfileSelect = {
  id: true,
  displayName: true,
  description: true,
  gender: true,
  locale: true,
  accent: true,
  provider: true,
  providerVoiceId: true,
  realtimeProvider: true,
  realtimeVoiceId: true,
  styleTags: true,
  sampleText: true,
  sampleUrl: true,
  latencyTier: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.VoiceProfileSelect;

const sceneVoicePresetSelect = {
  id: true,
  sceneId: true,
  defaultVoice: {
    select: voiceProfileSelect,
  },
  defaultMaleVoice: {
    select: voiceProfileSelect,
  },
  defaultFemaleVoice: {
    select: voiceProfileSelect,
  },
} satisfies Prisma.SceneVoicePresetSelect;

export type VoiceProfileRecord = Prisma.VoiceProfileGetPayload<{ select: typeof voiceProfileSelect }>;
export type SceneVoicePresetRecord = Prisma.SceneVoicePresetGetPayload<{ select: typeof sceneVoicePresetSelect }>;

function buildVoiceWhere(search?: string, gender?: VoiceGender) {
  return {
    isActive: true,
    ...(gender ? { gender } : {}),
    ...(search
      ? {
          OR: [
            { displayName: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { accent: { contains: search, mode: 'insensitive' as const } },
            { locale: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
  };
}

/**
 * Repository - Voices
 * Summary: Quản lý dữ liệu voice catalog, scene presets, và voice selection cho session.
 */

/**
 * Query Objective - countVoices
 * Summary: Đếm số voice active phục vụ phân trang.
 * Query Shape: count theo isActive + filter gender/search nếu có.
 */
export async function countVoices(search?: string, gender?: VoiceGender) {
  return prisma.voiceProfile.count({
    where: buildVoiceWhere(search, gender),
  });
}

/**
 * Query Objective - findVoices
 * Summary: Lấy danh sách voice active để render catalog.
 * Query Shape: findMany theo isActive + filter + order displayName.
 */
export async function findVoices(args: {
  skip: number;
  take: number;
  search?: string;
  gender?: VoiceGender;
}) {
  return prisma.voiceProfile.findMany({
    where: buildVoiceWhere(args.search, args.gender),
    orderBy: [{ displayName: 'asc' }],
    skip: args.skip,
    take: args.take,
    select: voiceProfileSelect,
  });
}

/**
 * Query Objective - findVoiceById
 * Summary: Lấy chi tiết một voice active theo id.
 * Query Shape: findFirst theo id + isActive.
 */
export async function findVoiceById(id: string) {
  return prisma.voiceProfile.findFirst({
    where: {
      id,
      isActive: true,
    },
    select: voiceProfileSelect,
  });
}

/**
 * Query Objective - findPreferredVoiceByGender
 * Summary: Chọn một voice active đầu tiên theo gender để làm fallback cho custom practice.
 * Query Shape: findFirst theo isActive + gender, order displayName asc.
 */
export async function findPreferredVoiceByGender(gender: VoiceGender) {
  return prisma.voiceProfile.findFirst({
    where: {
      isActive: true,
      gender,
    },
    orderBy: [{ displayName: 'asc' }],
    select: voiceProfileSelect,
  });
}

/**
 * Query Objective - findAnyActiveVoice
 * Summary: Chọn một voice active bất kỳ để fallback cuối cùng.
 * Query Shape: findFirst theo isActive, order displayName asc.
 */
export async function findAnyActiveVoice() {
  return prisma.voiceProfile.findFirst({
    where: {
      isActive: true,
    },
    orderBy: [{ displayName: 'asc' }],
    select: voiceProfileSelect,
  });
}

/**
 * Query Objective - findAllActiveVoices
 * Summary: Lấy toàn bộ active voices để chạy rule-based selection cho custom practice.
 * Query Shape: findMany theo isActive, order displayName asc.
 */
export async function findAllActiveVoices() {
  return prisma.voiceProfile.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ displayName: 'asc' }],
    select: voiceProfileSelect,
  });
}

/**
 * Query Objective - findSceneById
 * Summary: Kiểm tra scene active tồn tại trước khi trả voice preset.
 * Query Shape: findFirst theo scene id + isActive.
 */
export async function findSceneById(sceneId: string) {
  return prisma.scene.findFirst({
    where: {
      id: sceneId,
      isActive: true,
    },
    select: {
      id: true,
      title: true,
      category: true,
      characterName: true,
      characterRole: true,
    },
  });
}

/**
 * Query Objective - findSceneVoicePreset
 * Summary: Lấy preset quick-pick voice cho scene.
 * Query Shape: findUnique theo sceneId + include default/male/female voice.
 */
export async function findSceneVoicePreset(sceneId: string) {
  return prisma.sceneVoicePreset.findUnique({
    where: { sceneId },
    select: sceneVoicePresetSelect,
  });
}
