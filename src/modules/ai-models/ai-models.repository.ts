import { AiFeatureType, Prisma } from '@prisma/client';
import prisma from '../../config/database';

const aiModelSelect = {
  id: true,
  featureType: true,
  provider: true,
  modelId: true,
  displayName: true,
  description: true,
  inputModalities: true,
  outputType: true,
  dimensionOptions: true,
  defaultDimension: true,
  config: true,
  isActive: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.AiModelCatalogSelect;

const aiFeatureSettingSelect = {
  id: true,
  featureType: true,
  fallbackModelIds: true,
  outputDimension: true,
  config: true,
  updatedAt: true,
  activeModel: {
    select: aiModelSelect,
  },
} satisfies Prisma.AiFeatureSettingSelect;

const aiBenchmarkSelect = {
  id: true,
  modelCatalogId: true,
  featureType: true,
  provider: true,
  providerModelId: true,
  outputDimension: true,
  embeddingDimension: true,
  latencyMs: true,
  success: true,
  errorMessage: true,
  createdAt: true,
} satisfies Prisma.AiModelBenchmarkSelect;

export type AiModelRecord = Prisma.AiModelCatalogGetPayload<{ select: typeof aiModelSelect }>;
export type AiFeatureSettingRecord = Prisma.AiFeatureSettingGetPayload<{ select: typeof aiFeatureSettingSelect }>;
export type AiBenchmarkRecord = Prisma.AiModelBenchmarkGetPayload<{ select: typeof aiBenchmarkSelect }>;

/**
 * Repository - AI Models
 * Summary: Quản lý catalog model, active setting theo feature, và benchmark records.
 */

/**
 * Query Objective - findAiModels
 * Summary: Lấy catalog model cho admin, có thể filter theo feature.
 */
export async function findAiModels(featureType?: AiFeatureType) {
  return prisma.aiModelCatalog.findMany({
    where: {
      featureType,
    },
    orderBy: [
      { featureType: 'asc' },
      { isActive: 'desc' },
      { provider: 'asc' },
      { displayName: 'asc' },
    ],
    select: aiModelSelect,
  });
}

/**
 * Query Objective - findAiFeatureSettings
 * Summary: Lấy active model hiện tại của từng feature.
 */
export async function findAiFeatureSettings(featureType?: AiFeatureType) {
  return prisma.aiFeatureSetting.findMany({
    where: {
      featureType,
    },
    orderBy: {
      featureType: 'asc',
    },
    select: aiFeatureSettingSelect,
  });
}

/**
 * Query Objective - findAiModelById
 * Summary: Lấy một model catalog theo id để connect hoặc benchmark.
 */
export async function findAiModelById(modelId: string) {
  return prisma.aiModelCatalog.findUnique({
    where: {
      id: modelId,
    },
    select: aiModelSelect,
  });
}

/**
 * Query Objective - findAiModelsByIds
 * Summary: Lấy fallback models theo danh sách id, service sẽ tự giữ đúng thứ tự.
 */
export async function findAiModelsByIds(modelIds: string[]) {
  if (modelIds.length === 0) return [];

  return prisma.aiModelCatalog.findMany({
    where: {
      id: {
        in: modelIds,
      },
      isActive: true,
    },
    select: aiModelSelect,
  });
}

/**
 * Query Objective - findActiveFeatureSetting
 * Summary: Lấy active setting của một feature kèm model đang được chọn.
 */
export async function findActiveFeatureSetting(featureType: AiFeatureType) {
  return prisma.aiFeatureSetting.findUnique({
    where: {
      featureType,
    },
    select: aiFeatureSettingSelect,
  });
}

/**
 * Query Objective - upsertFeatureSetting
 * Summary: Chọn active model cho feature và lưu option runtime như outputDimension.
 */
export async function upsertFeatureSetting(input: {
  featureType: AiFeatureType;
  activeModelId: string;
  fallbackModelIds?: string[];
  outputDimension?: number | null;
  config?: Prisma.InputJsonValue | typeof Prisma.JsonNull;
}) {
  return prisma.aiFeatureSetting.upsert({
    where: {
      featureType: input.featureType,
    },
    update: {
      activeModelId: input.activeModelId,
      fallbackModelIds: input.fallbackModelIds ?? [],
      outputDimension: input.outputDimension,
      config: input.config,
    },
    create: {
      featureType: input.featureType,
      activeModelId: input.activeModelId,
      fallbackModelIds: input.fallbackModelIds ?? [],
      outputDimension: input.outputDimension,
      config: input.config,
    },
    select: aiFeatureSettingSelect,
  });
}

/**
 * Query Objective - createBenchmark
 * Summary: Lưu kết quả benchmark/connect test để admin so sánh model.
 */
export async function createBenchmark(data: Prisma.AiModelBenchmarkUncheckedCreateInput) {
  return prisma.aiModelBenchmark.create({
    data,
    select: aiBenchmarkSelect,
  });
}
