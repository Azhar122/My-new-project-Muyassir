import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';
import { colors } from '../theme';

export default function Index() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace('/(auth)/welcome');
      } else if (user) {
        // Route based on user role
        if (user.role === UserRole.ADMIN) {
          router.replace('/(admin)');
        } else if (user.role === UserRole.CLIENT) {
          router.replace('/(client)/home');
        } else if (user.role === UserRole.SERVICE_PROVIDER) {
          router.replace('/(provider)/dashboard');
        }
      }
    }
  }, [isLoading, isAuthenticated, user]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary.main} />
      <Text style={styles.text}>Loading Muyassir...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.card,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.secondary,
  },
});