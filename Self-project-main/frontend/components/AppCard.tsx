import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography, shadows } from '../theme';

interface AppCardProps {
  title: string;
  subtitle?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  price?: number;
  location?: string;
  type?: 'residence' | 'transportation';
  onPress?: () => void;
  variant?: 'horizontal' | 'vertical';
  slots?: { available: number; total: number };
}

export const AppCard: React.FC<AppCardProps> = ({
  title,
  subtitle,
  image,
  rating,
  reviewCount,
  price,
  location,
  type = 'residence',
  onPress,
  variant = 'vertical',
  slots,
}) => {
  const isHorizontal = variant === 'horizontal';

  return (
    <TouchableOpacity
      style={[styles.container, isHorizontal && styles.containerHorizontal, shadows.md]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Image */}
      <View style={[styles.imageContainer, isHorizontal && styles.imageContainerHorizontal]}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.imagePlaceholder, { backgroundColor: type === 'transportation' ? colors.primary.light : colors.secondary.purple }]}>
            <MaterialCommunityIcons
              name={type === 'transportation' ? 'bus' : 'home-city'}
              size={40}
              color={colors.text.white}
            />
          </View>
        )}
        
        {/* Type badge */}
        <View style={styles.typeBadge}>
          <MaterialCommunityIcons
            name={type === 'transportation' ? 'bus' : 'home'}
            size={14}
            color={colors.text.white}
          />
        </View>
      </View>

      {/* Content */}
      <View style={[styles.content, isHorizontal && styles.contentHorizontal]}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        
        {subtitle && (
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        )}

        {/* Rating */}
        {rating !== undefined && (
          <View style={styles.ratingRow}>
            <MaterialCommunityIcons name="star" size={14} color={colors.rating} />
            <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
            {reviewCount !== undefined && (
              <Text style={styles.reviewCount}>({reviewCount} reviews)</Text>
            )}
          </View>
        )}

        {/* Location */}
        {location && (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color={colors.text.secondary} />
            <Text style={styles.locationText} numberOfLines={1}>{location}</Text>
          </View>
        )}

        {/* Price & Slots */}
        <View style={styles.footer}>
          {price !== undefined && (
            <Text style={styles.price}>{price} <Text style={styles.currency}>ر.ع</Text></Text>
          )}
          {slots && (
            <View style={styles.slotsContainer}>
              <Text style={styles.slotsText}>{slots.available}/{slots.total}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  containerHorizontal: {
    flexDirection: 'row',
    height: 120,
  },
  imageContainer: {
    height: 140,
    position: 'relative',
  },
  imageContainerHorizontal: {
    width: 120,
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  content: {
    padding: spacing.md,
  },
  contentHorizontal: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  reviewCount: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  price: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary.main,
  },
  currency: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.regular,
  },
  slotsContainer: {
    backgroundColor: colors.status.success + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  slotsText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.status.success,
  },
});

export default AppCard;
