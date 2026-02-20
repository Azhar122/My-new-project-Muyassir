import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { servicesService } from '../../services/services';
import { VerificationStatus } from '../../types';
import { colors, spacing, borderRadius, typography, shadows } from '../../theme';
import { WaveHeader } from '../../components/WaveHeader';
import { PrimaryButton } from '../../components/PrimaryButton';

const VerificationBanner = ({ status, rejectedReason }: { status: string; rejectedReason?: string }) => {
  if (status === VerificationStatus.VERIFIED) return null;
  
  const config: Record<string, { bg: string; text: string; icon: string; message: string }> = {
    unverified: { bg: colors.status.warning + '20', text: colors.status.warning, icon: 'alert-circle', message: 'Upload Company Registration to publish services' },
    pending: { bg: colors.status.info + '20', text: colors.status.info, icon: 'clock-outline', message: 'Verification pending review' },
    rejected: { bg: colors.status.error + '20', text: colors.status.error, icon: 'close-circle', message: rejectedReason || 'Verification rejected. Please re-submit.' },
  };
  const c = config[status] || config.unverified;
  
  return (
    <View style={[styles.verificationBanner, { backgroundColor: c.bg }]}>
      <MaterialCommunityIcons name={c.icon as any} size={20} color={c.text} />
      <Text style={[styles.verificationText, { color: c.text }]}>{c.message}</Text>
    </View>
  );
};

export default function ProviderDashboard() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: listings, isLoading, refetch } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => servicesService.getMyListings(),
  });

  const activeListings = listings?.filter((l) => l.status === 'active') || [];
  const totalCapacity = listings?.reduce((sum, l) => sum + l.capacity, 0) || 0;
  const totalBookings = listings?.reduce(
    (sum, l) => sum + (l.capacity - l.available_slots),
    0
  ) || 0;

  const avgRating = listings && listings.length > 0
    ? (listings.reduce((sum, l) => sum + l.rating.average, 0) / listings.length).toFixed(1)
    : '0.0';

  return (
    <SafeAreaView style={styles.container}>
      {/* Wave Header */}
      <WaveHeader height={160}>
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Text style={styles.name}>{user?.profile.full_name}</Text>
            </View>
            <View style={styles.safetyBadge}>
              <MaterialCommunityIcons name="shield-check" size={18} color={colors.status.success} />
              <Text style={styles.safetyText}>{user?.safety_score}%</Text>
            </View>
          </View>
        </View>
      </WaveHeader>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Verification Banner */}
        <VerificationBanner 
          status={user?.profile?.verification_status || 'unverified'} 
          rejectedReason={user?.profile?.verification_rejected_reason}
        />

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="format-list-bulleted"
              label="Active Listings"
              value={activeListings.length.toString()}
              color={colors.primary.main}
            />
            <StatCard
              icon="account-group"
              label="Total Capacity"
              value={totalCapacity.toString()}
              color={colors.status.success}
            />
            <StatCard
              icon="check-circle"
              label="Bookings"
              value={totalBookings.toString()}
              color={colors.status.warning}
            />
            <StatCard
              icon="star"
              label="Avg Rating"
              value={avgRating}
              color={colors.rating}
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <PrimaryButton
              title="Add New Service"
              icon="plus-circle"
              onPress={() => router.push('/(provider)/add-service')}
              fullWidth
              size="lg"
            />
            <View style={styles.actionRow}>
              <TouchableOpacity 
                style={styles.secondaryAction}
                onPress={() => router.push('/(provider)/listings')}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.primary.main + '15' }]}>
                  <MaterialCommunityIcons name="view-list" size={22} color={colors.primary.main} />
                </View>
                <Text style={styles.secondaryActionText}>My Listings</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.secondaryAction}
                onPress={() => router.push('/(provider)/contracts')}
              >
                <View style={[styles.actionIcon, { backgroundColor: colors.status.success + '15' }]}>
                  <MaterialCommunityIcons name="file-document" size={22} color={colors.status.success} />
                </View>
                <Text style={styles.secondaryActionText}>Contracts</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <MaterialCommunityIcons name="chart-timeline-variant" size={48} color={colors.text.light} />
            <Text style={styles.activityText}>Activity tracking coming soon</Text>
            <Text style={styles.activitySubtext}>View bookings, messages, and reviews</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const StatCard = ({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
      <MaterialCommunityIcons name={icon as any} size={24} color={color} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  
  // Header
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: typography.size.md,
    color: 'rgba(255,255,255,0.8)',
  },
  name: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.white,
    marginTop: spacing.xs,
  },
  safetyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.status.success + '30',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  safetyText: {
    fontSize: typography.size.md,
    fontWeight: typography.weight.bold,
    color: colors.text.white,
  },
  
  // Scroll Content
  scrollContent: {
    padding: spacing.xl,
    paddingBottom: 100, // Extra padding for bottom tab bar
  },
  
  // Verification Banner
  verificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  verificationText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    flex: 1,
  },
  
  // Sections
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  statCard: {
    width: '47%',
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: typography.size.display,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  statLabel: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  
  // Actions
  actionsContainer: {
    gap: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: colors.background.card,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  secondaryActionText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  
  // Activity
  activityCard: {
    backgroundColor: colors.background.card,
    padding: spacing.xxxl,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  activityText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    marginTop: spacing.md,
  },
  activitySubtext: {
    fontSize: typography.size.sm,
    color: colors.text.light,
    marginTop: spacing.xs,
  },
});
