import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { imageService } from '../../services/imageService';
import { useAuth } from '../../hooks/useAuth';

interface ProfileImagePickerProps {
  currentImageUrl: string | null;
  onImageUpdate: (imageUrl: string | null) => void;
  size?: number;
  editable?: boolean;
}

const ProfileImagePicker: React.FC<ProfileImagePickerProps> = ({
  currentImageUrl,
  onImageUpdate,
  size = 80,
  editable = true,
}) => {
  const [uploading, setUploading] = useState(false);
  const { userProfile } = useAuth();

  const pickImage = async () => {
    if (!editable) return;

    try {
      // Demander la permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à vos photos.'
        );
        return;
      }

      // Ouvrir la galerie
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Erreur lors de la sélection de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner l\'image');
    }
  };

  const takePhoto = async () => {
    if (!editable) return;

    try {
      // Demander la permission
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à la caméra.'
        );
        return;
      }

      // Ouvrir la caméra
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Erreur lors de la prise de photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    }
  };

  const uploadImage = async (image: any) => {
    if (!userProfile?.id) return;

    try {
      setUploading(true);
      
      const result = await imageService.uploadProfileImage(image, userProfile.id);
      
      if (result.success && result.url) {
        onImageUpdate(result.url);
        Alert.alert('Succès', 'Photo de profil mise à jour !');
      } else {
        Alert.alert('Erreur', result.error || 'Impossible d\'uploader l\'image');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l\'upload');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = async () => {
    if (!editable) return;

    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer votre photo de profil ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              if (currentImageUrl) {
                await imageService.deleteProfileImage(currentImageUrl);
              }
              onImageUpdate(null);
            } catch (error) {
              console.error('Erreur lors de la suppression:', error);
            }
          },
        },
      ]
    );
  };

  const showImageOptions = () => {
    Alert.alert(
      'Photo de profil',
      'Choisissez une option',
      [
        { text: 'Prendre une photo', onPress: takePhoto },
        { text: 'Choisir dans la galerie', onPress: pickImage },
        ...(currentImageUrl
          ? [{ text: 'Supprimer la photo', onPress: removeImage, style: 'destructive' as const }]
          : []
        ),
        { text: 'Annuler', style: 'cancel' as const },
      ]
    );
  };

  const getInitials = () => {
    if (!userProfile) return '?';
    const firstInitial = userProfile.first_name?.charAt(0)?.toUpperCase() || '';
    const lastInitial = userProfile.last_name?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}` || userProfile.username?.charAt(0)?.toUpperCase() || '?';
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <TouchableOpacity
        onPress={editable ? showImageOptions : undefined}
        disabled={!editable || uploading}
        activeOpacity={editable ? 0.7 : 1}
      >
        {currentImageUrl ? (
          <Image
            source={{ uri: currentImageUrl }}
            style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
          />
        ) : (
          <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[styles.initials, { fontSize: size / 2.5 }]}>{getInitials()}</Text>
          </View>
        )}

        {editable && (
          <View style={[styles.editButton, { width: size / 3, height: size / 3, borderRadius: size / 6 }]}>
            <Ionicons name="camera" size={size / 5} color="#fff" />
          </View>
        )}

        {uploading && (
          <View style={[styles.loadingOverlay, { borderRadius: size / 2 }]}>
            <ActivityIndicator size="large" color="#0C3B2E" />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    borderWidth: 3,
    borderColor: '#0C3B2E',
  },
  placeholder: {
    backgroundColor: '#E8F5E8',
    borderWidth: 3,
    borderColor: '#0C3B2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontWeight: 'bold',
    color: '#0C3B2E',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#0C3B2E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ProfileImagePicker;


