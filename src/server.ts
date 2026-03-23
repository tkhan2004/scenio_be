import app from './app';
import prisma from './config/database';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  try {
    // Check DB Connection
    await prisma.$connect();
    console.log('✅ Connected to database via Prisma');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Scenio Backend is running on http://localhost:${PORT}`);
    });

    // Graceful shutdown
    const shutdown = async () => {
      console.log('🛑 Shutting down server...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('Database disconnected.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (err: any) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

bootstrap();
