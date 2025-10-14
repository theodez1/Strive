import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/notifications/:userId - Récupérer les notifications d'un utilisateur
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        data: true,
        readAt: true,
        createdAt: true
      }
    });

    // Compter les notifications non lues
    const unreadCount = await prisma.notification.count({
      where: { 
        userId,
        readAt: null
      }
    });

    res.json({
      success: true,
      data: notifications,
      unreadCount
    });

  } catch (error) {
    console.error('Erreur GET /api/notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des notifications'
    });
  }
});

// POST /api/notifications/:notificationId/read - Marquer une notification comme lue
router.post('/:notificationId/read', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() }
    });

    res.json({
      success: true,
      data: notification,
      message: 'Notification marquée comme lue'
    });

  } catch (error) {
    console.error('Erreur POST /api/notifications/read:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage de la notification'
    });
  }
});

// POST /api/notifications/:userId/read-all - Marquer toutes les notifications comme lues
router.post('/:userId/read-all', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await prisma.notification.updateMany({
      where: { 
        userId,
        readAt: null
      },
      data: { readAt: new Date() }
    });

    res.json({
      success: true,
      data: { count: result.count },
      message: `${result.count} notification(s) marquée(s) comme lue(s)`
    });

  } catch (error) {
    console.error('Erreur POST /api/notifications/read-all:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors du marquage des notifications'
    });
  }
});

// DELETE /api/notifications/:notificationId - Supprimer une notification
router.delete('/:notificationId', async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;

    await prisma.notification.delete({
      where: { id: notificationId }
    });

    res.json({
      success: true,
      message: 'Notification supprimée'
    });

  } catch (error) {
    console.error('Erreur DELETE /api/notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la notification'
    });
  }
});

export default router;

