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
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

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
      resetForm();
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const updateResiduoMutation = trpc.carbon.updateResiduo.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Residuo actualizado correctamente');
      resetForm();
      refetch();
      setLoading(false);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const deleteResiduoMutation = trpc.carbon.deleteResiduo.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Residuo eliminado correctamente');
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
    setSelectedTipo('');
    setCantidadKg('');
    setSelectedCampus(null);
    setEditingId(null);
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setSelectedCampus(item.campus_id);
    setSelectedTipo(item.tipo);
    setCantidadKg(item.cantidad_kg.toString());
  };

  const handleDelete = (id: number) => {
    setItemToDelete(id);
    setDeleteModalVisible(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteResiduoMutation.mutate({ id: itemToDelete });
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

    if (!selectedTipo) {
      Alert.alert('Error', 'Selecciona un tipo de residuo');
      return;
    }

    const cantidad = parseFloat(cantidadKg);
    if (!cantidadKg || isNaN(cantidad) || cantidad <= 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida en kg');
      return;
    }

    setLoading(true);
    if (editingId) {
      updateResiduoMutation.mutate({
        id: editingId,
        cantidad_kg: cantidad,
      });
    } else {
      createResiduoMutation.mutate({
        ano_inventario_id: selectedAno,
        campus_id: selectedCampus,
        tipo: selectedTipo as 'relleno' | 'compostado' | 'peligroso' | 'reciclado',
        cantidad_kg: cantidad,
      });
    }
  };

  const calcularEmisionEstimada = () => {
    const cantidad = parseFloat(cantidadKg);
    if (isNaN(cantidad) || cantidad <= 0 || !selectedTipo) return 0;
    
    const factores: Record<string, number> = {
      relleno: 0.5,
      compostado: 0.1,
      peligroso: 1.2,
      reciclado: 0.05,
    };
    
    return (cantidad * (factores[selectedTipo] || 0)).toFixed(2);
  };

  const getTipoInfo = (tipoId: string) => {
    return TIPOS_RESIDUO.find(t => t.id === tipoId);
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
            ♻️ Residuos Sólidos
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

                <ThemedText style={styles.label}>Tipo de Residuo *</ThemedText>
                <View style={styles.tipoGrid}>
                  {TIPOS_RESIDUO.map((tipo) => (
                    <Pressable
                      key={tipo.id}
                      style={[
                        styles.tipoButton,
                        selectedTipo === tipo.id && { backgroundColor: tipo.color },
                      ]}
                      onPress={() => setSelectedTipo(tipo.id)}
                      disabled={!!editingId}
                    >
                      <Text style={styles.tipoIcon}>{tipo.icon}</Text>
                      <Text
                        style={[
                          styles.tipoButtonText,
                          selectedTipo === tipo.id && styles.tipoButtonTextSelected,
                        ]}
                      >
                        {tipo.nombre}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <ThemedText style={styles.label}>Cantidad (kg) *</ThemedText>
                <TextInput
                  style={styles.input}
                  value={cantidadKg}
                  onChangeText={setCantidadKg}
                  keyboardType="numeric"
                  placeholder="Ej: 1000"
                  placeholderTextColor="#999"
                />

                {cantidadKg && selectedTipo && (
                  <ThemedText style={styles.emisionPreview}>
                    Emisión estimada: {calcularEmisionEstimada()} kg CO₂e
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
                  <Pressable style={styles.cancelButton} onPress={resetForm}>
                    <ThemedText style={styles.cancelText}>Cancelar Edición</ThemedText>
                  </Pressable>
                )}
              </ThemedView>

              <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Registros Guardados
                </ThemedText>
                {(residuos as any[])?.length === 0 ? (
                  <ThemedText style={styles.noData}>
                    No hay registros de residuos para este año
                  </ThemedText>
                ) : (
                  (residuos as any[])?.map((item: any) => {
                    const tipoInfo = getTipoInfo(item.tipo);
                    return (
                      <ThemedView key={item.id} style={styles.listItem}>
                        <View style={styles.listItemContent}>
                          <ThemedText type="defaultSemiBold">
                            {tipoInfo?.icon} {tipoInfo?.nombre} - {item.campus_nombre}
                          </ThemedText>
                          <ThemedText style={styles.listItemDetail}>
                            Cantidad: {item.cantidad_kg.toLocaleString()} kg
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
                    );
                  })
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
    backgroundColor: '#7B1FA2',
  },
  campusButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  campusButtonTextSelected: {
    color: '#FFFFFF',
  },
  tipoGrid: {
    gap: 8,
  },
  tipoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    gap: 8,
  },
  tipoIcon: {
    fontSize: 20,
  },
  tipoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  tipoButtonTextSelected: {
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
