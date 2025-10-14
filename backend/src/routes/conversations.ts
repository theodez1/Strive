import { Router, Request, Response } from 'express';
import { prisma } from '../lib';

export const conversationsRoutes = Router();

// GET /api/conversations/user/:userId
conversationsRoutes.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    // Conversations = une par événement. Récupérer les events où l'utilisateur est orga ou participant
    const orgEvents = await prisma.event.findMany({
      where: { organizerId: userId },
      select: { id: true, name: true, dateTime: true, duration: true }
    });

    const partEvents = await prisma.participant.findMany({
      where: { userId },
      select: { event: { select: { id: true, name: true, dateTime: true, duration: true } } }
    });

    const eventsMap: Record<string, { id: string; name: string; dateTime: Date; duration: number | null }> = {};
    orgEvents.forEach(e => { eventsMap[e.id] = { id: e.id, name: e.name, dateTime: e.dateTime, duration: e.duration }; });
    partEvents.forEach(pe => {
      const e = pe.event as any;
      eventsMap[e.id] = eventsMap[e.id] || { id: e.id, name: e.name, dateTime: e.dateTime, duration: e.duration };
    });

    const eventIds = Object.keys(eventsMap);
    if (eventIds.length === 0) return res.json({ success: true, data: [] });

    // Récupérer conversations par event
    const conversations = await prisma.conversation.findMany({
      where: { eventId: { in: eventIds } },
      include: { event: true }
    });

    // Récupérer participants par event
    const participantsByEvent = await prisma.participant.findMany({
      where: { eventId: { in: eventIds } },
      select: { userId: true, user: { select: { username: true, firstName: true, lastName: true } } }
    });

    const participantsMap: Record<string, Array<{ id: string; username?: string | null; firstName?: string | null; lastName?: string | null }>> = {};
    participantsByEvent.forEach(p => {
      const eid = (p as any).eventId || (p as any).event_id || (p as any).event?.id;
      if (!participantsMap[eid]) participantsMap[eid] = [];
      participantsMap[eid].push({ id: p.userId, username: p.user?.username, firstName: p.user?.firstName, lastName: p.user?.lastName });
    });

    // Ajouter l'organisateur comme participant minimal
    const organizers = await prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, organizerId: true } });
    organizers.forEach(o => {
      if (!participantsMap[o.id]) participantsMap[o.id] = [];
      if (!participantsMap[o.id].some(p => p.id === o.organizerId)) participantsMap[o.id].push({ id: o.organizerId });
    });

    // Récupérer last message pour chaque conversation
    const convIds = conversations.map(c => c.id);
    const lastMessages = await prisma.message.findMany({
      where: { conversationId: { in: convIds } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, conversationId: true, content: true, createdAt: true, senderId: true, read: true }
    });
    const lastMap: Record<string, { content?: string; createdAt?: Date; senderId?: string; read?: boolean }> = {};
    lastMessages.forEach(m => { if (!lastMap[m.conversationId]) lastMap[m.conversationId] = { content: m.content, createdAt: m.createdAt || undefined, senderId: m.senderId, read: m.read ?? false }; });

    const payload = conversations.map(c => {
      const ev = eventsMap[c.eventId];
      return {
        _id: c.id,
        eventId: ev ? { _id: ev.id, name: ev.name, dateTime: ev.dateTime?.toISOString?.() || ev.dateTime, duration: ev.duration || 120 } : null,
        participants: participantsMap[c.eventId] || [],
        lastMessage: lastMap[c.id]?.content || '',
        lastMessageSenderId: lastMap[c.id]?.senderId,
        lastMessageRead: lastMap[c.id]?.read ?? false,
        createdAt: c.createdAt?.toISOString?.() || new Date().toISOString(),
        updatedAt: c.updatedAt?.toISOString?.() || new Date().toISOString(),
      };
    });

    res.json({ success: true, data: payload });
  } catch (e) {
    console.error('Erreur conversations/user:', e);
    res.status(500).json({ success: false, error: 'Erreur serveur' });
  }
});
