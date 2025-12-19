import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

export default function CombustiblesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [gasolina, setGasolina] = useState('');
  const [diesel, setDiesel] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: combustibles, refetch } = trpc.carbon.getConsumosCombustible.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const createCombustibleMutation = trpc.carbon.createConsumoCombustible.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Combustible registrado correctamente');
      setGasolina('');
      setDiesel('');
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

    const gasolinaNum = parseFloat(gasolina);
    const dieselNum = parseFloat(diesel);

    if (!gasolina || isNaN(gasolinaNum) || gasolinaNum < 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de gasolina');
      return;
    }

    if (!diesel || isNaN(dieselNum) || dieselNum < 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de diesel');
      return;
    }

    setLoading(true);
    createCombustibleMutation.mutate({
      ano_inventario_id: selectedAno,
      tipo: 'gasolina',
      cantidad: gasolinaNum,
    });

    createCombustibleMutation.mutate({
      ano_inventario_id: selectedAno,
      tipo: 'diesel',
      cantidad: dieselNum,
    });
  };

  const calcularEmisionEstimada = (litros: string, tipo: 'gasolina' | 'diesel') => {
    const cantidad = parseFloat(litros);
    if (isNaN(cantidad) || cantidad <= 0) return 0;
    
    // Factores de emisión aproximados (kg CO2e por litro)
    const factores = {
      gasolina: 2.31,
      diesel: 2.68,
    };
    
    return (cantidad * factores[tipo]).toFixed(2);
  };

  if (!organizacion) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Combustibles
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
          Combustibles
        </ThemedText>

        <ThemedText style={styles.description}>
          Registra el consumo anual de combustibles (gasolina y diesel)
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
            {/* Formulario de Gasolina */}
            <ThemedView style={styles.form}>
              <ThemedText type="subtitle" style={styles.formTitle}>
                🚗 Gasolina
              </ThemedText>

              <ThemedText style={styles.label}>
                Cantidad (litros) *
              </ThemedText>
              <TextInput
                style={styles.input}
                value={gasolina}
                onChangeText={setGasolina}
                placeholder="Ej: 5000"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              {gasolina && parseFloat(gasolina) > 0 && (
                <ThemedView style={styles.emissionPreview}>
                  <ThemedText style={styles.emissionLabel}>
                    Emisión estimada:
                  </ThemedText>
                  <ThemedText style={styles.emissionValue}>
                    {calcularEmisionEstimada(gasolina, 'gasolina')} kg CO₂e
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            {/* Formulario de Diesel */}
            <ThemedView style={styles.form}>
              <ThemedText type="subtitle" style={styles.formTitle}>
                🚛 Diesel
              </ThemedText>

              <ThemedText style={styles.label}>
                Cantidad (litros) *
              </ThemedText>
              <TextInput
                style={styles.input}
                value={diesel}
                onChangeText={setDiesel}
                placeholder="Ej: 3000"
                keyboardType="numeric"
                placeholderTextColor="#999"
              />

              {diesel && parseFloat(diesel) > 0 && (
                <ThemedView style={styles.emissionPreview}>
                  <ThemedText style={styles.emissionLabel}>
                    Emisión estimada:
                  </ThemedText>
                  <ThemedText style={styles.emissionValue}>
                    {calcularEmisionEstimada(diesel, 'diesel')} kg CO₂e
                  </ThemedText>
                </ThemedView>
              )}
            </ThemedView>

            {/* Botón de Guardar */}
            <Pressable
              style={[styles.submitButton, loading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Guardar Combustibles</Text>
              )}
            </Pressable>

            {/* Lista de Registros */}
            {combustibles && Array.isArray(combustibles) && combustibles.length > 0 && (
              <ThemedView style={styles.listSection}>
                <ThemedText type="subtitle" style={styles.listTitle}>
                  Registros Guardados
                </ThemedText>
                {combustibles.map((item: any) => (
                  <ThemedView key={item.id} style={styles.listItem}>
                    <View style={styles.listItemHeader}>
                      <ThemedText style={styles.listItemType}>
                        {item.tipo === 'gasolina' ? '🚗' : '🚛'} {item.tipo.toUpperCase()}
                      </ThemedText>
                      <ThemedText style={styles.listItemEmission}>
                        {item.emision_co2e.toFixed(2)} kg CO₂e
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.listItemDetail}>
                      Cantidad: {item.cantidad_litros} litros
                    </ThemedText>
                    <ThemedText style={styles.listItemDetail}>
                      Factor: {item.factor_emision} kg CO₂e/litro
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
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 24,
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
  listItemType: {
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
