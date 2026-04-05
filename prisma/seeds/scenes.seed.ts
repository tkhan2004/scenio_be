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
    {
      key: 'restaurantOrder',
      title: 'At the Restaurant',
      category: SceneCategory.DAILY,
      description: 'Order food and drinks, ask for a recommendation, and request the bill politely.',
      missionText: 'Finish a full restaurant interaction from ordering to paying.',
      difficulty: Level.A2,
      characterName: 'Jake',
      characterRole: 'Waiter',
      systemPrompt: 'You are Jake, a friendly waiter in a busy restaurant. Stay warm, practical, and in character.',
      estimatedMinutes: 6,
      vocabulary: [
        { key: 'menu', word: 'menu', definition: 'the list of food and drinks available', example: 'Could I see the menu, please?' },
        { key: 'recommend', word: 'recommend', definition: 'to suggest something as a good choice', example: 'What do you recommend today?' },
        { key: 'bill', word: 'bill', definition: 'the paper that shows how much you need to pay', example: 'Could I get the bill when you have a moment?' },
      ],
    },
    {
      key: 'taxiRide',
      title: 'Taking a Taxi',
      category: SceneCategory.TRAVEL,
      description: 'Tell the driver your destination, ask about the route, and confirm the fare.',
      missionText: 'Reach your destination with clear and polite travel questions.',
      difficulty: Level.A1,
      characterName: 'Omar',
      characterRole: 'Taxi Driver',
      systemPrompt: 'You are Omar, a taxi driver helping a passenger reach their destination. Use easy English.',
      estimatedMinutes: 5,
      vocabulary: [
        { key: 'destination', word: 'destination', definition: 'the place where someone is going', example: 'My destination is the central station.' },
        { key: 'fare', word: 'fare', definition: 'the amount of money paid for a ride', example: 'How much is the fare to downtown?' },
        { key: 'traffic', word: 'traffic', definition: 'vehicles moving on the road', example: 'Is there a lot of traffic right now?' },
      ],
    },
    {
      key: 'networkingEvent',
      title: 'Networking Event',
      category: SceneCategory.SOCIAL,
      description: 'Introduce yourself at a professional event and keep a conversation going naturally.',
      missionText: 'Make a positive first impression and exchange interests.',
      difficulty: Level.B1,
      characterName: 'Nina',
      characterRole: 'Product Designer',
      systemPrompt: 'You are Nina, an approachable product designer at a networking event. Sound natural and interested.',
      estimatedMinutes: 7,
      vocabulary: [
        { key: 'industry', word: 'industry', definition: 'the business field or sector someone works in', example: 'Which industry do you work in?' },
        { key: 'collaborate', word: 'collaborate', definition: 'to work together with someone', example: 'Our teams often collaborate on launches.' },
        { key: 'insight', word: 'insight', definition: 'a useful understanding of something', example: 'That is a helpful insight about customer behavior.' },
      ],
    },
    {
      key: 'pharmacyVisit',
      title: 'At the Pharmacy',
      category: SceneCategory.DAILY,
      description: 'Describe simple symptoms, ask for medicine, and check usage instructions.',
      missionText: 'Explain what you need and understand how to take the medicine safely.',
      difficulty: Level.A2,
      characterName: 'Helen',
      characterRole: 'Pharmacist',
      systemPrompt: 'You are Helen, a calm pharmacist helping a customer choose medicine. Ask practical questions and keep it clear.',
      estimatedMinutes: 6,
      vocabulary: [
        { key: 'symptom', word: 'symptom', definition: 'a sign that shows someone may be sick', example: 'My main symptom is a sore throat.' },
        { key: 'tablet', word: 'tablet', definition: 'a small pill of medicine', example: 'Take one tablet after dinner.' },
        { key: 'dose', word: 'dose', definition: 'the amount of medicine to take at one time', example: 'What is the correct dose for adults?' },
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
