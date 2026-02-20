import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';

export const LanguageSwitcher = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, language === 'en' && styles.activeButton]}
        onPress={() => setLanguage('en')}
      >
        <Text style={[styles.text, language === 'en' && styles.activeText]}>EN</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, language === 'ar' && styles.activeButton]}
        onPress={() => setLanguage('ar')}
      >
        <Text style={[styles.text, language === 'ar' && styles.activeText]}>عربي</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  button: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  activeButton: {
    backgroundColor: '#2563EB',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeText: {
    color: '#fff',
  },
})