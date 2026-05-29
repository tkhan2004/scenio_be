import { Level, SessionModality, VoiceGender } from '@prisma/client';
import { z } from 'zod';

const contextTypeEnum = z.enum([
  'INTERVIEW',
  'WORK',
  'TRAVEL',
  'PHONE_CALL',
  'CUSTOMER_SERVICE',
  'SOCIAL',
  'MEDICAL',
  'OTHER',
]);

const conversationChannelEnum = z.enum(['IN_PERSON', 'PHONE_CALL', 'VIDEO_CALL']);
const timePressureEnum = z.enum(['LOW', 'MEDIUM', 'HIGH']);
const aiRelationshipEnum = z.enum([
  'INTERVIEWER',
  'CUSTOMER',
  'COLLEAGUE',
  'MANAGER',
  'SERVICE_STAFF',
  'STRANGER',
]);
const aiVoiceToneEnum = z.enum(['WARM', 'CALM', 'CONFIDENT', 'FRIENDLY', 'FORMAL']);
const aiSpeechSpeedEnum = z.enum(['SLOW', 'NORMAL', 'FAST']);
const conversationLengthEnum = z.enum(['SHORT', 'MEDIUM', 'LONG']);
const correctionStyleEnum = z.enum(['AFTER_RESPONSE', 'END_ONLY', 'GENTLE_INLINE', 'MINIMAL']);
const hintFrequencyEnum = z.enum(['OFF', 'LOW', 'MEDIUM', 'HIGH']);
const responseComplexityEnum = z.enum(['SIMPLE', 'BALANCED', 'CHALLENGING']);

export const startCustomSessionSchema = z.object({
  body: z.object({
    practiceGoal: z.string().trim().min(5, 'practiceGoal quá ngắn').max(180, 'practiceGoal quá dài'),
    successOutcome: z.string().trim().min(5).max(220).optional(),
    topicSummary: z.string().trim().min(5, 'topicSummary quá ngắn').max(220, 'topicSummary quá dài'),
    context: z.object({
      contextType: contextTypeEnum,
      location: z.string().trim().min(2).max(140).optional(),
      conversationChannel: conversationChannelEnum,
      timePressure: timePressureEnum.optional(),
      specialConditions: z.array(z.string().trim().min(1).max(120)).max(8).default([]),
    }),
    userProfile: z.object({
      userRole: z.string().trim().min(2, 'userRole quá ngắn').max(120, 'userRole quá dài'),
      userIntent: z.string().trim().min(3).max(220).optional(),
      userEnglishLevel: z.nativeEnum(Level).optional(),
      userPersonaNotes: z.string().trim().min(3).max(300).optional(),
    }),
    aiPersona: z.object({
      aiRole: z.string().trim().min(2, 'aiRole quá ngắn').max(120, 'aiRole quá dài'),
      aiDisplayName: z.string().trim().min(2, 'aiDisplayName quá ngắn').max(80, 'aiDisplayName quá dài'),
      aiRelationshipToUser: aiRelationshipEnum.optional(),
      aiPrimaryGoal: z.string().trim().min(3).max(220).optional(),
      aiBehaviorStyle: z.string().trim().min(3).max(160).optional(),
      aiGenderPresentation: z.nativeEnum(VoiceGender).default(VoiceGender.NEUTRAL),
      aiVoicePresetId: z.string().uuid('aiVoicePresetId không hợp lệ').optional(),
      aiVoiceTone: aiVoiceToneEnum.optional(),
      aiSpeechSpeed: aiSpeechSpeedEnum.optional(),
      aiAccentPreference: z.string().trim().min(2).max(40).optional(),
    }),
    learningConfig: z.object({
      difficulty: z.nativeEnum(Level).optional(),
      conversationLength: conversationLengthEnum.optional(),
      targetMinutes: z.coerce.number().int().min(5).max(30).optional(),
      correctionStyle: correctionStyleEnum.optional(),
      hintFrequency: hintFrequencyEnum.optional(),
      responseComplexity: responseComplexityEnum.optional(),
      focusSkills: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
      mustUseVocabulary: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
      avoidTopics: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
      customInstructions: z.string().trim().min(5).max(500).optional(),
    }),
    modality: z.nativeEnum(SessionModality).default(SessionModality.TEXT),
  }),
  query: z.object({}),
  params: z.object({}),
});

export type StartCustomSessionInput = z.infer<typeof startCustomSessionSchema>['body'];
