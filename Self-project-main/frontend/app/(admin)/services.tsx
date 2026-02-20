import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminServices() {
  const router = useRouter();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ['admin-services'],
    queryFn: adminService.getServices,
  });

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const suspendMutation = useMutation({
    mutationFn: (serviceId: string) => adminService.suspendService(serviceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (serviceId: string) => adminService.unsuspendService(serviceId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-services'] }),
  });

  const handleToggleSuspend = (service: any) => {
    const isSuspended = service.status === 'suspended';
    const action = isSuspended ? 'unsuspend' : 'suspend';
    const msg = `${action.charAt(0).toUpperCase() + action.slice(1)} "${service.title}"?`;
    
    if (Platform.OS === 'web') {
      if (confirm(msg)) {
        isSuspended ? unsuspendMutation.mutate(service.id) : suspendMutation.mutate(service.id);
      }
    } else {
      Alert.alert('Confirm', msg, [
        { text: 'Cancel' },
        { text: action.charAt(0).toUpperCase() + action.slice(1), onPress: () => 
          isSuspended ? unsuspendMutation.mutate(service.id) : suspendMutation.mutate(service.id)
        },
      ]);
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
        <Text style={styles.title}>Services ({services?.length || 0})</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {services?.map((service: any) => {
          const isSuspended = service.status === 'suspended';
          return (
            <View key={service.id} style={[styles.card, isSuspended && styles.cardSuspended]}>
              <View style={styles.cardHeader}>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceTitle} numberOfLines={1}>{service.title}</Text>
                  <Text style={styles.providerName}>by {service.provider_name}</Text>
                </View>
                <View style={[styles.typeBadge, service.service_type === 'transportation' ? styles.transportBadge : styles.residenceBadge]}>
                  <MaterialCommunityIcons name={service.service_type === 'transportation' ? 'bus' : 'home'} size={14} color="#fff" />
                </View>
              </View>

              <View style={styles.details}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Slots</Text>
                  <Text style={styles.detailValue}>{service.available_slots}/{service.capacity}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Auto-Accept</Text>
                  <MaterialCommunityIcons name={service.auto_accept ? 'check-circle' : 'close-circle'} size={18} color={service.auto_accept ? '#10B981' : '#9CA3AF'} />
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, isSuspended ? styles.suspendedBadge : styles.activeBadge]}>
                    <Text style={[styles.statusText, isSuspended ? styles.suspendedText : styles.activeText]}>
                      {isSuspended ? 'Suspended' : 'Active'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, isSuspended ? styles.unsuspendBtn : styles.suspendBtn]}
                onPress={() => handleToggleSuspend(service)}
                disabled={suspendMutation.isPending || unsuspendMutation.isPending}
              >
                <MaterialCommunityIcons name={isSuspended ? 'play-circle' : 'pause-circle'} size={18} color="#fff" />
                <Text style={styles.actionBtnText}>{isSuspended ? 'Unsuspend' : 'Suspend'}</Text>
              </TouchableOpacity>
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12 },
  cardSuspended: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceInfo: { flex: 1, marginRight: 12 },
  serviceTitle: { fontSize: 15, fontWeight: '600', color: '#1F2937' },
  providerName: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  typeBadge: { width: 28, height: 28, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  transportBadge: { backgroundColor: '#2563EB' },
  residenceBadge: { backgroundColor: '#10B981' },
  details: { flexDirection: 'row', marginTop: 12, gap: 16 },
  detailItem: { alignItems: 'center' },
  detailLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: '#1F2937' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  activeBadge: { backgroundColor: '#D1FAE5' },
  suspendedBadge: { backgroundColor: '#FEE2E2' },
  statusText: { fontSize: 12, fontWeight: '500' },
  activeText: { color: '#065F46' },
  suspendedText: { color: '#991B1B' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginTop: 12, gap: 6 },
  suspendBtn: { backgroundColor: '#F59E0B' },
  unsuspendBtn: { backgroundColor: '#10B981' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
