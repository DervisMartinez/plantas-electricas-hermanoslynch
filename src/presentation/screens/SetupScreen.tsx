import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMyMoto } from '../context/MotoContext';
import { useTheme } from '../context/ThemeContext';
import { Moto, VehicleType } from '../../domain/entities/Moto';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { PLANTAS_CATALOG, CatalogVehicle } from '../../data/catalog';

export const SetupScreen = () => {
  const { saveMoto, setIsAddingMoto, isAddingMoto } = useMyMoto();
  const { colors, mode, toggleTheme } = useTheme();

  // Todos los campos inician vacíos para ser rellenados por el usuario u operador
  const [vehicleType, setVehicleType] = useState<VehicleType>('planta');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [powerKva, setPowerKva] = useState('');
  const [powerKw, setPowerKw] = useState('');
  const [hours, setHours] = useState('');
  const [year, setYear] = useState('');
  const [serialOrPlate, setSerialOrPlate] = useState('');
  const [location, setLocation] = useState('');
  const [installationType, setInstallationType] = useState<'Canopy Insonorizada' | 'Abierta'>('Canopy Insonorizada');
  const [imageUri, setImageUri] = useState('');
  const [selectedCatalogRes, setSelectedCatalogRes] = useState<any>(null);

  const isPlantaSelected = true;

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setSelectedCatalogRes(null);
    }
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setSelectedCatalogRes(null);
    }
  };

  const handleQuickSelectPlanta = (item: CatalogVehicle) => {
    setBrand(item.brand);
    setModel(item.model.split(' ')[0]);
    setPowerKva(item.powerKva ? item.powerKva.toString() : '35');
    setPowerKw(item.powerKw ? item.powerKw.toString() : '28');
    setVehicleType('planta');
    setSelectedCatalogRes(item.imageRes);
    setImageUri('');
  };



  const handleSave = () => {
    if (!brand || !model) {
      alert('Por favor completa la marca y modelo de la unidad.');
      return;
    }

    const currentH = parseFloat(hours) || 0;

    const newUnit: Moto = {
      id: Math.random().toString(),
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year) || 2026,
      plate: serialOrPlate.trim() || (isPlantaSelected ? `BPG-${model.trim()}` : undefined),
      serialNumber: serialOrPlate.trim(),
      location: location.trim(),
      imageUrl: imageUri || '',
      catalogImageRes: selectedCatalogRes,
      currentOdometer: currentH,
      currentHours: currentH,
      powerKva: parseFloat(powerKva) || 35,
      powerKw: parseFloat(powerKw) || 28,
      installationType,
      isFromAgency: false,
      vehicleType,
    };

    saveMoto(newUnit);
    setIsAddingMoto(false);
  };

  const hasCustomImage = imageUri.length > 0;
  const hasCatalogImage = selectedCatalogRes !== null;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.surface }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Barra superior con selector de tema */}
        <TouchableOpacity
          style={[styles.themeToggle, { backgroundColor: colors.surfaceContainerHigh }]}
          onPress={toggleTheme}
        >
          <MaterialIcons name={mode === 'dark' ? 'light-mode' : 'dark-mode'} size={20} color={colors.primary} />
        </TouchableOpacity>

        {isAddingMoto && (
          <TouchableOpacity
            onPress={() => setIsAddingMoto(false)}
            style={[
              styles.returnPillBtn,
              {
                backgroundColor: mode === 'dark' ? 'rgba(65, 105, 225, 0.15)' : 'rgba(39, 95, 227, 0.1)',
                borderColor: mode === 'dark' ? 'rgba(0, 227, 253, 0.4)' : '#275FE3',
              },
            ]}
            activeOpacity={0.8}
          >
            <MaterialIcons name="arrow-back" size={18} color={mode === 'dark' ? '#00e3fd' : '#275FE3'} />
            <Text style={[styles.returnPillText, { color: colors.onSurface }]}>
              Volver al Panel Principal
            </Text>
          </TouchableOpacity>
        )}

        {/* Header Institucional Hermanos Lynch */}
        <View style={styles.header}>
          <Image
            source={require('../../../assets/images/logo and media coorporative/logo.png')}
            style={styles.logoHeader}
            resizeMode="contain"
          />
          <Text style={[styles.title, { color: colors.onSurface }]}>
            HERMANOS LYNCH
          </Text>
          <Text style={[styles.subtitle, { color: colors.onSurfaceVariant }]}>
            {isAddingMoto
              ? 'Anexar una nueva unidad al sistema telemático'
              : 'Configuración inicial: Selecciona el modelo de planta eléctrica a vincular'}
          </Text>
        </View>

        {/* SELECCIÓN DE DESTINO / UBICACIÓN DE LA PLANTA */}
        <View style={styles.typeSelectorWrapper}>
          <Text style={[styles.selectorLabel, { color: colors.onSurfaceVariant }]}>
            UBICACIÓN DE INSTALACIÓN DE LA PLANTA
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
            {[
              { label: 'Empresa / Sede', icon: 'business' },
              { label: 'Oficina', icon: 'domain' },
              { label: 'Casa / Residencia', icon: 'home' },
              { label: 'Planta Industrial', icon: 'factory' }
            ].map((loc) => {
              const isSelected = location.toLowerCase().includes(loc.label.split(' ')[0].toLowerCase());
              return (
                <TouchableOpacity
                  key={loc.label}
                  onPress={() => setLocation(loc.label)}
                  style={[
                    styles.radioBtn,
                    {
                      flex: 1,
                      minWidth: 140,
                      backgroundColor: isSelected ? colors.primary : colors.surfaceContainerLow,
                      borderColor: isSelected ? colors.primary : colors.outlineVariant,
                    }
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={loc.icon as any}
                    size={18}
                    color={isSelected ? '#FFFFFF' : colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontFamily: 'Montserrat_600SemiBold',
                      fontSize: 12,
                      color: isSelected ? '#FFFFFF' : colors.onSurface,
                    }}
                  >
                    {loc.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* PRE-CATÁLOGO DESTACADO: BLUE POWER GENERATION */}
        {isPlantaSelected && (
          <View style={{ marginVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={[styles.quickPickTitle, { color: colors.onSurfaceVariant }]}>
                CATÁLOGO OFICIAL — BLUE POWER GENERATION
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Montserrat_600SemiBold', color: '#00e3fd' }}>
                Cummins + Leroy Somer
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
              {PLANTAS_CATALOG.map((item) => {
                const isSelected = brand === item.brand && model.startsWith(item.model.split(' ')[0]);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleQuickSelectPlanta(item)}
                    style={[
                      styles.quickPickCardPlanta,
                      {
                        backgroundColor: colors.surfaceContainerLow,
                        borderColor: isSelected ? colors.primary : colors.outlineVariant,
                        borderWidth: isSelected ? 2 : 0.8,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Image source={item.imageRes} style={styles.quickPickImgPlanta} resizeMode="contain" />
                    <View style={{ marginTop: 8, alignItems: 'center' }}>
                      <Text style={[styles.quickPickBrand, { color: colors.primary }]}>
                        {item.brand}
                      </Text>
                      <Text style={[styles.quickPickModel, { color: colors.onSurface }]}>
                        Modelo {item.model.split(' ')[0]}
                      </Text>
                      <View style={styles.powerBadge}>
                        <MaterialCommunityIcons name="lightning-bolt" size={14} color="#00e3fd" />
                        <Text style={styles.powerBadgeText}>
                          {item.powerKva} kVA / {item.powerKw} kW
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}



        {/* FORMULARIO TÉCNICO DE REGISTRO */}
        <View style={styles.form}>
          {/* Foto o Previsualización */}
          <View style={styles.imageSection}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              {isPlantaSelected ? 'Fotografía de la Planta Eléctrica' : 'Fotografía del Vehículo'}
            </Text>
            {hasCustomImage ? (
              <View style={[styles.imagePreview, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.primary }]}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
                <TouchableOpacity style={[styles.removeImageBtn, { backgroundColor: colors.error }]} onPress={() => setImageUri('')}>
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : hasCatalogImage ? (
              <View style={[styles.imagePreview, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.primary }]}>
                <Image source={selectedCatalogRes} style={styles.previewImage} resizeMode="contain" />
                <TouchableOpacity style={[styles.removeImageBtn, { backgroundColor: colors.error }]} onPress={() => setSelectedCatalogRes(null)}>
                  <MaterialIcons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imageButtons}>
                <TouchableOpacity
                  style={[styles.imageBtn, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh }]}
                  onPress={pickImage}
                >
                  <MaterialIcons name="photo-library" size={26} color={colors.primary} />
                  <Text style={[styles.imageBtnText, { color: colors.onSurface }]}>Galería</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.imageBtn, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh }]}
                  onPress={takePhoto}
                >
                  <MaterialIcons name="camera-alt" size={26} color={colors.secondary} />
                  <Text style={[styles.imageBtnText, { color: colors.onSurface }]}>Cámara</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Campos Principales */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Marca del Generador</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
              placeholder="Ej: Blue Power Generation, Cummins, Perkins..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={brand}
              onChangeText={setBrand}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>Modelo</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
              placeholder="Ej: C35, C55, C125..."
              placeholderTextColor={colors.onSurfaceVariant}
              value={model}
              onChangeText={setModel}
            />
          </View>

          {/* Si es Planta Eléctrica: Potencia kVA y kW */}
          {isPlantaSelected && (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Potencia (kVA)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
                  placeholder="Ej: 35, 55, 125"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={powerKva}
                  onChangeText={setPowerKva}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.label, { color: colors.onSurface }]}>Potencia (kW)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
                  placeholder="Ej: 28, 44, 100"
                  placeholderTextColor={colors.onSurfaceVariant}
                  value={powerKw}
                  onChangeText={setPowerKw}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}

          {/* Horómetro en horas para plantas o kilometraje para vehículos */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.onSurface }]}>
              {isPlantaSelected ? 'Horómetro Actual (Horas de Uso acumuladas)' : 'Odómetro Actual (km)'}
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
              placeholder="Ej: 0 o las horas acumuladas del horómetro"
              placeholderTextColor={colors.onSurfaceVariant}
              value={hours}
              onChangeText={setHours}
              keyboardType="numeric"
            />
          </View>

          {/* Datos de Identificación y Ubicación */}
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputGroup, { flex: 1.2 }]}>
              <Text style={[styles.label, { color: colors.onSurface }]}>
                N° de Serie / Tag de Fábrica
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
                placeholder="Ej: BPG-2026-001"
                placeholderTextColor={colors.onSurfaceVariant}
                value={serialOrPlate}
                onChangeText={setSerialOrPlate}
                autoCapitalize="characters"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: colors.onSurface }]}>
                Ubicación / Instalación
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surfaceContainerLow, borderColor: colors.surfaceContainerHigh, color: colors.onSurface }]}
                placeholder="Ej: Oficina, Empresa, Casa..."
                placeholderTextColor={colors.onSurfaceVariant}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>

          {/* Tipo de Insonorización para Plantas */}
          {isPlantaSelected && (
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.onSurface }]}>Configuración de Carrocería</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={() => setInstallationType('Canopy Insonorizada')}
                  style={[
                    styles.radioBtn,
                    {
                      backgroundColor: installationType === 'Canopy Insonorizada' ? colors.primary : colors.surfaceContainerLow,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="volume-off"
                    size={18}
                    color={installationType === 'Canopy Insonorizada' ? '#fff' : colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontFamily: 'Montserrat_600SemiBold',
                      fontSize: 12,
                      color: installationType === 'Canopy Insonorizada' ? '#fff' : colors.onSurface,
                    }}
                  >
                    Canopy Insonorizada
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setInstallationType('Abierta')}
                  style={[
                    styles.radioBtn,
                    {
                      backgroundColor: installationType === 'Abierta' ? colors.primary : colors.surfaceContainerLow,
                      borderColor: colors.outlineVariant,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="volume-up"
                    size={18}
                    color={installationType === 'Abierta' ? '#fff' : colors.onSurfaceVariant}
                  />
                  <Text
                    style={{
                      fontFamily: 'Montserrat_600SemiBold',
                      fontSize: 12,
                      color: installationType === 'Abierta' ? '#fff' : colors.onSurface,
                    }}
                  >
                    Chasis Abierto
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Botón de Guardado */}
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <MaterialIcons name="check" size={22} color="#fff" />
            <Text style={styles.saveButtonText}>
              {isPlantaSelected ? 'REGISTRAR PLANTA ELÉCTRICA' : 'REGISTRAR VEHÍCULO'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: 24,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 60,
  },
  themeToggle: {
    position: 'absolute',
    top: 10,
    right: 16,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  returnPillText: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_700Bold',
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
  },
  logoHeader: {
    width: 80,
    height: 80,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: 'Montserrat_500Medium',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 480,
  },
  typeSelectorWrapper: {
    marginVertical: 12,
  },
  selectorLabel: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  typeBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  quickPickTitle: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.8,
  },
  quickPickCardPlanta: {
    width: 200,
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  quickPickImgPlanta: {
    width: 140,
    height: 90,
  },
  powerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 227, 253, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 6,
  },
  powerBadgeText: {
    fontSize: 11,
    fontFamily: 'Montserrat_700Bold',
    color: '#00e3fd',
  },
  quickPickCard: {
    width: 130,
    padding: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickPickImg: {
    width: 80,
    height: 55,
  },
  quickPickBrand: {
    fontSize: 10,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 0.5,
  },
  quickPickModel: {
    fontSize: 12,
    fontFamily: 'Montserrat_700Bold',
  },
  form: {
    gap: 14,
    marginTop: 8,
  },
  imageSection: {
    alignItems: 'center',
    marginVertical: 4,
  },
  label: {
    fontSize: 12.5,
    fontFamily: 'Montserrat_600SemiBold',
    marginBottom: 6,
  },
  imagePreview: {
    width: 170,
    height: 110,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  imageBtnText: {
    fontSize: 12,
    fontFamily: 'Montserrat_600SemiBold',
  },
  inputGroup: {
    width: '100%',
  },
  input: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Montserrat_500Medium',
  },
  radioBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  saveButton: {
    flexDirection: 'row',
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 13.5,
    fontFamily: 'Montserrat_800ExtraBold',
    letterSpacing: 0.5,
  },
});
