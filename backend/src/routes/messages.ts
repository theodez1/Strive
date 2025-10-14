import { Router, Request, Response } from 'express';
import { prisma } from '../lib';

export const messagesRoutes = Router();

// GET /api/messages/conversation/:conversationId
messagesRoutes.get('/conversation/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const list = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });
    const payload = list.map((m) => ({
      _id: m.id,
      content: m.content,
      type: m.type || 'text',
      sender: m.sender ? { _id: m.sender.id, username: m.sender.username || undefined, firstName: m.sender.firstName || undefined, lastName: m.sender.lastName || undefined } : null,
      createdAt: m.createdAt?.toISOString?.() || new Date().toISOString(),
    }));
    res.json({ success: true, data: payload });
  } catch (e) {
    console.error('Erreur GET messages:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// POST /api/messages
messagesRoutes.post('/', async (req: Request, res: Response) => {
  try {
    const { content, conversationId, senderId, type } = req.body || {};
    if (!content || !conversationId) {
      return res.status(400).json({ success: false, error: 'content et conversationId requis' });
    }
    const msg = await prisma.message.create({
      data: {
        conversationId,
        content,
        senderId: senderId || undefined,
        type: type || 'text',
      },
      include: { sender: { select: { id: true, username: true, firstName: true, lastName: true } } }
    });
    await prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageId: msg.id } });
    const payload = {
      _id: msg.id,
      content: msg.content,
      type: msg.type || 'text',
      sender: msg.sender ? { _id: msg.sender.id, username: msg.sender.username || undefined, firstName: msg.sender.firstName || undefined, lastName: msg.sender.lastName || undefined } : null,
      createdAt: msg.createdAt?.toISOString?.() || new Date().toISOString(),
    };
    res.json({ success: true, data: payload });
  } catch (e) {
    console.error('Erreur POST message:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// DELETE /api/messages/:id
messagesRoutes.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await prisma.message.delete({ where: { id } });
    res.json({ success: true, data: { _id: deleted.id } });
  } catch (e) {
    res.status(404).json({ success: false, error: 'Message introuvable' });
  }
});

// POST /api/messages/:id/read - Marquer un message comme lu (SIMPLE)
messagesRoutes.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📖 Marquage du message ${id} comme lu...`);
    
    // Utiliser Prisma directement (pas de Supabase RLS)
    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { read: true },
      select: { id: true, read: true }
    });
    
    console.log(`✅ Message ${id} marqué comme lu:`, updatedMessage);
    res.json({ 
      success: true, 
      data: { 
        messageId: id, 
        read: updatedMessage.read 
      } 
    });
  } catch (e) {
    console.error('Erreur POST message read:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/messages/conversation/:conversationId/unread-count - Compter les messages non lus (SIMPLE)
messagesRoutes.get('/conversation/:conversationId/unread-count', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    console.log(`📊 Comptage des messages non lus pour la conversation ${conversationId}...`);
    
    // Utiliser Prisma directement (pas de Supabase RLS)
    const unreadCount = await prisma.message.count({
      where: {
        conversationId,
        read: false
      }
    });
    
    console.log(`✅ Nombre de messages non lus: ${unreadCount}`);
    res.json({ 
      success: true, 
      data: { unreadCount } 
    });
  } catch (e) {
    console.error('Erreur GET unread count:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/messages/conversation/:conversationId/with-read-status - Récupérer les messages avec statut de lecture (SIMPLE)
messagesRoutes.get('/conversation/:conversationId/with-read-status', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    console.log(`📥 Récupération des messages avec statut read pour la conversation ${conversationId}...`);
    
    // Utiliser Prisma directement (pas de Supabase RLS)
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: { 
        sender: { 
          select: { 
            id: true, 
            username: true, 
            firstName: true, 
            lastName: true 
          } 
        } 
      }
    });
    
    // Transformer les données pour correspondre au format attendu
    const payload = messages.map((m) => ({
      _id: m.id,
      content: m.content,
      type: m.type || 'text',
      sender: m.sender ? { 
        _id: m.sender.id, 
        username: m.sender.username || undefined, 
        firstName: m.sender.firstName || undefined, 
        lastName: m.sender.lastName || undefined 
      } : null,
      createdAt: m.createdAt?.toISOString?.() || new Date().toISOString(),
      read: m.read || false
    }));
    
    console.log(`✅ Messages récupérés avec statut read: ${payload.length}`);
    res.json({ success: true, data: payload });
  } catch (e) {
    console.error('Erreur GET messages with read status:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});

// GET /api/messages/:id/read-status - Récupérer le statut read d'un message (SIMPLE)
messagesRoutes.get('/:id/read-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📖 Récupération du statut read pour le message ${id}...`);
    
    // Utiliser Prisma directement (pas de Supabase RLS)
    const message = await prisma.message.findUnique({
      where: { id },
      select: { read: true }
    });
    
    if (!message) {
      return res.status(404).json({ 
        success: false, 
        error: 'Message non trouvé' 
      });
    }
    
    console.log(`✅ Statut read récupéré pour ${id}:`, message.read);
    res.json({ 
      success: true, 
      data: { 
        messageId: id, 
        read: message.read || false 
      } 
    });
  } catch (error) {
    console.error('💥 Erreur inattendue read-status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Erreur serveur lors de la récupération du statut read' 
    });
  }
});


