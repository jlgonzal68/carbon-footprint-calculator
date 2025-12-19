import { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { ConfirmModal } from '@/components/confirm-modal';

type Categoria = 'total' | 'alcance_1' | 'alcance_2' | 'alcance_3' | 'combustibles' | 'energia' | 'aires_acondicionados' | 'extintores' | 'residuos' | 'agua';
type TipoMeta = 'reduccion_porcentual' | 'valor_absoluto';

const CATEGORIAS = [
  { id: 'total' as Categoria, nombre: 'Total General', icono: '🌍', color: '#2E7D32' },
  { id: 'alcance_1' as Categoria, nombre: 'Alcance 1', icono: '🏭', color: '#D32F2F' },
  { id: 'alcance_2' as Categoria, nombre: 'Alcance 2', icono: '⚡', color: '#F57C00' },
  { id: 'alcance_3' as Categoria, nombre: 'Alcance 3', icono: '♻️', color: '#1976D2' },
  { id: 'combustibles' as Categoria, nombre: 'Combustibles', icono: '⛽', color: '#F57C00' },
  { id: 'energia' as Categoria, nombre: 'Energía', icono: '💡', color: '#FBC02D' },
  { id: 'aires_acondicionados' as Categoria, nombre: 'Aires Acondicionados', icono: '❄️', color: '#0288D1' },
  { id: 'extintores' as Categoria, nombre: 'Extintores', icono: '🧯', color: '#E64A19' },
  { id: 'residuos' as Categoria, nombre: 'Residuos', icono: '🗑️', color: '#689F38' },
  { id: 'agua' as Categoria, nombre: 'Agua', icono: '💧', color: '#0097A7' },
];

export default function MetasScreen() {
  const insets = useSafeAreaInsets();
  const [anoInventarioId, setAnoInventarioId] = useState<number | null>(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<Categoria>('total');
  const [tipoMeta, setTipoMeta] = useState<TipoMeta>('reduccion_porcentual');
  const [valorObjetivo, setValorObjetivo] = useState('');
  const [valorBase, setValorBase] = useState('');
  const [anoBase, setAnoBase] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [metaAEliminar, setMetaAEliminar] = useState<number | null>(null);

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery({ organizacion_id: 1 });
  const { data: progresoMetas, refetch: refetchProgreso } = trpc.carbon.getProgresoMetas.useQuery(
    { ano_inventario_id: anoInventarioId || 0 },
    { enabled: !!anoInventarioId }
  );

  const createMetaMutation = trpc.carbon.createMeta.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Meta creada correctamente');
      limpiarFormulario();
      refetchProgreso();
    },
    onError: (error: any) => {
      Alert.alert('Error', `No se pudo crear la meta: ${error.message}`);
    },
  });

  const deleteMetaMutation = trpc.carbon.deleteMeta.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Meta eliminada correctamente');
      refetchProgreso();
    },
    onError: (error: any) => {
      Alert.alert('Error', `No se pudo eliminar la meta: ${error.message}`);
    },
  });

  const limpiarFormulario = () => {
    setMostrarFormulario(false);
    setCategoriaSeleccionada('total');
    setTipoMeta('reduccion_porcentual');
    setValorObjetivo('');
    setValorBase('');
    setAnoBase('');
    setDescripcion('');
  };

  const crearMeta = () => {
    if (!anoInventarioId || !valorObjetivo) {
      Alert.alert('Error', 'Completa todos los campos obligatorios');
      return;
    }

    if (tipoMeta === 'reduccion_porcentual' && !valorBase) {
      Alert.alert('Error', 'Para metas de reducción porcentual, debes ingresar el valor base');
      return;
    }

    createMetaMutation.mutate({
      ano_inventario_id: anoInventarioId,
      categoria: categoriaSeleccionada,
      tipo_meta: tipoMeta,
      valor_objetivo: parseFloat(valorObjetivo),
      valor_base: valorBase ? parseFloat(valorBase) : undefined,
      ano_base: anoBase ? parseInt(anoBase) : undefined,
      descripcion: descripcion || undefined,
    });
  };

  const confirmarEliminar = (id: number) => {
    setMetaAEliminar(id);
  };

  const eliminarMeta = () => {
    if (metaAEliminar) {
      deleteMetaMutation.mutate({ id: metaAEliminar });
      setMetaAEliminar(null);
    }
  };

  const getColorProgreso = (progreso: number, cumplida: boolean) => {
    if (cumplida) return '#4CAF50';
    if (progreso >= 80) return '#FFC107';
    if (progreso >= 50) return '#FF9800';
    return '#F44336';
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          🎯 Metas de Reducción
        </ThemedText>

        {/* Selector de Año */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Selecciona el Año de Inventario
          </ThemedText>
          <View style={styles.anosContainer}>
            {(anosInventario as any)?.anos?.map((ano: any) => (
              <Pressable
                key={ano.id}
                style={[
                  styles.anoButton,
                  anoInventarioId === ano.id && styles.anoButtonSelected,
                ]}
                onPress={() => setAnoInventarioId(ano.id)}
              >
                <ThemedText
                  style={[
                    styles.anoText,
                    anoInventarioId === ano.id && styles.anoTextSelected,
                  ]}
                >
                  {ano.ano}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ThemedView>

        {/* Botón Crear Meta */}
        {anoInventarioId && !mostrarFormulario && (
          <Pressable
            style={styles.createButton}
            onPress={() => setMostrarFormulario(true)}
          >
            <ThemedText style={styles.createButtonText}>
              ➕ Nueva Meta
            </ThemedText>
          </Pressable>
        )}

        {/* Formulario de Creación */}
        {mostrarFormulario && (
          <ThemedView style={styles.formCard}>
            <ThemedText type="subtitle" style={styles.formTitle}>
              Crear Nueva Meta
            </ThemedText>

            {/* Selector de Categoría */}
            <ThemedText style={styles.label}>Categoría:</ThemedText>
            <View style={styles.categoriasGrid}>
              {CATEGORIAS.map((cat) => (
                <Pressable
                  key={cat.id}
                  style={[
                    styles.categoriaButton,
                    categoriaSeleccionada === cat.id && {
                      backgroundColor: cat.color,
                      borderColor: cat.color,
                    },
                  ]}
                  onPress={() => setCategoriaSeleccionada(cat.id)}
                >
                  <ThemedText style={styles.categoriaIcon}>{cat.icono}</ThemedText>
                  <ThemedText
                    style={[
                      styles.categoriaNombre,
                      categoriaSeleccionada === cat.id && styles.categoriaSeleccionadaText,
                    ]}
                  >
                    {cat.nombre}
                  </ThemedText>
                </Pressable>
              ))}
            </View>

            {/* Tipo de Meta */}
            <ThemedText style={styles.label}>Tipo de Meta:</ThemedText>
            <View style={styles.tipoMetaContainer}>
              <Pressable
                style={[
                  styles.tipoMetaButton,
                  tipoMeta === 'reduccion_porcentual' && styles.tipoMetaSelected,
                ]}
                onPress={() => setTipoMeta('reduccion_porcentual')}
              >
                <ThemedText
                  style={[
                    styles.tipoMetaText,
                    tipoMeta === 'reduccion_porcentual' && styles.tipoMetaTextSelected,
                  ]}
                >
                  📉 Reducción %
                </ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.tipoMetaButton,
                  tipoMeta === 'valor_absoluto' && styles.tipoMetaSelected,
                ]}
                onPress={() => setTipoMeta('valor_absoluto')}
              >
                <ThemedText
                  style={[
                    styles.tipoMetaText,
                    tipoMeta === 'valor_absoluto' && styles.tipoMetaTextSelected,
                  ]}
                >
                  🎯 Valor Absoluto
                </ThemedText>
              </Pressable>
            </View>

            {/* Valor Objetivo */}
            <ThemedText style={styles.label}>
              {tipoMeta === 'reduccion_porcentual' ? 'Porcentaje de Reducción (%)' : 'Valor Objetivo (kg CO2e)'}:
            </ThemedText>
            <TextInput
              style={styles.input}
              value={valorObjetivo}
              onChangeText={setValorObjetivo}
              placeholder={tipoMeta === 'reduccion_porcentual' ? 'Ej: 10' : 'Ej: 5000'}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            {/* Valor Base (solo para reducción porcentual) */}
            {tipoMeta === 'reduccion_porcentual' && (
              <>
                <ThemedText style={styles.label}>Valor Base (kg CO2e):</ThemedText>
                <TextInput
                  style={styles.input}
                  value={valorBase}
                  onChangeText={setValorBase}
                  placeholder="Ej: 10000"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />

                <ThemedText style={styles.label}>Año Base (opcional):</ThemedText>
                <TextInput
                  style={styles.input}
                  value={anoBase}
                  onChangeText={setAnoBase}
                  placeholder="Ej: 2023"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </>
            )}

            {/* Descripción */}
            <ThemedText style={styles.label}>Descripción (opcional):</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={descripcion}
              onChangeText={setDescripcion}
              placeholder="Describe la meta..."
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            {/* Botones */}
            <View style={styles.formButtons}>
              <Pressable
                style={styles.cancelButton}
                onPress={limpiarFormulario}
              >
                <ThemedText style={styles.cancelButtonText}>Cancelar</ThemedText>
              </Pressable>
              <Pressable
                style={styles.saveButton}
                onPress={crearMeta}
                disabled={createMetaMutation.isPending}
              >
                {createMetaMutation.isPending ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.saveButtonText}>Crear Meta</ThemedText>
                )}
              </Pressable>
            </View>
          </ThemedView>
        )}

        {/* Lista de Metas con Progreso */}
        {anoInventarioId && progresoMetas && (progresoMetas as any[]).length > 0 && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Metas Activas
            </ThemedText>
            {(progresoMetas as any[]).map((meta: any) => {
              const categoria = CATEGORIAS.find((c) => c.id === meta.categoria);
              const colorProgreso = getColorProgreso(meta.progreso, meta.cumplida);

              return (
                <ThemedView key={meta.id} style={styles.metaCard}>
                  <View style={styles.metaHeader}>
                    <View style={styles.metaInfo}>
                      <ThemedText style={styles.metaIcon}>{categoria?.icono}</ThemedText>
                      <View>
                        <ThemedText style={styles.metaCategoria}>
                          {categoria?.nombre}
                        </ThemedText>
                        {meta.descripcion && (
                          <ThemedText style={styles.metaDescripcion}>
                            {meta.descripcion}
                          </ThemedText>
                        )}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => confirmarEliminar(meta.id)}
                      style={styles.deleteButton}
                    >
                      <ThemedText style={styles.deleteButtonText}>🗑️</ThemedText>
                    </Pressable>
                  </View>

                  {/* Barra de Progreso */}
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(meta.progreso, 100)}%`,
                            backgroundColor: colorProgreso,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText style={styles.progressText}>
                      {meta.progreso}%
                    </ThemedText>
                  </View>

                  {/* Detalles */}
                  <View style={styles.metaDetails}>
                    <View style={styles.metaDetailRow}>
                      <ThemedText style={styles.metaDetailLabel}>Tipo:</ThemedText>
                      <ThemedText style={styles.metaDetailValue}>
                        {meta.tipo_meta === 'reduccion_porcentual'
                          ? `Reducción ${meta.valor_objetivo}%`
                          : `${meta.valor_objetivo} kg CO2e`}
                      </ThemedText>
                    </View>
                    <View style={styles.metaDetailRow}>
                      <ThemedText style={styles.metaDetailLabel}>Emisión Actual:</ThemedText>
                      <ThemedText style={styles.metaDetailValue}>
                        {meta.emision_actual.toFixed(2)} kg CO2e
                      </ThemedText>
                    </View>
                    {meta.valor_base && (
                      <View style={styles.metaDetailRow}>
                        <ThemedText style={styles.metaDetailLabel}>Valor Base:</ThemedText>
                        <ThemedText style={styles.metaDetailValue}>
                          {meta.valor_base.toFixed(2)} kg CO2e
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.metaDetailRow}>
                      <ThemedText style={styles.metaDetailLabel}>Estado:</ThemedText>
                      <ThemedText
                        style={[
                          styles.metaEstado,
                          { color: meta.cumplida ? '#4CAF50' : '#F44336' },
                        ]}
                      >
                        {meta.cumplida ? '✅ Cumplida' : '⚠️ En Progreso'}
                      </ThemedText>
                    </View>
                  </View>
                </ThemedView>
              );
            })}
          </ThemedView>
        )}

        {/* Sin Metas */}
        {anoInventarioId && progresoMetas && (progresoMetas as any[]).length === 0 && !mostrarFormulario && (
          <ThemedView style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>
              No hay metas definidas para este año.
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Crea una meta para comenzar a monitorear tu progreso.
            </ThemedText>
          </ThemedView>
        )}
      </ThemedView>

      {/* Modal de Confirmación */}
      <ConfirmModal
        visible={metaAEliminar !== null}
        title="Eliminar Meta"
        message="¿Estás seguro de que deseas eliminar esta meta? Esta acción no se puede deshacer."
        onConfirm={eliminarMeta}
        onCancel={() => setMetaAEliminar(null)}
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 20,
  },
  title: {
    marginBottom: 8,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#2E7D32',
  },
  anosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anoButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  anoButtonSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  anoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  anoTextSelected: {
    color: '#FFFFFF',
  },
  createButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  formCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#C5E1A5',
    gap: 12,
  },
  formTitle: {
    color: '#2E7D32',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginTop: 8,
  },
  categoriasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoriaButton: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    gap: 4,
  },
  categoriaIcon: {
    fontSize: 24,
  },
  categoriaNombre: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#212121',
  },
  categoriaSeleccionadaText: {
    color: '#FFFFFF',
  },
  tipoMetaContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  tipoMetaButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  tipoMetaSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  tipoMetaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  tipoMetaTextSelected: {
    color: '#FFFFFF',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C5E1A5',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#212121',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metaCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    gap: 12,
  },
  metaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  metaIcon: {
    fontSize: 32,
  },
  metaCategoria: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
  },
  metaDescripcion: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
    minWidth: 45,
    textAlign: 'right',
  },
  metaDetails: {
    gap: 8,
  },
  metaDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaDetailLabel: {
    fontSize: 14,
    color: '#757575',
  },
  metaDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  metaEstado: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 32,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#757575',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
  },
});
