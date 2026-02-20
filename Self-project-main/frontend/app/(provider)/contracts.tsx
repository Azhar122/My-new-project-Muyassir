import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contractsService } from '../../services/contracts';
import { Button } from '../../components/Button';
import { Contract, ContractStatus } from '../../types';

export default function ProviderContracts() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: contracts, isLoading, refetch } = useQuery({
    queryKey: ['provider-contracts'],
    queryFn: contractsService.getProviderContracts,
  });

  const { data: earnings } = useQuery({
    queryKey: ['provider-earnings'],
    queryFn: contractsService.getProviderEarnings,
  });

  const acceptMutation = useMutation({
    mutationFn: (contractId: string) => contractsService.providerAccept(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
      if (Platform.OS === 'web') {
        alert('Contract accepted! Waiting for student confirmation.');
      } else {
        Alert.alert('Success', 'Contract accepted! Waiting for student confirmation.');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to accept contract';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (contractId: string) => contractsService.providerReject(contractId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-contracts'] });
      if (Platform.OS === 'web') {
        alert('Contract rejected.');
      } else {
        Alert.alert('Success', 'Contract rejected.');
      }
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to reject contract';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const handleAccept = (contractId: string) => {
    // Direct call for web (confirm dialogs unreliable in iframes)
    if (Platform.OS === 'web') {
      acceptMutation.mutate(contractId);
    } else {
      Alert.alert('Accept Contract', 'Accept this contract request?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Accept', onPress: () => acceptMutation.mutate(contractId) },
      ]);
    }
  };

  const handleReject = (contractId: string) => {
    // Direct call for web (confirm dialogs unreliable in iframes)
    if (Platform.OS === 'web') {
      rejectMutation.mutate(contractId);
    } else {
      Alert.alert('Reject Contract', 'Reject this contract request? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => rejectMutation.mutate(contractId) },
      ]);
    }
  };

  const getStatusColor = (status: ContractStatus) => {
    switch (status) {
      case ContractStatus.ACTIVE:
        return '#10B981';
      case ContractStatus.PENDING_PROVIDER_APPROVAL:
        return '#F59E0B';
      case ContractStatus.AWAITING_STUDENT_CONFIRMATION:
        return '#3B82F6';
      case ContractStatus.DRAFT:
        return '#6B7280';
      case ContractStatus.CANCELLED:
      case ContractStatus.REJECTED:
        return '#EF4444';
      case ContractStatus.COMPLETED:
        return '#2563EB';
      default:
        return '#6B7280';
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const pendingContracts = contracts?.filter(
    (c) => c.status === ContractStatus.PENDING_PROVIDER_APPROVAL
  );
  const awaitingStudentContracts = contracts?.filter(
    (c) => c.status === ContractStatus.AWAITING_STUDENT_CONFIRMATION
  );
  const activeContracts = contracts?.filter((c) => c.status === ContractStatus.ACTIVE);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Contracts</Text>
        <Text style={styles.subtitle}>Manage student agreements</Text>
      </View>

      {/* Earnings Card */}
      {earnings && earnings.net_earnings !== undefined && (
        <View style={styles.earningsCard}>
          <View style={styles.earningsHeader}>
            <MaterialCommunityIcons name="cash-multiple" size={24} color="#10B981" />
            <Text style={styles.earningsTitle}>Total Earnings</Text>
          </View>
          <Text style={styles.earningsAmount}>{(earnings.net_earnings || 0).toFixed(2)} ر.ع</Text>
          <View style={styles.earningsDetails}>
            <View style={styles.earningsDetail}>
              <Text style={styles.earningsDetailLabel}>Gross</Text>
              <Text style={styles.earningsDetailValue}>{(earnings.total_earnings || 0).toFixed(2)} ر.ع</Text>
            </View>
            <View style={styles.earningsDetail}>
              <Text style={styles.earningsDetailLabel}>Platform Fee (10%)</Text>
              <Text style={styles.earningsDetailValue}>-{(earnings.total_platform_fees || 0).toFixed(2)} ر.ع</Text>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
      >
        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.loadingText}>Loading contracts...</Text>
          </View>
        ) : (
          <>
            {/* Pending Approval Section */}
            {pendingContracts && pendingContracts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="alert-circle" size={20} color="#F59E0B" />
                  <Text style={styles.sectionTitle}>Pending Your Approval</Text>
                </View>
                {pendingContracts.map((contract) => (
                  <View key={contract.id} style={styles.contractCard}>
                    <View style={styles.cardContent}>
                      <Text style={styles.studentName}>{contract.student_name}</Text>
                      <Text style={styles.serviceName}>{contract.service?.title}</Text>
                      <View style={styles.contractDetails}>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            {formatDate(contract.start_date)} - {formatDate(contract.end_date)}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="cash" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            {contract.total_amount} ر.ع total
                          </Text>
                        </View>
                      </View>
                    </View>
                    <View style={styles.actionButtons}>
                      <Button
                        title="Accept"
                        onPress={() => handleAccept(contract.id)}
                        loading={acceptMutation.isPending && acceptMutation.variables === contract.id}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                        variant="secondary"
                      />
                      <TouchableOpacity
                        style={[
                          styles.rejectButton,
                          (rejectMutation.isPending && rejectMutation.variables === contract.id) && styles.rejectButtonDisabled
                        ]}
                        onPress={() => handleReject(contract.id)}
                        disabled={acceptMutation.isPending || rejectMutation.isPending}
                      >
                        {(rejectMutation.isPending && rejectMutation.variables === contract.id) ? (
                          <ActivityIndicator size="small" color="#EF4444" />
                        ) : (
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Awaiting Student Confirmation Section */}
            {awaitingStudentContracts && awaitingStudentContracts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#3B82F6" />
                  <Text style={styles.sectionTitle}>Awaiting Student Confirmation</Text>
                </View>
                {awaitingStudentContracts.map((contract) => (
                  <View key={contract.id} style={styles.contractCardSimple}>
                    <View style={styles.cardLeft}>
                      <View style={[styles.statusDot, { backgroundColor: '#3B82F6' }]} />
                      <View>
                        <Text style={styles.studentNameSmall}>{contract.student_name}</Text>
                        <Text style={styles.serviceNameSmall}>{contract.service?.title}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.amountSmall}>{contract.monthly_amount} ر.ع</Text>
                      <Text style={[styles.statusText, { color: '#3B82F6' }]}>Waiting</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Active Contracts Section */}
            {activeContracts && activeContracts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />
                  <Text style={styles.sectionTitle}>Active Contracts</Text>
                </View>
                {activeContracts.map((contract) => (
                  <View key={contract.id} style={styles.contractCard}>
                    <View style={styles.cardContent}>
                      <Text style={styles.studentName}>{contract.student_name}</Text>
                      <Text style={styles.serviceName}>{contract.service?.title}</Text>
                      <View style={styles.contractDetails}>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            Until {formatDate(contract.end_date)}
                          </Text>
                        </View>
                        <View style={styles.detailItem}>
                          <MaterialCommunityIcons name="cash" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            {contract.monthly_amount} ر.ع/mo
                          </Text>
                        </View>
                      </View>
                      {/* Payment Progress */}
                      <View style={styles.paymentProgress}>
                        <Text style={styles.paymentProgressLabel}>
                          Payments: {contract.payment_schedule?.filter(p => p.status === 'paid').length || 0} / {contract.payment_schedule?.length || 0}
                        </Text>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              {
                                width: `${((contract.payment_schedule?.filter(p => p.status === 'paid').length || 0) / (contract.payment_schedule?.length || 1)) * 100}%`,
                              },
                            ]}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* All Contracts */}
            {contracts && contracts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialCommunityIcons name="file-document-multiple" size={20} color="#6B7280" />
                  <Text style={styles.sectionTitle}>All Contracts ({contracts.length})</Text>
                </View>
                {contracts.map((contract) => (
                  <TouchableOpacity
                    key={contract.id}
                    style={styles.contractCardSimple}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardLeft}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: getStatusColor(contract.status) },
                        ]}
                      />
                      <View>
                        <Text style={styles.studentNameSmall}>{contract.student_name}</Text>
                        <Text style={styles.serviceNameSmall}>{contract.service?.title}</Text>
                      </View>
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.amountSmall}>{contract.monthly_amount} ر.ع</Text>
                      <Text style={[styles.statusText, { color: getStatusColor(contract.status) }]}>
                        {contract.status.replace('_', ' ')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {(!contracts || contracts.length === 0) && (
              <View style={styles.empty}>
                <MaterialCommunityIcons name="file-document-outline" size={64} color="#9CA3AF" />
                <Text style={styles.emptyText}>No contracts yet</Text>
                <Text style={styles.emptySubtext}>
                  Contracts will appear here when students book your services
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  earningsCard: {
    margin: 20,
    padding: 20,
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  earningsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  earningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#065F46',
  },
  earningsAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 12,
  },
  earningsDetails: {
    borderTopWidth: 1,
    borderTopColor: '#A7F3D0',
    paddingTop: 12,
  },
  earningsDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  earningsDetailLabel: {
    fontSize: 12,
    color: '#047857',
  },
  earningsDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 0,
  },
  loading: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  contractCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardContent: {
    flex: 1,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  rejectButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    minWidth: 70,
    alignItems: 'center',
  },
  rejectButtonDisabled: {
    opacity: 0.6,
  },
  rejectButtonText: {
    color: '#EF4444',
    fontWeight: '600',
    fontSize: 14,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  serviceName: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  contractDetails: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentProgress: {
    marginTop: 12,
  },
  paymentProgressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 3,
  },
  contractCardSimple: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  studentNameSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceNameSmall: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amountSmall: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  empty: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
});
