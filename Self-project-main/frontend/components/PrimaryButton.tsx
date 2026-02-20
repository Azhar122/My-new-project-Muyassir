import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  variant?: 'filled' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  icon,
  variant = 'filled',
  size = 'md',
  fullWidth = false,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || loading;

  const getContainerStyle = () => {
    const base = [styles.container, styles[`container_${size}`]];
    
    if (fullWidth) base.push(styles.fullWidth);
    
    if (variant === 'filled') {
      base.push(styles.filled);
      if (isDisabled) base.push(styles.filledDisabled);
    } else if (variant === 'outline') {
      base.push(styles.outline);
      if (isDisabled) base.push(styles.outlineDisabled);
    } else {
      base.push(styles.ghost);
    }
    
    if (style) base.push(style);
    return base;
  };

  const getTextStyle = () => {
    const base = [styles.text, styles[`text_${size}`]];
    
    if (variant === 'filled') {
      base.push(styles.textFilled);
    } else if (variant === 'outline') {
      base.push(styles.textOutline);
      if (isDisabled) base.push(styles.textOutlineDisabled);
    } else {
      base.push(styles.textGhost);
    }
    
    if (textStyle) base.push(textStyle);
    return base;
  };

  const iconColor = variant === 'filled' 
    ? colors.text.white 
    : isDisabled 
      ? colors.text.light 
      : colors.primary.main;

  return (
    <TouchableOpacity
      style={getContainerStyle()}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <>
          {icon && (
            <MaterialCommunityIcons
              name={icon as any}
              size={size === 'sm' ? 16 : size === 'lg' ? 22 : 18}
              color={iconColor}
              style={styles.icon}
            />
          )}
          <Text style={getTextStyle()}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.md,
  },
  container_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  container_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  container_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xxl,
  },
  fullWidth: {
    width: '100%',
  },
  filled: {
    backgroundColor: colors.primary.main,
  },
  filledDisabled: {
    backgroundColor: colors.border.medium,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  outlineDisabled: {
    borderColor: colors.border.medium,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  text: {
    fontWeight: typography.weight.semibold,
  },
  text_sm: {
    fontSize: typography.size.sm,
  },
  text_md: {
    fontSize: typography.size.md,
  },
  text_lg: {
    fontSize: typography.size.lg,
  },
  textFilled: {
    color: colors.text.white,
  },
  textOutline: {
    color: colors.primary.main,
  },
  textOutlineDisabled: {
    color: colors.text.light,
  },
  textGhost: {
    color: colors.primary.main,
  },
  icon: {
    marginRight: spacing.sm,
  },
});

export default PrimaryButton;
