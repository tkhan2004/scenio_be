import { seedActivityData } from './activity.seed';
import { seedBadges } from './badges.seed';
import { seedMissions } from './missions.seed';
import { seedScenes } from './scenes.seed';
import { TEST_PASSWORD } from './helpers';
import { seedUsers } from './users.seed';

export async function runDatabaseSeeds() {
  const { users, refreshTokens } = await seedUsers();
  const { scenes, sceneVocabulary } = await seedScenes();
  const missions = await seedMissions();
  const badges = await seedBadges();
  const { sessions } = await seedActivityData({
    users,
    scenes,
    sceneVocabulary,
    missions,
    badges,
  });

  console.log('Database seed completed.');
  console.log('Sample logins:');
  console.log(`- admin@scenio.dev / ${TEST_PASSWORD}`);
  console.log(`- learner@scenio.dev / ${TEST_PASSWORD}`);
  console.log(`- beginner@scenio.dev / ${TEST_PASSWORD}`);
  console.log(`- xp-tester@scenio.dev / ${TEST_PASSWORD}`);
  console.log(`- newcomer@scenio.dev / ${TEST_PASSWORD}`);
  console.log('Seed summary:');
  console.log(`- Users: ${Object.keys(users).length}`);
  console.log(`- Refresh tokens: ${Object.keys(refreshTokens).length}`);
  console.log(`- Scenes: ${Object.keys(scenes).length}`);
  console.log(`- Vocabulary entries: ${Object.keys(sceneVocabulary).length}`);
  console.log(`- Missions: ${Object.keys(missions).length}`);
  console.log(`- Badges: ${Object.keys(badges).length}`);
  console.log(`- Sessions: ${Object.keys(sessions).length}`);
}
