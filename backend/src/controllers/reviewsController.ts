import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Créer une review
 */
export const createReview = async (req: Request, res: Response) => {
  try {
    const { reviewed_user_id, event_id, rating, comment } = req.body;

    // Validation
    if (!reviewed_user_id || !event_id || !rating) {
      return res.status(400).json({
        success: false,
        error: 'reviewer_id, reviewed_user_id, event_id et rating sont requis',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'La note doit être entre 1 et 5',
      });
    }

    // Récupérer le reviewer_id depuis le header (si authentifié)
    const reviewer_id = req.headers['x-user-id'] as string;

    if (!reviewer_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    // Vérifier que l'utilisateur ne se note pas lui-même
    if (reviewer_id === reviewed_user_id) {
      return res.status(400).json({
        success: false,
        error: 'Vous ne pouvez pas vous noter vous-même',
      });
    }

    // Créer la review
    const review = await prisma.review.create({
      data: {
        reviewerId: reviewer_id,
        reviewedUserId: reviewed_user_id,
        eventId: event_id,
        rating,
        comment: comment || null,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        reviewedUser: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Mettre à jour la moyenne de l'utilisateur noté
    await updateUserRatingAverage(reviewed_user_id);

    res.status(201).json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('Erreur lors de la création de la review:', error);
    
    // Gérer l'erreur de doublon (contrainte unique)
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: 'Vous avez déjà noté cet utilisateur pour cet événement',
      });
    }

    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création de la review',
    });
  }
};

/**
 * Créer plusieurs reviews en une fois
 */
export const createMultipleReviews = async (req: Request, res: Response) => {
  try {
    const { reviews } = req.body;

    if (!Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Le champ reviews doit être un tableau non vide',
      });
    }

    const reviewer_id = req.headers['x-user-id'] as string;

    if (!reviewer_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    // Valider et préparer les reviews
    const validReviews = reviews
      .filter(r => r.reviewed_user_id !== reviewer_id) // Pas se noter soi-même
      .filter(r => r.rating >= 1 && r.rating <= 5) // Note valide
      .map(r => ({
        reviewerId: reviewer_id,
        reviewedUserId: r.reviewed_user_id,
        eventId: r.event_id,
        rating: r.rating,
        comment: r.comment || null,
      }));

    if (validReviews.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune review valide à créer',
      });
    }

    // Créer les reviews
    const createdReviews = await prisma.review.createMany({
      data: validReviews,
      skipDuplicates: true, // Ignorer les doublons
    });

    // Mettre à jour les moyennes de tous les utilisateurs notés
    const uniqueUserIds = [...new Set(validReviews.map(r => r.reviewedUserId))];
    await Promise.all(
      uniqueUserIds.map(userId => updateUserRatingAverage(userId))
    );

    res.status(201).json({
      success: true,
      data: {
        created_count: createdReviews.count,
        total_submitted: reviews.length,
      },
    });
  } catch (error: any) {
    console.error('Erreur lors de la création des reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la création des reviews',
    });
  }
};

/**
 * Récupérer les reviews d'un utilisateur
 */
export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        reviewedUserId: userId,
      },
      include: {
        reviewer: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des reviews:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des reviews',
    });
  }
};

/**
 * Récupérer les statistiques de reviews d'un utilisateur
 */
export const getUserReviewStats = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const reviews = await prisma.review.findMany({
      where: {
        reviewedUserId: userId,
      },
      select: {
        rating: true,
      },
    });

    const total_reviews = reviews.length;
    const rating_average = total_reviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews
      : 0;

    const reviews_by_rating = reviews.reduce((acc: any, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        rating_average: parseFloat(rating_average.toFixed(2)),
        rating_count: total_reviews,
        total_reviews,
        reviews_by_rating,
      },
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des stats:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la récupération des statistiques',
    });
  }
};

/**
 * Mettre à jour la moyenne des notes d'un utilisateur
 */
async function updateUserRatingAverage(userId: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        reviewedUserId: userId,
      },
      select: {
        rating: true,
      },
    });

    const count = reviews.length;
    const average = count > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / count
      : 0;

    await prisma.user.update({
      where: { id: userId },
      data: {
        ratingAverage: average.toFixed(2),
        ratingCount: count,
      },
    });

    console.log(`✅ Rating mis à jour pour ${userId}: ${average.toFixed(2)} (${count} avis)`);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du rating:', error);
  }
}

/**
 * Supprimer une review
 */
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { reviewId } = req.params;
    const reviewer_id = req.headers['x-user-id'] as string;

    if (!reviewer_id) {
      return res.status(401).json({
        success: false,
        error: 'Authentification requise',
      });
    }

    // Récupérer la review pour obtenir le reviewed_user_id
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: { reviewedUserId: true, reviewerId: true },
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Review non trouvée',
      });
    }

    // Vérifier que c'est bien le reviewer qui supprime
    if (review.reviewerId !== reviewer_id) {
      return res.status(403).json({
        success: false,
        error: 'Non autorisé',
      });
    }

    // Supprimer la review
    await prisma.review.delete({
      where: { id: reviewId },
    });

    // Mettre à jour la moyenne
    await updateUserRatingAverage(review.reviewedUserId);

    res.json({
      success: true,
      message: 'Review supprimée',
    });
  } catch (error) {
    console.error('Erreur lors de la suppression de la review:', error);
    res.status(500).json({
      success: false,
      error: 'Erreur lors de la suppression de la review',
    });
  }
};


