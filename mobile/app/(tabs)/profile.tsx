import React, { useState, useEffect } from 'react';
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform,
  TextInput, Modal, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { getContacts, addContact, deleteContact, getUser, updateProfile } from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();

  // Real user data from login
  const [user, setUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Add contact modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);

  // Edit profile modal states
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // Load logged-in user data from AsyncStorage and backend
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('user_token');
        if (stored) {
          const parsed = JSON.parse(stored);
          setUser(parsed);
          
          // Fetch latest user details from backend to ensure freshness
          try {
            const freshUser = await getUser(parsed.id);
            setUser(freshUser);
            await AsyncStorage.setItem('user_token', JSON.stringify(freshUser));
          } catch (err) {
            console.log('Could not fetch fresh profile, using stored', err);
          }

          // Fetch their emergency contacts
          const contactsList = await getContacts(parsed.id);
          setContacts(contactsList);
        }
      } catch (e) {
        console.log('Error loading profile', e);
      }
      setLoading(false);
    })();
  }, []);

  const handleOpenEditProfile = () => {
    if (user) {
      setEditName(user.name || '');
      setEditPhone(user.phone === '0000000000' ? '' : user.phone || '');
      setShowEditProfileModal(true);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter your name.');
      return;
    }
    if (!editPhone.trim()) {
      Alert.alert('Error', 'Please enter your phone number.');
      return;
    }
    if (!user) return;
    setUpdatingProfile(true);
    try {
      const result = await updateProfile(user.id, editName.trim(), editPhone.trim());
      setUser(result.user);
      await AsyncStorage.setItem('user_token', JSON.stringify(result.user));
      setShowEditProfileModal(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Could not update profile. Is backend running?');
    }
    setUpdatingProfile(false);
  };

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Error', 'Please fill in both name and phone number.');
      return;
    }
    if (!user) return;
    setSaving(true);
    try {
      const result = await addContact(user.id, newName.trim(), newPhone.trim());
      setContacts(prev => [...prev, result]);
      setNewName('');
      setNewPhone('');
      setShowAddModal(false);
    } catch (e) {
      Alert.alert('Error', 'Could not add contact. Is backend running?');
    }
    setSaving(false);
  };

  const handleDeleteContact = (contactId: number) => {
    if (!user) return;
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await deleteContact(user.id, contactId);
            setContacts(prev => prev.filter(c => c.id !== contactId));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete contact.');
          }
        }
      }
    ]);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('user_token');
    router.replace('/login');
  };

  // Derive display name from email if name is just the email prefix
  const displayName = user?.name || 'User';
  const displayEmail = user?.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();

  const SettingsItem = ({ icon, label, subtitle, color, onPress, danger }: any) => (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.6}>
      <View style={[styles.settingsIcon, { backgroundColor: (danger ? '#EA4335' : color || '#4285F4') + '15' }]}>
        <Ionicons name={icon} size={20} color={danger ? '#EA4335' : color || '#4285F4'} />
      </View>
      <View style={styles.settingsInfo}>
        <Text style={[styles.settingsLabel, danger && { color: '#EA4335' }]}>{label}</Text>
        {subtitle && <Text style={styles.settingsSubtitle}>{subtitle}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={20} color="#DADCE0" />}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your profile</Text>
      </View>

      {/* Profile Card - shows REAL user data */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileEmail}>{displayEmail}</Text>
          <Text style={styles.profilePhone}>{user?.phone && user.phone !== '0000000000' ? `📞 ${user.phone}` : '📞 No phone registered'}</Text>
        </View>
        <TouchableOpacity style={styles.editProfileBtn} onPress={handleOpenEditProfile}>
          <Ionicons name="create-outline" size={20} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{contacts.length}</Text>
          <Text style={styles.statLabel}>Contacts</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>ID #{user?.id || '-'}</Text>
          <Text style={styles.statLabel}>User ID</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: '#34A853' }]}>Safe</Text>
          <Text style={styles.statLabel}>Status</Text>
        </View>
      </View>

      {/* Emergency Contacts - REAL from database */}
      <Text style={styles.sectionTitle}>Emergency contacts</Text>

      {contacts.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={36} color="#DADCE0" />
          <Text style={styles.emptyText}>No emergency contacts yet</Text>
          <Text style={styles.emptySubtext}>Add contacts who will be notified during SOS</Text>
        </View>
      )}

      {contacts.map(contact => (
        <View key={contact.id} style={styles.contactCard}>
          <View style={styles.contactRow}>
            <View style={[styles.contactAvatar, { backgroundColor: '#E8F0FE' }]}>
              <Text style={styles.contactInitials}>
                {contact.contact_name.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactName}>{contact.contact_name}</Text>
              <Text style={styles.contactPhone}>{contact.contact_phone}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteContact(contact.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={18} color="#EA4335" />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      <TouchableOpacity style={styles.addContactBtn} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={20} color="#4285F4" />
        <Text style={styles.addContactText}>Add emergency contact</Text>
      </TouchableOpacity>

      {/* Settings */}
      <Text style={styles.sectionTitle}>Settings</Text>

      <View style={styles.settingsGroup}>
        <SettingsItem icon="notifications-outline" label="Notifications" subtitle="Push alerts & warnings" />
        <SettingsItem icon="location-outline" label="Location sharing" subtitle="Who can see your location" color="#34A853" />
        <SettingsItem icon="shield-checkmark-outline" label="Safety preferences" subtitle="Route safety thresholds" color="#FBBC05" />
      </View>

      <View style={[styles.settingsGroup, { marginTop: 16 }]}>
        <SettingsItem icon="log-out-outline" label="Sign out" danger onPress={handleLogout} />
      </View>

      {/* Add Contact Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowAddModal(false)}
        >
          <View />
        </TouchableOpacity>
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>Add Emergency Contact</Text>
          <Text style={styles.modalSub}>This person will be notified when you trigger SOS</Text>

          <Text style={styles.inputLabel}>Contact Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mom, Dad, Friend"
            placeholderTextColor="#9AA0A6"
            value={newName}
            onChangeText={setNewName}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor="#9AA0A6"
            value={newPhone}
            onChangeText={setNewPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleAddContact} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Save Contact</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Profile Modal */}
      <Modal visible={showEditProfileModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowEditProfileModal(false)}
        >
          <View />
        </TouchableOpacity>
        <View style={styles.modalSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.modalTitle}>Edit Profile Details</Text>
          <Text style={styles.modalSub}>Update your personal info so dispatchers can call you during an SOS alert</Text>

          <Text style={styles.inputLabel}>Your Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor="#9AA0A6"
            value={editName}
            onChangeText={setEditName}
          />

          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. +91 9876543210"
            placeholderTextColor="#9AA0A6"
            value={editPhone}
            onChangeText={setEditPhone}
            keyboardType="phone-pad"
          />

          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowEditProfileModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveProfile} disabled={updatingProfile}>
              {updatingProfile ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.modalSubmitText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 44 },

  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#202124' },

  // Profile
  profileCard: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 20, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F3F4',
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#4285F4', alignItems: 'center', justifyContent: 'center', marginRight: 16,
  },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '600', color: '#202124' },
  profileEmail: { fontSize: 14, color: '#5F6368', marginTop: 2 },
  profilePhone: { fontSize: 13, color: '#5F6368', marginTop: 4 },
  editProfileBtn: { padding: 8, backgroundColor: '#E8F0FE', borderRadius: 8 },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginVertical: 24,
    backgroundColor: '#F8F9FA', borderRadius: 16, paddingVertical: 20,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#202124' },
  statLabel: { fontSize: 12, color: '#9AA0A6', marginTop: 4, fontWeight: '500' },
  statDivider: { width: 1, height: 36, backgroundColor: '#E8EAED' },

  // Section
  sectionTitle: {
    fontSize: 14, fontWeight: '600', color: '#5F6368',
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingHorizontal: 20, marginTop: 28, marginBottom: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center', paddingVertical: 24, marginHorizontal: 20,
    backgroundColor: '#F8F9FA', borderRadius: 12,
  },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#5F6368', marginTop: 10 },
  emptySubtext: { fontSize: 13, color: '#9AA0A6', marginTop: 4 },

  // Contacts
  contactCard: {
    marginHorizontal: 20, backgroundColor: '#F8F9FA',
    borderRadius: 12, padding: 16, marginBottom: 8,
  },
  contactRow: { flexDirection: 'row', alignItems: 'center' },
  contactAvatar: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  contactInitials: { fontSize: 15, fontWeight: '700', color: '#4285F4' },
  contactName: { fontSize: 15, fontWeight: '600', color: '#202124' },
  contactPhone: { fontSize: 13, color: '#9AA0A6', marginTop: 1 },
  deleteBtn: { padding: 8 },

  addContactBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginHorizontal: 20, marginTop: 8, paddingVertical: 14,
    borderRadius: 12, borderWidth: 1, borderColor: '#E8EAED', borderStyle: 'dashed',
  },
  addContactText: { fontSize: 14, color: '#4285F4', fontWeight: '600', marginLeft: 8 },

  // Settings
  settingsGroup: {
    marginHorizontal: 20, backgroundColor: '#F8F9FA',
    borderRadius: 16, overflow: 'hidden',
  },
  settingsItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#fff',
  },
  settingsIcon: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  settingsInfo: { flex: 1 },
  settingsLabel: { fontSize: 15, fontWeight: '500', color: '#202124' },
  settingsSubtitle: { fontSize: 12, color: '#9AA0A6', marginTop: 1 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingTop: 12, paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: '#DADCE0', borderRadius: 2,
    alignSelf: 'center', marginBottom: 16,
  },
  modalTitle: { fontSize: 22, fontWeight: '700', color: '#202124', marginTop: 8 },
  modalSub: { fontSize: 14, color: '#5F6368', marginTop: 4, marginBottom: 24 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#5F6368', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#F1F3F4', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14,
    fontSize: 16, color: '#202124', marginBottom: 16,
  },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalCancelBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20 },
  modalCancelText: { fontSize: 15, color: '#4285F4', fontWeight: '600' },
  modalSubmitBtn: {
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20,
    backgroundColor: '#4285F4', minWidth: 120, alignItems: 'center',
  },
  modalSubmitText: { fontSize: 15, color: '#fff', fontWeight: '600' },
});
