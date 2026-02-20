import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { servicesService } from '../../services/services';
import { ServiceType } from '../../types';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { WaveHeader } from '../../components/WaveHeader';
import { AppCard } from '../../components/AppCard';
import { PrimaryButton } from '../../components/PrimaryButton';

export default function Browse() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Filter states
  const [activeTab, setActiveTab] = useState<'all' | ServiceType>(
    (params.type as ServiceType) || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [city, setCity] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Build query params
  const buildParams = useCallback(() => {
    const queryParams: any = { limit: 50 };
    
    if (activeTab !== 'all') {
      queryParams.service_type = activeTab;
    }
    if (city.trim()) {
      queryParams.city = city.trim();
    }
    if (minPrice && !isNaN(Number(minPrice))) {
      queryParams.min_price = Number(minPrice);
    }
    if (maxPrice && !isNaN(Number(maxPrice))) {
      queryParams.max_price = Number(maxPrice);
    }
    
    return queryParams;
  }, [activeTab, city, minPrice, maxPrice]);

  const { data: services, isLoading, refetch } = useQuery({
    queryKey: ['services', activeTab, city, minPrice, maxPrice],
    queryFn: () => servicesService.listServices(buildParams()),
  });

  // Client-side title search filter
  const filteredServices = services?.filter(service => {
    if (!searchQuery.trim()) return true;
    return service.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const clearFilters = () => {
    setSearchQuery('');
    setCity('');
    setMinPrice('');
    setMaxPrice('');
    setActiveTab('all');
  };

  const hasActiveFilters = city || minPrice || maxPrice || searchQuery;

  return (
    <SafeAreaView style={styles.container}>
      {/* Wave Header */}
      <WaveHeader height={140}>
        <View style={styles.headerContent}>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Browse Services</Text>
            <TouchableOpacity 
              style={styles.filterButton} 
              onPress={() => setShowFilters(!showFilters)}
            >
              <MaterialCommunityIcons 
                name={showFilters ? "filter-off" : "tune-vertical"} 
                size={22} 
                color={hasActiveFilters ? colors.rating : colors.text.white} 
              />
            </TouchableOpacity>
          </View>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons name="magnify" size={22} color={colors.text.light} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              placeholderTextColor={colors.text.light}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={20} color={colors.text.light} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </WaveHeader>

      {/* Content */}
      <View style={styles.content}>
        {/* Segmented Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <Tab 
              title="All" 
              active={activeTab === 'all'} 
              onPress={() => setActiveTab('all')} 
            />
            <Tab 
              title="Transport" 
              icon="bus"
              active={activeTab === ServiceType.TRANSPORTATION} 
              onPress={() => setActiveTab(ServiceType.TRANSPORTATION)} 
            />
            <Tab 
              title="Residence" 
              icon="home"
              active={activeTab === ServiceType.RESIDENCE} 
              onPress={() => setActiveTab(ServiceType.RESIDENCE)} 
            />
          </View>
        </View>

        {/* Expandable Filters */}
        {showFilters && (
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <View style={styles.filterField}>
                <Text style={styles.filterLabel}>City</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="e.g., Muscat"
                  placeholderTextColor={colors.text.light}
                  value={city}
                  onChangeText={setCity}
                  onEndEditing={() => refetch()}
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={[styles.filterField, { marginRight: spacing.sm }]}>
                <Text style={styles.filterLabel}>Min Price</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="0"
                  placeholderTextColor={colors.text.light}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                  onEndEditing={() => refetch()}
                />
              </View>
              <View style={[styles.filterField, { marginLeft: spacing.sm }]}>
                <Text style={styles.filterLabel}>Max Price</Text>
                <TextInput
                  style={styles.filterInput}
                  placeholder="5000"
                  placeholderTextColor={colors.text.light}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  onEndEditing={() => refetch()}
                />
              </View>
            </View>
            {hasActiveFilters && (
              <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
                <MaterialCommunityIcons name="close-circle" size={16} color={colors.status.error} />
                <Text style={styles.clearButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Results Count */}
        {filteredServices && (
          <View style={styles.resultsBar}>
            <Text style={styles.resultsText}>
              {filteredServices.length} service{filteredServices.length !== 1 ? 's' : ''} found
            </Text>
          </View>
        )}

        {/* Service List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator size="large" color={colors.primary.main} />
              <Text style={styles.loadingText}>Loading services...</Text>
            </View>
          ) : filteredServices && filteredServices.length > 0 ? (
            filteredServices.map((service) => (
              <View key={service.id} style={styles.cardWrapper}>
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
            ))
          ) : (
            <View style={styles.empty}>
              <MaterialCommunityIcons name="magnify-close" size={64} color={colors.text.light} />
              <Text style={styles.emptyText}>No services found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
              {hasActiveFilters && (
                <View style={styles.clearFiltersWrapper}>
                  <PrimaryButton
                    title="Clear Filters"
                    onPress={clearFilters}
                    variant="outline"
                    size="sm"
                  />
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const Tab = ({ title, icon, active, onPress }: { title: string; icon?: string; active: boolean; onPress: () => void }) => (
  <TouchableOpacity 
    style={[styles.tab, active && styles.tabActive]} 
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && (
      <MaterialCommunityIcons 
        name={icon as any} 
        size={16} 
        color={active ? colors.text.white : colors.text.secondary} 
        style={styles.tabIcon}
      />
    )}
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{title}</Text>
  </TouchableOpacity>
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
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.size.xxl,
    fontWeight: typography.weight.bold,
    color: colors.text.white,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Search
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
  
  // Content
  content: {
    flex: 1,
  },
  
  // Tabs
  tabsContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.card,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.xs,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
  },
  tabActive: {
    backgroundColor: colors.primary.main,
  },
  tabIcon: {
    marginRight: spacing.xs,
  },
  tabText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  tabTextActive: {
    color: colors.text.white,
  },
  
  // Filters
  filtersContainer: {
    backgroundColor: colors.background.card,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  filterField: {
    flex: 1,
  },
  filterLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  filterInput: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: typography.size.md,
    color: colors.text.primary,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  clearButtonText: {
    fontSize: typography.size.sm,
    color: colors.status.error,
    fontWeight: typography.weight.medium,
    marginLeft: spacing.xs,
  },
  
  // Results
  resultsBar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.primary,
  },
  resultsText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  
  // List
  list: {
    flex: 1,
  },
  listContent: {
    padding: spacing.xl,
    paddingBottom: 100, // Extra padding for bottom tab bar
  },
  cardWrapper: {
    marginBottom: spacing.lg,
  },
  
  // Loading
  loading: {
    paddingVertical: spacing.xxxl * 2,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.lg,
    fontSize: typography.size.lg,
    color: colors.text.secondary,
  },
  
  // Empty
  empty: {
    paddingVertical: spacing.xxxl * 2,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.lg,
  },
  emptySubtext: {
    fontSize: typography.size.md,
    color: colors.text.secondary,
    marginTop: spacing.sm,
  },
  clearFiltersWrapper: {
    marginTop: spacing.xl,
  },
});
