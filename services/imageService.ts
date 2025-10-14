import { supabase } from '../lib/supabase';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export class ImageService {
  /**
   * Upload une image vers Supabase Storage
   */
  async uploadProfileImage(file: any, userId: string): Promise<ImageUploadResult> {
    try {
      console.log('📸 Début upload image:', file.uri);
      
      // Générer un nom de fichier unique
      const fileExt = file.uri.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${userId}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; // Pas de sous-dossier dans le chemin du fichier

      console.log('📦 Bucket: profile-pictures (public)');
      console.log('📄 Nom du fichier:', fileName);
      console.log('📤 Lecture du fichier depuis:', file.uri);
      
      // Pour React Native, on utilise ArrayBuffer au lieu de Blob
      const response = await fetch(file.uri);
      if (!response.ok) {
        console.error('❌ Erreur fetch:', response.status, response.statusText);
        return { success: false, error: `Impossible de lire le fichier: ${response.statusText}` };
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('📦 ArrayBuffer créé:', arrayBuffer.byteLength, 'bytes');

      // Déterminer le type MIME à partir de l'extension
      const mimeTypes: { [key: string]: string } = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'webp': 'image/webp',
      };
      const contentType = mimeTypes[fileExt] || 'image/jpeg';

      // Upload vers Supabase Storage
      console.log('☁️ Upload vers Supabase...');
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, arrayBuffer, {
          cacheControl: '3600',
          upsert: true, // Permettre l'écrasement si le fichier existe
          contentType: contentType,
        });

      if (uploadError) {
        console.error('❌ Erreur upload:', uploadError);
        return { success: false, error: `Erreur d'upload: ${uploadError.message}` };
      }

      console.log('✅ Upload réussi:', uploadData);

      // Récupérer l'URL publique permanente
      const { data: urlData } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        console.error('❌ Impossible de récupérer l\'URL publique');
        return { success: false, error: 'Impossible de récupérer l\'URL de l\'image' };
      }

      console.log('✅ URL publique créée:', urlData.publicUrl);
      return { success: true, url: urlData.publicUrl };
    } catch (error: any) {
      console.error('❌ Erreur lors de l\'upload:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }

  /**
   * Supprimer une image de profil
   */
  async deleteProfileImage(imageUrl: string): Promise<ImageUploadResult> {
    try {
      // Extraire le nom du fichier de l'URL
      const fileName = imageUrl.split('/').pop();
      if (!fileName) {
        return { success: false, error: 'URL d\'image invalide' };
      }

      console.log('🗑️ Suppression de:', fileName);

      const { error } = await supabase.storage
        .from('profile-pictures')
        .remove([fileName]); // Utiliser directement le nom du fichier sans préfixe

      if (error) {
        console.error('❌ Erreur suppression:', error);
        return { success: false, error: 'Erreur lors de la suppression de l\'image' };
      }

      console.log('✅ Image supprimée avec succès');
      return { success: true };
    } catch (error: any) {
      console.error('❌ Erreur lors de la suppression:', error);
      return { success: false, error: error.message || 'Erreur inconnue' };
    }
  }
}

export const imageService = new ImageService();


