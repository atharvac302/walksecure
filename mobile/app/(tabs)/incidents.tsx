import React, { useState } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, RefreshControl, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MOCK_INCIDENTS = [
  { id: '1', type: 'Poor Lighting', risk: 'MEDIUM', time: '10 mins ago', location: 'Station Road', upvotes: 12 },
  { id: '2', type: 'Suspicious Activity', risk: 'HIGH', time: '25 mins ago', location: 'MIT College Area', upvotes: 34 },
  { id: '3', type: 'SOS Alert', risk: 'CRITICAL', time: '1 hour ago', location: 'Prozone Mall', upvotes: 89 },
  { id: '4', type: 'Crime / Theft', risk: 'HIGH', time: '2 hours ago', location: 'Cannaught Place', upvotes: 45 },
];

const getRiskColor = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return '#EA4335';
    case 'HIGH': return '#FBBC05';
    default: return '#5F6368';
  }
};

const getRiskIcon = (risk: string) => {
  switch (risk) {
    case 'CRITICAL': return 'alert-circle';
    case 'HIGH': return 'warning';
    default: return 'flash';
  }
};

export default function IncidentsScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [incidents] = useState(MOCK_INCIDENTS);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconCircle, { backgroundColor: getRiskColor(item.risk) + '15' }]}>
          <Ionicons name={getRiskIcon(item.risk) as any} size={20} color={getRiskColor(item.risk)} />
        </View>
      </View>

      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <Text style={styles.cardType}>{item.type}</Text>
          <Text style={styles.cardTime}>{item.time}</Text>
        </View>

        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={14} color="#9AA0A6" />
          <Text style={styles.cardLocation}>{item.location}</Text>
        </View>

        <View style={styles.cardBottom}>
          <View style={[styles.riskPill, { backgroundColor: getRiskColor(item.risk) + '15' }]}>
            <Text style={[styles.riskPillText, { color: getRiskColor(item.risk) }]}>{item.risk}</Text>
          </View>
          <TouchableOpacity style={styles.upvoteBtn}>
            <Ionicons name="arrow-up-outline" size={16} color="#5F6368" />
            <Text style={styles.upvoteText}>{item.upvotes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Updates</Text>
        <Text style={styles.subtitle}>Community safety alerts near you</Text>
      </View>

      <FlatList
        data={incidents}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4285F4" />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'ios' ? 56 : 44 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E8EAED' },
  title: { fontSize: 24, fontWeight: '700', color: '#202124' },
  subtitle: { color: '#5F6368', fontSize: 14, marginTop: 4 },

  list: { paddingBottom: 100 },
  separator: { height: 1, backgroundColor: '#F1F3F4', marginLeft: 76 },

  card: {
    flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20,
  },
  cardLeft: { marginRight: 16, paddingTop: 2 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardType: { fontSize: 16, fontWeight: '600', color: '#202124' },
  cardTime: { fontSize: 12, color: '#9AA0A6' },

  locationRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardLocation: { fontSize: 14, color: '#5F6368', marginLeft: 4 },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  riskPill: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  riskPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

  upvoteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#F1F3F4' },
  upvoteText: { fontSize: 12, color: '#5F6368', fontWeight: '600', marginLeft: 4 },
});
