import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST /api/users/device-token - Ajouter/mettre à jour un device token
router.post('/device-token', async (req: Request, res: Response) => {
  try {
    const { token, deviceId, deviceName, platform, osVersion } = req.body;
    const userId = (req as any).user?.id; // Depuis le middleware d'auth

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'userId et token requis'
      });
    }

    // Récupérer l'utilisateur et ses tokens existants
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Ajouter le nouveau token s'il n'existe pas déjà
    const existingTokens = user.deviceTokens || [];
    const tokenExists = existingTokens.includes(token);

    let updatedTokens: string[];
    if (!tokenExists) {
      updatedTokens = [...existingTokens, token];
      console.log(`📱 Nouveau token ajouté pour l'utilisateur ${userId}: ${token.substring(0, 20)}...`);
    } else {
      updatedTokens = existingTokens;
      console.log(`📱 Token existant confirmé pour l'utilisateur ${userId}`);
    }

    // Mettre à jour en base
    await prisma.user.update({
      where: { id: userId },
      data: { 
        deviceTokens: updatedTokens,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      message: tokenExists ? 'Token confirmé' : 'Token ajouté avec succès',
      tokenCount: updatedTokens.length
    });

  } catch (error) {
    console.error('Erreur POST /api/users/device-token:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de l\'ajout du token'
    });
  }
});

// DELETE /api/users/device-token - Supprimer un device token
router.delete('/device-token', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const userId = (req as any).user?.id;

    if (!userId || !token) {
      return res.status(400).json({
        success: false,
        error: 'userId et token requis'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    // Supprimer le token
    const updatedTokens = (user.deviceTokens || []).filter(t => t !== token);

    await prisma.user.update({
      where: { id: userId },
      data: { 
        deviceTokens: updatedTokens,
        updatedAt: new Date()
      }
    });

    console.log(`📱 Token supprimé pour l'utilisateur ${userId}`);

    res.json({
      success: true,
      message: 'Token supprimé avec succès',
      tokenCount: updatedTokens.length
    });

  } catch (error) {
    console.error('Erreur DELETE /api/users/device-token:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression du token'
    });
  }
});

// GET /api/users/device-tokens - Récupérer tous les tokens d'un utilisateur
router.get('/device-tokens', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'userId requis'
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { deviceTokens: true }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Utilisateur non trouvé'
      });
    }

    res.json({
      success: true,
      data: {
        tokens: user.deviceTokens || [],
        count: (user.deviceTokens || []).length
      }
    });

  } catch (error) {
    console.error('Erreur GET /api/users/device-tokens:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des tokens'
    });
  }
});

export default router;

