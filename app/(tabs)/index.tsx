import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS_ALCANCE = ['#2E7D32', '#66BB6A', '#A5D6A7'];
const COLORS_CAMPUS = ['#D32F2F', '#F57C00', '#FBC02D', '#7B1FA2', '#0288D1'];

const CAMPUS_NAMES: Record<number, string> = {
  1: 'Robledo',
  2: 'Fraternidad',
  3: 'Floresta',
  4: 'Prado',
  5: 'Castilla',
};

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedAno, setSelectedAno] = useState<number | null>(null);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: resumen, isLoading } = trpc.carbon.getResumenHuellaCarbono.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  // Preparar datos para gráfico de alcances
  const datosAlcance = resumen ? [
    { name: 'Alcance 1', value: parseFloat(resumen.alcance_1_total || '0'), color: COLORS_ALCANCE[0] },
    { name: 'Alcance 2', value: parseFloat(resumen.alcance_2_total || '0'), color: COLORS_ALCANCE[1] },
    { name: 'Alcance 3', value: parseFloat(resumen.alcance_3_total || '0'), color: COLORS_ALCANCE[2] },
  ].filter(item => item.value > 0) : [];

  // Preparar datos para gráfico de campus
  const datosCampus = resumen?.por_campus ? Object.entries(resumen.por_campus).map(([campusId, total]: [string, any], index) => ({
    name: CAMPUS_NAMES[parseInt(campusId)] || `Campus ${campusId}`,
    total: parseFloat(total || '0'),
    color: COLORS_CAMPUS[index % COLORS_CAMPUS.length],
  })).filter(item => item.total > 0) : [];

  // Preparar datos para tabla de categorías
  const datosCategoria = resumen ? [
    { categoria: '⛽ Combustibles', emision: parseFloat(resumen.combustibles_total || '0') },
    { categoria: '⚡ Energía', emision: parseFloat(resumen.energia_total || '0') },
    { categoria: '❄️ Aires Acond.', emision: parseFloat(resumen.aires_total || '0') },
    { categoria: '🧯 Extintores', emision: parseFloat(resumen.extintores_total || '0') },
    { categoria: '♻️ Residuos', emision: parseFloat(resumen.residuos_total || '0') },
    { categoria: '💧 Agua', emision: parseFloat(resumen.agua_total || '0') },
  ].filter(item => item.emision > 0) : [];

  const totalEmisiones = resumen ? parseFloat(resumen.total_co2e || '0') : 0;

  if (!user) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            🌱 Dashboard
          </ThemedText>
          <ThemedText style={styles.noAuth}>
            Inicia sesión para ver tu dashboard de huella de carbono
          </ThemedText>
        </ThemedView>
      </ScrollView>
    );
  }

  if (!organizacion) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <ThemedText type="title" style={styles.title}>
            🌱 Dashboard
          </ThemedText>
          <ThemedText style={styles.noOrg}>
            No tienes una organización creada. Ve a Configuración para crear una.
          </ThemedText>
          <Pressable style={styles.actionButton} onPress={() => router.push('/organizacion' as any)}>
            <ThemedText style={styles.actionButtonText}>Crear Organización</ThemedText>
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
          🌱 Dashboard de Huella de Carbono
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
          {(!anosInventario || (anosInventario as any[]).length === 0) && (
            <View style={styles.noDataContainer}>
              <ThemedText style={styles.noData}>
                No hay años de inventario creados
              </ThemedText>
              <Pressable style={styles.actionButton} onPress={() => router.push('/anos-inventario' as any)}>
                <ThemedText style={styles.actionButtonText}>Crear Año de Inventario</ThemedText>
              </Pressable>
            </View>
          )}
        </ThemedView>

        {selectedAno && (
          <>
            {isLoading ? (
              <ThemedView style={styles.card}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <ThemedText style={styles.loadingText}>Cargando datos...</ThemedText>
              </ThemedView>
            ) : (
              <>
                {/* Total de Emisiones */}
                <ThemedView style={styles.totalCard}>
                  <ThemedText style={styles.totalLabel}>Total de Emisiones</ThemedText>
                  <ThemedText style={styles.totalValue}>
                    {totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                  </ThemedText>
                  <ThemedText style={styles.totalUnit}>kg CO₂e</ThemedText>
                </ThemedView>

                {/* Gráfico de Emisiones por Alcance */}
                {datosAlcance.length > 0 && (
                  <ThemedView style={styles.card}>
                    <ThemedText type="subtitle" style={styles.cardTitle}>
                      Emisiones por Alcance
                    </ThemedText>
                    <View style={styles.chartContainer}>
                      <PieChart width={Dimensions.get('window').width - 64} height={250}>
                        <Pie
                          data={datosAlcance}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => `${entry.name}: ${entry.value.toFixed(0)} kg`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {datosAlcance.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </View>
                    <View style={styles.legendContainer}>
                      {datosAlcance.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                          <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                          <ThemedText style={styles.legendText}>
                            {item.name}: {item.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </ThemedView>
                )}

                {/* Gráfico de Emisiones por Campus */}
                {datosCampus.length > 0 && (
                  <ThemedView style={styles.card}>
                    <ThemedText type="subtitle" style={styles.cardTitle}>
                      Emisiones por Campus
                    </ThemedText>
                    <View style={styles.chartContainer}>
                      <BarChart
                        width={Dimensions.get('window').width - 64}
                        height={250}
                        data={datosCampus}
                        margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="total" fill="#2E7D32">
                          {datosCampus.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </View>
                  </ThemedView>
                )}

                {/* Tabla de Emisiones por Categoría */}
                {datosCategoria.length > 0 && (
                  <ThemedView style={styles.card}>
                    <ThemedText type="subtitle" style={styles.cardTitle}>
                      Emisiones por Categoría
                    </ThemedText>
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <ThemedText style={styles.tableHeaderText}>Categoría</ThemedText>
                        <ThemedText style={styles.tableHeaderText}>Emisión (kg CO₂e)</ThemedText>
                      </View>
                      {datosCategoria.map((item, index) => (
                        <View key={index} style={styles.tableRow}>
                          <ThemedText style={styles.tableCellCategory}>{item.categoria}</ThemedText>
                          <ThemedText style={styles.tableCellValue}>
                            {item.emision.toLocaleString('es-ES', { maximumFractionDigits: 2 })}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  </ThemedView>
                )}

                {totalEmisiones === 0 && (
                  <ThemedView style={styles.card}>
                    <ThemedText style={styles.noData}>
                      No hay datos de emisiones para este año. Comienza ingresando datos en la pestaña "Datos".
                    </ThemedText>
                  </ThemedView>
                )}
              </>
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
  title: {
    marginBottom: 8,
  },
  noAuth: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },
  noOrg: {
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
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
  noDataContainer: {
    gap: 12,
    alignItems: 'center',
  },
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#757575',
  },
  totalCard: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    gap: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 48,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  totalUnit: {
    fontSize: 18,
    color: '#A5D6A7',
    fontWeight: '600',
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  legendContainer: {
    gap: 8,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 14,
    flex: 1,
  },
  table: {
    gap: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#2E7D32',
  },
  tableHeaderText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2E7D32',
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tableCellCategory: {
    fontSize: 14,
    fontWeight: '600',
  },
  tableCellValue: {
    fontSize: 14,
    color: '#424242',
  },
});
