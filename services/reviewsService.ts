import { supabase } from '../lib/supabase';

export interface Review {
  id: string;
  reviewer_id: string;
  reviewed_user_id: string;
  event_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  reviewer?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
  reviewed_user?: {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
  };
}

export interface CreateReviewData {
  reviewed_user_id: string;
  event_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewStats {
  rating_average: number;
  rating_count: number;
  total_reviews: number;
  reviews_by_rating: {
    [key: number]: number;
  };
}

class ReviewsService {
  /**
   * Créer une review pour un utilisateur après un événement
   */
  async createReview(reviewData: CreateReviewData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      // Vérifier que l'utilisateur ne se note pas lui-même
      if (user.id === reviewData.reviewed_user_id) {
        return { data: null, error: 'Vous ne pouvez pas vous noter vous-même' };
      }

      // Vérifier que la note est entre 1 et 5
      if (reviewData.rating < 1 || reviewData.rating > 5) {
        return { data: null, error: 'La note doit être entre 1 et 5' };
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert({
          reviewer_id: user.id,
          reviewed_user_id: reviewData.reviewed_user_id,
          event_id: reviewData.event_id,
          rating: reviewData.rating,
          comment: reviewData.comment || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur lors de la création de la review:', error);
        return { data: null, error: error.message };
      }

      // Mettre à jour la moyenne de l'utilisateur noté
      await this.updateUserRatingAverage(reviewData.reviewed_user_id);

      return { data, error: null };
    } catch (error: any) {
      console.error('Erreur lors de la création de la review:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Créer plusieurs reviews en une fois (batch)
   */
  async createMultipleReviews(reviews: CreateReviewData[]) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      const reviewsToInsert = reviews
        .filter(r => r.reviewed_user_id !== user.id) // Ne pas se noter soi-même
        .filter(r => r.rating >= 1 && r.rating <= 5) // Note valide
        .map(r => ({
          reviewer_id: user.id,
          reviewed_user_id: r.reviewed_user_id,
          event_id: r.event_id,
          rating: r.rating,
          comment: r.comment || null,
        }));

      if (reviewsToInsert.length === 0) {
        return { data: [], error: 'Aucune review valide à créer' };
      }

      const { data, error } = await supabase
        .from('reviews')
        .insert(reviewsToInsert)
        .select();

      if (error) {
        console.error('Erreur lors de la création des reviews:', error);
        return { data: null, error: error.message };
      }

      // Mettre à jour les moyennes de tous les utilisateurs notés
      const uniqueUserIds = [...new Set(reviewsToInsert.map(r => r.reviewed_user_id))];
      await Promise.all(
        uniqueUserIds.map(userId => this.updateUserRatingAverage(userId))
      );

      return { data, error: null };
    } catch (error: any) {
      console.error('Erreur lors de la création des reviews:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Récupérer les reviews d'un utilisateur
   */
  async getUserReviews(userId: string) {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          *,
          reviewer:reviewer_id(id, username, first_name, last_name)
        `)
        .eq('reviewed_user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des reviews:', error);
        return { data: null, error: error.message };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des reviews:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Récupérer les statistiques de reviews d'un utilisateur
   */
  async getUserReviewStats(userId: string): Promise<{ data: ReviewStats | null; error: string | null }> {
    try {
      const { data: reviews, error } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', userId);

      if (error) {
        return { data: null, error: error.message };
      }

      const total_reviews = reviews?.length || 0;
      const rating_average = total_reviews > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / total_reviews
        : 0;

      const reviews_by_rating = reviews?.reduce((acc: any, r) => {
        acc[r.rating] = (acc[r.rating] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        data: {
          rating_average,
          rating_count: total_reviews,
          total_reviews,
          reviews_by_rating,
        },
        error: null,
      };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des stats:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Vérifier si l'utilisateur a déjà noté quelqu'un pour un événement
   */
  async hasUserReviewedParticipant(eventId: string, reviewedUserId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: false, error: 'Utilisateur non authentifié' };
      }

      const { data, error } = await supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', user.id)
        .eq('reviewed_user_id', reviewedUserId)
        .eq('event_id', eventId)
        .single();

      return { data: !!data, error: null };
    } catch (error: any) {
      return { data: false, error: null }; // Pas trouvé = pas de review
    }
  }

  /**
   * Récupérer les participants à noter pour un événement
   */
  async getParticipantsToReview(eventId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      // Récupérer tous les participants de l'événement (sauf l'utilisateur actuel)
      const { data: participants, error: participantsError } = await supabase
        .from('participants')
        .select(`
          user_id,
          user:users(id, username, first_name, last_name, rating_average, rating_count)
        `)
        .eq('event_id', eventId)
        .neq('user_id', user.id);

      if (participantsError) {
        return { data: null, error: participantsError.message };
      }

      // Récupérer les reviews déjà faites par l'utilisateur pour cet événement
      const { data: existingReviews, error: reviewsError } = await supabase
        .from('reviews')
        .select('reviewed_user_id, rating, comment')
        .eq('reviewer_id', user.id)
        .eq('event_id', eventId);

      if (reviewsError) {
        return { data: null, error: reviewsError.message };
      }

      // Mapper les participants avec leur review existante (si elle existe)
      const participantsWithReviews = participants?.map(p => {
        const existingReview = existingReviews?.find(r => r.reviewed_user_id === p.user_id);
        return {
          ...p,
          existing_review: existingReview || null,
        };
      });

      return { data: participantsWithReviews, error: null };
    } catch (error: any) {
      console.error('Erreur lors de la récupération des participants:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Mettre à jour la moyenne des notes d'un utilisateur
   */
  private async updateUserRatingAverage(userId: string) {
    try {
      const { data: reviews } = await supabase
        .from('reviews')
        .select('rating')
        .eq('reviewed_user_id', userId);

      if (!reviews || reviews.length === 0) {
        await supabase
          .from('users')
          .update({
            rating_average: 0,
            rating_count: 0,
          })
          .eq('id', userId);
        return;
      }

      const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

      await supabase
        .from('users')
        .update({
          rating_average: average.toFixed(2),
          rating_count: reviews.length,
        })
        .eq('id', userId);

      console.log(`✅ Moyenne mise à jour pour ${userId}: ${average.toFixed(2)} (${reviews.length} avis)`);
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la moyenne:', error);
    }
  }

  /**
   * Supprimer une review
   */
  async deleteReview(reviewId: string) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { data: null, error: 'Utilisateur non authentifié' };
      }

      // Récupérer la review pour obtenir le reviewed_user_id avant suppression
      const { data: review } = await supabase
        .from('reviews')
        .select('reviewed_user_id')
        .eq('id', reviewId)
        .eq('reviewer_id', user.id)
        .single();

      if (!review) {
        return { data: null, error: 'Review non trouvée' };
      }

      const { error } = await supabase
        .from('reviews')
        .delete()
        .eq('id', reviewId)
        .eq('reviewer_id', user.id);

      if (error) {
        console.error('Erreur lors de la suppression de la review:', error);
        return { data: null, error: error.message };
      }

      // Mettre à jour la moyenne
      await this.updateUserRatingAverage(review.reviewed_user_id);

      return { data: true, error: null };
    } catch (error: any) {
      console.error('Erreur lors de la suppression de la review:', error);
      return { data: null, error: error.message };
    }
  }
}

export default new ReviewsService();


