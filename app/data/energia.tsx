import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmModal } from '@/components/confirm-modal';
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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

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

  const createEnergiaMutation = trpc.carbon.createConsumoEnergia.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de energía registrado correctamente');
      setConsumoKwh('');
      setSelectedCampus(null);
      setEditingId(null);
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const updateEnergiaMutation = trpc.carbon.updateEnergia.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de energía actualizado correctamente');
      setConsumoKwh('');
      setSelectedCampus(null);
      setEditingId(null);
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const deleteEnergiaMutation = trpc.carbon.deleteEnergia.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Consumo de energía eliminado correctamente');
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

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setSelectedCampus(item.campus_id);
    setConsumoKwh(item.cantidad_kwh.toString());
  };

  const handleDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteEnergiaMutation.mutate({ id: itemToDelete });
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

    const consumo = parseFloat(consumoKwh);
    if (!consumoKwh || isNaN(consumo) || consumo < 0) {
      Alert.alert('Error', 'Ingresa un consumo válido en kWh');
      return;
    }

    setLoading(true);
    if (editingId) {
      updateEnergiaMutation.mutate({
        id: editingId,
        cantidad_kwh: consumo,
      });
    } else {
      createEnergiaMutation.mutate({
        ano_inventario_id: selectedAno,
        campus_id: selectedCampus,
        cantidad_kwh: consumo,
      });
    }
  };

  const calcularEmisionEstimada = (kwh: string) => {
    const consumo = parseFloat(kwh);
    if (isNaN(consumo) || consumo <= 0) return 0;
    const factor = 0.18;
    return (consumo * factor).toFixed(2);
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
            ⚡ Energía Eléctrica
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

                <ThemedText style={styles.label}>Consumo (kWh) *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={consumoKwh}
                  onChangeText={setConsumoKwh}
                  keyboardType="numeric"
                  placeholder="Ej: 50000"
                  placeholderTextColor="#999"
                />
                {consumoKwh && (
                  <ThemedText style={styles.emisionPreview}>
                    Emisión estimada: {calcularEmisionEstimada(consumoKwh)} kg CO₂e
                  </ThemedText>
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
                  <Pressable
                    style={styles.cancelButton}
                    onPress={() => {
                      setEditingId(null);
                      setConsumoKwh('');
                      setSelectedCampus(null);
                    }}
                  >
                    <ThemedText style={styles.cancelText}>Cancelar Edición</ThemedText>
                  </Pressable>
                )}
              </ThemedView>

              <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Registros Guardados
                </ThemedText>
                {(consumosEnergia as any[])?.length === 0 ? (
                  <ThemedText style={styles.noData}>
                    No hay registros de energía para este año
                  </ThemedText>
                ) : (
                  (consumosEnergia as any[])?.map((item: any) => (
                    <ThemedView key={item.id} style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <ThemedText type="defaultSemiBold">
                          📍 {item.campus_nombre}
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Consumo: {item.cantidad_kwh?.toLocaleString() || 0} kWh
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Emisión: {item.emision_co2e?.toFixed(2) || 0} kg CO₂e
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
    backgroundColor: '#FBC02D',
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
  emisionPreview: {
    fontSize: 14,
    color: '#2E7D32',
    fontStyle: 'italic',
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
