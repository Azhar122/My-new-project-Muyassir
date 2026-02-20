import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '../../components/Button';

const { width } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.arabicTitle}>مُيسر</Text>
          <Text style={styles.title}>Muyassir</Text>
          <Text style={styles.subtitle}>Safe Student Services Platform</Text>
        </View>

        <View style={styles.features}>
          <FeatureCard
            icon="shield-check"
            title="Safety First"
            description="Your safety is our priority. No phone numbers exposed."
          />
          <FeatureCard
            icon="bus"
            title="Transportation"
            description="Find reliable transportation to your university."
          />
          <FeatureCard
            icon="home"
            title="Residences"
            description="Secure and verified student accommodation."
          />
        </View>

        <View style={styles.buttons}>
          <Button
            title="Login"
            onPress={() => router.push('/(auth)/login')}
            variant="primary"
            fullWidth
          />
          <View style={{ height: 12 }} />
          <Button
            title="Register"
            onPress={() => router.push('/(auth)/register')}
            variant="outline"
            fullWidth
          />
        </View>

        <Text style={styles.footer}>
          © 2025 Muyassir. Safe student services.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const FeatureCard = ({ icon, title, description }: any) => (
  <View style={styles.featureCard}>
    <View style={styles.iconContainer}>
      <Text style={styles.iconText}>✓</Text>
    </View>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureDescription}>{description}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  arabicTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  features: {
    marginBottom: 40,
  },
  featureCard: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#6B7280',
  },
  buttons: {
    marginTop: 'auto',
    marginBottom: 24,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9CA3AF',
  },
});