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

export default function CombustiblesScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [gasolina, setGasolina] = useState('');
  const [diesel, setDiesel] = useState('');
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

  const { data: combustibles, refetch } = trpc.carbon.getConsumosCombustible.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const createCombustibleMutation = trpc.carbon.createConsumoCombustible.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Combustible registrado correctamente');
      setGasolina('');
      setDiesel('');
      setEditingId(null);
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const updateCombustibleMutation = trpc.carbon.updateCombustible.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Combustible actualizado correctamente');
      setGasolina('');
      setDiesel('');
      setEditingId(null);
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const deleteCombustibleMutation = trpc.carbon.deleteCombustible.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Combustible eliminado correctamente');
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
    if (item.tipo_combustible === 'gasolina') {
      setGasolina(item.cantidad.toString());
    } else {
      setDiesel(item.cantidad.toString());
    }
  };

  const handleDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteCombustibleMutation.mutate({ id: itemToDelete });
    }
  };

  const handleSubmit = () => {
    if (!selectedAno) {
      Alert.alert('Error', 'Selecciona un año de inventario');
      return;
    }

    const gasolinaNum = parseFloat(gasolina);
    const dieselNum = parseFloat(diesel);

    if (editingId) {
      // Modo edición
      const itemToEdit = (combustibles as any[])?.find((c: any) => c.id === editingId);
      if (!itemToEdit) return;

      const cantidad = itemToEdit.tipo_combustible === 'gasolina' ? gasolinaNum : dieselNum;
      if (isNaN(cantidad) || cantidad <= 0) {
        Alert.alert('Error', 'Ingresa una cantidad válida');
        return;
      }

      setLoading(true);
      updateCombustibleMutation.mutate({
        id: editingId,
        tipo_combustible: itemToEdit.tipo_combustible,
        cantidad,
      });
    } else {
      // Modo creación
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
    }
  };

  const calcularEmisionEstimada = (litros: string, tipo: 'gasolina' | 'diesel') => {
    const cantidad = parseFloat(litros);
    if (isNaN(cantidad) || cantidad <= 0) return 0;
    
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
            ⛽ Consumo de Combustibles
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

                <ThemedText style={styles.label}>Gasolina (litros/año)</ThemedText>
                <TextInput
                  style={styles.input}
                  value={gasolina}
                  onChangeText={setGasolina}
                  keyboardType="numeric"
                  placeholder="Ej: 5000"
                  placeholderTextColor="#999"
                />
                {gasolina && (
                  <ThemedText style={styles.emisionPreview}>
                    Emisión estimada: {calcularEmisionEstimada(gasolina, 'gasolina')} kg CO₂e
                  </ThemedText>
                )}

                <ThemedText style={styles.label}>Diesel (litros/año)</ThemedText>
                <TextInput
                  style={styles.input}
                  value={diesel}
                  onChangeText={setDiesel}
                  keyboardType="numeric"
                  placeholder="Ej: 3000"
                  placeholderTextColor="#999"
                />
                {diesel && (
                  <ThemedText style={styles.emisionPreview}>
                    Emisión estimada: {calcularEmisionEstimada(diesel, 'diesel')} kg CO₂e
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
                      setGasolina('');
                      setDiesel('');
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
                {(combustibles as any[])?.length === 0 ? (
                  <ThemedText style={styles.noData}>
                    No hay registros de combustibles para este año
                  </ThemedText>
                ) : (
                  (combustibles as any[])?.map((item: any) => (
                    <ThemedView key={item.id} style={styles.listItem}>
                      <View style={styles.listItemContent}>
                        <ThemedText type="defaultSemiBold">
                          {item.tipo_combustible === 'gasolina' ? '⛽ Gasolina' : '🚛 Diesel'}
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Cantidad: {item.cantidad.toLocaleString()} litros
                        </ThemedText>
                        <ThemedText style={styles.listItemDetail}>
                          Emisión: {item.emision_co2e.toFixed(2)} kg CO₂e
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
