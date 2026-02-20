import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { servicesService } from '../../services/services';
import { ServiceType, VerificationStatus } from '../../types';
import { MapPicker } from '../../components/MapPicker';
import { ImageUploader } from '../../components/ImageUploader';
import { useAuth } from '../../contexts/AuthContext';

const CATEGORIES = [
  'Daily Commute',
  'Airport Transfer',
  'Weekend Service',
  'Student Housing',
  'Shared Apartment',
  'Private Room',
];

// Enums matching backend exactly
const RESIDENCE_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'room', label: 'Private Room' },
  { value: 'shared', label: 'Shared Room' },
];

const GENDER_RESTRICTIONS = [
  { value: 'any', label: 'Any' },
  { value: 'male', label: 'Male Only' },
  { value: 'female', label: 'Female Only' },
];

const VEHICLE_TYPES = [
  { value: 'Bus', label: 'Bus' },
  { value: 'Van', label: 'Van' },
  { value: 'Car', label: 'Car' },
  { value: 'Minibus', label: 'Minibus' },
];

export default function AddService() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Check verification status
  const isVerified = user?.profile?.verification_status === VerificationStatus.VERIFIED;

  // Basic fields
  const [serviceType, setServiceType] = useState<ServiceType>(ServiceType.TRANSPORTATION);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [images, setImages] = useState<string[]>([]);

  // Location fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [university, setUniversity] = useState('');
  const [lat, setLat] = useState('24.7136'); // Default Riyadh coords
  const [lng, setLng] = useState('46.6753');

  // Transportation fields
  const [vehicleType, setVehicleType] = useState('Bus');

  // Residence fields
  const [residenceType, setResidenceType] = useState('apartment');
  const [bedrooms, setBedrooms] = useState('1');
  const [bathrooms, setBathrooms] = useState('1');
  const [furnished, setFurnished] = useState(false);
  const [genderRestriction, setGenderRestriction] = useState('any');
  const [leaseDuration, setLeaseDuration] = useState('12');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Map picker state (residence only)
  const [showMapPicker, setShowMapPicker] = useState(false);

  const createMutation = useMutation({
    mutationFn: (data: any) => servicesService.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      Alert.alert('Success', 'Service created successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error: any) => {
      console.error('Create service error:', error);
      let errorMessage = 'Failed to create service';
      if (error.response?.data?.detail) {
        errorMessage = typeof error.response.data.detail === 'string' 
          ? error.response.data.detail 
          : JSON.stringify(error.response.data.detail);
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert('Error', errorMessage);
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Basic validations
    if (!title.trim()) newErrors.title = 'Title is required';
    if (!category.trim()) newErrors.category = 'Category is required';
    
    const priceNum = Number(price);
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      newErrors.price = 'Price must be greater than 0';
    }
    
    const capacityNum = Number(capacity);
    if (!capacity || isNaN(capacityNum) || capacityNum <= 0) {
      newErrors.capacity = 'Capacity must be at least 1';
    }

    // Location validations
    if (!address.trim()) newErrors.address = 'Address is required';
    if (!city.trim()) newErrors.city = 'City is required';
    if (!university.trim()) newErrors.university = 'University is required';

    // Residence-specific validations
    if (serviceType === ServiceType.RESIDENCE) {
      const bedroomsNum = Number(bedrooms);
      if (!bedrooms || isNaN(bedroomsNum) || bedroomsNum < 0) {
        newErrors.bedrooms = 'Bedrooms must be 0 or more';
      }
      const bathroomsNum = Number(bathrooms);
      if (!bathrooms || isNaN(bathroomsNum) || bathroomsNum < 0) {
        newErrors.bathrooms = 'Bathrooms must be 0 or more';
      }
      const leaseNum = Number(leaseDuration);
      if (!leaseDuration || isNaN(leaseNum) || leaseNum <= 0) {
        newErrors.leaseDuration = 'Lease duration must be at least 1 month';
      }
    }

    setErrors(newErrors);
    
    if (Object.keys(newErrors).length > 0) {
      const firstError = Object.values(newErrors)[0];
      Alert.alert('Validation Error', firstError);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    // Build the payload matching backend schema exactly
    const serviceData: any = {
      service_type: serviceType,
      title: title.trim(),
      description: description.trim() || 'No description provided',
      category: category.trim(),
      price_monthly: Number(price),
      capacity: Number(capacity),
      images: images, // Already Base64 strings
      location: {
        address: address.trim(),
        coordinates: {
          lat: Number(lat) || 0,
          lng: Number(lng) || 0,
        },
        city: city.trim(),
        university_nearby: university.trim(),
      },
    };

    // Add service-type specific fields
    if (serviceType === ServiceType.TRANSPORTATION) {
      serviceData.transportation = {
        vehicle_type: vehicleType,
        vehicle_number: null,
        route: [],
        pickup_times: [],
        amenities: [],
      };
    } else if (serviceType === ServiceType.RESIDENCE) {
      serviceData.residence = {
        residence_type: residenceType,
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        furnished: furnished, // boolean
        amenities: [],
        gender_restriction: genderRestriction,
        lease_duration_months: Number(leaseDuration),
      };
    }

    console.log('Submitting:', JSON.stringify(serviceData, null, 2));
    createMutation.mutate(serviceData);
  };

  const handleMapLocationSelect = (newLat: number, newLng: number) => {
    setLat(newLat.toString());
    setLng(newLng.toString());
  };

  const renderSelector = (
    options: { value: string; label: string }[],
    selected: string,
    onSelect: (value: string) => void
  ) => (
    <View style={styles.selectorRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.selectorButton, selected === opt.value && styles.selectorButtonActive]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[styles.selectorText, selected === opt.value && styles.selectorTextActive]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Service</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Verification Required Block */}
        {!isVerified ? (
          <View style={styles.verificationRequired}>
            <MaterialCommunityIcons name="shield-alert" size={64} color="#F59E0B" />
            <Text style={styles.verificationTitle}>Verification Required</Text>
            <Text style={styles.verificationText}>
              Your account must be verified before you can create services. Please upload your company registration document in your profile.
            </Text>
            <TouchableOpacity style={styles.goBackButton} onPress={() => router.back()}>
              <Text style={styles.goBackButtonText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Service Type */}
          <View style={styles.section}>
            <Text style={styles.label}>Service Type *</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, serviceType === ServiceType.TRANSPORTATION && styles.typeButtonActive]}
                onPress={() => setServiceType(ServiceType.TRANSPORTATION)}
              >
                <MaterialCommunityIcons
                  name="bus"
                  size={24}
                  color={serviceType === ServiceType.TRANSPORTATION ? '#fff' : '#6B7280'}
                />
                <Text style={[styles.typeButtonText, serviceType === ServiceType.TRANSPORTATION && styles.typeButtonTextActive]}>
                  Transportation
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeButton, serviceType === ServiceType.RESIDENCE && styles.typeButtonActive]}
                onPress={() => setServiceType(ServiceType.RESIDENCE)}
              >
                <MaterialCommunityIcons
                  name="home"
                  size={24}
                  color={serviceType === ServiceType.RESIDENCE ? '#fff' : '#6B7280'}
                />
                <Text style={[styles.typeButtonText, serviceType === ServiceType.RESIDENCE && styles.typeButtonTextActive]}>
                  Residence
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Daily Campus Shuttle"
              placeholderTextColor="#9CA3AF"
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={[styles.input, errors.category && styles.inputError, { marginTop: 8 }]}
              value={category}
              onChangeText={setCategory}
              placeholder="Or enter custom category"
              placeholderTextColor="#9CA3AF"
            />
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your service..."
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Price & Capacity */}
          <View style={styles.row}>
            <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Monthly Price (SAR) *</Text>
              <TextInput
                style={[styles.input, errors.price && styles.inputError]}
                value={price}
                onChangeText={setPrice}
                placeholder="500"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
            </View>
            <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Capacity *</Text>
              <TextInput
                style={[styles.input, errors.capacity && styles.inputError]}
                value={capacity}
                onChangeText={setCapacity}
                placeholder="10"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
              {errors.capacity && <Text style={styles.errorText}>{errors.capacity}</Text>}
            </View>
          </View>

          {/* Location Section */}
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#10B981" />
            <Text style={styles.sectionHeaderText}>Location</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={address}
              onChangeText={setAddress}
              placeholder="123 Main Street"
              placeholderTextColor="#9CA3AF"
            />
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={[styles.input, errors.city && styles.inputError]}
                value={city}
                onChangeText={setCity}
                placeholder="Riyadh"
                placeholderTextColor="#9CA3AF"
              />
              {errors.city && <Text style={styles.errorText}>{errors.city}</Text>}
            </View>
            <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Nearby University *</Text>
              <TextInput
                style={[styles.input, errors.university && styles.inputError]}
                value={university}
                onChangeText={setUniversity}
                placeholder="KSU"
                placeholderTextColor="#9CA3AF"
              />
              {errors.university && <Text style={styles.errorText}>{errors.university}</Text>}
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Latitude</Text>
              <TextInput
                style={styles.input}
                value={lat}
                onChangeText={setLat}
                placeholder="24.7136"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Longitude</Text>
              <TextInput
                style={styles.input}
                value={lng}
                onChangeText={setLng}
                placeholder="46.6753"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Map Picker Button - Residence Only */}
          {serviceType === ServiceType.RESIDENCE && (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.mapPickerButton}
                onPress={() => setShowMapPicker(true)}
              >
                <MaterialCommunityIcons name="map-marker-radius" size={20} color="#2563EB" />
                <Text style={styles.mapPickerButtonText}>Select Location on Map</Text>
              </TouchableOpacity>
              {lat && lng && Number(lat) !== 0 && Number(lng) !== 0 && (
                <View style={styles.selectedLocationPreview}>
                  <MaterialCommunityIcons name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.selectedLocationText}>
                    Location: {Number(lat).toFixed(4)}, {Number(lng).toFixed(4)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Transportation-specific fields */}
          {serviceType === ServiceType.TRANSPORTATION && (
            <>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="bus" size={20} color="#10B981" />
                <Text style={styles.sectionHeaderText}>Transportation Details</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Vehicle Type *</Text>
                {renderSelector(VEHICLE_TYPES, vehicleType, setVehicleType)}
              </View>
            </>
          )}

          {/* Residence-specific fields */}
          {serviceType === ServiceType.RESIDENCE && (
            <>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons name="home" size={20} color="#10B981" />
                <Text style={styles.sectionHeaderText}>Residence Details</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Residence Type *</Text>
                {renderSelector(RESIDENCE_TYPES, residenceType, setResidenceType)}
              </View>

              <View style={styles.row}>
                <View style={[styles.section, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Bedrooms *</Text>
                  <TextInput
                    style={[styles.input, errors.bedrooms && styles.inputError]}
                    value={bedrooms}
                    onChangeText={setBedrooms}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  {errors.bedrooms && <Text style={styles.errorText}>{errors.bedrooms}</Text>}
                </View>
                <View style={[styles.section, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>Bathrooms *</Text>
                  <TextInput
                    style={[styles.input, errors.bathrooms && styles.inputError]}
                    value={bathrooms}
                    onChangeText={setBathrooms}
                    placeholder="1"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  {errors.bathrooms && <Text style={styles.errorText}>{errors.bathrooms}</Text>}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Gender Restriction *</Text>
                {renderSelector(GENDER_RESTRICTIONS, genderRestriction, setGenderRestriction)}
              </View>

              <View style={styles.section}>
                <Text style={styles.label}>Lease Duration (months) *</Text>
                <TextInput
                  style={[styles.input, errors.leaseDuration && styles.inputError]}
                  value={leaseDuration}
                  onChangeText={setLeaseDuration}
                  placeholder="12"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                />
                {errors.leaseDuration && <Text style={styles.errorText}>{errors.leaseDuration}</Text>}
              </View>

              <View style={styles.section}>
                <View style={styles.switchRow}>
                  <Text style={styles.label}>Furnished</Text>
                  <Switch
                    value={furnished}
                    onValueChange={setFurnished}
                    trackColor={{ false: '#D1D5DB', true: '#10B981' }}
                    thumbColor="#fff"
                  />
                </View>
              </View>
            </>
          )}

          {/* Image Upload */}
          <ImageUploader images={images} onImagesChange={setImages} maxImages={5} />

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, createMutation.isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Create Service</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* Map Picker Modal - Residence Only */}
      <MapPicker
        visible={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelectLocation={handleMapLocationSelect}
        initialLat={Number(lat) || 23.5880}
        initialLng={Number(lng) || 58.3829}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  verificationRequired: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FEF3C7',
  },
  verificationTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#92400E',
    marginTop: 16,
  },
  verificationText: {
    fontSize: 14,
    color: '#92400E',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  goBackButton: {
    marginTop: 24,
    backgroundColor: '#92400E',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  goBackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    gap: 8,
  },
  typeButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  categoryChipText: {
    fontSize: 13,
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  selectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectorButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  selectorButtonActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  selectorText: {
    fontSize: 14,
    color: '#6B7280',
  },
  selectorTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  imageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeImageButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  addImageButtonText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  mapPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: '#EFF6FF',
    gap: 8,
  },
  mapPickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  selectedLocationPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  selectedLocationText: {
    fontSize: 13,
    color: '#10B981',
  },
});
