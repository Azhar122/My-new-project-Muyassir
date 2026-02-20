import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminContracts() {
  const router = useRouter();
  const { logout } = useAuth();
  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['admin-contracts'],
    queryFn: adminService.getContracts,
  });

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active': return { bg: '#D1FAE5', color: '#065F46' };
      case 'completed': return { bg: '#DBEAFE', color: '#1E40AF' };
      case 'cancelled': return { bg: '#FEE2E2', color: '#991B1B' };
      case 'pending_provider_approval': return { bg: '#FEF3C7', color: '#92400E' };
      case 'awaiting_student_confirmation': return { bg: '#E0E7FF', color: '#3730A3' };
      default: return { bg: '#F3F4F6', color: '#6B7280' };
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
        <Text style={styles.title}>Contracts ({contracts?.length || 0})</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {contracts?.map((contract: any) => {
          const statusStyle = getStatusStyle(contract.status);
          return (
            <View key={contract.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.serviceTitle} numberOfLines={1}>{contract.service_title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.color }]}>
                    {formatStatus(contract.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.parties}>
                <View style={styles.party}>
                  <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
                  <Text style={styles.partyLabel}>Client:</Text>
                  <Text style={styles.partyName}>{contract.student_name}</Text>
                </View>
                <View style={styles.party}>
                  <MaterialCommunityIcons name="briefcase" size={16} color="#6B7280" />
                  <Text style={styles.partyLabel}>Provider:</Text>
                  <Text style={styles.partyName}>{contract.provider_name}</Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <View style={styles.amount}>
                  <Text style={styles.amountLabel}>Total</Text>
                  <Text style={styles.amountValue}>{contract.total_amount} ر.ع</Text>
                </View>
                <Text style={styles.date}>
                  {contract.created_at ? new Date(contract.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          );
        })}

        {(!contracts || contracts.length === 0) && (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No contracts found</Text>
          </View>
        )}
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1F2937', marginRight: 12 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: '600' },
  parties: { marginTop: 12, gap: 6 },
  party: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  partyLabel: { fontSize: 12, color: '#6B7280' },
  partyName: { fontSize: 13, fontWeight: '500', color: '#1F2937' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  amount: {},
  amountLabel: { fontSize: 11, color: '#9CA3AF' },
  amountValue: { fontSize: 16, fontWeight: '700', color: '#7C3AED' },
  date: { fontSize: 12, color: '#9CA3AF' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
});
