import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmModal } from '@/components/confirm-modal';
import { trpc } from '@/lib/trpc';
import { usePermissions } from '@/hooks/use-permissions';
import { ProtectedAction } from '@/components/protected-action';
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

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
      resetForm();
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const updateAguaMutation = trpc.carbon.updateAgua.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de agua actualizado correctamente');
      resetForm();
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const deleteAguaMutation = trpc.carbon.deleteAgua.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de agua eliminado correctamente');
      refetch();
      setDeleteModalVisible(false);
      setItemToDelete(null);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setDeleteModalVisible(false);
      setItemToDelete(null);
    },
  });

  const resetForm = () => {
    setConsumoM3('');
    setSelectedCampus(null);
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setSelectedCampus(item.campus_id);
    setConsumoM3(item.consumo_m3.toString());
  };

  const handleDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteAguaMutation.mutate({ id: itemToDelete });
    }
  };

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
    if (!consumoM3 || isNaN(consumo) || consumo <= 0) {
      Alert.alert('Error', 'Ingresa un consumo válido en m³');
      return;
    }

    setLoading(true);
    if (editingId) {
      updateAguaMutation.mutate({
        id: editingId,
        agua_potable_m3: consumo,
        agua_residual_m3: consumo,
      });
    } else {
      createAguaMutation.mutate({
        ano_inventario_id: selectedAno,
        campus_id: selectedCampus,
        agua_potable_m3: consumo,
        agua_residual_m3: consumo,
      });
    }
  };

  const calcularEmisionEstimada = () => {
    const consumo = parseFloat(consumoM3);
    if (isNaN(consumo) || consumo <= 0) return { potable: 0, residual: 0, total: 0 };
    
    const factorPotable = 0.344;
    const factorResidual = 0.272;
    
    return {
      potable: (consumo * factorPotable).toFixed(2),
      residual: (consumo * factorResidual).toFixed(2),
      total: (consumo * (factorPotable + factorResidual)).toFixed(2),
    };
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
          <ThemedText style={styles.noOrg}>
            No tienes una organización creada. Ve a Configuración para crear una.
          </ThemedText>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>← Volver</ThemedText>
          </Pressable>
        </ThemedView>
      </ScrollView>
    );
  }

  const emisiones = calcularEmisionEstimada();

  return (
    <>
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <ThemedText style={styles.backText}>← Volver</ThemedText>
          </Pressable>

          <ThemedText type="title" style={styles.title}>
            💧 Agua Potable y Residual
          </ThemedText>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Año de Inventario
            </ThemedText>
            <View style={styles.anoSelector}>
              {(anosInventario as any[])?.map((ano: any) => (
                <Pressable
                  key={ano.id}
                  style={[
                    styles.anoButton,
                    selectedAno === ano.id && styles.anoButtonSelected,
                  ]}
                  onPress={() => setSelectedAno(ano.id)}
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
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  {editingId ? 'Editar Registro' : 'Nuevo Registro'}
                </ThemedText>

                <ThemedText style={styles.label}>Campus *</ThemedText>
                <View style={styles.campusGrid}>
                  {CAMPUS.map((campus) => (
                    <Pressable
                      key={campus.id}
                      style={[
                        styles.campusButton,
                        selectedCampus === campus.id && styles.campusButtonSelected,
                      ]}
                      onPress={() => setSelectedCampus(campus.id)}
                      disabled={!!editingId}
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

                <ThemedText style={styles.label}>Consumo de Agua Potable (m³) *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={consumoM3}
                  onChangeText={setConsumoM3}
                  keyboardType="numeric"
                  placeholder="Ej: 500"
                  placeholderTextColor="#999"
                />

                {consumoM3 && parseFloat(consumoM3) > 0 && (
                  <ThemedView style={styles.emisionCard}>
                    <ThemedText style={styles.emisionTitle}>Emisiones Estimadas:</ThemedText>
                    <View style={styles.emisionRow}>
                      <ThemedText style={styles.emisionLabel}>💧 Agua Potable:</ThemedText>
                      <ThemedText style={styles.emisionValue}>{emisiones.potable} kg CO₂e</ThemedText>
                    </View>
                    <View style={styles.emisionRow}>
                      <ThemedText style={styles.emisionLabel}>🚰 Agua Residual:</ThemedText>
                      <ThemedText style={styles.emisionValue}>{emisiones.residual} kg CO₂e</ThemedText>
                    </View>
                    <View style={[styles.emisionRow, styles.emisionTotal]}>
                      <ThemedText style={styles.emisionLabelBold}>Total:</ThemedText>
                      <ThemedText style={styles.emisionValueBold}>{emisiones.total} kg CO₂e</ThemedText>
                    </View>
                  </ThemedView>
                )}

                <Pressable
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitText}>
                      {editingId ? 'Actualizar' : 'Guardar Registro'}
                    </ThemedText>
                  )}
                </Pressable>

                {editingId && (
                  <Pressable style={styles.cancelButton} onPress={resetForm}>
                    <ThemedText style={styles.cancelText}>Cancelar Edición</ThemedText>
                  </Pressable>
                )}
              </ThemedView>

              <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Registros Guardados
                </ThemedText>
                {(consumosAgua as any[])?.length === 0 ? (
                  <ThemedText style={styles.noData}>
                    No hay registros de agua para este año
                  </ThemedText>
                ) : (
                  (consumosAgua as any[])?.map((item: any) => (
                    <ThemedView key={item.id} style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <ThemedText type="defaultSemiBold">
                          💧 {item.campus_nombre}
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Consumo: {item.consumo_m3.toLocaleString()} m³
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Emisión Potable: {item.emision_potable_co2e.toFixed(2)} kg CO₂e
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Emisión Residual: {item.emision_residual_co2e.toFixed(2)} kg CO₂e
                        </ThemedText>
                        <ThemedText style={[styles.listItemDetail, { fontWeight: '600', color: '#2E7D32' }]}>
                          Total: {item.emision_total_co2e.toFixed(2)} kg CO₂e
                        </ThemedText>
                      </View>
                      <View style={styles.listItemActions}>
                        <Pressable
                          style={styles.editButton}
                          onPress={() => handleEdit(item)}
                        >
                          <ThemedText style={styles.editButtonText}>✏️</ThemedText>
                        </Pressable>
                        <Pressable
                          style={styles.deleteButton}
                          onPress={() => handleDelete(item.id)}
                        >
                          <ThemedText style={styles.deleteButtonText}>🗑️</ThemedText>
                        </Pressable>
                      </View>
                    </ThemedView>
                  ))
                )}
              </ThemedView>
            </>
          )}
        </ThemedView>
      </ScrollView>

      <ConfirmModal
        visible={deleteModalVisible}
        title="Confirmar Eliminación"
        message="¿Estás seguro de que deseas eliminar este registro? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteModalVisible(false);
          setItemToDelete(null);
        }}
      />
    </>
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
  },
  backText: {
    fontSize: 16,
    color: '#2E7D32',
  },
  title: {
    marginBottom: 8,
  },
  noOrg: {
    textAlign: 'center',
    marginVertical: 20,
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
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
    backgroundColor: '#E0E0E0',
  },
  campusButtonSelected: {
    backgroundColor: '#0288D1',
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  campusButtonTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#CCCCCC',
  },
  emisionCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  emisionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 4,
  },
  emisionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emisionLabel: {
    fontSize: 14,
    color: '#2E7D32',
  },
  emisionValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  emisionTotal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#A5D6A7',
  },
  emisionLabelBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B5E20',
  },
  emisionValueBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1B5E20',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#E0E0E0',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelText: {
    color: '#424242',
    fontSize: 16,
    fontWeight: '600',
  },
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemContent: {
    flex: 1,
    gap: 4,
  },
  listItemDetail: {
    fontSize: 14,
    color: '#757575',
  },
  listItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 18,
  },
  deleteButton: {
    padding: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 18,
  },
});
