import { Pressable, StyleSheet, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/hooks/use-auth';

interface DataCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

const categories: DataCategory[] = [
  {
    id: 'organizacion',
    title: 'Organización',
    description: 'Gestionar información de la organización',
    icon: 'house.fill',
    route: '/organizacion',
    color: '#2E7D32',
  },
  {
    id: 'anos',
    title: 'Años de Inventario',
    description: 'Crear y gestionar años de inventario',
    icon: 'paperplane.fill',
    route: '/anos-inventario',
    color: '#1976D2',
  },
];

export default function DataScreen() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Ingreso de Datos
          </ThemedText>
          <ThemedText style={styles.description}>
            Inicia sesión para comenzar a ingresar datos de huella de carbono
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
        <ThemedText type="title" style={styles.title}>
          Ingreso de Datos
        </ThemedText>

        <ThemedText style={styles.description}>
          Selecciona una categoría para ingresar o gestionar datos
        </ThemedText>

        <View style={styles.grid}>
          {categories.map((category) => (
            <Pressable
              key={category.id}
              style={[styles.card, { borderLeftColor: category.color, borderLeftWidth: 4 }]}
              onPress={() => router.push(category.route as any)}
            >
              <View style={[styles.iconContainer, { backgroundColor: category.color + '20' }]}>
                <IconSymbol name={category.icon as any} size={32} color={category.color} />
              </View>

              <View style={styles.cardContent}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  {category.title}
                </ThemedText>
                <ThemedText style={styles.cardDescription}>
                  {category.description}
                </ThemedText>
              </View>

              <IconSymbol name="chevron.right" size={20} color="#999" />
            </Pressable>
          ))}
        </View>

        <ThemedView style={styles.infoBox}>
          <ThemedText type="subtitle" style={styles.infoTitle}>
            📋 Próximamente
          </ThemedText>
          <ThemedText style={styles.infoText}>
            • Combustibles (Gasolina y Diesel){'\n'}
            • Energía Eléctrica por Campus{'\n'}
            • Aires Acondicionados{'\n'}
            • Extintores{'\n'}
            • Residuos Sólidos{'\n'}
            • Agua Potable y Residual
          </ThemedText>
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
  grid: {
    gap: 12,
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    marginBottom: 4,
    color: '#333',
  },
  cardDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  infoTitle: {
    marginBottom: 12,
    color: '#2E7D32',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 24,
    color: '#1B5E20',
  },
});
