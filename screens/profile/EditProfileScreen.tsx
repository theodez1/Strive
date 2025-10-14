import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { ProfileImagePicker } from '../../components/ui';

const COLORS = {
  primary: '#0C3B2E',
  background: '#FFFFFF',
  card: '#F9F9F9',
  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
};

const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const { userProfile, refreshProfile } = useAuth();
  const [updatingImage, setUpdatingImage] = useState(false);

  // Gérer la mise à jour de l'image de profil
  const handleImageUpdate = async (imageUrl: string | null) => {
    if (!userProfile?.id) return;

    try {
      setUpdatingImage(true);
      const { success, error } = await userService.updateUserProfile({
        profile_picture_url: imageUrl,
      });

      if (success) {
        await refreshProfile();
      } else {
        Alert.alert('Erreur', error || 'Impossible de mettre à jour la photo');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'image:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    } finally {
      setUpdatingImage(false);
    }
  };

  const AVAILABLE_SPORTS = [
    'Football',
    'Basketball',
    'Tennis',
    'Padel',
    'Running',
    'Fitness',
    'Swimming',
    'Volleyball',
    'Other',
  ] as const;

  const [firstName, setFirstName] = useState(userProfile?.first_name || '');
  const [lastName, setLastName] = useState(userProfile?.last_name || '');
  // Champ affiché en FR: JJ-MM-AAAA (avec tirets auto)
  const [birthDate, setBirthDate] = useState(
    userProfile?.birth_date
      ? (() => {
          const iso = String(userProfile.birth_date).slice(0, 10); // YYYY-MM-DD
          const [y, m, d] = iso.split('-');
          return d && m && y ? `${d}-${m}-${y}` : '';
        })()
      : ''
  );
  const [region, setRegion] = useState(userProfile?.region || '');
  const [regionQuery, setRegionQuery] = useState(userProfile?.region || '');
  const [regionOptions, setRegionOptions] = useState<Array<{ code: string; nom: string }>>([]);
  const [loadingRegions, setLoadingRegions] = useState(false);
  const regionAbortRef = useRef<AbortController | null>(null);
  const [favoriteSports, setFavoriteSports] = useState<string[]>(
    (userProfile?.favorite_sports || []) as string[]
  );
  const [saving, setSaving] = useState(false);

  // Synchroniser le formulaire si le profil change (ou à l'arrivée sur l'écran)
  useEffect(() => {
    setFirstName(userProfile?.first_name || '');
    setLastName(userProfile?.last_name || '');
    if (userProfile?.birth_date) {
      const iso = String(userProfile.birth_date).slice(0, 10);
      const [y, m, d] = iso.split('-');
      setBirthDate(d && m && y ? `${d}-${m}-${y}` : '');
    } else {
      setBirthDate('');
    }
    setRegion(userProfile?.region || '');
    setRegionQuery(userProfile?.region || '');
    setFavoriteSports((userProfile?.favorite_sports || []) as string[]);
  }, [userProfile?.id, userProfile?.first_name, userProfile?.last_name, userProfile?.birth_date, userProfile?.region, userProfile?.favorite_sports]);

  const toggleSport = (sport: string) => {
    setFavoriteSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  };

  // Recherche régions (API officielle: https://geo.api.gouv.fr/regions)
  useEffect(() => {
    const q = (regionQuery || '').trim();

    // N'afficher les suggestions que si l'utilisateur tape au moins 2 caractères
    if (q.length < 2) {
      setRegionOptions([]);
      setLoadingRegions(false);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        if (regionAbortRef.current) regionAbortRef.current.abort();
        const controller = new AbortController();
        regionAbortRef.current = controller;
        setLoadingRegions(true);
        
        // Fetch once all regions then filter locally to reduce calls
        let allRegions: Array<{ code: string; nom: string }> = [];
        if ((global as any).__ALL_FR_REGIONS__) {
          allRegions = (global as any).__ALL_FR_REGIONS__;
        } else {
          const res = await fetch(`https://geo.api.gouv.fr/regions`, { signal: controller.signal });
          const data = await res.json();
          if (Array.isArray(data)) {
            allRegions = data as Array<{ code: string; nom: string }>;
            (global as any).__ALL_FR_REGIONS__ = allRegions;
          }
        }

        const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
        const qn = norm(q);
        
        // Filtrer les régions qui contiennent la recherche
        const filtered = allRegions.filter((r) => norm(r.nom).includes(qn));
        setRegionOptions(filtered);
      } catch (e) {
        if ((e as any)?.name !== 'AbortError') {
          setRegionOptions([]);
        }
      } finally {
        setLoadingRegions(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [regionQuery]);

  const handleSelectRegion = (opt: { code: string; nom: string }) => {
    setRegion(opt.nom);
    setRegionQuery(opt.nom);
    setRegionOptions([]);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      // Convertir JJ-MM-AAAA -> YYYY-MM-DD pour sauvegarde
      const isoBirth = (() => {
        const digits = (birthDate || '').replace(/[^0-9]/g, '');
        if (digits.length !== 8) return null;
        const dd = digits.slice(0, 2);
        const mm = digits.slice(2, 4);
        const yyyy = digits.slice(4, 8);
        // Validation simple
        const dt = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
        if (
          dt.getFullYear() !== Number(yyyy) ||
          dt.getMonth() !== Number(mm) - 1 ||
          dt.getDate() !== Number(dd)
        ) {
          return null;
        }
        return `${yyyy}-${mm}-${dd}`;
      })();

      await userService.updateUserProfile({
        first_name: firstName,
        last_name: lastName,
        birth_date: isoBirth || null,
        region: region || null,
        favorite_sports: favoriteSports,
        updated_at: new Date().toISOString(),
      } as any);
      await refreshProfile();
      navigation.goBack();
    } catch (e) {
      console.log('Erreur sauvegarde profil:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Modifier le profil</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Photo de profil */}
        <View style={styles.profileImageSection}>
          <ProfileImagePicker
            currentImageUrl={userProfile?.profile_picture_url || null}
            onImageUpdate={handleImageUpdate}
            size={100}
            editable={true}
          />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Prénom</Text>
            <TextInput style={styles.input} value={firstName} onChangeText={setFirstName} placeholder="Votre prénom" placeholderTextColor="#999" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nom</Text>
            <TextInput style={styles.input} value={lastName} onChangeText={setLastName} placeholder="Votre nom" placeholderTextColor="#999" />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date de naissance</Text>
            <TextInput
              style={styles.input}
              value={birthDate || ''}
              onChangeText={(text) => {
                // Auto-format JJ-MM-AAAA
                const digits = text.replace(/[^0-9]/g, '').slice(0, 8);
                let out = digits;
                if (digits.length >= 3) out = `${digits.slice(0, 2)}-${digits.slice(2)}`;
                if (digits.length >= 5) out = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
                setBirthDate(out);
              }}
              keyboardType="number-pad"
              placeholder="JJ-MM-AAAA"
              placeholderTextColor="#999"
              maxLength={10}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Région</Text>
            <View style={styles.regionInputContainer}>
              <TextInput
                style={styles.input}
                value={regionQuery}
                onChangeText={setRegionQuery}
                placeholder="Tapez au moins 2 lettres..."
                placeholderTextColor="#999"
              />
              {regionQuery.length > 0 && regionQuery.length < 2 && (
                <View style={styles.hintContainer}>
                  <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                  <Text style={styles.hintText}>Tapez au moins 2 lettres pour voir les suggestions</Text>
                </View>
              )}
              {loadingRegions && (
                <View style={styles.dropdown}>
                  <View style={styles.loadingRow}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Recherche...</Text>
                  </View>
                </View>
              )}
              {!loadingRegions && regionOptions.length > 0 && (
                <View style={styles.dropdown}>
                  <View style={styles.dropdownHeader}>
                    <Text style={styles.dropdownHeaderText}>
                      {regionOptions.length} région{regionOptions.length > 1 ? 's' : ''} trouvée{regionOptions.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {regionOptions.map((opt) => (
                      <TouchableOpacity 
                        key={opt.code} 
                        style={styles.optionRow} 
                        onPress={() => handleSelectRegion(opt)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="location" size={18} color={COLORS.primary} style={styles.optionIcon} />
                        <Text style={styles.optionText}>{opt.nom}</Text>
                        <Ionicons name="checkmark-circle-outline" size={18} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              {!loadingRegions && regionQuery.length >= 2 && regionOptions.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Ionicons name="search-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.noResultsText}>Aucune région trouvée</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Sports favoris</Text>
            <View style={styles.chipsContainer}>
              {AVAILABLE_SPORTS.map((sport) => {
                const selected = favoriteSports.includes(sport);
                return (
                  <TouchableOpacity
                    key={sport}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => toggleSport(sport)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                      {sport}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveText}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  profileImageSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#fff',
  },
  content: { padding: 16 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 6 },
  input: { backgroundColor: COLORS.card, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, color: COLORS.textPrimary, borderWidth: 1, borderColor: '#E5E5E5' },
  regionInputContainer: {
    position: 'relative',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 10,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  hintText: {
    fontSize: 13,
    color: '#856404',
    marginLeft: 6,
    flex: 1,
  },
  dropdown: { 
    backgroundColor: '#FFFFFF', 
    borderWidth: 1, 
    borderColor: '#E5E5E5', 
    borderRadius: 12, 
    marginTop: 6, 
    maxHeight: 240,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownHeader: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dropdownHeaderText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  optionRow: { 
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12, 
    paddingHorizontal: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0',
  },
  optionIcon: {
    marginRight: 10,
  },
  optionText: { 
    color: COLORS.textPrimary, 
    fontSize: 14,
    flex: 1,
  },
  noResultsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 10,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5', backgroundColor: '#FFFFFF', marginRight: 8, marginBottom: 8 },
  chipSelected: { backgroundColor: '#E8F5E8', borderColor: '#B7E1B7' },
  chipText: { color: COLORS.textPrimary, fontSize: 14 },
  chipTextSelected: { color: COLORS.primary, fontWeight: '600' },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: '#E5E5E5' },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveText: { color: '#fff', fontWeight: '700' },
});

export default EditProfileScreen;


