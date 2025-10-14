import React, { useState, useRef, useEffect } from 'react';
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
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../constants/Theme';
import { authService } from '../../services/auth';
import ForgotPasswordScreen from './ForgotPasswordScreen';

const { width, height } = Dimensions.get('window');

// Responsive dimensions
const isSmallScreen = width < 375;
const isLargeScreen = width > 414;
const buttonHeight = isSmallScreen ? 40 : isLargeScreen ? 48 : 44;
const buttonPadding = isSmallScreen ? 8 : isLargeScreen ? 12 : 10;

interface LoginScreenProps {
  onBack?: () => void;
  onGoToRegister?: () => void;
}

export default function LoginScreen({ onBack, onGoToRegister }: LoginScreenProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerStep, setRegisterStep] = useState(1); // 1: nom/prénom, 2: email/password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const forgotPasswordSlideAnim = useRef(new Animated.Value(0)).current;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const firstNameRef = useRef<TextInput>(null);
  const lastNameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Pas de focus automatique


  const toggleMode = () => {
    Animated.timing(slideAnim, {
      toValue: isRegisterMode ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    setIsRegisterMode(!isRegisterMode);
    setRegisterStep(1); // Reset to step 1 when switching modes
    
    // Reset form fields when switching modes
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFirstName('');
    setLastName('');
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const nextRegisterStep = () => {
    if (firstName && lastName) {
      setRegisterStep(2);
    } else {
      Alert.alert('Erreur', 'Veuillez remplir votre prénom et nom');
    }
  };

  const prevRegisterStep = () => {
    setRegisterStep(1);
  };

  const handleForgotPassword = () => {
    setShowForgotPassword(true);
    Animated.timing(forgotPasswordSlideAnim, {
      toValue: -width,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const handleBackFromForgotPassword = () => {
    Animated.timing(forgotPasswordSlideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setShowForgotPassword(false);
    });
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await authService.signIn(email, password);

      if (error) {
        Alert.alert('Erreur', (error as any).message || 'Email ou mot de passe incorrect');
      } else if (user) {
        // No explicit navigation here, App.tsx handles it based on user state
      }
    } catch (error) {
      console.error('Erreur lors de la connexion :', error);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse email valide');
      return;
    }

    setLoading(true);
    try {
      const { user, error } = await authService.signUp(email, password, {
        username: email.split('@')[0],
        first_name: firstName,
        last_name: lastName,
      });

      if (error) {
        Alert.alert('Erreur', (error as any).message || 'Erreur lors de l\'inscription');
      } else if (user) {
        Alert.alert(
          'Inscription réussie !',
          'Votre compte a été créé. Vous pouvez maintenant vous connecter.',
          [{ text: 'OK', onPress: () => {
            setIsRegisterMode(false);
            setRegisterStep(1);
            setConfirmPassword('');
            setFirstName('');
            setLastName('');
          }}]
        );
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription :', error);
      Alert.alert('Erreur', 'Une erreur inattendue est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Background - Extended for slide animation */}
      <View style={styles.extendedBackground}>
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
        {/* Header */}
        <View style={styles.header}>
          {onBack && (
            <TouchableOpacity style={styles.backButton} onPress={onBack}>
              <View style={styles.backButtonContainer}>
                <Ionicons name="arrow-back" size={20} color={Colors.primary} />
              </View>
            </TouchableOpacity>
          )}
        </View>

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
              <Text style={styles.title}>
                {isRegisterMode ? 'Rejoignez-nous !' : 'Bon retour !'}
              </Text>
              <Text style={styles.subtitle}>
                {isRegisterMode 
                  ? 'Créez votre compte en quelques secondes' 
                  : 'Connectez-vous pour continuer'
                }
              </Text>
            </View>

            {/* Form Card */}
            <View style={styles.formCard}>
              <View style={styles.formHeader}>
                <Text style={styles.formTitle}>
                  {isRegisterMode ? 'Inscription' : 'Connexion'}
                </Text>
              </View>

              <View style={styles.formContent}>
                {/* Register Step 1: Name Fields */}
                {isRegisterMode && registerStep === 1 && (
                  <>
                    {/* First Name Field */}
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Prénom</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                          <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
                          <TextInput
                            ref={firstNameRef}
                            style={styles.textInput}
                            placeholder="Votre prénom"
                            placeholderTextColor={Colors.textSecondary}
                            value={firstName}
                            onChangeText={setFirstName}
                            autoCapitalize="words"
                            autoComplete="given-name"
                            textContentType="givenName"
                            autoCorrect={false}
                            spellCheck={false}
                            importantForAutofill="yes"
                            returnKeyType="next"
                            onSubmitEditing={() => lastNameRef.current?.focus()}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Last Name Field */}
                    <View style={styles.fieldContainer}>
                      <Text style={styles.fieldLabel}>Nom</Text>
                      <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                          <Ionicons name="person-outline" size={18} color={Colors.textSecondary} />
                          <TextInput
                            ref={lastNameRef}
                            style={styles.textInput}
                            placeholder="Votre nom"
                            placeholderTextColor={Colors.textSecondary}
                            value={lastName}
                            onChangeText={setLastName}
                            autoCapitalize="words"
                            autoComplete="family-name"
                            textContentType="familyName"
                            autoCorrect={false}
                            spellCheck={false}
                            importantForAutofill="yes"
                            returnKeyType="done"
                            onSubmitEditing={nextRegisterStep}
                          />
                        </View>
                      </View>
                    </View>

                    {/* Next Button for Step 1 */}
                    <TouchableOpacity 
                      style={[styles.fullWidthButton, (!firstName || !lastName) && styles.loginButtonDisabled]}
                      onPress={nextRegisterStep}
                      disabled={!firstName || !lastName}
                    >
                      <Text style={styles.loginButtonText}>Continuer</Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </TouchableOpacity>
                  </>
                )}


                {/* Email Field - Only in Login Mode or Register Step 2 */}
                {(!isRegisterMode || (isRegisterMode && registerStep === 2)) && (
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
                          returnKeyType="next"
                          onSubmitEditing={() => passwordRef.current?.focus()}
                        />
                      </View>
                    </View>
                  </View>
                )}

                {/* Password Field - Only in Login Mode or Register Step 2 */}
                {(!isRegisterMode || (isRegisterMode && registerStep === 2)) && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Mot de passe</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                        <TextInput
                          ref={passwordRef}
                          style={styles.textInput}
                          placeholder={isRegisterMode ? "Minimum 6 caractères" : "Votre mot de passe"}
                          placeholderTextColor={Colors.textSecondary}
                          value={password}
                          onChangeText={setPassword}
                          secureTextEntry={!showPassword}
                          autoCapitalize="none"
                          autoComplete={isRegisterMode ? "new-password" : "current-password"}
                          textContentType={isRegisterMode ? "newPassword" : "password"}
                          autoCorrect={false}
                          spellCheck={false}
                          importantForAutofill="yes"
                          returnKeyType={isRegisterMode ? "next" : "done"}
                          onSubmitEditing={isRegisterMode ? () => confirmPasswordRef.current?.focus() : handleLogin}
                        />
                        <TouchableOpacity 
                          onPress={() => setShowPassword(!showPassword)}
                          style={styles.eyeButton}
                        >
                          <Ionicons 
                            name={showPassword ? "eye-off-outline" : "eye-outline"} 
                            size={18} 
                            color={Colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                {/* Confirm Password Field - Only in Register Mode Step 2 */}
                {isRegisterMode && registerStep === 2 && (
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Confirmer le mot de passe</Text>
                    <View style={styles.inputWrapper}>
                      <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={18} color={Colors.textSecondary} />
                        <TextInput
                          ref={confirmPasswordRef}
                          style={styles.textInput}
                          placeholder="Retapez votre mot de passe"
                          placeholderTextColor={Colors.textSecondary}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                          secureTextEntry={!showConfirmPassword}
                          autoCapitalize="none"
                          autoComplete="new-password"
                          textContentType="newPassword"
                          autoCorrect={false}
                          spellCheck={false}
                          importantForAutofill="yes"
                          returnKeyType="done"
                          onSubmitEditing={handleRegister}
                        />
                        <TouchableOpacity 
                          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={styles.eyeButton}
                        >
                          <Ionicons 
                            name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                            size={18} 
                            color={Colors.textSecondary} 
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}

                    {/* Forgot Password - Only in Login Mode */}
                    {!isRegisterMode && (
                      <TouchableOpacity 
                        style={styles.forgotPassword}
                        onPress={handleForgotPassword}
                      >
                        <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                      </TouchableOpacity>
                    )}

                {/* Terms - Only in Register Mode Step 2 */}
                {isRegisterMode && registerStep === 2 && (
                  <View style={styles.termsContainer}>
                    <Text style={styles.termsText}>
                      En créant un compte, vous acceptez nos{' '}
                      <Text style={styles.termsLink}>Conditions d'utilisation</Text>
                      {' '}et notre{' '}
                      <Text style={styles.termsLink}>Politique de confidentialité</Text>
                    </Text>
                  </View>
                )}

                {/* Action Buttons - Only in Login Mode or Register Step 2 */}
                {(!isRegisterMode || (isRegisterMode && registerStep === 2)) && (
                  <View style={styles.actionButtonsContainer}>
                    {/* Back Button - Only in Register Step 2 */}
                    {isRegisterMode && registerStep === 2 && (
                      <TouchableOpacity 
                        style={styles.backStepButton}
                        onPress={prevRegisterStep}
                      >
                        <Ionicons name="arrow-back" size={16} color={Colors.primary} />
                        <Text style={styles.backStepButtonText}>Retour</Text>
                      </TouchableOpacity>
                    )}
                    
                    {/* Main Action Button */}
                    <TouchableOpacity 
                      style={[
                        styles.loginButton, 
                        ((!isRegisterMode && (!email || !password)) || (isRegisterMode && (!email || !password || !confirmPassword)) || loading) && styles.loginButtonDisabled
                      ]}
                      onPress={isRegisterMode ? handleRegister : handleLogin}
                      disabled={
                        (isRegisterMode && (!email || !password || !confirmPassword)) || 
                        (!isRegisterMode && (!email || !password)) || 
                        loading
                      }
                    >
                      <Text style={styles.loginButtonText}>
                        {loading 
                          ? (isRegisterMode ? 'Création...' : 'Connexion...') 
                          : (isRegisterMode ? 'Créer' : 'Se connecter')
                        }
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="white" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            {/* Social Login */}
            <View style={styles.socialSection}>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>ou</Text>
                <View style={styles.dividerLine} />
              </View>

              <View style={styles.socialButtons}>
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-google" size={20} color="#DB4437" />
                  <Text style={styles.socialButtonText}>Google</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="logo-apple" size={20} color="#000000" />
                  <Text style={styles.socialButtonText}>Apple</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>
                {isRegisterMode ? 'Déjà un compte ?' : 'Pas encore de compte ?'}{' '}
                <Text style={styles.footerLink} onPress={toggleMode}>
                  {isRegisterMode ? 'Se connecter' : 'Créer un compte'}
                </Text>
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Forgot Password Screen Overlay */}
      {showForgotPassword && (
        <Animated.View 
          style={[
            styles.forgotPasswordOverlay,
            {
              transform: [{ translateX: forgotPasswordSlideAnim }],
            },
          ]}
        >
          <ForgotPasswordScreen onBack={handleBackFromForgotPassword} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    width: width * 2, // Étendre sur toute la largeur
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
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Theme.shadows.sm,
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
    position: 'relative',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 8,
    marginLeft: 8,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: buttonPadding,
    paddingHorizontal: buttonPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flex: 1,
    minHeight: buttonHeight,
    marginLeft: 'auto',
    ...Theme.shadows.sm,
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
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: width < 375 ? 8 : 12, // Smaller gap on small screens
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  socialSection: {
    marginBottom: 16,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  socialButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  socialButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  socialButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
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
  termsContainer: {
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  termsText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: Colors.primary,
    fontWeight: '600',
  },
  backStepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingVertical: buttonPadding,
    paddingHorizontal: isSmallScreen ? 12 : 16,
    borderRadius: 12,
    gap: 6,
    minWidth: isSmallScreen ? 80 : 90,
    minHeight: buttonHeight,
    ...Theme.shadows.sm,
  },
  backStepButtonText: {
    fontSize: isSmallScreen ? 12 : isLargeScreen ? 16 : 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  extendedBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    width: width * 2, // Double largeur pour couvrir le slide
  },
  forgotPasswordOverlay: {
    position: 'absolute',
    top: 0,
    left: width,
    width: width,
    height: '100%',
    backgroundColor: 'transparent',
  },
});