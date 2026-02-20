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
  TextInput,
  Image,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '../../../services/services';
import { contractsService } from '../../../services/contracts';
import { reviewsService, Review } from '../../../services/reviews';
import { StaticMap } from '../../../components/StaticMap';
import { PrimaryButton } from '../../../components/PrimaryButton';
import { Service, ServiceType, VerificationStatus } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { colors, spacing, borderRadius, typography } from '../../../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showContractModal, setShowContractModal] = useState(false);
  const [duration, setDuration] = useState('3');
  const [selectedRoomType, setSelectedRoomType] = useState('Single');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  });

  // Check if user is verified
  const isVerified = user?.profile?.verification_status === VerificationStatus.VERIFIED;

  const { data: service, isLoading, error } = useQuery({
    queryKey: ['service', id],
    queryFn: () => servicesService.getService(id!),
    enabled: !!id,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsService.getServiceReviews(id!),
    enabled: !!id,
  });

  const createContractMutation = useMutation({
    mutationFn: contractsService.createContract,
    onSuccess: (contract) => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
      setShowContractModal(false);
      if (Platform.OS === 'web') {
        alert('Contract created successfully! Please review and sign.');
      } else {
        Alert.alert('Success', 'Contract created successfully! Please review and sign.');
      }
      router.push(`/(client)/contract/${contract.id}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Failed to create contract';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    },
  });

  const handleCreateContract = () => {
    if (!service) return;
    createContractMutation.mutate({
      service_id: service.id,
      start_date: startDate,
      duration_months: parseInt(duration),
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Service Details', headerShown: false }} />
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary.main} />
          <Text style={styles.loadingText}>Loading service...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !service) {
    return (
      <SafeAreaView style={styles.container}>
        <Stack.Screen options={{ title: 'Service Details', headerShown: false }} />
        <View style={styles.error}>
          <MaterialCommunityIcons name="alert-circle" size={64} color={colors.status.error} />
          <Text style={styles.errorText}>Service not found</Text>
          <PrimaryButton title="Go Back" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  const isTransport = service.service_type === ServiceType.TRANSPORTATION;
  const roomTypes = ['Single', 'Dual', 'Triple', 'Quad'];

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: service.title, headerShown: false }} />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Image Banner */}
        <View style={styles.imageBanner}>
          {service.images && service.images.length > 0 ? (
            <ScrollView 
              horizontal 
              pagingEnabled 
              showsHorizontalScrollIndicator={false}
            >
              {service.images.map((img, index) => (
                <Image
                  key={index}
                  source={{ uri: img }}
                  style={styles.bannerImage}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.bannerPlaceholder}>
              <MaterialCommunityIcons
                name={isTransport ? 'bus' : 'home-city'}
                size={80}
                color={colors.text.white}
              />
            </View>
          )}
          
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.text.white} />
          </TouchableOpacity>
          
          {/* Favorite Button */}
          <TouchableOpacity style={styles.favoriteButton}>
            <MaterialCommunityIcons name="heart-outline" size={24} color={colors.text.white} />
          </TouchableOpacity>
          
          {/* Image Counter */}
          {service.images && service.images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>{service.images.length} photos</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title & Rating Row */}
          <View style={styles.titleRow}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{service.title}</Text>
              <Text style={styles.provider}>by {service.provider_name}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={18} color={colors.rating} />
              <Text style={styles.ratingText}>{service.rating.average.toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({service.rating.count})</Text>
            </View>
          </View>

          {/* Location Row */}
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={18} color={colors.primary.main} />
            <Text style={styles.locationText}>{service.location.city}, {service.location.address}</Text>
          </View>

          {/* Room Type Selector (Residence Only) */}
          {!isTransport && (
            <View style={styles.roomTypeSection}>
              <Text style={styles.sectionLabel}>Room Type</Text>
              <View style={styles.roomTypeRow}>
                {roomTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.roomTypePill,
                      selectedRoomType === type && styles.roomTypePillSelected
                    ]}
                    onPress={() => setSelectedRoomType(type)}
                  >
                    <Text style={[
                      styles.roomTypePillText,
                      selectedRoomType === type && styles.roomTypePillTextSelected
                    ]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Monthly Price Card */}
          <View style={styles.priceCard}>
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>Monthly Price</Text>
                <View style={styles.priceValueRow}>
                  <Text style={styles.priceValue}>{service.price_monthly}</Text>
                  <Text style={styles.priceCurrency}>ر.ع/month</Text>
                </View>
              </View>
              <View style={styles.availabilityBadge}>
                <Text style={styles.availabilityText}>
                  {service.available_slots}/{service.capacity} Available
                </Text>
              </View>
            </View>
          </View>

          {/* Description Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Description</Text>
            <Text style={styles.descriptionText}>{service.description}</Text>
          </View>

          {/* Location Information Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Location</Text>
            <View style={styles.locationInfoRow}>
              <View style={styles.locationIconContainer}>
                <MaterialCommunityIcons name="map-marker" size={24} color={colors.primary.main} />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationCity}>{service.location.city}, Oman</Text>
                <Text style={styles.locationAddress}>{service.location.address}</Text>
                <Text style={styles.locationUniversity}>Near: {service.location.university_nearby}</Text>
              </View>
            </View>
            
            {/* Static Map - Residence Only */}
            {!isTransport && service.location.coordinates && 
             service.location.coordinates.lat && service.location.coordinates.lng && (
              <View style={styles.mapContainer}>
                <StaticMap
                  lat={service.location.coordinates.lat}
                  lng={service.location.coordinates.lng}
                  address={service.location.address}
                />
              </View>
            )}
          </View>

          {/* Service-specific Details */}
          {isTransport && service.transportation && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Transportation Details</Text>
              <DetailRow icon="car" label="Vehicle" value={service.transportation.vehicle_type} />
              {service.transportation.vehicle_number && (
                <DetailRow icon="numeric" label="Vehicle No." value={service.transportation.vehicle_number} />
              )}
            </View>
          )}

          {!isTransport && service.residence && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Residence Details</Text>
              <DetailRow icon="home" label="Type" value={service.residence.residence_type} />
              <DetailRow icon="bed" label="Bedrooms" value={String(service.residence.bedrooms)} />
              <DetailRow icon="shower" label="Bathrooms" value={String(service.residence.bathrooms)} />
              <DetailRow icon="sofa" label="Furnished" value={service.residence.furnished ? 'Yes' : 'No'} />
              <DetailRow icon="gender-male-female" label="Gender" value={service.residence.gender_restriction} />
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.card}>
            <View style={styles.reviewsHeader}>
              <Text style={styles.cardTitle}>Reviews ({service.rating.count})</Text>
              {reviews && reviews.length > 0 && (
                <TouchableOpacity>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {reviewsLoading ? (
              <ActivityIndicator size="small" color={colors.primary.main} />
            ) : reviews && reviews.length > 0 ? (
              reviews.slice(0, 2).map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))
            ) : (
              <View style={styles.noReviews}>
                <MaterialCommunityIcons name="comment-outline" size={32} color={colors.text.light} />
                <Text style={styles.noReviewsText}>No reviews yet</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Action Button */}
      <View style={styles.bottomAction}>
        {!isVerified ? (
          <View style={styles.verificationRequired}>
            <MaterialCommunityIcons name="shield-alert" size={20} color={colors.status.warning} />
            <Text style={styles.verificationText}>Verify your account to create contracts</Text>
          </View>
        ) : service.available_slots > 0 ? (
          <PrimaryButton
            title="Create Contract"
            onPress={() => setShowContractModal(true)}
            icon="file-document-edit"
            fullWidth
            size="lg"
          />
        ) : (
          <View style={styles.unavailableBar}>
            <MaterialCommunityIcons name="alert" size={20} color={colors.status.error} />
            <Text style={styles.unavailableText}>No slots available</Text>
          </View>
        )}
      </View>

      {/* Contract Creation Modal */}
      <Modal
        visible={showContractModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowContractModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Contract</Text>
              <TouchableOpacity onPress={() => setShowContractModal(false)}>
                <MaterialCommunityIcons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Service</Text>
            <Text style={styles.modalValue}>{service.title}</Text>

            <Text style={styles.modalLabel}>Start Date</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.text.light}
            />

            <Text style={styles.modalLabel}>Duration</Text>
            <View style={styles.durationOptions}>
              {['1', '3', '6', '12'].map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.durationOption, duration === d && styles.durationSelected]}
                  onPress={() => setDuration(d)}
                >
                  <Text style={[styles.durationText, duration === d && styles.durationTextSelected]}>
                    {d}mo
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>
                {service.price_monthly * parseInt(duration)} ر.ع
              </Text>
            </View>

            <PrimaryButton
              title="Confirm Contract"
              onPress={handleCreateContract}
              loading={createContractMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const ReviewCard = ({ review }: { review: Review }) => (
  <View style={styles.reviewCard}>
    <View style={styles.reviewHeader}>
      <View style={styles.reviewerInfo}>
        <View style={styles.reviewerAvatar}>
          <Text style={styles.reviewerInitial}>
            {review.student_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View>
          <Text style={styles.reviewerName}>{review.student_name}</Text>
          <Text style={styles.reviewDate}>
            {new Date(review.created_at).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <View style={styles.reviewRatingBadge}>
        <MaterialCommunityIcons name="star" size={14} color={colors.rating} />
        <Text style={styles.reviewRatingText}>{review.rating}</Text>
      </View>
    </View>
    <Text style={styles.reviewText}>{review.review_text}</Text>
    {review.verified_booking && (
      <View style={styles.verifiedBadge}>
        <MaterialCommunityIcons name="check-circle" size={14} color={colors.status.success} />
        <Text style={styles.verifiedText}>Verified Booking</Text>
      </View>
    )}
  </View>
);

const DetailRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.detailRow}>
    <MaterialCommunityIcons name={icon as any} size={20} color={colors.text.secondary} />
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background.primary 
  },
  loading: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loadingText: { 
    marginTop: spacing.lg, 
    fontSize: typography.size.lg, 
    color: colors.text.secondary 
  },
  error: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: spacing.xl 
  },
  errorText: { 
    fontSize: typography.size.xl, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary, 
    marginVertical: spacing.lg 
  },
  scrollContent: { 
    paddingBottom: 100 
  },
  
  // Image Banner
  imageBanner: { 
    height: 280, 
    backgroundColor: colors.primary.main, 
    position: 'relative' 
  },
  bannerImage: { 
    width: SCREEN_WIDTH, 
    height: 280 
  },
  bannerPlaceholder: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  backButton: { 
    position: 'absolute', 
    top: spacing.lg, 
    left: spacing.lg, 
    width: 44, 
    height: 44, 
    borderRadius: borderRadius.full, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  favoriteButton: { 
    position: 'absolute', 
    top: spacing.lg, 
    right: spacing.lg, 
    width: 44, 
    height: 44, 
    borderRadius: borderRadius.full, 
    backgroundColor: 'rgba(0,0,0,0.4)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  imageCounter: { 
    position: 'absolute', 
    bottom: spacing.lg, 
    right: spacing.lg, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.sm 
  },
  imageCounterText: { 
    color: colors.text.white, 
    fontSize: typography.size.sm, 
    fontWeight: typography.weight.medium 
  },

  // Content
  content: { 
    padding: spacing.xl 
  },
  
  // Title Row
  titleRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.sm 
  },
  titleContainer: { 
    flex: 1, 
    marginRight: spacing.md 
  },
  title: { 
    fontSize: typography.size.xxl, 
    fontWeight: typography.weight.bold, 
    color: colors.text.primary, 
    marginBottom: spacing.xs 
  },
  provider: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary 
  },
  ratingContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.rating + '20', 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.xs, 
    borderRadius: borderRadius.sm 
  },
  ratingText: { 
    fontSize: typography.size.md, 
    fontWeight: typography.weight.bold, 
    color: colors.text.primary, 
    marginLeft: spacing.xs 
  },
  reviewCount: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary, 
    marginLeft: spacing.xs 
  },

  // Location Row
  locationRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: spacing.xl 
  },
  locationText: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary, 
    marginLeft: spacing.xs 
  },

  // Room Type
  roomTypeSection: { 
    marginBottom: spacing.xl 
  },
  sectionLabel: { 
    fontSize: typography.size.md, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary, 
    marginBottom: spacing.sm 
  },
  roomTypeRow: { 
    flexDirection: 'row', 
    gap: spacing.sm 
  },
  roomTypePill: { 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.full, 
    backgroundColor: colors.background.card, 
    borderWidth: 1, 
    borderColor: colors.border.light 
  },
  roomTypePillSelected: { 
    backgroundColor: colors.primary.main, 
    borderColor: colors.primary.main 
  },
  roomTypePillText: { 
    fontSize: typography.size.sm, 
    fontWeight: typography.weight.medium, 
    color: colors.text.secondary 
  },
  roomTypePillTextSelected: { 
    color: colors.text.white 
  },

  // Price Card
  priceCard: { 
    backgroundColor: colors.background.card, 
    borderRadius: borderRadius.lg, 
    padding: spacing.lg, 
    marginBottom: spacing.lg 
  },
  priceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  priceLabel: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary, 
    marginBottom: spacing.xs 
  },
  priceValueRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline' 
  },
  priceValue: { 
    fontSize: typography.size.display, 
    fontWeight: typography.weight.bold, 
    color: colors.primary.main 
  },
  priceCurrency: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary, 
    marginLeft: spacing.xs 
  },
  availabilityBadge: { 
    backgroundColor: colors.status.success + '20', 
    paddingHorizontal: spacing.md, 
    paddingVertical: spacing.sm, 
    borderRadius: borderRadius.sm 
  },
  availabilityText: { 
    fontSize: typography.size.sm, 
    fontWeight: typography.weight.semibold, 
    color: colors.status.success 
  },

  // Cards
  card: { 
    backgroundColor: colors.background.card, 
    borderRadius: borderRadius.lg, 
    padding: spacing.lg, 
    marginBottom: spacing.lg 
  },
  cardTitle: { 
    fontSize: typography.size.lg, 
    fontWeight: typography.weight.bold, 
    color: colors.text.primary, 
    marginBottom: spacing.md 
  },
  descriptionText: { 
    fontSize: typography.size.md, 
    color: colors.text.secondary, 
    lineHeight: 24 
  },

  // Location Info
  locationInfoRow: { 
    flexDirection: 'row', 
    alignItems: 'flex-start' 
  },
  locationIconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: borderRadius.md, 
    backgroundColor: colors.primary.main + '10', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: spacing.md 
  },
  locationDetails: { 
    flex: 1 
  },
  locationCity: { 
    fontSize: typography.size.lg, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary 
  },
  locationAddress: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary, 
    marginTop: spacing.xs 
  },
  locationUniversity: { 
    fontSize: typography.size.sm, 
    color: colors.primary.main, 
    marginTop: spacing.xs 
  },
  mapContainer: { 
    marginTop: spacing.lg 
  },

  // Detail Rows
  detailRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: spacing.sm, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  detailLabel: { 
    flex: 1, 
    fontSize: typography.size.md, 
    color: colors.text.secondary, 
    marginLeft: spacing.sm 
  },
  detailValue: { 
    fontSize: typography.size.md, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary, 
    textTransform: 'capitalize' 
  },

  // Reviews
  reviewsHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.md 
  },
  seeAllText: { 
    fontSize: typography.size.sm, 
    color: colors.primary.main, 
    fontWeight: typography.weight.semibold 
  },
  reviewCard: { 
    paddingVertical: spacing.md, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.border.light 
  },
  reviewHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.sm 
  },
  reviewerInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  reviewerAvatar: { 
    width: 40, 
    height: 40, 
    borderRadius: borderRadius.full, 
    backgroundColor: colors.primary.main, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: spacing.sm 
  },
  reviewerInitial: { 
    color: colors.text.white, 
    fontSize: typography.size.lg, 
    fontWeight: typography.weight.semibold 
  },
  reviewerName: { 
    fontSize: typography.size.md, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary 
  },
  reviewDate: { 
    fontSize: typography.size.xs, 
    color: colors.text.light 
  },
  reviewRatingBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: colors.rating + '20', 
    paddingHorizontal: spacing.sm, 
    paddingVertical: spacing.xs, 
    borderRadius: borderRadius.sm 
  },
  reviewRatingText: { 
    fontSize: typography.size.sm, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary, 
    marginLeft: spacing.xs 
  },
  reviewText: { 
    fontSize: typography.size.sm, 
    color: colors.text.secondary, 
    lineHeight: 20 
  },
  verifiedBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: spacing.sm 
  },
  verifiedText: { 
    fontSize: typography.size.xs, 
    color: colors.status.success, 
    marginLeft: spacing.xs 
  },
  noReviews: { 
    alignItems: 'center', 
    paddingVertical: spacing.xl 
  },
  noReviewsText: { 
    fontSize: typography.size.sm, 
    color: colors.text.light, 
    marginTop: spacing.sm 
  },

  // Bottom Action
  bottomAction: { 
    position: 'absolute', 
    bottom: 0, 
    left: 0, 
    right: 0, 
    padding: spacing.lg, 
    backgroundColor: colors.background.card, 
    borderTopWidth: 1, 
    borderTopColor: colors.border.light 
  },
  verificationRequired: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.status.warning + '20', 
    padding: spacing.md, 
    borderRadius: borderRadius.md 
  },
  verificationText: { 
    fontSize: typography.size.sm, 
    color: colors.status.warning, 
    marginLeft: spacing.sm, 
    fontWeight: typography.weight.medium 
  },
  unavailableBar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: colors.status.error + '20', 
    padding: spacing.md, 
    borderRadius: borderRadius.md 
  },
  unavailableText: { 
    fontSize: typography.size.md, 
    fontWeight: typography.weight.semibold, 
    color: colors.status.error, 
    marginLeft: spacing.sm 
  },

  // Modal
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: colors.background.card, 
    borderTopLeftRadius: borderRadius.xxl, 
    borderTopRightRadius: borderRadius.xxl, 
    padding: spacing.xxl, 
    maxHeight: '80%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: spacing.xl 
  },
  modalTitle: { 
    fontSize: typography.size.xl, 
    fontWeight: typography.weight.bold, 
    color: colors.text.primary 
  },
  modalLabel: { 
    fontSize: typography.size.sm, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary, 
    marginTop: spacing.lg, 
    marginBottom: spacing.sm 
  },
  modalValue: { 
    fontSize: typography.size.lg, 
    color: colors.text.secondary 
  },
  input: { 
    borderWidth: 1, 
    borderColor: colors.border.light, 
    borderRadius: borderRadius.md, 
    padding: spacing.md, 
    fontSize: typography.size.lg, 
    color: colors.text.primary 
  },
  durationOptions: { 
    flexDirection: 'row', 
    gap: spacing.sm 
  },
  durationOption: { 
    flex: 1, 
    padding: spacing.md, 
    borderRadius: borderRadius.md, 
    borderWidth: 2, 
    borderColor: colors.border.light, 
    alignItems: 'center' 
  },
  durationSelected: { 
    borderColor: colors.primary.main, 
    backgroundColor: colors.primary.main + '10' 
  },
  durationText: { 
    fontSize: typography.size.md, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.secondary 
  },
  durationTextSelected: { 
    color: colors.primary.main 
  },
  totalSection: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    backgroundColor: colors.background.primary, 
    padding: spacing.lg, 
    borderRadius: borderRadius.md, 
    marginVertical: spacing.xl 
  },
  totalLabel: { 
    fontSize: typography.size.lg, 
    fontWeight: typography.weight.semibold, 
    color: colors.text.primary 
  },
  totalValue: { 
    fontSize: typography.size.xxl, 
    fontWeight: typography.weight.bold, 
    color: colors.primary.main 
  },
});
