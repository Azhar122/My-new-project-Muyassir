import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { servicesService } from '../../services/services';
import { VerificationStatus } from '../../types';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { WaveHeader } from '../../components/WaveHeader';
import { AppCard } from '../../components/AppCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const VerificationBanner = ({ status, rejectedReason }: { status: string; rejectedReason?: string }) => {
  if (status === VerificationStatus.VERIFIED) return null;
  
  const config: Record<string, { bg: string; text: string; icon: string; message: string }> = {
    unverified: { bg: colors.status.warning + '20', text: colors.status.warning, icon: 'alert-circle', message: 'Upload your Civil ID to unlock all features' },
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

export default function StudentHome() {
  const router = useRouter();
  const { user } = useAuth();

  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ['featured-services'],
    queryFn: () => servicesService.listServices({ limit: 5 }),
  });

  const recommendedServices = services?.slice(0, 2) || [];
  const nearbyServices = services?.slice(2) || [];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Wave Header with Search */}
        <WaveHeader height={180}>
          <View style={styles.headerContent}>
            {/* Location Row */}
            <View style={styles.locationRow}>
              <View>
                <Text style={styles.locationLabel}>Location</Text>
                <View style={styles.locationValue}>
                  <Text style={styles.locationText}>{user?.profile?.university || 'Select Location'}</Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={colors.text.white} />
                </View>
              </View>
              <TouchableOpacity style={styles.notificationBtn}>
                <MaterialCommunityIcons name="bell-outline" size={24} color={colors.text.white} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <MaterialCommunityIcons name="magnify" size={22} color={colors.text.light} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search residences, transport..."
                placeholderTextColor={colors.text.light}
                onFocus={() => router.push('/(client)/browse')}
              />
              <TouchableOpacity 
                style={styles.filterBtn}
                onPress={() => router.push('/(client)/browse')}
              >
                <MaterialCommunityIcons name="tune-vertical" size={20} color={colors.primary.main} />
              </TouchableOpacity>
            </View>
          </View>
        </WaveHeader>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Verification Banner */}
          <VerificationBanner 
            status={user?.profile?.verification_status || 'unverified'} 
            rejectedReason={user?.profile?.verification_rejected_reason}
          />

          {/* Recommended Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recommended Residence</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/browse')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {recommendedServices.map((service) => (
                <View key={service.id} style={styles.recommendedCard}>
                  <AppCard
                    title={service.title}
                    subtitle={service.provider_name}
                    image={service.images?.[0]}
                    rating={service.rating?.average}
                    reviewCount={service.rating?.count}
                    price={service.price_monthly}
                    location={service.location?.city}
                    type={service.service_type as any}
                    slots={{ available: service.available_slots, total: service.capacity }}
                    onPress={() => router.push(`/(client)/service/${service.id}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Nearby Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Residence</Text>
              <TouchableOpacity onPress={() => router.push('/(client)/browse')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {nearbyServices.map((service) => (
              <View key={service.id} style={styles.nearbyCard}>
                <AppCard
                  title={service.title}
                  subtitle={service.provider_name}
                  image={service.images?.[0]}
                  rating={service.rating?.average}
                  reviewCount={service.rating?.count}
                  price={service.price_monthly}
                  location={service.location?.city}
                  type={service.service_type as any}
                  variant="horizontal"
                  onPress={() => router.push(`/(client)/service/${service.id}`)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    flexGrow: 1,
  },
  headerContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  locationLabel: {
    fontSize: typography.size.sm,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: spacing.xs,
  },
  locationValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.white,
    marginRight: spacing.xs,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.size.md,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primary.main + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: spacing.xl,
  },
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
  section: {
    marginBottom: spacing.xxl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  seeAll: {
    fontSize: typography.size.sm,
    color: colors.primary.main,
    fontWeight: typography.weight.semibold,
  },
  horizontalScroll: {
    paddingRight: spacing.xl,
  },
  recommendedCard: {
    width: (SCREEN_WIDTH - spacing.xl * 2 - spacing.md) / 2,
    marginRight: spacing.md,
  },
  nearbyCard: {
    marginBottom: spacing.md,
  },
});
