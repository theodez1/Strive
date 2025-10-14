import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { eventsService } from '../../services/events';
import { Database } from '../../types/database';

type Event = Database['public']['Tables']['events']['Row'];

interface RouteParams {
  eventId: string;
}

const PRIMARY_COLOR = '#0C3B2E';

export default function EventEditScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { eventId } = route.params as RouteParams;

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [totalSlots, setTotalSlots] = useState('');
  const [price, setPrice] = useState('');
  const [organizerSlots, setOrganizerSlots] = useState('');

  useEffect(() => {
    (async () => {
      const resp = await eventsService.getEvent(eventId);
      const data = resp.data as Event | null;
      if (data) {
        setEvent(data);
        setName(data.name);
        setDescription(data.description || '');
        setTotalSlots(String(data.total_slots));
        setPrice(data.price != null ? String(data.price) : '');
        setOrganizerSlots(String(data.organizer_slots || 1));
      }
      setLoading(false);
    })();
  }, [eventId]);

  const handleSave = async () => {
    if (!event) return;
    try {
      setSaving(true);
      const updates: any = {
        name: name.trim(),
        description: description.trim() || null,
      };

      // Parse numeric fields
      const parsedTotal = parseInt(totalSlots, 10);
      const parsedPrice = parseFloat(price);
      const parsedOrg = parseInt(organizerSlots, 10);

      if (!isNaN(parsedTotal) && parsedTotal > 0) updates.total_slots = parsedTotal;
      if (!isNaN(parsedPrice) && parsedPrice >= 0) updates.price = parsedPrice;
      if (!isNaN(parsedOrg) && parsedOrg > 0) updates.organizer_slots = parsedOrg;

      // Keep constraints consistent with DB:
      // available_slots <= total_slots and available_slots <= (total_slots - organizer_slots)
      const nextTotal = updates.total_slots ?? event.total_slots;
      const nextOrg = updates.organizer_slots ?? event.organizer_slots;
      const currentAvailable = event.available_slots;
      const maxAvailable = Math.max(0, nextTotal - nextOrg);
      const nextAvailable = Math.min(currentAvailable, maxAvailable);
      // Only include if it needs clamping
      if (nextAvailable !== currentAvailable) {
        updates.available_slots = nextAvailable;
      }

      // Basic guard to avoid invalid config
      if (nextOrg > nextTotal) {
        Alert.alert('Erreur', "Les places réservées ne peuvent pas dépasser le total");
        setSaving(false);
        return;
      }

      const { error } = await eventsService.updateEvent(event.id, updates);
      if (error) {
        Alert.alert('Erreur', "Impossible d'enregistrer les modifications");
        return;
      }
      Alert.alert('Succès', "Événement mis à jour", [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } finally {
      setSaving(false);
    }
  };

  

  if (loading || !event) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}><Text>Chargement...</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={PRIMARY_COLOR} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Modifier l'événement</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.6 }]}>
          <Text style={styles.saveBtnText}>{saving ? '...' : 'Enregistrer'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>Nom</Text>
          <TextInput value={name} onChangeText={setName} style={styles.input} placeholder="Nom de l'événement" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput value={description} onChangeText={setDescription} style={[styles.input, styles.multiline]} placeholder="Description" multiline numberOfLines={4} />
        </View>
        <View style={styles.row}> 
          <View style={[styles.field, styles.col]}>
            <Text style={styles.label}>Places totales</Text>
            <TextInput value={totalSlots} onChangeText={setTotalSlots} style={styles.input} placeholder="0" keyboardType="number-pad" />
          </View>
          <View style={[styles.field, styles.col]}>
            <Text style={styles.label}>Prix (€)</Text>
            <TextInput value={price} onChangeText={setPrice} style={styles.input} placeholder="0" keyboardType="decimal-pad" />
          </View>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Places réservées organisateur</Text>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const total = parseInt(totalSlots || '0', 10);
                const current = parseInt(organizerSlots || '1', 10) || 1;
                const next = Math.max(1, current - 1);
                // Bound also by total if défini
                const bounded = total > 0 ? Math.min(next, total) : next;
                setOrganizerSlots(String(bounded));
              }}
            >
              <Text style={styles.stepperBtnText}>-</Text>
            </TouchableOpacity>
            <TextInput
              value={organizerSlots}
              onChangeText={(v) => {
                // sanitize to number and clamp
                const total = parseInt(totalSlots || '0', 10);
                let num = parseInt(v.replace(/[^0-9]/g, '') || '1', 10);
                if (isNaN(num) || num < 1) num = 1;
                if (total > 0) num = Math.min(num, total);
                setOrganizerSlots(String(num));
              }}
              style={[styles.input, styles.stepperValue]}
              placeholder="1"
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => {
                const total = parseInt(totalSlots || '0', 10);
                const current = parseInt(organizerSlots || '1', 10) || 1;
                let next = current + 1;
                if (total > 0) next = Math.min(next, total);
                setOrganizerSlots(String(next));
              }}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', backgroundColor: '#FFF' },
  backButton: { padding: 8, width: 40 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: '#000', textAlign: 'center' },
  saveBtn: { backgroundColor: PRIMARY_COLOR, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: '700' },
  content: { padding: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, color: '#374151', fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF', fontSize: 14 },
  multiline: { height: 120, textAlignVertical: 'top' },
  row: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepperBtn: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#0C3B2E', alignItems: 'center', justifyContent: 'center' },
  stepperBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  stepperValue: { textAlign: 'center', flex: 1 },
});


