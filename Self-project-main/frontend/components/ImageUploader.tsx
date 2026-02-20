import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface ImageUploaderProps {
  images: string[]; // Base64 strings
  onImagesChange: (images: string[]) => void;
  maxImages?: number;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onImagesChange,
  maxImages = 5,
}) => {
  const [uploading, setUploading] = useState(false);

  const handlePickImage = async () => {
    if (images.length >= maxImages) {
      const msg = `Maximum ${maxImages} images allowed`;
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Limit Reached', msg);
      return;
    }

    try {
      setUploading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png'],
        copyToCacheDirectory: true,
        multiple: true,
      });

      if (result.canceled || !result.assets?.length) {
        setUploading(false);
        return;
      }

      const newImages: string[] = [];
      const remaining = maxImages - images.length;
      const filesToProcess = result.assets.slice(0, remaining);

      for (const file of filesToProcess) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!['jpg', 'jpeg', 'png'].includes(ext || '')) {
          continue;
        }

        let base64: string;
        if (Platform.OS === 'web') {
          const response = await fetch(file.uri);
          const blob = await response.blob();
          base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result); // Keep full data URL for display
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } else {
          const content = await FileSystem.readAsStringAsync(file.uri, {
            encoding: 'base64',
          });
          const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
          base64 = `data:${mimeType};base64,${content}`;
        }
        newImages.push(base64);
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      const msg = 'Failed to upload image. Please try again.';
      Platform.OS === 'web' ? alert(msg) : Alert.alert('Error', msg);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index: number) => {
    onImagesChange(images.filter((_, i) => i !== index));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Service Images</Text>
        <Text style={styles.count}>{images.length}/{maxImages}</Text>
      </View>
      <Text style={styles.hint}>First image will be used as cover. JPG/PNG only.</Text>

      {/* Image Grid */}
      <View style={styles.grid}>
        {images.map((img, index) => (
          <View key={index} style={styles.imageWrapper}>
            <Image source={{ uri: img }} style={styles.image} resizeMode="cover" />
            {index === 0 && (
              <View style={styles.coverBadge}>
                <Text style={styles.coverText}>Cover</Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => handleRemoveImage(index)}
            >
              <MaterialCommunityIcons name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Add Button */}
        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={handlePickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <>
                <MaterialCommunityIcons name="camera-plus" size={28} color="#2563EB" />
                <Text style={styles.addText}>Add</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151' },
  count: { fontSize: 12, color: '#6B7280' },
  hint: { fontSize: 12, color: '#9CA3AF', marginTop: 2, marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  imageWrapper: { width: 100, height: 100, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  image: { width: '100%', height: '100%', backgroundColor: '#E5E7EB' },
  coverBadge: { position: 'absolute', top: 4, left: 4, backgroundColor: '#2563EB', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  coverText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  removeButton: { position: 'absolute', top: -4, right: -4, backgroundColor: '#fff', borderRadius: 12 },
  addButton: { width: 100, height: 100, borderRadius: 10, borderWidth: 2, borderColor: '#D1D5DB', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F9FAFB' },
  addText: { fontSize: 12, color: '#2563EB', marginTop: 4 },
});

export default ImageUploader;
