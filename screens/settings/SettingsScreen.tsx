import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
  primary: '#0C3B2E',
  background: '#FFFFFF',
  card: '#F9F9F9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  accent: '#FFD700',
  danger: '#FF4D4D',
  shadow: '#00000020',
};

const SettingsScreen: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const [isPushNotificationsEnabled, setIsPushNotificationsEnabled] = React.useState(true);
  const [isEmailNotificationsEnabled, setIsEmailNotificationsEnabled] = React.useState(false);

  const { signOut, userProfile } = useAuth();
  const navigation = useNavigation();

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);
  const togglePushNotifications = () => setIsPushNotificationsEnabled((prev) => !prev);
  const toggleEmailNotifications = () => setIsEmailNotificationsEnabled((prev) => !prev);

  const handleLogout = async () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        {
          text: 'Annuler',
          style: 'cancel',
        },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              // La navigation sera gérée automatiquement par le système d'authentification
            } catch (error) {
              console.error('Erreur de déconnexion:', error);
              Alert.alert('Erreur', 'Une erreur est survenue lors de la déconnexion');
            }
          },
        },
      ]
    );
  };

  // Détection des champs manquants (comme sur le profil)
  const missingFields: string[] = [];
  if (!userProfile?.birth_date) missingFields.push('âge');
  if (!userProfile?.region) missingFields.push('région');
  if (!userProfile?.favorite_sports || userProfile.favorite_sports.length === 0) missingFields.push('sports favoris');

  const handleEditProfile = () => {
    (navigation as any).navigate('EditProfile');
  };

  const handleChangePassword = () => {
    Alert.alert('Information', 'Fonctionnalité à venir : Modification du mot de passe');
  };

  const handleTermsAndConditions = () => {
    Alert.alert('Information', 'Fonctionnalité à venir : Conditions générales');
  };

  const handlePrivacyPolicy = () => {
    Alert.alert('Information', 'Fonctionnalité à venir : Politique de confidentialité');
  };

  const handleAppVersion = () => {
    Alert.alert('Version', 'Strive v1.0.0\n\nVersion actuelle de l\'application');
  };

  const handleSupport = () => {
    Alert.alert('Support', 'Pour toute question ou problème, contactez-nous à :\n\nsupport@strive-app.com');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Réglages</Text>
      </View>

      {/* Settings Content */}
      <ScrollView contentContainerStyle={styles.content}>
        {/* Section: Compte */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Compte</Text>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.8}
            onPress={handleEditProfile}
          >
            <Ionicons name="person-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Modifier mes infos personnelles</Text>
            {missingFields.length > 0 && <View style={styles.badgeDot} />}
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingRow}
            activeOpacity={0.8}
            onPress={handleChangePassword}
          >
            <Ionicons name="lock-closed-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Modifier mon mot de passe</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Notifications push</Text>
            <Switch
              value={isPushNotificationsEnabled}
              onValueChange={togglePushNotifications}
              trackColor={{ false: '#E5E5E5', true: COLORS.primary }}
              thumbColor={isPushNotificationsEnabled ? COLORS.accent : '#FFF'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8}>
            <Ionicons name="mail-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Notifications par email</Text>
            <Switch
              value={isEmailNotificationsEnabled}
              onValueChange={toggleEmailNotifications}
              trackColor={{ false: '#E5E5E5', true: COLORS.primary }}
              thumbColor={isEmailNotificationsEnabled ? COLORS.accent : '#FFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Section: Apparence */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Apparence</Text>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8}>
            <Ionicons name="moon-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Mode sombre</Text>
            <Switch
              value={isDarkMode}
              onValueChange={toggleDarkMode}
              trackColor={{ false: '#E5E5E5', true: COLORS.primary }}
              thumbColor={isDarkMode ? COLORS.accent : '#FFF'}
            />
          </TouchableOpacity>
        </View>

        {/* Section: Confidentialité */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Confidentialité</Text>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={handleTermsAndConditions}>
            <Ionicons name="document-text-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Conditions générales</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={handlePrivacyPolicy}>
            <Ionicons name="shield-checkmark-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Politique de confidentialité</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: À propos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>À propos</Text>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={handleAppVersion}>
            <Ionicons name="information-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Version de l'application</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} activeOpacity={0.8} onPress={handleSupport}>
            <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
            <Text style={styles.settingText}>Support</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Déconnexion */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sécurité</Text>
          <TouchableOpacity
            style={[styles.settingRow, styles.logoutButton]}
            activeOpacity={0.8}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={24} color={COLORS.danger} />
            <Text style={[styles.settingText, styles.logoutText]}>Se déconnecter</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerButton: {
    position: 'absolute',
    left: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF3B30',
    marginRight: 8,
  },
  settingText: {
    fontSize: 16,
    flex: 1,
    marginLeft: 15,
    color: COLORS.textPrimary,
  },
  logoutButton: {
    backgroundColor: '#FFF5F5',
  },
  logoutText: {
    color: COLORS.danger,
  },
});

export default SettingsScreen;
