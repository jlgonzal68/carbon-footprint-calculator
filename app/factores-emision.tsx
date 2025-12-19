import { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { router } from 'expo-router';

interface FactorField {
  key: string;
  label: string;
  unit: string;
  category: string;
  description: string;
}

const FACTOR_FIELDS: FactorField[] = [
  // Combustibles
  { key: 'gasolina_kg_co2e_por_litro', label: 'Gasolina', unit: 'kg CO₂e/litro', category: 'Combustibles', description: 'Factor de emisión para gasolina' },
  { key: 'diesel_kg_co2e_por_litro', label: 'Diesel', unit: 'kg CO₂e/litro', category: 'Combustibles', description: 'Factor de emisión para diesel' },
  
  // Energía
  { key: 'energia_kg_co2e_por_kwh', label: 'Energía Eléctrica', unit: 'kg CO₂e/kWh', category: 'Energía', description: 'Factor de emisión para electricidad de la red' },
  
  // Refrigerantes
  { key: 'r22_kg_co2e_por_kg', label: 'Refrigerante R-22', unit: 'kg CO₂e/kg', category: 'Refrigerantes', description: 'Factor de emisión para R-22 (HCFC-22)' },
  { key: 'r410a_kg_co2e_por_kg', label: 'Refrigerante R-410A', unit: 'kg CO₂e/kg', category: 'Refrigerantes', description: 'Factor de emisión para R-410A (HFC)' },
  { key: 'r134a_kg_co2e_por_kg', label: 'Refrigerante R-134a', unit: 'kg CO₂e/kg', category: 'Refrigerantes', description: 'Factor de emisión para R-134a (HFC)' },
  
  // Extintores
  { key: 'co2_extintor_kg_co2e_por_kg', label: 'CO₂ (Extintor)', unit: 'kg CO₂e/kg', category: 'Extintores', description: 'Factor de emisión para CO₂ en extintores' },
  { key: 'pqs_extintor_kg_co2e_por_kg', label: 'PQS (Extintor)', unit: 'kg CO₂e/kg', category: 'Extintores', description: 'Factor de emisión para polvo químico seco' },
  
  // Residuos
  { key: 'residuo_relleno_kg_co2e_por_kg', label: 'Residuo a Relleno', unit: 'kg CO₂e/kg', category: 'Residuos', description: 'Factor de emisión para residuos dispuestos en relleno sanitario' },
  { key: 'residuo_compostado_kg_co2e_por_kg', label: 'Residuo Compostado', unit: 'kg CO₂e/kg', category: 'Residuos', description: 'Factor de emisión para residuos compostados' },
  { key: 'residuo_peligroso_kg_co2e_por_kg', label: 'Residuo Peligroso', unit: 'kg CO₂e/kg', category: 'Residuos', description: 'Factor de emisión para residuos peligrosos' },
  { key: 'residuo_reciclado_kg_co2e_por_kg', label: 'Residuo Reciclado', unit: 'kg CO₂e/kg', category: 'Residuos', description: 'Factor de emisión para residuos reciclados' },
  
  // Agua
  { key: 'agua_potable_kg_co2e_por_m3', label: 'Agua Potable', unit: 'kg CO₂e/m³', category: 'Agua', description: 'Factor de emisión para tratamiento y distribución de agua potable' },
  { key: 'agua_residual_kg_co2e_por_m3', label: 'Agua Residual', unit: 'kg CO₂e/m³', category: 'Agua', description: 'Factor de emisión para tratamiento de aguas residuales' },
];

const CATEGORY_ICONS: Record<string, string> = {
  'Combustibles': '⛽',
  'Energía': '⚡',
  'Refrigerantes': '❄️',
  'Extintores': '🧯',
  'Residuos': '♻️',
  'Agua': '💧',
};

export default function FactoresEmisionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [editedFactors, setEditedFactors] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: factores, isLoading, refetch } = trpc.carbon.getFactoresEmision.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const updateFactorMutation = trpc.carbon.updateFactoresEmision.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Factores de emisión actualizados correctamente');
      setIsEditing(false);
      refetch();
    },
    onError: (error: any) => {
      Alert.alert('Error', `No se pudieron actualizar los factores: ${error.message}`);
    },
  });

  useEffect(() => {
    if (factores) {
      const initialValues: Record<string, string> = {};
      FACTOR_FIELDS.forEach(field => {
        initialValues[field.key] = String((factores as any)[field.key] || '0');
      });
      setEditedFactors(initialValues);
    }
  }, [factores]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (factores) {
      const initialValues: Record<string, string> = {};
      FACTOR_FIELDS.forEach(field => {
        initialValues[field.key] = String((factores as any)[field.key] || '0');
      });
      setEditedFactors(initialValues);
    }
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!selectedAno) return;

    // Validar que todos los valores sean números positivos
    const hasInvalidValues = FACTOR_FIELDS.some(field => {
      const value = parseFloat(editedFactors[field.key] || '0');
      return isNaN(value) || value < 0;
    });

    if (hasInvalidValues) {
      Alert.alert('Error', 'Todos los factores deben ser números positivos');
      return;
    }

    Alert.alert(
      'Confirmar Actualización',
      '¿Está seguro de actualizar los factores de emisión? Esto recalculará todas las emisiones del año.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Actualizar',
          style: 'destructive',
          onPress: () => {
            setSaving(true);
            const factoresData: any = { ano_inventario_id: selectedAno };
            FACTOR_FIELDS.forEach(field => {
              factoresData[field.key] = parseFloat(editedFactors[field.key] || '0');
            });
            updateFactorMutation.mutate(factoresData);
            setSaving(false);
          },
        },
      ]
    );
  };

  const handleFactorChange = (key: string, value: string) => {
    setEditedFactors(prev => ({ ...prev, [key]: value }));
  };

  const groupedFactors = FACTOR_FIELDS.reduce((acc, field) => {
    if (!acc[field.category]) {
      acc[field.category] = [];
    }
    acc[field.category].push(field);
    return acc;
  }, {} as Record<string, FactorField[]>);

  if (!user) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Volver</ThemedText>
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            ⚙️ Factores de Emisión
          </ThemedText>
          <ThemedText style={styles.noAuth}>
            Inicia sesión para gestionar factores de emisión
          </ThemedText>
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Volver</ThemedText>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          ⚙️ Gestión de Factores de Emisión
        </ThemedText>

        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.infoText}>
            Los factores de emisión determinan cuánto CO₂ equivalente se genera por unidad de consumo.
            Actualice estos valores según las regulaciones locales o metodologías específicas.
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Seleccionar Año de Inventario
          </ThemedText>
          <View style={styles.anoSelector}>
            {(anosInventario as any[])?.map((ano: any) => (
              <Pressable
                key={ano.id}
                style={[
                  styles.anoButton,
                  selectedAno === ano.id && styles.anoButtonSelected,
                ]}
                onPress={() => {
                  setSelectedAno(ano.id);
                  setIsEditing(false);
                }}
              >
                <Text
                  style={[
                    styles.anoText,
                    selectedAno === ano.id && styles.anoTextSelected,
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
            {isLoading ? (
              <ThemedView style={styles.card}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <ThemedText style={styles.loadingText}>Cargando factores...</ThemedText>
              </ThemedView>
            ) : factores ? (
              <>
                {Object.entries(groupedFactors).map(([category, fields]) => (
                  <ThemedView key={category} style={styles.categoryCard}>
                    <View style={styles.categoryHeader}>
                      <ThemedText type="subtitle" style={styles.categoryTitle}>
                        {CATEGORY_ICONS[category]} {category}
                      </ThemedText>
                    </View>

                    {fields.map(field => (
                      <View key={field.key} style={styles.factorRow}>
                        <View style={styles.factorInfo}>
                          <ThemedText style={styles.factorLabel}>{field.label}</ThemedText>
                          <ThemedText style={styles.factorDescription}>{field.description}</ThemedText>
                        </View>
                        <View style={styles.factorInput}>
                          {isEditing ? (
                            <TextInput
                              style={styles.input}
                              value={editedFactors[field.key] || '0'}
                              onChangeText={(value) => handleFactorChange(field.key, value)}
                              keyboardType="decimal-pad"
                              placeholder="0.0000"
                            />
                          ) : (
                            <ThemedText style={styles.factorValue}>
                              {parseFloat((factores as any)[field.key] || '0').toFixed(4)}
                            </ThemedText>
                          )}
                          <ThemedText style={styles.factorUnit}>{field.unit}</ThemedText>
                        </View>
                      </View>
                    ))}
                  </ThemedView>
                ))}

                <View style={styles.actionButtons}>
                  {isEditing ? (
                    <>
                      <Pressable
                        style={[styles.button, styles.cancelButton]}
                        onPress={handleCancel}
                        disabled={saving}
                      >
                        <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.button, styles.saveButton, saving && styles.saveButtonDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                      >
                        {saving ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <ThemedText style={styles.saveButtonText}>💾 Guardar Cambios</ThemedText>
                        )}
                      </Pressable>
                    </>
                  ) : (
                    <Pressable style={[styles.button, styles.editButton]} onPress={handleEdit}>
                      <ThemedText style={styles.editButtonText}>✏️ Editar Factores</ThemedText>
                    </Pressable>
                  )}
                </View>
              </>
            ) : (
              <ThemedView style={styles.card}>
                <ThemedText style={styles.noData}>
                  No hay factores de emisión disponibles para este año
                </ThemedText>
              </ThemedView>
            )}
          </>
        )}
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  title: {
    marginBottom: 8,
  },
  noAuth: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#424242',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    gap: 12,
  },
  cardTitle: {
    marginBottom: 8,
  },
  anoSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anoButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
  },
  anoButtonSelected: {
    backgroundColor: '#2E7D32',
  },
  anoText: {
    fontSize: 16,
    color: '#424242',
  },
  anoTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#757575',
  },
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
    fontSize: 14,
  },
  categoryCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  categoryHeader: {
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
    paddingBottom: 8,
    marginBottom: 8,
  },
  categoryTitle: {
    color: '#2E7D32',
  },
  factorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  factorInfo: {
    flex: 1,
    marginRight: 16,
  },
  factorLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  factorDescription: {
    fontSize: 12,
    color: '#757575',
    lineHeight: 16,
  },
  factorInput: {
    alignItems: 'flex-end',
    minWidth: 120,
  },
  input: {
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    backgroundColor: '#FFFFFF',
    minWidth: 100,
    textAlign: 'right',
  },
  factorValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  factorUnit: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  editButton: {
    backgroundColor: '#2E7D32',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#1976D2',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
