import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

const CAMPUS = [
  { id: 1, nombre: 'Robledo' },
  { id: 2, nombre: 'Fraternidad' },
  { id: 3, nombre: 'Floresta' },
  { id: 4, nombre: 'Prado' },
  { id: 5, nombre: 'Castilla' },
];

export default function EnergiaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [consumoKwh, setConsumoKwh] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: consumosEnergia, refetch } = trpc.carbon.getConsumosEnergia.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const createEnergiaM = trpc.carbon.createConsumoEnergia.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de energía registrado correctamente');
      setConsumoKwh('');
      setSelectedCampus(null);
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const handleSubmit = () => {
    if (!selectedAno) {
      Alert.alert('Error', 'Selecciona un año de inventario');
      return;
    }

    if (!selectedCampus) {
      Alert.alert('Error', 'Selecciona un campus');
      return;
    }

    const consumo = parseFloat(consumoKwh);
    if (!consumoKwh || isNaN(consumo) || consumo < 0) {
      Alert.alert('Error', 'Ingresa un consumo válido en kWh');
      return;
    }

    setLoading(true);
    createEnergiaM.mutate({
      ano_inventario_id: selectedAno,
      campus_id: selectedCampus,
      cantidad_kwh: consumo,
    });
  };

  const calcularEmisionEstimada = (kwh: string) => {
    const consumo = parseFloat(kwh);
    if (isNaN(consumo) || consumo <= 0) return 0;
    
    // Factor de emisión aproximado para Colombia (kg CO2e por kWh)
    const factor = 0.164;
    
    return (consumo * factor).toFixed(2);
  };

  const getCampusNombre = (campusId: number) => {
    const campus = CAMPUS.find(c => c.id === campusId);
    return campus ? campus.nombre : 'Desconocido';
  };

  if (!organizacion) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Energía Eléctrica
          </ThemedText>
          <ThemedText style={styles.description}>
            Primero debes crear una organización.
          </ThemedText>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/organizacion')}>
            <Text style={styles.primaryButtonText}>Crear Organización</Text>
          </Pressable>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          ⚡ Energía Eléctrica
        </ThemedText>

        <ThemedText style={styles.description}>
          Registra el consumo de energía eléctrica por campus
        </ThemedText>

        {/* Selector de Año */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.label}>
            Año de Inventario *
          </ThemedText>
          <View style={styles.yearSelector}>
            {anosInventario && Array.isArray(anosInventario) && anosInventario.map((ano: any) => (
              <Pressable
                key={ano.id}
                style={[
                  styles.yearButton,
                  selectedAno === ano.id && styles.yearButtonSelected,
                ]}
                onPress={() => setSelectedAno(ano.id)}
              >
                <Text
                  style={[
                    styles.yearButtonText,
                    selectedAno === ano.id && styles.yearButtonTextSelected,
                  ]}
                >
                  {ano.ano}
                </Text>
              </Pressable>
            ))}
          </View>
        </ThemedView>

        {selectedAno && (
          <>
            {/* Formulario */}
            <ThemedView style={styles.form}>
              <ThemedText type="subtitle" style={styles.formTitle}>
                Nuevo Registro
              </ThemedText>

              <ThemedText style={styles.label}>
                Campus *
              </ThemedText>
              <View style={styles.campusGrid}>
                {CAMPUS.map((campus) => (
                  <Pressable
                    key={campus.id}
                    style={[
                      styles.campusButton,
                      selectedCampus === campus.id && styles.campusButtonSelected,
                    ]}
                    onPress={() => setSelectedCampus(campus.id)}
                  >
                    <Text
                      style={[
                        styles.campusButtonText,
                        selectedCampus === campus.id && styles.campusButtonTextSelected,
                      ]}
                    >
                      {campus.nombre}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={[styles.label, { marginTop: 16 }]}>
                Consumo (kWh) *
              </ThemedText>
              <TextInput
                style={styles.input}
                value={consumoKwh}
                onChangeText={setConsumoKwh}
                placeholder="Ej: 50000"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              {consumoKwh && parseFloat(consumoKwh) > 0 && (
                <ThemedView style={styles.emissionPreview}>
                  <ThemedText style={styles.emissionLabel}>
                    Emisión estimada:
                  </ThemedText>
                  <ThemedText style={styles.emissionValue}>
                    {calcularEmisionEstimada(consumoKwh)} kg CO₂e
                  </ThemedText>
                </ThemedView>
              )}

              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar Registro</Text>
                )}
              </Pressable>
            </ThemedView>

            {/* Lista de Registros */}
            {consumosEnergia && Array.isArray(consumosEnergia) && consumosEnergia.length > 0 && (
              <ThemedView style={styles.listSection}>
                <ThemedText type="subtitle" style={styles.listTitle}>
                  Registros Guardados
                </ThemedText>
                {consumosEnergia.map((item: any) => (
                  <ThemedView key={item.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <ThemedText style={styles.listItemCampus}>
                        📍 {item.campus_nombre || getCampusNombre(item.campus_id)}
                      </ThemedText>
                      <ThemedText style={styles.listItemEmission}>
                        {item.emision_co2e.toFixed(2)} kg CO₂e
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.listItemDetail}>
                      Consumo: {item.consumo_kwh.toLocaleString()} kWh
                    </ThemedText>
                    <ThemedText style={styles.listItemDetail}>
                      Factor: {item.factor_emision} kg CO₂e/kWh
                    </ThemedText>
                  </ThemedView>
                ))}
              </ThemedView>
            )}
          </>
        )}

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 16,
    color: '#2E7D32',
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
    color: '#666',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    fontWeight: '600',
    color: '#333',
  },
  yearSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  yearButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  yearButtonSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  yearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  yearButtonTextSelected: {
    color: '#2E7D32',
  },
  form: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  formTitle: {
    marginBottom: 16,
    color: '#2E7D32',
  },
  campusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  campusButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  campusButtonSelected: {
    borderColor: '#FBC02D',
    backgroundColor: '#FFF9C4',
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  campusButtonTextSelected: {
    color: '#F57F17',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  emissionPreview: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emissionLabel: {
    fontSize: 14,
    color: '#1B5E20',
  },
  emissionValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  listSection: {
    marginBottom: 24,
  },
  listTitle: {
    marginBottom: 16,
    color: '#2E7D32',
  },
  listItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  listItemCampus: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  listItemEmission: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2E7D32',
  },
  listItemDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
