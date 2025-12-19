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

const TIPOS_EXTINTOR = ['CO2', 'PQS', 'Solkaflam', 'Agua', 'Espuma'];

export default function ExtintoresScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [selectedCampus, setSelectedCampus] = useState<number | null>(null);
  const [tipoExtintor, setTipoExtintor] = useState('');
  const [pesoKg, setPesoKg] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: extintores, refetch } = trpc.carbon.getExtintores.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const createExtintorMutation = trpc.carbon.createExtintor.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Extintor registrado correctamente');
      setTipoExtintor('');
      setPesoKg('');
      setCantidad('');
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

    if (!tipoExtintor) {
      Alert.alert('Error', 'Selecciona el tipo de extintor');
      return;
    }

    const peso = parseFloat(pesoKg);
    if (!pesoKg || isNaN(peso) || peso <= 0) {
      Alert.alert('Error', 'Ingresa un peso válido en kg');
      return;
    }

    const cant = parseInt(cantidad);
    if (!cantidad || isNaN(cant) || cant <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de extintores');
      return;
    }

    setLoading(true);
    createExtintorMutation.mutate({
      ano_inventario_id: selectedAno,
      campus_id: selectedCampus,
      tipo: tipoExtintor,
      peso_kg: peso,
      cantidad: cant,
    });
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
            Extintores
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
          🧯 Extintores
        </ThemedText>

        <ThemedText style={styles.description}>
          Registra el inventario de extintores por campus
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
                Nuevo Extintor
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
                Tipo de Extintor *
              </ThemedText>
              <View style={styles.tipoGrid}>
                {TIPOS_EXTINTOR.map((tipo) => (
                  <Pressable
                    key={tipo}
                    style={[
                      styles.tipoButton,
                      tipoExtintor === tipo && styles.tipoButtonSelected,
                    ]}
                    onPress={() => setTipoExtintor(tipo)}
                  >
                    <Text
                      style={[
                        styles.tipoButtonText,
                        tipoExtintor === tipo && styles.tipoButtonTextSelected,
                      ]}
                    >
                      {tipo}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <ThemedText style={styles.label}>
                    Peso (kg) *
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={pesoKg}
                    onChangeText={setPesoKg}
                    placeholder="Ej: 5"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.halfWidth}>
                  <ThemedText style={styles.label}>
                    Cantidad *
                  </ThemedText>
                  <TextInput
                    style={styles.input}
                    value={cantidad}
                    onChangeText={setCantidad}
                    placeholder="Ej: 10"
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <Pressable
                style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Guardar Extintor</Text>
                )}
              </Pressable>
            </ThemedView>

            {/* Lista de Registros */}
            {extintores && Array.isArray(extintores) && extintores.length > 0 && (
              <ThemedView style={styles.listSection}>
                <ThemedText type="subtitle" style={styles.listTitle}>
                  Inventario Registrado ({extintores.length} tipos)
                </ThemedText>
                {extintores.map((item: any) => (
                  <ThemedView key={item.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <ThemedText style={styles.listItemTitle}>
                        🧯 {item.tipo_extintor}
                      </ThemedText>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>x{item.cantidad}</Text>
                      </View>
                    </View>
                    <ThemedText style={styles.listItemDetail}>
                      📍 Campus: {item.campus_nombre || getCampusNombre(item.campus_id)}
                    </ThemedText>
                    <ThemedText style={styles.listItemDetail}>
                      ⚖️ Peso unitario: {item.peso_kg} kg
                    </ThemedText>
                    <ThemedText style={styles.listItemDetail}>
                      📦 Peso total: {(item.peso_kg * item.cantidad).toFixed(2)} kg
                    </ThemedText>
                    {item.emision_co2e && (
                      <ThemedText style={styles.listItemEmission}>
                        💨 Emisión: {item.emision_co2e.toFixed(2)} kg CO₂e
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
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  campusButtonTextSelected: {
    color: '#B71C1C',
  },
  tipoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tipoButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: '#fff',
  },
  tipoButtonSelected: {
    borderColor: '#D32F2F',
    backgroundColor: '#FFEBEE',
  },
  tipoButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  tipoButtonTextSelected: {
    color: '#B71C1C',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  halfWidth: {
    flex: 1,
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
    backgroundColor: '#D32F2F',
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
