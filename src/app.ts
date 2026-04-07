import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import 'dotenv/config';
import path from 'path';

import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import homeRoutes from './modules/home/home.routes';
import missionsRoutes from './modules/missions/missions.routes';
import scenesRoutes from './modules/scenes/scenes.routes';
import sessionsRoutes from './modules/sessions/sessions.routes';
import usersRoutes from './modules/users/users.routes';

const app: Express = express();

app.use('/ui', express.static(path.resolve(process.cwd(), 'static')));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/missions', missionsRoutes);
app.use('/api/scenes', scenesRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/users', usersRoutes);

app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ ok: true, timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

app.use(errorHandler);

export default app;
