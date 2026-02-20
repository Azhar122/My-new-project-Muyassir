import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface StaticMapProps {
  lat: number;
  lng: number;
  address?: string;
  height?: number;
}

export const StaticMap: React.FC<StaticMapProps> = ({
  lat,
  lng,
  address,
  height = 180,
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);

  // Use a more reliable static map service
  const zoom = 15;
  const mapUrl = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=${zoom}&size=600x300&maptype=mapnik&markers=${lat},${lng},red-pushpin`;

  const handleOpenInMaps = () => {
    const webUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;
    
    if (Platform.OS === 'web') {
      window.open(webUrl, '_blank');
      return;
    }
    
    const url = Platform.select({
      ios: `maps:?q=${encodeURIComponent(address || 'Location')}&ll=${lat},${lng}`,
      android: `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(address || 'Location')})`,
      default: webUrl,
    });

    Linking.openURL(url!).catch(() => {
      Linking.openURL(webUrl);
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.mapContainer, { height }]}>
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563EB" />
          </View>
        )}
        {!imageError ? (
          <Image
            source={{ uri: mapUrl }}
            style={styles.mapImage}
            resizeMode="cover"
            onLoad={() => setLoading(false)}
            onError={() => { setImageError(true); setLoading(false); }}
          />
        ) : (
          <View style={styles.fallbackMap}>
            <MaterialCommunityIcons name="map-marker" size={40} color="#2563EB" />
            <Text style={styles.fallbackText}>Map Preview</Text>
          </View>
        )}
      </View>
      
      <TouchableOpacity style={styles.openButton} onPress={handleOpenInMaps}>
        <MaterialCommunityIcons name="directions" size={18} color="#2563EB" />
        <Text style={styles.openButtonText}>Open in Maps</Text>
      </TouchableOpacity>
      
      <View style={styles.coordsRow}>
        <MaterialCommunityIcons name="crosshairs-gps" size={14} color="#9CA3AF" />
        <Text style={styles.coordsText}>{lat.toFixed(6)}, {lng.toFixed(6)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  mapContainer: { width: '100%', backgroundColor: '#E5E7EB', position: 'relative' },
  mapImage: { width: '100%', height: '100%' },
  loadingContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  fallbackMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' },
  fallbackText: { marginTop: 8, fontSize: 14, color: '#6B7280' },
  openButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 6 },
  openButtonText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  coordsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: 12, gap: 6 },
  coordsText: { fontSize: 12, color: '#9CA3AF', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
});

export default StaticMap;
