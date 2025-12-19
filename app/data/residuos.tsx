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

const TIPOS_RESIDUO = [
  { id: 'relleno', nombre: 'Relleno Sanitario', icon: '🗑️', color: '#757575' },
  { id: 'compostado', nombre: 'Compostado', icon: '🌱', color: '#689F38' },
  { id: 'peligroso', nombre: 'Peligroso', icon: '☢️', color: '#D32F2F' },
  { id: 'reciclado', nombre: 'Reciclado', icon: '♻️', color: '#1976D2' },
];

export default function ResiduosScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [selectedTipo, setSelectedTipo] = useState<string>('');
  const [cantidadKg, setCantidadKg] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: residuos, refetch } = trpc.carbon.getResiduosSolidos.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const createResiduoMutation = trpc.carbon.createResiduoSolido.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Residuo registrado correctamente');
      setCantidadKg('');
      setSelectedCampus(null);
      setSelectedTipo('');
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

    if (!selectedTipo) {
      Alert.alert('Error', 'Selecciona el tipo de residuo');
      return;
    }

    const cantidad = parseFloat(cantidadKg);
    if (!cantidadKg || isNaN(cantidad) || cantidad < 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida en kg');
      return;
    }

    setLoading(true);
    createResiduoMutation.mutate({
      ano_inventario_id: selectedAno,
      campus_id: selectedCampus,
      tipo: selectedTipo as any,
      cantidad_kg: cantidad,
    });
  };

  const calcularEmisionEstimada = (kg: string, tipo: string) => {
    const cantidad = parseFloat(kg);
    if (isNaN(cantidad) || cantidad <= 0) return 0;
    
    // Factores de emisión aproximados (kg CO2e por kg de residuo)
    const factores: Record<string, number> = {
      relleno: 0.5,
      compostado: 0.1,
      peligroso: 1.2,
      reciclado: 0.05,
    };
    
    const factor = factores[tipo] || 0;
    return (cantidad * factor).toFixed(2);
  };

  const getCampusNombre = (campusId: number) => {
    const campus = CAMPUS.find(c => c.id === campusId);
    return campus ? campus.nombre : 'Desconocido';
  };

  const getTipoInfo = (tipo: string) => {
    return TIPOS_RESIDUO.find(t => t.id === tipo);
  };

  if (!organizacion) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Residuos Sólidos
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
          ♻️ Residuos Sólidos
        </ThemedText>

        <ThemedText style={styles.description}>
          Registra la cantidad de residuos generados por campus, clasificados por tipo de disposición
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
                Tipo de Disposición *
              </ThemedText>
              <View style={styles.tipoGrid}>
                {TIPOS_RESIDUO.map((tipo) => (
                  <Pressable
                    key={tipo.id}
                    style={[
                      styles.tipoButton,
                      selectedTipo === tipo.id && styles.tipoButtonSelected,
                      { borderColor: selectedTipo === tipo.id ? tipo.color : '#ddd' },
                    ]}
                    onPress={() => setSelectedTipo(tipo.id)}
                  >
                    <Text style={styles.tipoIcon}>{tipo.icon}</Text>
                    <Text
                      style={[
                        styles.tipoButtonText,
                        selectedTipo === tipo.id && { color: tipo.color },
                      ]}
                    >
                      {tipo.nombre}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <ThemedText style={[styles.label, { marginTop: 16 }]}>
                Cantidad (kg) *
              </ThemedText>
              <TextInput
                style={styles.input}
                value={cantidadKg}
                onChangeText={setCantidadKg}
                placeholder="Ej: 1500"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              {cantidadKg && parseFloat(cantidadKg) > 0 && selectedTipo && (
                <ThemedView style={styles.emissionPreview}>
                  <ThemedText style={styles.emissionLabel}>
                    Emisión estimada:
                  </ThemedText>
                  <ThemedText style={styles.emissionValue}>
                    {calcularEmisionEstimada(cantidadKg, selectedTipo)} kg CO₂e
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
            {residuos && Array.isArray(residuos) && residuos.length > 0 && (
              <ThemedView style={styles.listSection}>
                <ThemedText type="subtitle" style={styles.listTitle}>
                  Registros Guardados ({residuos.length} registros)
                </ThemedText>
                {residuos.map((item: any) => {
                  const tipoInfo = getTipoInfo(item.tipo_residuo);
                  return (
                    <ThemedView key={item.id} style={styles.listItem}>
                      <View style={styles.listItemHeader}>
                        <ThemedText style={styles.listItemTitle}>
                          {tipoInfo?.icon} {tipoInfo?.nombre || item.tipo_residuo}
                        </ThemedText>
                        <View style={[styles.badge, { backgroundColor: tipoInfo?.color || '#999' }]}>
                          <Text style={styles.badgeText}>{item.cantidad_kg.toLocaleString()} kg</Text>
                        </View>
                      </View>
                      <ThemedText style={styles.listItemDetail}>
                        📍 Campus: {item.campus_nombre || getCampusNombre(item.campus_id)}
                      </ThemedText>
                      {item.emision_co2e && (
                        <ThemedText style={styles.listItemEmission}>
                          💨 Emisión: {item.emision_co2e.toFixed(2)} kg CO₂e
                        </ThemedText>
                      )}
                    </ThemedView>
                  );
                })}
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
    borderColor: '#7B1FA2',
    backgroundColor: '#F3E5F5',
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  campusButtonTextSelected: {
    color: '#4A148C',
  },
  tipoGrid: {
    gap: 12,
  },
  tipoButton: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipoButtonSelected: {
    backgroundColor: '#f5f5f5',
  },
  tipoIcon: {
    fontSize: 24,
  },
  tipoButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
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
    flex: 1,
  },
  badge: {
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
