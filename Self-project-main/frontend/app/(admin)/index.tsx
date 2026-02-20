import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Platform, Modal, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService } from '../../services/admin';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminVerifications() {
  const router = useRouter();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDocModal, setShowDocModal] = useState(false);
  
  const [docToView, setDocToView] = useState<any>(null);

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  const { data: pending, isLoading, refetch } = useQuery({
    queryKey: ['admin-pending'],
    queryFn: adminService.getPendingVerifications,
  });

  const verifyMutation = useMutation({
    mutationFn: ({ userId, decision, reason }: { userId: string; decision: 'verified' | 'rejected'; reason?: string }) =>
      adminService.verifyUser(userId, decision, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-pending'] });
      setShowRejectModal(false);
      setSelectedUser(null);
      setRejectReason('');
    },
  });

  const handleApprove = (user: any) => {
    const msg = `Approve ${user.profile?.full_name}?`;
    if (Platform.OS === 'web') {
      if (confirm(msg)) verifyMutation.mutate({ userId: user.id, decision: 'verified' });
    } else {
      Alert.alert('Confirm', msg, [
        { text: 'Cancel' },
        { text: 'Approve', onPress: () => verifyMutation.mutate({ userId: user.id, decision: 'verified' }) },
      ]);
    }
  };

  const handleReject = (user: any) => {
    setSelectedUser(user);
    setShowRejectModal(true);
  };

  const submitReject = () => {
    if (!rejectReason.trim()) {
      Platform.OS === 'web' ? alert('Please provide a reason') : Alert.alert('Error', 'Please provide a reason');
      return;
    }
    verifyMutation.mutate({ userId: selectedUser.id, decision: 'rejected', reason: rejectReason });
  };

  const viewDocument = (doc: any) => {
    setDocToView(doc);
    setShowDocModal(true);
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
        <Text style={styles.title}>Pending Verifications</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshBtn}>
          <MaterialCommunityIcons name="refresh" size={24} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.list}>
        {!pending || pending.length === 0 ? (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="check-circle" size={64} color="#10B981" />
            <Text style={styles.emptyText}>No pending verifications</Text>
          </View>
        ) : (
          pending.map((user: any) => (
            <View key={user.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{user.profile?.full_name || 'Unknown'}</Text>
                <View style={[styles.badge, user.role === 'client' ? styles.badgeClient : styles.badgeProvider]}>
                  <Text style={styles.badgeText}>{user.role}</Text>
                </View>
              </View>
              <Text style={styles.email}>{user.email}</Text>
              {user.role === 'client' && user.profile?.client_type && (
                <Text style={styles.clientType}>Type: {user.profile.client_type}</Text>
              )}

              {/* Verification Documents */}
              {user.profile?.verification_documents?.length > 0 && (
                <View style={styles.docsSection}>
                  <Text style={styles.docsLabel}>Documents:</Text>
                  {user.profile.verification_documents.map((doc: any, idx: number) => (
                  
                    <TouchableOpacity key={idx} style={styles.docBtn} onPress={() => viewDocument(doc)}>
                      <MaterialCommunityIcons name="file-document" size={16} color="#2563EB" />
                      <Text style={styles.docBtnText}>View Document {idx + 1}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.actions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(user)} disabled={verifyMutation.isPending}>
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(user)} disabled={verifyMutation.isPending}>
                  <MaterialCommunityIcons name="close" size={18} color="#fff" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Reject Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reject User</Text>
            <Text style={styles.modalSubtitle}>Rejecting: {selectedUser?.profile?.full_name}</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowRejectModal(false); setRejectReason(''); }}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmRejectBtn} onPress={submitReject} disabled={verifyMutation.isPending}>
                {verifyMutation.isPending ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.confirmRejectText}>Reject</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Document Preview Modal */}
      <Modal visible={showDocModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.docModal}>
            <TouchableOpacity style={styles.closeDocBtn} onPress={() => setShowDocModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
            {docToView && (
              <Image source={{ uri: docToView.data_uri }} style={styles.docImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
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
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 16, color: '#6B7280', marginTop: 12 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeClient: { backgroundColor: '#DBEAFE' },
  badgeProvider: { backgroundColor: '#FEF3C7' },
  badgeText: { fontSize: 12, fontWeight: '500', color: '#1F2937' },
  email: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  clientType: { fontSize: 13, color: '#7C3AED', marginTop: 4 },
  docsSection: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  docsLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 },
  docBtnText: { fontSize: 14, color: '#2563EB' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  approveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', paddingVertical: 10, borderRadius: 8, gap: 6 },
  approveBtnText: { color: '#fff', fontWeight: '600' },
  rejectBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#EF4444', paddingVertical: 10, borderRadius: 8, gap: 6 },
  rejectBtnText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modal: { backgroundColor: '#fff', borderRadius: 16, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  reasonInput: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, marginTop: 16, minHeight: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: '#D1D5DB', alignItems: 'center' },
  cancelBtnText: { color: '#6B7280', fontWeight: '600' },
  confirmRejectBtn: { flex: 1, backgroundColor: '#EF4444', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  confirmRejectText: { color: '#fff', fontWeight: '600' },
  docModal: { backgroundColor: '#fff', borderRadius: 16, padding: 16, width: '90%', maxWidth: 500, aspectRatio: 1 },
  closeDocBtn: { position: 'absolute', top: 8, right: 8, zIndex: 10, backgroundColor: '#F3F4F6', borderRadius: 20, padding: 4 },
  docImage: { width: '100%', height: '100%' },
});
