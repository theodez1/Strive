import express from 'express';
import {
  createReview,
  createMultipleReviews,
  getUserReviews,
  getUserReviewStats,
  deleteReview,
} from '../controllers/reviewsController';

const router = express.Router();

/**
 * @route   POST /api/reviews
 * @desc    Créer une review
 * @access  Private
 */
router.post('/', createReview);

/**
 * @route   POST /api/reviews/batch
 * @desc    Créer plusieurs reviews en une fois
 * @access  Private
 */
router.post('/batch', createMultipleReviews);

/**
 * @route   GET /api/reviews/user/:userId
 * @desc    Récupérer les reviews d'un utilisateur
 * @access  Public
 */
router.get('/user/:userId', getUserReviews);

/**
 * @route   GET /api/reviews/user/:userId/stats
 * @desc    Récupérer les statistiques de reviews d'un utilisateur
 * @access  Public
 */
router.get('/user/:userId/stats', getUserReviewStats);

/**
 * @route   DELETE /api/reviews/:reviewId
 * @desc    Supprimer une review
 * @access  Private
 */
router.delete('/:reviewId', deleteReview);

export default router;


