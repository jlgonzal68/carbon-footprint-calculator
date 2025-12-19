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

export default function AguaScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [consumoM3, setConsumoM3] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: consumosAgua, refetch } = trpc.carbon.getConsumosAgua.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const createAguaMutation = trpc.carbon.createConsumoAgua.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de agua registrado correctamente');
      setConsumoM3('');
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

    const consumo = parseFloat(consumoM3);
    if (!consumoM3 || isNaN(consumo) || consumo < 0) {
      Alert.alert('Error', 'Ingresa un consumo válido en m³');
      return;
    }

    setLoading(true);
    createAguaMutation.mutate({
      ano_inventario_id: selectedAno,
      campus_id: selectedCampus,
      agua_potable_m3: consumo,
      agua_residual_m3: consumo, // Equivalente al consumo
    });
  };

  const calcularEmisionEstimada = (m3: string) => {
    const consumo = parseFloat(m3);
    if (isNaN(consumo) || consumo <= 0) return { potable: 0, residual: 0, total: 0 };
    
    // Factores de emisión aproximados (kg CO2e por m³)
    const factorPotable = 0.344; // Tratamiento y distribución
    const factorResidual = 0.272; // Tratamiento de aguas residuales
    
    const emisionPotable = consumo * factorPotable;
    const emisionResidual = consumo * factorResidual;
    
    return {
      potable: emisionPotable.toFixed(2),
      residual: emisionResidual.toFixed(2),
      total: (emisionPotable + emisionResidual).toFixed(2),
    };
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
            Agua Potable y Residual
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
          💧 Agua Potable y Residual
        </ThemedText>

        <ThemedText style={styles.description}>
          Registra el consumo de agua potable por campus. El volumen de agua residual se calcula automáticamente como equivalente al consumo.
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
                Consumo de Agua Potable (m³) *
              </ThemedText>
              <TextInput
                style={styles.input}
                value={consumoM3}
                onChangeText={setConsumoM3}
                placeholder="Ej: 5000"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              {consumoM3 && parseFloat(consumoM3) > 0 && (
                <ThemedView style={styles.emissionPreview}>
                  <ThemedText style={styles.emissionTitle}>
                    Emisiones estimadas:
                  </ThemedText>
                  <View style={styles.emissionRow}>
                    <ThemedText style={styles.emissionLabel}>
                      💧 Agua potable:
                    </ThemedText>
                    <ThemedText style={styles.emissionValue}>
                      {calcularEmisionEstimada(consumoM3).potable} kg CO₂e
                    </ThemedText>
                  </View>
                  <View style={styles.emissionRow}>
                    <ThemedText style={styles.emissionLabel}>
                      🚰 Agua residual:
                    </ThemedText>
                    <ThemedText style={styles.emissionValue}>
                      {calcularEmisionEstimada(consumoM3).residual} kg CO₂e
                    </ThemedText>
                  </View>
                  <View style={[styles.emissionRow, styles.emissionTotal]}>
                    <ThemedText style={styles.emissionLabelBold}>
                      Total:
                    </ThemedText>
                    <ThemedText style={styles.emissionValueBold}>
                      {calcularEmisionEstimada(consumoM3).total} kg CO₂e
                    </ThemedText>
                  </View>
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
            {consumosAgua && Array.isArray(consumosAgua) && consumosAgua.length > 0 && (
              <ThemedView style={styles.listSection}>
                <ThemedText type="subtitle" style={styles.listTitle}>
                  Registros Guardados ({consumosAgua.length} campus)
                </ThemedText>
                {consumosAgua.map((item: any) => (
                  <ThemedView key={item.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <ThemedText style={styles.listItemTitle}>
                        📍 {item.campus_nombre || getCampusNombre(item.campus_id)}
                      </ThemedText>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{item.consumo_m3.toLocaleString()} m³</Text>
                      </View>
                    </View>
                    <ThemedText style={styles.listItemDetail}>
                      💧 Agua potable: {item.consumo_m3.toLocaleString()} m³
                    </ThemedText>
                    <ThemedText style={styles.listItemDetail}>
                      🚰 Agua residual: {item.consumo_m3.toLocaleString()} m³ (equivalente)
                    </ThemedText>
                    {item.emision_co2e && (
                      <ThemedText style={styles.listItemEmission}>
                        💨 Emisión total: {item.emision_co2e.toFixed(2)} kg CO₂e
                      </ThemedText>
                    )}
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
    borderColor: '#0288D1',
    backgroundColor: '#E1F5FE',
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  campusButtonTextSelected: {
    color: '#01579B',
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
    padding: 16,
    backgroundColor: '#E1F5FE',
    borderRadius: 8,
    gap: 8,
  },
  emissionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#01579B',
    marginBottom: 4,
  },
  emissionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emissionTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#0288D1',
  },
  emissionLabel: {
    fontSize: 14,
    color: '#01579B',
  },
  emissionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0288D1',
  },
  emissionLabelBold: {
    fontSize: 16,
    fontWeight: '600',
    color: '#01579B',
  },
  emissionValueBold: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0288D1',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
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
  listItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  badge: {
    backgroundColor: '#0288D1',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  listItemDetail: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginTop: 4,
  },
  listItemEmission: {
    fontSize: 14,
    lineHeight: 22,
    color: '#2E7D32',
    fontWeight: '600',
    marginTop: 8,
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
