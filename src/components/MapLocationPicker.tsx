import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export interface LocationData {
  lat: number;
  lng: number;
  address: string;
}

interface MapLocationPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: LocationData) => void;
  initialLocation?: LocationData;
  title?: string;
}

export default function MapLocationPicker({
  visible,
  onClose,
  onSelect,
  initialLocation,
  title = 'اختر الموقع على الخريطة',
}: MapLocationPickerProps) {
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<LocationData | null>(initialLocation || null);
  const [address, setAddress] = useState(initialLocation?.address || '');

  useEffect(() => {
    if (visible && !initialLocation) {
      getCurrentLocation();
    }
  }, [visible]);

  const getCurrentLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('تنبيه', 'يرجى السماح بالوصول إلى الموقع لتحديد موقعك الحالي');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      const locData: LocationData = {
        lat: latitude,
        lng: longitude,
        address: '',
      };

      setCurrentLocation(locData);
      setSelectedLocation(locData);

      // Try to get address from coordinates
      await reverseGeocode(latitude, longitude);
    } catch (error) {
      console.error('Error getting location:', error);
      Alert.alert('خطأ', 'حدث خطأ أثناء تحديد الموقع');
    } finally {
      setLoading(false);
    }
  };

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const addresses = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (addresses && addresses.length > 0) {
        const addr = addresses[0];
        const addressParts = [
          addr.street,
          addr.city,
          addr.region,
          addr.country,
        ].filter(Boolean);
        const fullAddress = addressParts.join(', ');
        setAddress(fullAddress);
        if (selectedLocation) {
          setSelectedLocation({ ...selectedLocation, address: fullAddress });
        }
      }
    } catch (error) {
      console.error('Error reverse geocoding:', error);
    }
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      const finalLocation = {
        ...selectedLocation,
        address: address || selectedLocation.address,
      };
      onSelect(finalLocation);
      onClose();
    } else {
      Alert.alert('تنبيه', 'يرجى تحديد موقع أولاً');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2E7D32" />
              <Text style={styles.loadingText}>جاري تحديد الموقع...</Text>
            </View>
          ) : (
            <>
              <View style={styles.mapPlaceholder}>
                <MaterialCommunityIcons name="map-marker" size={64} color="#2E7D32" />
                <Text style={styles.mapText}>
                  {selectedLocation
                    ? 'تم تحديد الموقع'
                    : 'اضغط على الزر أدناه لتحديد موقعك'}
                </Text>
                {selectedLocation && (
                  <Text style={styles.coordinatesText}>
                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
              >
                <MaterialCommunityIcons name="crosshairs-gps" size={20} color="#FFF" />
                <Text style={styles.locationButtonText}>تحديد موقعي الحالي</Text>
              </TouchableOpacity>

              <View style={styles.addressContainer}>
                <Text style={styles.label}>العنوان (اختياري)</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="map-marker" size={20} color="#666" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={address}
                    onChangeText={setAddress}
                    placeholder="أدخل العنوان التفصيلي"
                    placeholderTextColor="#999"
                    multiline
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
                onPress={handleConfirm}
                disabled={!selectedLocation}
              >
                <Text style={styles.confirmButtonText}>تأكيد الموقع</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.9,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  mapPlaceholder: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F5F5',
    margin: 20,
    borderRadius: 16,
  },
  mapText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  coordinatesText: {
    marginTop: 8,
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2E7D32',
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  locationButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  addressContainer: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  inputIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    textAlignVertical: 'top',
    minHeight: 60,
  },
  confirmButton: {
    backgroundColor: '#2E7D32',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

import { TextInput } from 'react-native';
