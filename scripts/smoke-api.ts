import 'dotenv/config';

type ApiResponse<T = any> = {
  success: boolean;
  status: number;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

type SmokeResult = {
  name: string;
  ok: boolean;
  detail: string;
};

const BASE_URL = (process.env.SMOKE_BASE_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
const ADMIN_EMAIL = process.env.SMOKE_ADMIN_EMAIL || 'admin@scenio.dev';
const ADMIN_PASSWORD = process.env.SMOKE_ADMIN_PASSWORD || '123456';
const LEARNER_EMAIL = process.env.SMOKE_LEARNER_EMAIL || 'learner@scenio.dev';
const LEARNER_PASSWORD = process.env.SMOKE_LEARNER_PASSWORD || '123456';

const results: SmokeResult[] = [];

function pushResult(name: string, ok: boolean, detail: string) {
  results.push({ name, ok, detail });
  const marker = ok ? 'PASS' : 'FAIL';
  console.log(`[${marker}] ${name} - ${detail}`);
}

function assertCondition(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}) {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const payload = await response.json().catch(() => null) as ApiResponse<T> | null;

  if (!payload) {
    throw new Error(`Non-JSON response: HTTP ${response.status}`);
  }
  if (!response.ok || payload.success === false) {
    throw new Error(`${payload.error?.code || response.status}: ${payload.error?.message || 'Request failed'}`);
  }

  return payload;
}

async function step(name: string, fn: () => Promise<string>) {
  try {
    const detail = await fn();
    pushResult(name, true, detail);
  } catch (error: any) {
    pushResult(name, false, error?.message || String(error));
  }
}

async function login(email: string, password: string) {
  const response = await request<{
    accessToken: string;
    user: {
      email: string;
      isAdmin?: boolean;
    };
  }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  if (!response.data?.accessToken) {
    throw new Error('Missing access token');
  }
  return response.data;
}

async function main() {
  console.log(`Scenio API smoke test`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log('');

  let adminToken = '';
  let learnerToken = '';

  await step('Admin login', async () => {
    const data = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
    assertCondition(data.user.isAdmin === true, 'Logged in user is not admin');
    adminToken = data.accessToken;
    return `${data.user.email}, token ok`;
  });

  await step('Learner login', async () => {
    const data = await login(LEARNER_EMAIL, LEARNER_PASSWORD);
    learnerToken = data.accessToken;
    return `${data.user.email}, token ok`;
  });

  await step('Verify learner token', async () => {
    const response = await request<{ user: { email: string } }>('/auth/verify-token', { token: learnerToken });
    return response.data?.user?.email || 'verified';
  });

  await step('Admin overview', async () => {
    const response = await request<any>('/admin/overview', { token: adminToken });
    const data = response.data || {};
    return `keys=${Object.keys(data).slice(0, 6).join(',') || 'ok'}`;
  });

  await step('Admin AI model catalog', async () => {
    const response = await request<any>('/admin/ai-models', { token: adminToken });
    const models = response.data?.models || response.data?.items || response.data?.catalog || [];
    const settings = response.data?.settings || response.data?.featureSettings || [];
    return `models=${Array.isArray(models) ? models.length : 'ok'}, settings=${Array.isArray(settings) ? settings.length : 'ok'}`;
  });

  await step('Home dashboard', async () => {
    const response = await request<any>('/home/dashboard', { token: learnerToken });
    const data = response.data || {};
    return `keys=${Object.keys(data).slice(0, 6).join(',') || 'ok'}`;
  });

  await step('Scene list', async () => {
    const response = await request<any>('/scenes?page=1&limit=3', { token: learnerToken });
    const scenes = response.data?.scenes || [];
    assertCondition(Array.isArray(scenes), 'Missing scenes array');
    return `scenes=${scenes.length}`;
  });

  await step('Scene search', async () => {
    const response = await request<any>('/scenes/search?q=airport&limit=3', { token: learnerToken });
    const scenes = response.data?.scenes || [];
    return `retrievalMode=${response.data?.retrievalMode || scenes[0]?.retrievalMode || 'unknown'}, scenes=${scenes.length}`;
  });

  await step('Scene recommend', async () => {
    const response = await request<any>('/scenes/recommend?limit=3', { token: learnerToken });
    const scenes = response.data?.scenes || [];
    return `retrievalMode=${response.data?.retrievalMode || 'unknown'}, focusSkill=${response.data?.focusSkill || 'unknown'}, scenes=${scenes.length}`;
  });

  await step('Learning plan current', async () => {
    const response = await request<any>('/learning-plan/current', { token: learnerToken });
    const steps = response.data?.steps || [];
    assertCondition(response.data?.plan?.status === 'ACTIVE', 'No active learning plan');
    return `focusSkill=${response.data.plan.focusSkill}, steps=${steps.length}, nextStep=${response.data?.nextStep?.title || 'none'}`;
  });

  const failed = results.filter((result) => !result.ok);
  console.log('');
  console.log(`Summary: ${results.length - failed.length}/${results.length} passed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
