import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminUsers() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminService.getUsers,
  });

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return { bg: '#7C3AED', text: '#fff' };
      case 'provider': return { bg: '#FEF3C7', text: '#92400E' };
      default: return { bg: '#DBEAFE', text: '#1E40AF' };
    }
  };

  if (isLoading) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><ActivityIndicator size="large" color="#7C3AED" /></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLogout} style={styles.backBtn}>
          <MaterialCommunityIcons name="logout" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>All Users ({users?.length || 0})</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {users?.map((user: any) => {
          const roleBadge = getRoleBadge(user.role);
          const verificationStatus = user.profile?.verification_status || 'unverified';
          return (
            <View key={user.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.userInfo}>
                  <Text style={styles.name}>{user.profile?.full_name || 'Unknown'}</Text>
                  <Text style={styles.email}>{user.email}</Text>
                </View>
                <View style={[styles.roleBadge, { backgroundColor: roleBadge.bg }]}>
                  <Text style={[styles.roleBadgeText, { color: roleBadge.text }]}>{user.role}</Text>
                </View>
              </View>
              <View style={styles.cardFooter}>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(verificationStatus) }]} />
                  <Text style={styles.statusText}>{verificationStatus}</Text>
                </View>
                {user.role === 'client' && user.profile?.client_type && (
                  <Text style={styles.clientType}>{user.profile.client_type}</Text>
                )}
                <Text style={styles.date}>
                  {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#7C3AED' },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
  refreshBtn: { backgroundColor: '#fff', padding: 8, borderRadius: 8 },
  list: { flex: 1, padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userInfo: { flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  email: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  roleBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 12 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, color: '#6B7280', textTransform: 'capitalize' },
  clientType: { fontSize: 12, color: '#7C3AED', backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  date: { fontSize: 12, color: '#9CA3AF', marginLeft: 'auto' },
});
