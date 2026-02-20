import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing } from '../theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WaveHeaderProps {
  height?: number;
  children?: React.ReactNode;
}

export const WaveHeader: React.FC<WaveHeaderProps> = ({ height = 200, children }) => {
  return (
    <View style={[styles.container, { height }]}>
      {/* Base dark layer */}
      <View style={styles.baseLayer} />
      
      {/* Wave layers using overlapping rounded containers */}
      <View style={[styles.waveLayer, styles.wave1]} />
      <View style={[styles.waveLayer, styles.wave2]} />
      <View style={[styles.waveLayer, styles.wave3]} />
      
      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: colors.primary.dark,
  },
  baseLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.primary.main,
  },
  waveLayer: {
    position: 'absolute',
    borderRadius: 100,
  },
  wave1: {
    width: SCREEN_WIDTH * 1.5,
    height: 300,
    backgroundColor: colors.primary.wave,
    opacity: 0.5,
    top: -100,
    left: -SCREEN_WIDTH * 0.25,
    transform: [{ rotate: '-15deg' }],
  },
  wave2: {
    width: SCREEN_WIDTH * 1.8,
    height: 250,
    backgroundColor: colors.secondary.purple,
    opacity: 0.3,
    top: -50,
    right: -SCREEN_WIDTH * 0.4,
    transform: [{ rotate: '10deg' }],
  },
  wave3: {
    width: SCREEN_WIDTH * 2,
    height: 400,
    backgroundColor: colors.primary.light,
    opacity: 0.2,
    bottom: -250,
    left: -SCREEN_WIDTH * 0.5,
    transform: [{ rotate: '-5deg' }],
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10,
  },
});

export default WaveHeader;
