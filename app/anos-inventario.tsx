import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, FlatList } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

export default function AnosInventarioScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [ano, setAno] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario, isLoading, refetch } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const createAnoMutation = trpc.carbon.createAnoInventario.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Año de inventario creado correctamente');
      setShowCreateForm(false);
      setAno('');
      refetch();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
      setLoading(false);
    },
  });

  const handleCreate = () => {
    if (!organizacion) {
      Alert.alert('Error', 'Primero debes crear una organización');
      return;
    }

    const anoNum = parseInt(ano);
    if (!ano || isNaN(anoNum) || anoNum < 2000 || anoNum > 2100) {
      Alert.alert('Error', 'El año debe ser un valor válido entre 2000 y 2100');
      return;
    }

    const anoBase = (organizacion as any).ano_base;
    if (anoNum < anoBase) {
      Alert.alert('Error', `El año debe ser mayor o igual al año base (${anoBase})`);
      return;
    }

    setLoading(true);
    createAnoMutation.mutate({
      organizacion_id: (organizacion as any).id,
      ano: anoNum,
    });
  };

  const getEstadoBadge = (estado: string) => {
    const colors = {
      borrador: '#FFA726',
      completado: '#66BB6A',
      reportado: '#42A5F5',
    };
    return (
      <View style={[styles.badge, { backgroundColor: colors[estado as keyof typeof colors] || '#999' }]}>
        <Text style={styles.badgeText}>{estado.toUpperCase()}</Text>
      </View>
    );
  };

  if (!organizacion) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Años de Inventario
          </ThemedText>
          <ThemedText style={styles.description}>
            Primero debes crear una organización antes de gestionar años de inventario.
          </ThemedText>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/organizacion')}>
            <Text style={styles.primaryButtonText}>Crear Organización</Text>
          </Pressable>
        </ThemedView>
      </ScrollView>
    );
  }

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Años de Inventario
        </ThemedText>

        <ThemedText style={styles.description}>
          Organización: {(organizacion as any).nombre} | Año Base: {(organizacion as any).ano_base}
        </ThemedText>

        {!showCreateForm && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => setShowCreateForm(true)}
          >
            <Text style={styles.primaryButtonText}>+ Nuevo Año de Inventario</Text>
          </Pressable>
        )}

        {showCreateForm && (
          <ThemedView style={styles.form}>
            <ThemedText type="subtitle" style={styles.label}>
              Año *
            </ThemedText>
            <TextInput
              style={styles.input}
              value={ano}
              onChangeText={setAno}
              placeholder={`Ej: ${new Date().getFullYear()}`}
              keyboardType="numeric"
              placeholderTextColor="#999"
              maxLength={4}
            />

            <View style={styles.formButtons}>
              <Pressable
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  setShowCreateForm(false);
                  setAno('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={[styles.button, styles.submitButton, loading && styles.submitButtonDisabled]}
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.submitButtonText}>Crear</Text>
                )}
              </Pressable>
            </View>
          </ThemedView>
        )}

        <ThemedView style={styles.listContainer}>
          {anosInventario && Array.isArray(anosInventario) && anosInventario.length > 0 ? (
            anosInventario.map((item: any) => (
              <Pressable
                key={item.id}
                style={styles.card}
                onPress={() => {
                  // Navegar a la pantalla de detalle del año
                  router.push('/(tabs)/' as any);
                }}
              >
                <View style={styles.cardHeader}>
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    Año {item.ano}
                  </ThemedText>
                  {getEstadoBadge(item.estado)}
                </View>

                {item.es_ano_base && (
                  <View style={styles.baseYearBadge}>
                    <Text style={styles.baseYearText}>AÑO BASE</Text>
                  </View>
                )}

                <ThemedText style={styles.cardDate}>
                  Creado: {new Date(item.fecha_creacion).toLocaleDateString('es-ES')}
                </ThemedText>

                {item.fecha_actualizacion && (
                  <ThemedText style={styles.cardDate}>
                    Actualizado: {new Date(item.fecha_actualizacion).toLocaleDateString('es-ES')}
                  </ThemedText>
                )}
              </Pressable>
            ))
          ) : (
            <ThemedView style={styles.emptyState}>
              <ThemedText style={styles.emptyText}>
                No hay años de inventario creados
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Crea tu primer año de inventario para comenzar a registrar datos
              </ThemedText>
            </ThemedView>
          )}
        </ThemedView>

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
  primaryButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: '#2E7D32',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#2E7D32',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  baseYearBadge: {
    backgroundColor: '#FFD54F',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  baseYearText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '600',
  },
  cardDate: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    textAlign: 'center',
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
