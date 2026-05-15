import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your <Text style={styles.titleHighlight}>Profile</Text></Text>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Ionicons name="person-circle" size={80} color="#3b82f6" />
        </View>
        <Text style={styles.name}>Sarah Jenkins</Text>
        <Text style={styles.email}>sarah.j@example.com</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Routes</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>Gold</Text>
            <Text style={styles.statLabel}>Status</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Emergency Contacts</Text>
      
      <View style={styles.contactCard}>
        <View style={styles.contactInfo}>
          <View style={styles.contactAvatar}>
            <Text style={styles.contactInitials}>MD</Text>
          </View>
          <View>
            <Text style={styles.contactName}>Mom (Dad)</Text>
            <Text style={styles.contactPhone}>+1 (555) 123-4567</Text>
          </View>
        </View>
        <Ionicons name="shield-checkmark" size={24} color="#10b981" />
      </View>

      <View style={styles.contactCard}>
        <View style={styles.contactInfo}>
          <View style={styles.contactAvatar}>
            <Text style={styles.contactInitials}>ER</Text>
          </View>
          <View>
            <Text style={styles.contactName}>Emergency Response</Text>
            <Text style={styles.contactPhone}>911 / 112</Text>
          </View>
        </View>
        <Ionicons name="alert-circle" size={24} color="#ef4444" />
      </View>

      <TouchableOpacity style={styles.addContactBtn}>
        <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
        <Text style={styles.addContactText}>Add Guardian Contact</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Settings</Text>

      <View style={styles.settingsGroup}>
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications" size={20} color="#94a3b8" />
            <Text style={styles.settingText}>Alert Preferences</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="location" size={20} color="#94a3b8" />
            <Text style={styles.settingText}>Location Privacy</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.settingItem, { borderBottomWidth: 0 }]}>
          <View style={styles.settingLeft}>
            <Ionicons name="log-out" size={20} color="#ef4444" />
            <Text style={[styles.settingText, { color: '#ef4444' }]}>Log Out</Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={{height: 100}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', paddingTop: Platform.OS === 'web' ? 20 : 60, paddingHorizontal: 20 },
  header: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#ffffff' },
  titleHighlight: { color: '#3b82f6' },
  
  profileCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 25, alignItems: 'center', marginBottom: 30, borderWidth: 1, borderColor: '#334155' },
  avatarContainer: { marginBottom: 10 },
  name: { fontSize: 24, fontWeight: 'bold', color: '#f8fafc' },
  email: { fontSize: 14, color: '#94a3b8', marginBottom: 20 },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#334155' },
  statBox: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '900', color: '#ffffff' },
  statLabel: { fontSize: 12, color: '#64748b', marginTop: 5 },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 15, marginTop: 10 },
  
  contactCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 15, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  contactInfo: { flexDirection: 'row', alignItems: 'center' },
  contactAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  contactInitials: { color: '#94a3b8', fontWeight: 'bold', fontSize: 16 },
  contactName: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
  contactPhone: { fontSize: 12, color: '#64748b', marginTop: 2 },
  
  addContactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#3b82f6', marginBottom: 30, backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  addContactText: { color: '#3b82f6', fontWeight: 'bold', marginLeft: 8 },
  
  settingsGroup: { backgroundColor: '#1e293b', borderRadius: 15, borderWidth: 1, borderColor: '#334155', overflow: 'hidden' },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: '#334155' },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingText: { color: '#f8fafc', fontSize: 16, marginLeft: 15, fontWeight: '500' }
});
