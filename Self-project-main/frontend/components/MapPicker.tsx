import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface MapPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelectLocation: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

export const MapPicker: React.FC<MapPickerProps> = ({
  visible,
  onClose,
  onSelectLocation,
  initialLat = 23.5880,
  initialLng = 58.3829,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLat, setSelectedLat] = useState(initialLat);
  const [selectedLng, setSelectedLng] = useState(initialLng);

  const handleMessage = (event: any) => {
    try {
      const data = Platform.OS === 'web' 
        ? JSON.parse(event.data)
        : JSON.parse(event.nativeEvent.data);
      if (data.type === 'locationSelected') {
        setSelectedLat(data.lat);
        setSelectedLng(data.lng);
      }
    } catch (e) {
      console.error('Error parsing message:', e);
    }
  };

  const handleConfirm = () => {
    onSelectLocation(selectedLat, selectedLng);
    onClose();
  };

  // Reset loading state when modal opens
  React.useEffect(() => {
    if (visible) {
      setIsLoading(true);
      setSelectedLat(initialLat);
      setSelectedLng(initialLng);
      // Auto-hide loading after timeout for web
      if (Platform.OS === 'web') {
        setTimeout(() => setIsLoading(false), 1500);
      }
    }
  }, [visible, initialLat, initialLng]);

  // Listen for postMessage on web
  React.useEffect(() => {
    if (Platform.OS === 'web' && visible) {
      const handler = (event: MessageEvent) => {
        handleMessage(event);
      };
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    }
  }, [visible]);

  const leafletHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><style>*{margin:0;padding:0;box-sizing:border-box}html,body{height:100%;width:100%}#map{height:100%;width:100%}.leaflet-control-attribution{display:none}</style></head><body><div id="map"></div><script>var map=L.map('map').setView([${initialLat},${initialLng}],14);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);var marker=L.marker([${initialLat},${initialLng}],{draggable:true}).addTo(map);function send(lat,lng){var msg=JSON.stringify({type:'locationSelected',lat:lat,lng:lng});if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(msg)}else{window.parent.postMessage(msg,'*')}}map.on('click',function(e){marker.setLatLng(e.latlng);send(e.latlng.lat,e.latlng.lng)});marker.on('dragend',function(){var p=marker.getLatLng();send(p.lat,p.lng)});send(${initialLat},${initialLng});</script></body></html>`;

  const renderMap = () => {
    if (Platform.OS === 'web') {
      return (
        <iframe
          srcDoc={leafletHtml}
          style={{ flex: 1, border: 'none', width: '100%', height: '100%' } as any}
          onLoad={() => setIsLoading(false)}
        />
      );
    }
    return (
      <WebView
        ref={webViewRef}
        source={{ html: leafletHtml }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadEnd={() => setIsLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Select Location</Text>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmText}>Confirm</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.mapContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading map...</Text>
            </View>
          )}
          {renderMap()}
        </View>
        <View style={styles.footer}>
          <View style={styles.coordsDisplay}>
            <MaterialCommunityIcons name="map-marker" size={20} color="#2563EB" />
            <Text style={styles.coordsText}>{selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}</Text>
          </View>
          <TouchableOpacity style={styles.selectButton} onPress={handleConfirm}>
            <MaterialCommunityIcons name="check" size={20} color="#fff" />
            <Text style={styles.selectButtonText}>Use This Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 50 : 16, paddingBottom: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  closeButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '600', color: '#1F2937' },
  confirmButton: { paddingHorizontal: 16, paddingVertical: 8 },
  confirmText: { fontSize: 16, fontWeight: '600', color: '#2563EB' },
  mapContainer: { flex: 1, position: 'relative' },
  webview: { flex: 1 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  loadingText: { marginTop: 12, fontSize: 14, color: '#6B7280' },
  footer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  coordsDisplay: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  coordsText: { fontSize: 14, color: '#374151', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  selectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563EB', paddingVertical: 14, borderRadius: 12, gap: 8 },
  selectButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});

export default MapPicker;
