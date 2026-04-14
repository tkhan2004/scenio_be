import { ConditionType, MissionType, Prisma } from '@prisma/client';
import prisma from '../../config/database';
import {
  CreateVocabularyInput,
  DeleteVocabularyParams,
  ListVocabularyQuery,
} from '../../schemas/vocabulary';
import * as missionsService from '../missions/missions.service';
import * as usersRepo from '../users/users.repository';
import * as vocabularyRepo from './vocabulary.repository';

type TodayMissionRecord = Awaited<ReturnType<typeof usersRepo.findTodayUserMissions>>[number];
type BadgeRecord = Awaited<ReturnType<typeof usersRepo.findActiveBadgesWithEarnedStatus>>[number];

/**
 * Helper - getTodayDateString
 * Summary: Trả về ngày hiện tại dạng YYYY-MM-DD để đồng bộ với mission progress.
 */
function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Helper - mapVocabularyItem
 * Summary: Chuẩn hóa user vocabulary record thành payload trả về cho client.
 */
function mapVocabularyItem(item: vocabularyRepo.UserVocabularyRecord) {
  return {
    id: item.id,
    word: item.sceneVocabulary?.word ?? item.word,
    definition: item.sceneVocabulary?.definition ?? item.definition,
    example: item.sceneVocabulary?.example ?? null,
    isMastered: item.isMastered,
    savedAt: item.savedAt,
    reviewedAt: item.reviewedAt,
    sourceSessionId: item.sourceSessionId,
    scene: item.sceneVocabulary
      ? {
          id: item.sceneVocabulary.scene.id,
          title: item.sceneVocabulary.scene.title,
          category: item.sceneVocabulary.scene.category,
          difficulty: item.sceneVocabulary.scene.difficulty,
        }
      : null,
  };
}

/**
 * Helper - isVocabularyBadgeEligible
 * Summary: Kiểm tra badge VOCAB_SAVED đã đủ điều kiện award hay chưa.
 */
function isVocabularyBadgeEligible(badge: BadgeRecord, savedVocabulary: number) {
  return badge.conditionType === ConditionType.VOCAB_SAVED
    && badge.userBadges.length === 0
    && savedVocabulary >= badge.conditionValue;
}

/**
 * Helper - updateSaveVocabularyMission
 * Summary: Tăng progress SAVE_VOCABULARY cho ngày hiện tại và cộng thưởng nếu mission vừa complete.
 */
async function updateSaveVocabularyMission(userId: string, today: string, tx: Prisma.TransactionClient) {
  const todayMissions = await usersRepo.findTodayUserMissions(userId, today, tx);
  let missionBonusXp = 0;

  for (const mission of todayMissions) {
    if (mission.mission.missionType !== MissionType.SAVE_VOCABULARY) {
      continue;
    }

    const nextValue = mission.currentValue + 1;
    const shouldComplete = !mission.isCompleted && nextValue >= mission.mission.targetValue;

    await usersRepo.updateUserMissionById(
      mission.id,
      {
        currentValue: nextValue,
        isCompleted: mission.isCompleted || shouldComplete,
        completedAt: shouldComplete ? new Date() : mission.completedAt,
      },
      tx,
    );

    if (shouldComplete) {
      missionBonusXp += mission.mission.xpReward;
    }
  }

  return missionBonusXp;
}

/**
 * Function Objective - listVocabulary
 * Summary: Lấy danh sách từ vựng đã lưu của user hiện tại.
 * Inputs: userId từ access token và query phân trang đã validate.
 * Behavior: Count tổng -> lấy page hiện tại -> chuẩn hóa payload vocabulary list.
 * Returns: Danh sách vocabulary cùng total, page, limit.
 */
export async function listVocabulary(userId: string, query: ListVocabularyQuery) {
  const skip = (query.page - 1) * query.limit;

  const [total, vocabulary] = await Promise.all([
    vocabularyRepo.countUserVocabulary(userId, query.isMastered),
    vocabularyRepo.findUserVocabulary({
      userId,
      skip,
      take: query.limit,
      isMastered: query.isMastered,
    }),
  ]);

  return {
    vocabulary: vocabulary.map(mapVocabularyItem),
    total,
    page: query.page,
    limit: query.limit,
  };
}

/**
 * Function Objective - createVocabulary
 * Summary: Lưu một từ mới vào vocabulary list của user theo chế độ auto hoặc manual.
 * Inputs: userId từ access token và payload đã validate.
 * Behavior: Validate duplicate/sourceSession -> create vocabulary -> update mission/badge vocab save nếu đủ điều kiện.
 * Returns: Từ vựng mới đã được lưu dưới format client-friendly.
 */
export async function createVocabulary(userId: string, input: CreateVocabularyInput) {
  const today = getTodayDateString();
  await missionsService.ensureTodayMissions(userId, today);

  return prisma.$transaction(async (tx) => {
    if (input.sourceSessionId) {
      const sourceSession = await vocabularyRepo.findOwnedSourceSession(userId, input.sourceSessionId, tx);
      if (!sourceSession) {
        throw Object.assign(new Error('Source session không tồn tại'), {
          code: 'NOT_FOUND',
          status: 404,
        });
      }
    }

    let created: vocabularyRepo.UserVocabularyRecord;

    if (input.sceneVocabularyId) {
      const sceneVocabulary = await vocabularyRepo.findSceneVocabularyById(input.sceneVocabularyId, tx);
      if (!sceneVocabulary) {
        throw Object.assign(new Error('Scene vocabulary không tồn tại'), {
          code: 'NOT_FOUND',
          status: 404,
        });
      }

      const duplicateById = await vocabularyRepo.findDuplicateUserVocabularyBySceneVocabularyId(
        userId,
        input.sceneVocabularyId,
        tx,
      );
      const duplicateByWord = await vocabularyRepo.findDuplicateUserVocabularyByWord(
        userId,
        sceneVocabulary.word,
        tx,
      );

      if (duplicateById || duplicateByWord) {
        throw Object.assign(new Error('Từ vựng này đã có trong danh sách học'), {
          code: 'BAD_REQUEST',
          status: 400,
        });
      }

      created = await vocabularyRepo.createUserVocabulary(
        {
          user: { connect: { id: userId } },
          sceneVocabulary: { connect: { id: sceneVocabulary.id } },
          sourceSessionId: input.sourceSessionId ?? null,
        },
        tx,
      );
    } else {
      const duplicate = await vocabularyRepo.findDuplicateUserVocabularyByWord(userId, input.word!, tx);
      if (duplicate) {
        throw Object.assign(new Error('Từ vựng này đã có trong danh sách học'), {
          code: 'BAD_REQUEST',
          status: 400,
        });
      }

      created = await vocabularyRepo.createUserVocabulary(
        {
          user: { connect: { id: userId } },
          word: input.word!,
          definition: input.definition!,
          sourceSessionId: input.sourceSessionId ?? null,
        },
        tx,
      );
    }

    const [savedVocabulary, badges] = await Promise.all([
      vocabularyRepo.countUserVocabulary(userId, undefined, tx),
      usersRepo.findActiveBadgesWithEarnedStatus(userId, tx),
    ]);

    const missionBonusXp = await updateSaveVocabularyMission(userId, today, tx);

    let badgeBonusXp = 0;
    for (const badge of badges) {
      if (!isVocabularyBadgeEligible(badge, savedVocabulary)) {
        continue;
      }

      await usersRepo.createUserBadge(
        {
          userId,
          badgeId: badge.id,
          earnedAt: new Date(),
        },
        tx,
      );
      badgeBonusXp += badge.xpReward;
    }

    if (missionBonusXp > 0 || badgeBonusXp > 0) {
      await usersRepo.updateUserById(
        userId,
        {
          totalXp: {
            increment: missionBonusXp + badgeBonusXp,
          },
        },
        tx,
      );
    }

    return {
      vocabulary: mapVocabularyItem(created),
    };
  });
}

/**
 * Function Objective - deleteVocabulary
 * Summary: Xóa một từ khỏi vocabulary list của user hiện tại.
 * Inputs: userId từ access token và params id đã validate.
 * Behavior: Kiểm tra ownership -> xóa bản ghi -> trả cờ deleted.
 * Returns: Cờ deleted để client cập nhật local state.
 */
export async function deleteVocabulary(userId: string, params: DeleteVocabularyParams) {
  const vocabulary = await vocabularyRepo.findUserVocabularyById(userId, params.id);
  if (!vocabulary) {
    throw Object.assign(new Error('Từ vựng không tồn tại'), { code: 'NOT_FOUND', status: 404 });
  }

  await vocabularyRepo.deleteUserVocabularyById(vocabulary.id);

  return {
    deleted: true,
  };
}
