import { AiProvider, Level, SceneCategory } from '@prisma/client';

export type SceneEmbeddingScene = {
  id: string;
  title: string;
  category: SceneCategory;
  description: string;
  missionText: string;
  difficulty: Level;
  characterName: string;
  characterRole: string;
  systemPrompt: string;
  isActive: boolean;
  vocabulary: Array<{
    word: string;
    definition: string;
    example: string;
    sortOrder: number;
  }>;
};

export type SemanticSceneMatch = {
  id: string;
  title: string;
  category: SceneCategory;
  description: string;
  missionText?: string;
  difficulty: Level;
  estimatedMinutes: number;
  characterName: string;
  characterRole: string;
  similarity: number;
};

export type SceneEmbeddingMetadata = {
  provider: AiProvider;
  modelId: string;
  outputDimension: number | null;
  embeddingDimension: number;
  fallbackUsed: boolean;
  embeddingValues?: number[];
};
