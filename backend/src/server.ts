import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { eventRoutes } from './routes/events';
import { conversationsRoutes } from './routes/conversations';
import { messagesRoutes } from './routes/messages';
import { healthRoutes } from './routes/health';
import eventLifecycleRoutes from './routes/eventLifecycle';
import notificationsRoutes from './routes/notifications';
import usersRoutes from './routes/users';
import reviewsRoutes from './routes/reviews';
import { scheduleExistingEvents } from './services/eventScheduler';
import os from 'os';

// Charger les variables d'environnement
dotenv.config();

const app: Express = express();
const PORT: number = Number(process.env.PORT) || 3001;

// Middleware de sécurité
app.use(helmet());
app.use(compression());

// Middleware CORS
app.use(cors({
  origin: true, // Permettre toutes les origines pour le développement
  credentials: true
}));

// Middleware de logging
app.use(morgan('combined'));

// Middleware pour parser le JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/event-lifecycle', eventLifecycleRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/reviews', reviewsRoutes);

// Route de base
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Strive Backend API',
    version: '1.0.0',
    status: 'running',
           endpoints: {
             health: '/api/health',
             events: '/api/events',
             conversations: '/api/conversations',
             messages: '/api/messages',
             eventLifecycle: '/api/event-lifecycle',
             notifications: '/api/notifications',
             users: '/api/users',
             reviews: '/api/reviews'
           }
  });
});

// Fonction utilitaire pour récupérer l'IP locale (LAN)
function getLocalLanIp(): string | null {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const netList = nets[name];
    if (!netList) continue;
    for (const net of netList) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return null;
}

// Middleware de gestion d'erreurs
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Erreur serveur:', err);
  res.status(500).json({
    error: 'Erreur interne du serveur',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Une erreur est survenue'
  });
});

// Middleware 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint non trouvé',
    path: req.originalUrl
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', async () => {
  const lanIp = getLocalLanIp();
  const hostForMobile = lanIp ? `http://${lanIp}:${PORT}` : `http://localhost:${PORT}`;

  console.log(`🚀 Serveur Strive démarré sur le port ${PORT}`);
  console.log(`📡 API (localhost): http://localhost:${PORT}`);
  console.log(`📡 API (mobile LAN): ${hostForMobile}`);
  console.log(`🏥 Health check: ${hostForMobile}/api/health`);
  console.log(`📅 Événements: ${hostForMobile}/api/events`);
  
  // Programmer les événements existants au démarrage
  try {
    await scheduleExistingEvents();
  } catch (error) {
    console.error('❌ Erreur lors de la programmation des événements existants:', error);
  }
});

export default app;
