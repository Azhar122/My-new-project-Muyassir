import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '../../services/contracts';
import { reviewsService } from '../../services/reviews';
import { ContractStatus } from '../../types';

export default function StudentContracts() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [safetyRating, setSafetyRating] = useState(5);
  const [reviewText, setReviewText] = useState('');

  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['student-contracts'],
    queryFn: () => contractsService.getStudentContracts(),
  });

  const submitReviewMutation = useMutation({
    mutationFn: reviewsService.createReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      setShowReviewModal(false);
      setReviewText('');
      setRating(5);
      setSafetyRating(5);
      const msg = 'Review submitted successfully!';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Success', msg);
    },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Failed to submit review';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    },
  });

  const handleSubmitReview = () => {
    if (!selectedContract || !reviewText.trim()) {
      const msg = 'Please write a review';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
      return;
    }
    submitReviewMutation.mutate({
      service_id: selectedContract.service_id,
      rating,
      safety_rating: safetyRating,
      review_text: reviewText.trim(),
    });
  };

  const openReviewModal = (contract: any) => {
    setSelectedContract(contract);
    setShowReviewModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case ContractStatus.ACTIVE: return '#10B981';
      case ContractStatus.COMPLETED: return 'colors.primary.main';
      case ContractStatus.PENDING_PROVIDER_APPROVAL: return '#F59E0B';
      case ContractStatus.AWAITING_STUDENT_CONFIRMATION: return '#8B5CF6';
      case ContractStatus.CANCELLED:
      case ContractStatus.REJECTED: return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case ContractStatus.PENDING_PROVIDER_APPROVAL: return 'Pending Approval';
      case ContractStatus.AWAITING_STUDENT_CONFIRMATION: return 'Awaiting Confirmation';
      case ContractStatus.ACTIVE: return 'Active';
      case ContractStatus.COMPLETED: return 'Completed';
      case ContractStatus.CANCELLED: return 'Cancelled';
      case ContractStatus.REJECTED: return 'Rejected';
      default: return status;
    }
  };

  const canReview = (status: string) => status === ContractStatus.COMPLETED;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Contracts</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="colors.primary.main" />
            <Text style={styles.loadingText}>Loading contracts...</Text>
          </View>
        ) : contracts && contracts.length > 0 ? (
          contracts.map((contract: any) => (
            <TouchableOpacity
              key={contract.id}
              style={styles.card}
              onPress={() => router.push(`/(client)/contract/${contract.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.serviceTitle}>{contract.service_title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
                    {getStatusLabel(contract.status)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="account" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{contract.provider_name}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="calendar" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>
                    {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="cash" size={16} color="#6B7280" />
                  <Text style={styles.detailText}>{contract.total_amount} ر.ع total</Text>
                </View>
              </View>

              {canReview(contract.status) && (
                <TouchableOpacity
                  style={styles.reviewButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    openReviewModal(contract);
                  }}
                >
                  <MaterialCommunityIcons name="star-outline" size={18} color="#F59E0B" />
                  <Text style={styles.reviewButtonText}>Write Review</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.empty}>
            <MaterialCommunityIcons name="file-document-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No contracts yet</Text>
            <Text style={styles.emptySubtext}>Browse services to create your first contract</Text>
          </View>
        )}
      </ScrollView>

      {/* Review Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Write a Review</Text>
              <TouchableOpacity onPress={() => setShowReviewModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedContract && (
              <>
                <Text style={styles.modalServiceTitle}>{selectedContract.service_title}</Text>

                <Text style={styles.modalLabel}>Overall Rating</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setRating(star)}>
                      <MaterialCommunityIcons
                        name={star <= rating ? 'star' : 'star-outline'}
                        size={36}
                        color="#F59E0B"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Safety Rating</Text>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity key={star} onPress={() => setSafetyRating(star)}>
                      <MaterialCommunityIcons
                        name={star <= safetyRating ? 'shield-check' : 'shield-outline'}
                        size={32}
                        color="#10B981"
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.modalLabel}>Your Review</Text>
                <TextInput
                  style={styles.reviewInput}
                  value={reviewText}
                  onChangeText={setReviewText}
                  placeholder="Share your experience..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <TouchableOpacity
                  style={[styles.submitButton, submitReviewMutation.isPending && styles.submitButtonDisabled]}
                  onPress={handleSubmitReview}
                  disabled={submitReviewMutation.isPending}
                >
                  {submitReviewMutation.isPending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Review</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  content: { flex: 1 },
  contentContainer: { padding: 20 },
  loading: { padding: 60, alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6B7280' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  serviceTitle: { fontSize: 18, fontWeight: '600', color: '#1F2937', flex: 1, marginRight: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardDetails: { gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailText: { fontSize: 14, color: '#6B7280' },
  reviewButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 6 },
  reviewButtonText: { fontSize: 14, fontWeight: '600', color: '#F59E0B' },
  empty: { padding: 60, alignItems: 'center' },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937' },
  modalServiceTitle: { fontSize: 16, color: '#6B7280', marginBottom: 20 },
  modalLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  starsRow: { flexDirection: 'row', gap: 8 },
  reviewInput: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 14, fontSize: 16, minHeight: 100 },
  submitButton: { backgroundColor: 'colors.primary.main', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  submitButtonDisabled: { opacity: 0.7 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
