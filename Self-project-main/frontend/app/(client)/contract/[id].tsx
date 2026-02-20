import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '../../../services/contracts';
import { Button } from '../../../components/Button';
import { ContractStatus } from '../../../types';

export default function ContractDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPayModal, setShowPayModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => contractsService.getContract(id!),
    enabled: !!id,
  });

  const { data: payments } = useQuery({
    queryKey: ['contract-payments', id],
    queryFn: () => contractsService.getContractPayments(id!),
    enabled: !!id,
  });

  const confirmMutation = useMutation({
    mutationFn: () => contractsService.studentConfirm(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      if (Platform.OS === 'web') {
        alert('Contract confirmed and activated!');
      } else {
        Alert.alert('Success', 'Contract confirmed and activated!');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to confirm contract';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const paymentMutation = useMutation({
    mutationFn: (amount: number) =>
      contractsService.makePayment({
        contract_id: id!,
        amount,
        payment_method: 'mock_card',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['contract-payments', id] });
      setShowPayModal(false);
      if (Platform.OS === 'web') {
        alert('Payment successful!');
      } else {
        Alert.alert('Success', 'Payment successful!');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Payment failed';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => {
      console.log('cancelMutation executing for contract:', id);
      return contractsService.cancelContract(id!);
    },
    onSuccess: (data) => {
      console.log('cancelMutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      if (Platform.OS === 'web') {
        alert('Contract cancelled');
      } else {
        Alert.alert('Success', 'Contract cancelled');
      }
      router.back();
    },
    onError: (error: any) => {
      console.error('cancelMutation error:', error);
      console.error('Error response:', error.response?.data);
      const message = error.response?.data?.detail || 'Failed to cancel contract';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const completeMutation = useMutation({
    mutationFn: () => {
      console.log('completeMutation executing for contract:', id);
      return contractsService.completeContract(id!);
    },
    onSuccess: (data) => {
      console.log('completeMutation success:', data);
      queryClient.invalidateQueries({ queryKey: ['contract', id] });
      queryClient.invalidateQueries({ queryKey: ['student-contracts'] });
      if (Platform.OS === 'web') {
        alert('Contract marked as completed! You can now write a review.');
      } else {
        Alert.alert('Success', 'Contract marked as completed! You can now write a review.');
      }
    },
    onError: (error: any) => {
      console.error('completeMutation error:', error);
      console.error('Error response:', error.response?.data);
      const message = error.response?.data?.detail || 'Failed to complete contract';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const handleConfirm = () => {
    if (Platform.OS === 'web') {
      confirmMutation.mutate();
    } else {
      Alert.alert(
        'Confirm Contract',
        'Confirm this contract and activate it? You will need to pay after activation.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm', onPress: () => confirmMutation.mutate() },
        ]
      );
    }
  };

  const handleCancel = () => {
    console.log('handleCancel called');
    if (Platform.OS === 'web') {
      // Remove blocking confirm - just execute directly
      console.log('Calling cancelMutation.mutate()');
      cancelMutation.mutate();
    } else {
      Alert.alert(
        'Cancel Contract',
        'Are you sure you want to cancel this contract?',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: () => cancelMutation.mutate() },
        ]
      );
    }
  };

  const handleComplete = () => {
    console.log('handleComplete called');
    if (Platform.OS === 'web') {
      // Remove blocking confirm - just execute directly
      console.log('Calling completeMutation.mutate()');
      completeMutation.mutate();
    } else {
      Alert.alert(
        'Complete Contract',
        'Mark this contract as completed? You will be able to write a review after this.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Complete', onPress: () => completeMutation.mutate() },
        ]
      );
    }
  };

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE: return '#10B981';
      case ContractStatus.PENDING_PROVIDER_APPROVAL: return '#F59E0B';
      case ContractStatus.AWAITING_STUDENT_CONFIRMATION: return '#3B82F6';
      case ContractStatus.DRAFT: return '#6B7280';
      case ContractStatus.CANCELLED:
      case ContractStatus.REJECTED: return '#EF4444';
      default: return '#6B7280';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Contract Details' }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading contract...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !contract) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Contract Details' }} />
        <View style={styles.error}>
          <MaterialCommunityIcons name="alert-circle" size={64} color="#EF4444" />
          <Text style={styles.errorText}>Contract not found</Text>
          <Button title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const nextPendingPayment = contract.payment_schedule?.find(p => p.status === 'pending');
  const canConfirm = contract.status === ContractStatus.AWAITING_STUDENT_CONFIRMATION;
  const canPay = contract.status === ContractStatus.ACTIVE && nextPendingPayment;
  const canCancel = contract.status !== ContractStatus.CANCELLED && contract.status !== ContractStatus.COMPLETED && contract.status !== ContractStatus.REJECTED;
  const canComplete = contract.status === ContractStatus.ACTIVE;
  const isPending = contract.status === ContractStatus.PENDING_PROVIDER_APPROVAL;
  const isRejected = contract.status === ContractStatus.REJECTED;
  const isCompleted = contract.status === ContractStatus.COMPLETED;

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: 'Contract Details', headerShown: false }} />
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contract Details</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Header */}
        <View style={[styles.statusHeader, { backgroundColor: `${getStatusColor(contract.status)}15` }]}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(contract.status) }]}>
            <Text style={styles.statusBadgeText}>
              {contract.status.replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
          <Text style={styles.contractId}>Contract #{contract.id.slice(-8).toUpperCase()}</Text>
        </View>

        {/* Pending/Waiting Messages */}
        {isPending && (
          <View style={styles.infoMessage}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#F59E0B" />
            <Text style={styles.infoMessageText}>Waiting for provider to accept your contract request.</Text>
          </View>
        )}
        
        {canConfirm && (
          <View style={[styles.infoMessage, { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' }]}>
            <MaterialCommunityIcons name="hand-pointing-up" size={24} color="#3B82F6" />
            <Text style={[styles.infoMessageText, { color: '#1E40AF' }]}>Provider has accepted! Please confirm to activate.</Text>
          </View>
        )}
        
        {isRejected && (
          <View style={[styles.infoMessage, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
            <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
            <Text style={[styles.infoMessageText, { color: '#B91C1C' }]}>Provider has rejected this contract request.</Text>
          </View>
        )}

        {/* Contract Info */}
        <View style={styles.infoCard}>
          <Text style={styles.serviceTitle}>{contract.service?.title || 'Service'}</Text>
          <Text style={styles.providerName}>Provider: {contract.provider_name}</Text>
          
          <View style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-start" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Start Date:</Text>
            <Text style={styles.infoValue}>{formatDate(contract.start_date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="calendar-end" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>End Date:</Text>
            <Text style={styles.infoValue}>{formatDate(contract.end_date)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={20} color="#6B7280" />
            <Text style={styles.infoLabel}>Duration:</Text>
            <Text style={styles.infoValue}>{contract.duration_months} months</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.paymentCard}>
          <Text style={styles.cardTitle}>Payment Details</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Monthly Amount</Text>
            <Text style={styles.paymentValue}>{contract.monthly_amount} ر.ع</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Total Contract Value</Text>
            <Text style={styles.paymentValueLarge}>{contract.total_amount} ر.ع</Text>
          </View>
        </View>

        {/* Contract Status Flow */}
        <View style={styles.signatureCard}>
          <Text style={styles.cardTitle}>Contract Progress</Text>
          
          <View style={styles.signatureRow}>
            <View style={styles.signatureInfo}>
              <MaterialCommunityIcons
                name="check-circle"
                size={24}
                color="#10B981"
              />
              <View>
                <Text style={styles.signatureLabel}>Request Submitted</Text>
                <Text style={styles.signatureDate}>Contract requested by you</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.signatureRow}>
            <View style={styles.signatureInfo}>
              <MaterialCommunityIcons
                name={contract.provider_signature?.signed ? 'check-circle' : 'clock-outline'}
                size={24}
                color={contract.provider_signature?.signed ? '#10B981' : '#F59E0B'}
              />
              <View>
                <Text style={styles.signatureLabel}>Provider Approval</Text>
                {contract.provider_signature?.signed ? (
                  <Text style={styles.signatureDate}>
                    Accepted: {formatDate(contract.provider_signature.signed_at!)}
                  </Text>
                ) : contract.status === ContractStatus.REJECTED ? (
                  <Text style={styles.signaturePending}>Rejected</Text>
                ) : (
                  <Text style={styles.signaturePending}>Awaiting approval</Text>
                )}
              </View>
            </View>
          </View>
          
          <View style={styles.signatureRow}>
            <View style={styles.signatureInfo}>
              <MaterialCommunityIcons
                name={contract.student_signature?.signed ? 'check-circle' : 'circle-outline'}
                size={24}
                color={contract.student_signature?.signed ? '#10B981' : '#9CA3AF'}
              />
              <View>
                <Text style={styles.signatureLabel}>Your Confirmation</Text>
                {contract.student_signature?.signed ? (
                  <Text style={styles.signatureDate}>
                    Confirmed: {formatDate(contract.student_signature.signed_at!)}
                  </Text>
                ) : canConfirm ? (
                  <Text style={[styles.signaturePending, { color: '#3B82F6' }]}>Ready to confirm</Text>
                ) : (
                  <Text style={styles.signaturePending}>Pending</Text>
                )}
              </View>
            </View>
            {canConfirm && (
              <Button
                title="Confirm"
                onPress={handleConfirm}
                loading={confirmMutation.isPending}
              />
            )}
          </View>
        </View>

        {/* Payment Schedule */}
        {contract.payment_schedule && contract.payment_schedule.length > 0 && (
          <View style={styles.scheduleCard}>
            <Text style={styles.cardTitle}>Payment Schedule</Text>
            {contract.payment_schedule.map((payment, idx) => (
              <View key={idx} style={styles.scheduleRow}>
                <View style={styles.scheduleInfo}>
                  <MaterialCommunityIcons
                    name={payment.status === 'paid' ? 'check-circle' : 'clock-outline'}
                    size={20}
                    color={payment.status === 'paid' ? '#10B981' : '#F59E0B'}
                  />
                  <Text style={styles.scheduleDate}>{formatDate(payment.due_date)}</Text>
                </View>
                <View style={styles.scheduleAmount}>
                  <Text style={styles.scheduleAmountText}>{payment.amount} ر.ع</Text>
                  <Text style={[styles.scheduleStatus, { color: payment.status === 'paid' ? '#10B981' : '#F59E0B' }]}>
                    {payment.status.toUpperCase()}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* View Terms Button */}
        <TouchableOpacity style={styles.termsButton} onPress={() => setShowTermsModal(true)}>
          <MaterialCommunityIcons name="file-document" size={20} color="#2563EB" />
          <Text style={styles.termsButtonText}>View Full Contract Terms</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {canPay && (
            <Button
              title={`Pay ${nextPendingPayment.amount} ر.ع`}
              onPress={() => setShowPayModal(true)}
              icon="credit-card"
              fullWidth
            />
          )}
          
          {canComplete && (
            <Button
              title="Mark as Completed"
              onPress={handleComplete}
              icon="check-circle"
              fullWidth
              loading={completeMutation.isPending}
            />
          )}
          
          {canCancel && (
            <Button
              title="Cancel Contract"
              onPress={handleCancel}
              variant="outline"
              icon="close"
              fullWidth
              loading={cancelMutation.isPending}
            />
          )}
        </View>
      </ScrollView>

      {/* Payment Modal */}
      <Modal
        visible={showPayModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Make Payment</Text>
              <TouchableOpacity onPress={() => setShowPayModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentSummary}>
              <Text style={styles.paymentSummaryLabel}>Payment Amount</Text>
              <Text style={styles.paymentSummaryValue}>{nextPendingPayment?.amount} ر.ع</Text>
            </View>
            
            <View style={styles.mockNotice}>
              <MaterialCommunityIcons name="information" size={20} color="#F59E0B" />
              <Text style={styles.mockNoticeText}>
                This is a mock payment for demonstration purposes.
              </Text>
            </View>
            
            <Button
              title="Confirm Payment"
              onPress={() => paymentMutation.mutate(nextPendingPayment?.amount || 0)}
              loading={paymentMutation.isPending}
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* Terms Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        onRequestClose={() => setShowTermsModal(false)}
      >
        <SafeAreaView style={styles.termsModal}>
          <View style={styles.termsHeader}>
            <Text style={styles.termsTitle}>Contract Terms</Text>
            <TouchableOpacity onPress={() => setShowTermsModal(false)}>
              <MaterialCommunityIcons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.termsContent}>
            <Text style={styles.termsText}>{contract.auto_generated_terms}</Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginVertical: 16,
  },
  scrollContent: {
    padding: 20,
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 16,
  },
  infoMessageText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  statusHeader: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  statusBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  contractId: {
    fontSize: 12,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 14,
    color: '#6B7280',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  paymentValueLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
  },
  signatureCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  signatureInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  signatureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  signatureDate: {
    fontSize: 12,
    color: '#10B981',
  },
  signaturePending: {
    fontSize: 12,
    color: '#F59E0B',
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduleDate: {
    fontSize: 14,
    color: '#374151',
  },
  scheduleAmount: {
    alignItems: 'flex-end',
  },
  scheduleAmountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  scheduleStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    marginBottom: 20,
  },
  termsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  actions: {
    gap: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  paymentSummary: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    marginBottom: 20,
  },
  paymentSummaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  paymentSummaryValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2563EB',
  },
  mockNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    marginBottom: 20,
  },
  mockNoticeText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  termsModal: {
    flex: 1,
    backgroundColor: '#fff',
  },
  termsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  termsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  termsContent: {
    flex: 1,
    padding: 20,
  },
  termsText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
