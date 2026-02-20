import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole, ClientType } from '../../types';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    role: UserRole.CLIENT,
    university: '',
    student_id: '',
    client_type: ClientType.STUDENT,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  
  // Document upload state
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [documentBase64, setDocumentBase64] = useState<string | null>(null);
  const [documentLoading, setDocumentLoading] = useState(false);

  const validateForm = () => {
    const newErrors: any = {};
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (formData.password.length < 8)
      newErrors.password = 'Password must be at least 8 characters';
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.full_name) newErrors.full_name = 'Full name is required';
    if (formData.role === UserRole.CLIENT && !formData.university)
      newErrors.university = 'University is required for students';
    if (formData.role === UserRole.CLIENT && !formData.client_type)
      newErrors.client_type = 'Client type is required';
    if (!documentBase64) {
      newErrors.document = 'Verification document is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const getDocumentUploadLabel = () => {
    if (formData.role === UserRole.SERVICE_PROVIDER) {
      return 'Upload Company Registration (PDF)';
    }
    if (formData.client_type === ClientType.STUDENT) {
      return 'Upload Student ID';
    }
    return 'Upload Civil ID';
  };

  const getAcceptedFileTypes = () => {
    if (formData.role === UserRole.SERVICE_PROVIDER) {
      return ['application/pdf'];
    }
    // Clients can upload JPG, PNG, or PDF
    return ['image/jpeg', 'image/png', 'application/pdf'];
  };

  const handleDocumentPick = async () => {
    try {
      setDocumentLoading(true);
      setErrors({ ...errors, document: undefined });

      const acceptedTypes = getAcceptedFileTypes();
      
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        setDocumentLoading(false);
        return;
      }

      const file = result.assets[0];
      
      // Validate file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      const isProvider = formData.role === UserRole.SERVICE_PROVIDER;
      
      if (isProvider && fileExtension !== 'pdf') {
        setErrors({ ...errors, document: 'Only PDF files are allowed for providers' });
        setDocumentLoading(false);
        return;
      }

      if (!isProvider && !['jpg', 'jpeg', 'png', 'pdf'].includes(fileExtension || '')) {
        setErrors({ ...errors, document: 'Only JPG, PNG, or PDF files are allowed' });
        setDocumentLoading(false);
        return;
      }

      // Convert to Base64
      let base64Content: string;
      
      if (Platform.OS === 'web') {
        // Web: use fetch and FileReader
        const response = await fetch(file.uri);
        const blob = await response.blob();
        base64Content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            // Remove data URL prefix (e.g., "data:application/pdf;base64,")
            const base64 = result.split(',')[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        // Native: use expo-file-system
        base64Content = await FileSystem.readAsStringAsync(file.uri, {
          encoding: 'base64',
        });
      }

      setDocumentName(file.name);
      setDocumentBase64(base64Content);
    } catch (error) {
      console.error('Error picking document:', error);
      const message = 'Failed to read the document. Please try again.';
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    } finally {
      setDocumentLoading(false);
    }
  };

  const handleClearDocument = () => {
    setDocumentName(null);
    setDocumentBase64(null);
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await register({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        full_name: formData.full_name,
        university: formData.university || undefined,
        student_id: formData.student_id || undefined,
        client_type: formData.role === UserRole.CLIENT ? formData.client_type : undefined,
        verification_document: documentBase64 || undefined,
      });
      // Navigate to index which will redirect based on user role
      router.replace('/');
    } catch (error: any) {
      let message = 'Unable to create account';
    
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
    
        if (Array.isArray(detail)) {
          message = detail.map((d: any) => d.msg).join(', ');
        } else if (typeof detail === 'string') {
          message = detail;
        }
      } else if (error.request) {
        message = 'Cannot reach backend. Check API URL and backend server.';
      }
    
      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Registration Failed', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join Muyassir today</Text>
          </View>

          {/* Role Selector */}
          <View style={styles.roleSelector}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === UserRole.CLIENT && styles.roleButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, role: UserRole.CLIENT })}
            >
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === UserRole.CLIENT && styles.roleButtonTextActive,
                ]}
              >
                Client
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === UserRole.SERVICE_PROVIDER &&
                  styles.roleButtonActive,
              ]}
              onPress={() =>
                setFormData({ ...formData, role: UserRole.SERVICE_PROVIDER })
              }
            >
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === UserRole.SERVICE_PROVIDER &&
                    styles.roleButtonTextActive,
                ]}
              >
                Service Provider
              </Text>
            </TouchableOpacity>
          </View>

          {/* Client Type Selector - Only shown for clients */}
          {formData.role === UserRole.CLIENT && (
            <View style={styles.clientTypeSection}>
              <Text style={styles.sectionLabel}>I am a:</Text>
              <View style={styles.clientTypeSelector}>
                <TouchableOpacity
                  style={[
                    styles.clientTypeButton,
                    formData.client_type === ClientType.STUDENT && styles.clientTypeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, client_type: ClientType.STUDENT })}
                >
                  <View style={[
                    styles.radioOuter,
                    formData.client_type === ClientType.STUDENT && styles.radioOuterActive,
                  ]}>
                    {formData.client_type === ClientType.STUDENT && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.clientTypeText,
                    formData.client_type === ClientType.STUDENT && styles.clientTypeTextActive,
                  ]}>
                    Student
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.clientTypeButton,
                    formData.client_type === ClientType.EMPLOYEE && styles.clientTypeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, client_type: ClientType.EMPLOYEE })}
                >
                  <View style={[
                    styles.radioOuter,
                    formData.client_type === ClientType.EMPLOYEE && styles.radioOuterActive,
                  ]}>
                    {formData.client_type === ClientType.EMPLOYEE && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                  <Text style={[
                    styles.clientTypeText,
                    formData.client_type === ClientType.EMPLOYEE && styles.clientTypeTextActive,
                  ]}>
                    Employee
                  </Text>
                </TouchableOpacity>
              </View>
              {errors.client_type && (
                <Text style={styles.errorText}>{errors.client_type}</Text>
              )}
            </View>
          )}

          <View style={styles.form}>
            <Input
              label="Full Name"
              placeholder="Your full name"
              value={formData.full_name}
              onChangeText={(text) => setFormData({ ...formData, full_name: text })}
              error={errors.full_name}
              icon="account"
            />

            <Input
              label="Email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChangeText={(text) => setFormData({ ...formData, email: text })}
              error={errors.email}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="email"
            />

            {formData.role === UserRole.CLIENT && (
              <>
                <Input
                  label="University"
                  placeholder="Your university"
                  value={formData.university}
                  onChangeText={(text) =>
                    setFormData({ ...formData, university: text })
                  }
                  error={errors.university}
                  icon="school"
                />
                <Input
                  label="Student ID (Optional)"
                  placeholder="Your student ID"
                  value={formData.student_id}
                  onChangeText={(text) =>
                    setFormData({ ...formData, student_id: text })
                  }
                  icon="card-account-details"
                />
              </>
            )}

            <Input
              label="Password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChangeText={(text) => setFormData({ ...formData, password: text })}
              error={errors.password}
              isPassword
              icon="lock"
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChangeText={(text) =>
                setFormData({ ...formData, confirmPassword: text })
              }
              error={errors.confirmPassword}
              isPassword
              icon="lock-check"
            />

            {/* Document Upload Section */}
            <View style={styles.documentSection}>
              <Text style={styles.documentLabel}>{getDocumentUploadLabel()}</Text>
              <Text style={styles.documentHint}>
                {formData.role === UserRole.SERVICE_PROVIDER
                  ? 'Accepted format: PDF'
                  : 'Accepted formats: JPG, PNG, PDF'}
              </Text>
              
              {!documentName ? (
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={handleDocumentPick}
                  disabled={documentLoading}
                >
                  {documentLoading ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <Text style={styles.uploadButtonText}>Choose File</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View style={styles.documentSelected}>
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentIcon}>📄</Text>
                    <Text style={styles.documentNameText} numberOfLines={1}>
                      {documentName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={handleClearDocument}
                  >
                    <Text style={styles.clearButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {errors.document && (
                <Text style={styles.errorText}>{errors.document}</Text>
              )}
            </View>

            <Button
              title="Create Account"
              onPress={handleRegister}
              loading={loading}
              fullWidth
              icon="account-plus"
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Button
              title="Login"
              onPress={() => router.push('/(auth)/login')}
              variant="outline"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 24,
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
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleButtonTextActive: {
    color: '#2563EB',
  },
  // Client Type Section
  clientTypeSection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  clientTypeSelector: {
    flexDirection: 'row',
    gap: 16,
  },
  clientTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  clientTypeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  radioOuterActive: {
    borderColor: '#2563EB',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2563EB',
  },
  clientTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  clientTypeTextActive: {
    color: '#2563EB',
  },
  form: {
    marginBottom: 24,
  },
  // Document Upload Section
  documentSection: {
    marginBottom: 16,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  documentHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  uploadButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2563EB',
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  documentSelected: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  documentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  documentIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  documentNameText: {
    fontSize: 14,
    color: '#166534',
    flex: 1,
  },
  clearButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DC2626',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    marginTop: 4,
  },
  footer: {
    marginTop: 'auto',
    alignItems: 'center',
    marginBottom: 24,
  },
  footerText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
});
