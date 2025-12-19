import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

export default function OrganizacionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [nombre, setNombre] = useState('');
  const [anoBase, setAnoBase] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: organizaciones, isLoading, refetch } = trpc.carbon.getOrganizaciones.useQuery(
    undefined,
    { enabled: !!user }
  );

  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const createOrganizacionMutation = trpc.carbon.createOrganizacion.useMutation({
    onSuccess: () => {
      Alert.alert('Éxito', 'Organización creada correctamente');
      refetch();
      router.back();
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSubmit = () => {
    if (!nombre.trim()) {
      Alert.alert('Error', 'El nombre de la organización es requerido');
      return;
    }

    const anoBaseNum = parseInt(anoBase);
    if (!anoBase || isNaN(anoBaseNum) || anoBaseNum < 2000 || anoBaseNum > 2100) {
      Alert.alert('Error', 'El año base debe ser un año válido entre 2000 y 2100');
      return;
    }

    setLoading(true);
    createOrganizacionMutation.mutate({
      nombre: nombre.trim(),
      ano_base: anoBaseNum,
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </ThemedView>
    );
  }

  if (organizacion) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Mi Organización
          </ThemedText>

          <ThemedView style={styles.card}>
            <ThemedText type="subtitle" style={styles.label}>
              Nombre
            </ThemedText>
            <ThemedText style={styles.value}>{(organizacion as any).nombre}</ThemedText>

            <ThemedText type="subtitle" style={[styles.label, { marginTop: 20 }]}>
              Año Base
            </ThemedText>
            <ThemedText style={styles.value}>{(organizacion as any).ano_base}</ThemedText>

            <ThemedText type="subtitle" style={[styles.label, { marginTop: 20 }]}>
              Fecha de Creación
            </ThemedText>
            <ThemedText style={styles.value}>
              {new Date((organizacion as any).fecha_creacion).toLocaleDateString('es-ES')}
            </ThemedText>
          </ThemedView>

          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Volver</Text>
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
          Crear Organización
        </ThemedText>

        <ThemedText style={styles.description}>
          Para comenzar a calcular la huella de carbono, primero debes crear tu organización.
        </ThemedText>

        <ThemedView style={styles.form}>
          <ThemedText type="subtitle" style={styles.label}>
            Nombre de la Organización *
          </ThemedText>
          <TextInput
            style={styles.input}
            value={nombre}
            onChangeText={setNombre}
            placeholder="Ej: Instituto Tecnológico Metropolitano"
            placeholderTextColor="#999"
          />

          <ThemedText type="subtitle" style={[styles.label, { marginTop: 20 }]}>
            Año Base *
          </ThemedText>
          <ThemedText style={styles.helpText}>
            El año base es el año de referencia para comparar las emisiones futuras
          </ThemedText>
          <TextInput
            style={styles.input}
            value={anoBase}
            onChangeText={setAnoBase}
            placeholder="Ej: 2023"
            keyboardType="numeric"
            placeholderTextColor="#999"
            maxLength={4}
          />

          <Pressable
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Crear Organización</Text>
            )}
          </Pressable>
        </ThemedView>
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
  form: {
    gap: 12,
  },
  card: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    color: '#2E7D32',
  },
  value: {
    fontSize: 18,
    lineHeight: 24,
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  submitButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
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
