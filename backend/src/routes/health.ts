import express from 'express';
import { prisma } from '../lib';

const router = express.Router();

// Health check simple
router.get('/', async (req, res) => {
  try {
    // Test de connexion à la base de données
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: 'connected'
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check détaillé
router.get('/detailed', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Test de connexion DB
    await prisma.$queryRaw`SELECT 1`;
    const dbTime = Date.now() - startTime;
    
    // Statistiques de la base
    const [userCount, eventCount] = await Promise.all([
      prisma.user.count(),
      prisma.event.count()
    ]);
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: 'connected',
        responseTime: `${dbTime}ms`,
        users: userCount,
        events: eventCount
      },
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
      }
    });
  } catch (error) {
    console.error('Detailed health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as healthRoutes };
