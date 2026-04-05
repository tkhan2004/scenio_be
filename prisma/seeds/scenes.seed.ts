import { Level, Scene, SceneCategory, SceneVocabulary } from '@prisma/client';
import { SeedEntityMap, prisma } from './helpers';

type SceneSeedDefinition = {
  key: string;
  title: string;
  category: SceneCategory;
  description: string;
  missionText: string;
  difficulty: Level;
  characterName: string;
  characterRole: string;
  systemPrompt: string;
  estimatedMinutes: number;
  vocabulary: {
    key: string;
    word: string;
    definition: string;
    example: string;
  }[];
};

type SeedScenesResult = {
  scenes: SeedEntityMap<Scene>;
  sceneVocabulary: SeedEntityMap<SceneVocabulary>;
};

async function upsertScene(definition: SceneSeedDefinition) {
  const existing = await prisma.scene.findFirst({
    where: { title: definition.title },
    select: { id: true },
  });

  const data = {
    title: definition.title,
    category: definition.category,
    description: definition.description,
    missionText: definition.missionText,
    difficulty: definition.difficulty,
    estimatedMinutes: definition.estimatedMinutes,
    characterName: definition.characterName,
    characterRole: definition.characterRole,
    systemPrompt: definition.systemPrompt,
    isActive: true,
  };

  if (existing) {
    return prisma.scene.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.scene.create({ data });
}

export async function seedScenes(): Promise<SeedScenesResult> {
  const definitions: SceneSeedDefinition[] = [
    {
      key: 'coffeeShop',
      title: 'At the Coffee Shop',
      category: SceneCategory.DAILY,
      description: 'Order a drink and ask follow-up questions politely.',
      missionText: 'Order confidently and confirm details with the barista.',
      difficulty: Level.A2,
      characterName: 'Mia',
      characterRole: 'Barista',
      systemPrompt: 'You are Mia, a friendly barista. Keep replies short and natural.',
      estimatedMinutes: 6,
      vocabulary: [
        { key: 'latte', word: 'latte', definition: 'a coffee drink made with espresso and milk', example: 'I would like a hot latte with oat milk.' },
        { key: 'receipt', word: 'receipt', definition: 'a paper that shows payment information', example: 'Can I have the receipt, please?' },
        { key: 'size', word: 'medium', definition: 'the middle size option', example: 'A medium drink is enough for me.' },
      ],
    },
    {
      key: 'airportCheckIn',
      title: 'Airport Check-in',
      category: SceneCategory.TRAVEL,
      description: 'Check in luggage and ask about gate, boarding time, and seat.',
      missionText: 'Complete check-in with clear travel questions.',
      difficulty: Level.A2,
      characterName: 'David',
      characterRole: 'Check-in Staff',
      systemPrompt: 'You are David at airport check-in. Be clear, professional, and concise.',
      estimatedMinutes: 7,
      vocabulary: [
        { key: 'boardingPass', word: 'boarding pass', definition: 'a document that allows a passenger to board a plane', example: 'Could you print my boarding pass again?' },
        { key: 'gate', word: 'gate', definition: 'the area where passengers board the aircraft', example: 'What gate does my flight leave from?' },
        { key: 'luggage', word: 'luggage', definition: 'bags and suitcases for travel', example: 'I only have one piece of luggage.' },
      ],
    },
    {
      key: 'hotelCheckIn',
      title: 'Hotel Check-in',
      category: SceneCategory.TRAVEL,
      description: 'Check into a hotel and ask simple questions about your room.',
      missionText: 'Confirm your booking and ask for basic hotel information.',
      difficulty: Level.A1,
      characterName: 'Anna',
      characterRole: 'Receptionist',
      systemPrompt: 'You are Anna, a helpful hotel receptionist. Use simple English.',
      estimatedMinutes: 5,
      vocabulary: [
        { key: 'reservation', word: 'reservation', definition: 'a booking made in advance', example: 'I have a reservation under Nguyen.' },
        { key: 'roomKey', word: 'room key', definition: 'a key or card to open a hotel room', example: 'Where can I get my room key?' },
        { key: 'breakfast', word: 'breakfast', definition: 'the morning meal', example: 'Is breakfast included in the room price?' },
      ],
    },
    {
      key: 'jobInterview',
      title: 'Job Interview',
      category: SceneCategory.WORK,
      description: 'Introduce yourself, describe your experience, and answer interview questions.',
      missionText: 'Present your background clearly and ask one thoughtful question.',
      difficulty: Level.B1,
      characterName: 'Sarah Mitchell',
      characterRole: 'HR Manager',
      systemPrompt: 'You are Sarah Mitchell, an HR manager conducting a professional interview.',
      estimatedMinutes: 10,
      vocabulary: [
        { key: 'strength', word: 'strength', definition: 'a personal quality you do well', example: 'One of my strengths is clear communication.' },
        { key: 'experience', word: 'experience', definition: 'knowledge or skill from previous work', example: 'I have two years of experience in customer support.' },
        { key: 'responsibility', word: 'responsibility', definition: 'a task or duty you are expected to do', example: 'My main responsibility was handling client requests.' },
      ],
    },
    {
      key: 'weekendPlans',
      title: 'Making Weekend Plans',
      category: SceneCategory.SOCIAL,
      description: 'Chat with a friend about free time and suggest activities.',
      missionText: 'Suggest a plan and agree on a time to meet.',
      difficulty: Level.A1,
      characterName: 'Lily',
      characterRole: 'Friend',
      systemPrompt: 'You are Lily, a close friend making relaxed weekend plans.',
      estimatedMinutes: 5,
      vocabulary: [
        { key: 'movie', word: 'movie', definition: 'a film that people watch for entertainment', example: 'Do you want to watch a movie on Saturday?' },
        { key: 'park', word: 'park', definition: 'a public outdoor area with grass and trees', example: 'We can walk in the park after lunch.' },
        { key: 'meetUp', word: 'meet up', definition: 'to come together in the same place', example: 'Let’s meet up at 3 p.m.' },
      ],
    },
    {
      key: 'teamStandup',
      title: 'Daily Team Standup',
      category: SceneCategory.WORK,
      description: 'Give a short update about progress, blockers, and next steps.',
      missionText: 'Deliver a concise update and explain one blocker professionally.',
      difficulty: Level.B2,
      characterName: 'Ethan',
      characterRole: 'Engineering Lead',
      systemPrompt: 'You are Ethan, an engineering lead running a fast-paced standup meeting.',
      estimatedMinutes: 8,
      vocabulary: [
        { key: 'blocker', word: 'blocker', definition: 'a problem that stops progress', example: 'My main blocker is waiting for API access.' },
        { key: 'timeline', word: 'timeline', definition: 'a schedule for when work will be completed', example: 'The current timeline is still on track.' },
        { key: 'handoff', word: 'handoff', definition: 'passing work to another person or team', example: 'The handoff to QA will happen this afternoon.' },
      ],
    },
  ];

  const scenes: SeedEntityMap<Scene> = {};
  const sceneVocabulary: SeedEntityMap<SceneVocabulary> = {};

  for (const definition of definitions) {
    const scene = await upsertScene(definition);
    scenes[definition.key] = scene;

    await prisma.sceneVocabulary.deleteMany({
      where: { sceneId: scene.id },
    });

    await prisma.sceneVocabulary.createMany({
      data: definition.vocabulary.map((item, index) => ({
        sceneId: scene.id,
        word: item.word,
        definition: item.definition,
        example: item.example,
        sortOrder: index,
      })),
    });

    const vocabularyRows = await prisma.sceneVocabulary.findMany({
      where: { sceneId: scene.id },
      orderBy: { sortOrder: 'asc' },
    });

    for (const row of vocabularyRows) {
      const vocabularyDefinition = definition.vocabulary.find((item) => item.word === row.word);
      const key = `${definition.key}.${vocabularyDefinition?.key ?? row.word}`;
      sceneVocabulary[key] = row;
    }
  }

  return { scenes, sceneVocabulary };
}
