import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../constants/Theme';
import { supabase } from '../../lib/supabase';

const { width, height } = Dimensions.get('window');

// Responsive dimensions
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const buttonHeight = isSmallScreen ? 40 : isLargeScreen ? 48 : 44;
const buttonPadding = isSmallScreen ? 8 : isLargeScreen ? 12 : 10;

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const emailRef = useRef<TextInput>(null);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse email');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'strive://reset-password', // Deep link pour revenir à l'app
      });
      
      if (error) {
        console.error('Erreur Supabase:', error);
        Alert.alert('Erreur', error.message || 'Impossible d\'envoyer l\'email de réinitialisation');
        return;
      }
      
      setEmailSent(true);
      Alert.alert(
        'Email envoyé !',
        'Vérifiez votre boîte email et suivez les instructions pour réinitialiser votre mot de passe.',
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation :', error);
      Alert.alert('Erreur', error.message || 'Une erreur est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setEmailSent(false);
    setEmail('');
    onBack();
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
        <View style={styles.quarterCircle1} />
        <View style={styles.quarterCircle2} />
        <View style={styles.halfCircle} />
        <View style={styles.smallCircle1} />
        <View style={styles.smallCircle2} />
        <View style={styles.smallCircle3} />
        <View style={styles.smallCircle4} />
      </View>

        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Success Content */}
              <View style={styles.successContainer}>
                <View style={styles.iconContainer}>
                  <Ionicons name="checkmark-circle" size={80} color="white" />
                </View>
                
                <Text style={styles.successTitle}>Email envoyé !</Text>
                <Text style={styles.successSubtitle}>
                  Nous avons envoyé un lien de réinitialisation à :
                </Text>
                <Text style={styles.emailText}>{email}</Text>
                
                <Text style={styles.instructionsText}>
                  Vérifiez votre boîte email et suivez les instructions pour créer un nouveau mot de passe.
                </Text>

                <TouchableOpacity 
                  style={styles.fullWidthButton}
                  onPress={handleBackToLogin}
                >
                  <Text style={styles.loginButtonText}>Retour à la connexion</Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.resendButton}
                  onPress={() => {
                    setEmailSent(false);
                    setEmail('');
                  }}
                >
                  <Text style={styles.resendButtonText}>Renvoyer l'email</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Background */}
      <View style={styles.background}>
        <View style={styles.gradientOverlay} />
        <View style={styles.quarterCircle1} />
        <View style={styles.quarterCircle2} />
        <View style={styles.halfCircle} />
        <View style={styles.smallCircle1} />
        <View style={styles.smallCircle2} />
        <View style={styles.smallCircle3} />
        <View style={styles.smallCircle4} />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >

            {/* Welcome Section */}
            <View style={styles.welcomeSection}>
              <View style={styles.logoContainer}>
                <View style={styles.logo}>
                  <Text style={styles.logoText}>S</Text>
                </View>
              </View>
              <Text style={styles.title}>Mot de passe oublié</Text>
              <Text style={styles.subtitle}>
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>Réinitialisation</Text>
              </View>

              <View style={styles.formContent}>
                {/* Email Field */}
                <View style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputContainer}>
                      <Ionicons name="mail-outline" size={18} color={Colors.textSecondary} />
                      <TextInput
                        ref={emailRef}
                        style={styles.textInput}
                        placeholder="exemple@email.com"
                        placeholderTextColor={Colors.textSecondary}
                        value={email}
                        onChangeText={setEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        autoComplete="email"
                        textContentType="emailAddress"
                        autoCorrect={false}
                        spellCheck={false}
                        importantForAutofill="yes"
                        returnKeyType="done"
                        onSubmitEditing={handleResetPassword}
                      />
                    </View>
                  </View>
                </View>

                {/* Action Button */}
                <TouchableOpacity 
                  style={[styles.fullWidthButton, (!email || loading) && styles.loginButtonDisabled]}
                  onPress={handleResetPassword}
                  disabled={!email || loading}
                >
                  <Text style={styles.loginButtonText}>
                    {loading ? 'Envoi...' : 'Envoyer le lien'}
                  </Text>
                  <Ionicons name="arrow-forward" size={18} color="white" />
                </TouchableOpacity>

                {/* Help Text */}
                <View style={styles.helpContainer}>
                  <Text style={styles.helpText}>
                    Vous recevrez un email avec un lien sécurisé pour créer un nouveau mot de passe.
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Vous vous souvenez de votre mot de passe ?</Text>
              <TouchableOpacity onPress={onBack} style={styles.footerLinkContainer}>
                <Text style={styles.footerLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  quarterCircle1: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: width * 0.6,
    height: width * 0.6,
    borderBottomLeftRadius: width * 0.6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  quarterCircle2: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: width * 0.5,
    height: width * 0.5,
    borderTopRightRadius: width * 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  halfCircle: {
    position: 'absolute',
    top: height * 0.3,
    right: 0,
    width: width * 0.4,
    height: width * 0.4,
    borderBottomLeftRadius: width * 0.4,
    borderTopLeftRadius: width * 0.4,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  smallCircle1: {
    position: 'absolute',
    top: height * 0.15,
    left: width * 0.2,
    width: width * 0.12,
    height: width * 0.12,
    borderRadius: width * 0.06,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  smallCircle2: {
    position: 'absolute',
    top: height * 0.6,
    right: width * 0.15,
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.04,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  smallCircle3: {
    position: 'absolute',
    bottom: height * 0.25,
    left: width * 0.15,
    width: width * 0.1,
    height: width * 0.1,
    borderRadius: width * 0.05,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  smallCircle4: {
    position: 'absolute',
    top: height * 0.45,
    left: width * 0.05,
    width: width * 0.06,
    height: width * 0.06,
    borderRadius: width * 0.03,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  welcomeSection: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 16,
  },
  logoContainer: {
    marginBottom: 12,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    ...Theme.shadows.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    marginBottom: 16,
    ...Theme.shadows.lg,
    overflow: 'hidden',
  },
  formHeader: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  formContent: {
    padding: 20,
  },
  fieldContainer: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.extendedColors.gray50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Theme.extendedColors.gray300,
    height: 48,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    paddingLeft: 10,
    fontSize: 14,
    color: Colors.text,
  },
  fullWidthButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: buttonPadding,
    paddingHorizontal: buttonPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    minHeight: buttonHeight,
    marginTop: 16,
    ...Theme.shadows.sm,
  },
  loginButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  loginButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : isLargeScreen ? 18 : 16,
    fontWeight: 'bold',
  },
  helpContainer: {
    marginTop: 16,
    paddingHorizontal: 4,
  },
  helpText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
  footerLink: {
    color: 'white',
    fontWeight: 'bold',
  },
  footerLinkContainer: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginHorizontal: -4,
    borderRadius: 4,
  },
  // Success screen styles
  successContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  iconContainer: {
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 8,
  },
  emailText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    textAlign: 'center',
    marginBottom: 24,
  },
  instructionsText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  resendButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  resendButtonText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
    textAlign: 'center',
  },
});
