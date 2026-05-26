import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import adminRoutes from './modules/admin/admin.routes';
import homeRoutes from './modules/home/home.routes';
import labRoutes from './modules/lab/lab.routes';
import learningPlanRoutes from './modules/learning-plan/learning-plan.routes';
import missionsRoutes from './modules/missions/missions.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import scenesRoutes from './modules/scenes/scenes.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';
import usersRoutes from './modules/users/users.routes';
import vocabularyRoutes from './modules/vocabulary/vocabulary.routes';
import voicesRoutes from './modules/voices/voices.routes';

const app: Express = express();

app.use('/ui', express.static(path.resolve(process.cwd(), 'static')));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/learning-plan', learningPlanRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/vocabulary', vocabularyRoutes);
app.use('/api/voices', voicesRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

export default app;
