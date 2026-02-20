import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminProfile() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    const msg = 'Are you sure you want to logout?';
    if (Platform.OS === 'web') {
      if (confirm(msg)) {
        logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert('Logout', msg, [
        { text: 'Cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="shield-account" size={48} color="#7C3AED" />
          </View>
          <Text style={styles.name}>{user?.profile?.full_name || 'Administrator'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="crown" size={14} color="#7C3AED" />
            <Text style={styles.roleText}>System Admin</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Dashboard Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="shield-check" size={24} color="#10B981" />
              <Text style={styles.statLabel}>Verifications</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group" size={24} color="#2563EB" />
              <Text style={styles.statLabel}>Users</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="briefcase" size={24} color="#F59E0B" />
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="file-document" size={24} color="#EF4444" />
              <Text style={styles.statLabel}>Contracts</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <MaterialCommunityIcons name="logout" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appName}>Muyassir Admin</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: { padding: 16, backgroundColor: '#7C3AED' },
  title: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { flex: 1, padding: 20 },
  avatarSection: { alignItems: 'center', marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  name: { fontSize: 22, fontWeight: '700', color: '#1F2937' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 12, gap: 6 },
  roleText: { fontSize: 13, fontWeight: '600', color: '#7C3AED' },
  statsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24 },
  statsTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center', gap: 8 },
  statLabel: { fontSize: 12, color: '#6B7280' },
  actions: { marginBottom: 24 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', paddingVertical: 14, borderRadius: 12, gap: 8 },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  appInfo: { alignItems: 'center', marginTop: 'auto' },
  appName: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
  version: { fontSize: 12, color: '#D1D5DB', marginTop: 4 },
});
