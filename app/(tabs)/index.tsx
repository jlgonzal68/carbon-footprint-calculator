import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import { usePermissions } from '@/hooks/use-permissions';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS_ALCANCE = ['#2E7D32', '#66BB6A', '#A5D6A7'];
const COLORS_CAMPUS = ['#D32F2F', '#F57C00', '#FBC02D', '#7B1FA2', '#0288D1'];

import { ComparativaAnualChart } from "@/components/comparativa-anual-chart";
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

  // Hook de permisos para obtener el rol del usuario
  const { rol, loading: loadingRol } = usePermissions((organizacion as any)?.id);

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: resumen, isLoading } = trpc.carbon.getResumenHuellaCarbono.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const { data: alertas, refetch: refetchAlertas } = trpc.carbon.getAlertas.useQuery(
    { ano_inventario_id: selectedAno!, solo_no_leidas: true },
    { enabled: !!selectedAno }
  );

  const marcarAlertaLeidaMutation = trpc.carbon.marcarAlertaLeida.useMutation({
    onSuccess: () => {
      refetchAlertas();
    },
  });

  const verificarMetasMutation = trpc.carbon.verificarMetas.useMutation({
    onSuccess: () => {
      refetchAlertas();
    },
  });

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

  // Función para obtener el color del badge según el rol
  const getRoleBadgeColor = (rolNombre: string) => {
    switch (rolNombre.toLowerCase()) {
      case 'administrador':
        return { bg: '#1976D2', text: '#FFFFFF' }; // Azul
      case 'editor':
        return { bg: '#388E3C', text: '#FFFFFF' }; // Verde
      case 'visualizador':
        return { bg: '#757575', text: '#FFFFFF' }; // Gris
      default:
        return { bg: '#9E9E9E', text: '#FFFFFF' };
    }
  };

  // Función para obtener el texto del rol en español
  const getRoleDisplayName = (rolNombre: string) => {
    switch (rolNombre.toLowerCase()) {
      case 'administrador':
        return 'Administrador';
      case 'editor':
        return 'Editor';
      case 'visualizador':
        return 'Visualizador';
      default:
        return rolNombre;
    }
  };

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

  // Redirigir a onboarding si no hay organización
  useEffect(() => {
    if (user && organizaciones !== undefined && !organizacion) {
      router.replace('/onboarding' as any);
    }
  }, [user, organizaciones, organizacion]);

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
            Redirigiendo al asistente de configuración...
          </ThemedText>
          <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 20 }} />
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
        {/* Header con título y badge de rol */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            🌱 Dashboard
          </ThemedText>
          {rol && !loadingRol && (
            <View style={[styles.roleBadge, { backgroundColor: getRoleBadgeColor(rol.nombre).bg }]}>
              <Text style={[styles.roleBadgeText, { color: getRoleBadgeColor(rol.nombre).text }]}>
                {getRoleDisplayName(rol.nombre)}
              </Text>
            </View>
          )}
        </View>

        {/* Selector de Año de Inventario */}
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Año de Inventario
          </ThemedText>
          {!anosInventario || anosInventario.length === 0 ? (
            <View style={styles.noDataContainer}>
              <ThemedText style={styles.noData}>
                No hay años de inventario. Crea uno en Configuración.
              </ThemedText>
              <Pressable
                style={styles.actionButton}
                onPress={() => router.push('/management/anos-inventario' as any)}
              >
                <Text style={styles.actionButtonText}>Crear Año de Inventario</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.anoSelector}>
              {anosInventario.map((ano: any) => (
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
          )}
        </ThemedView>

        {/* Panel de Alertas (solo si hay año seleccionado y hay alertas) */}
        {selectedAno && alertas && Array.isArray(alertas) && alertas.length > 0 && (
          <ThemedView style={styles.alertasPanel}>
            <View style={styles.alertasHeader}>
              <View style={styles.alertasHeaderLeft}>
                <ThemedText type="subtitle" style={styles.alertasTitle}>
                  ⚠️ Alertas Activas
                </ThemedText>
                <View style={styles.alertasBadge}>
                  <Text style={styles.alertasBadgeText}>{alertas.length}</Text>
                </View>
              </View>
              <Pressable
                style={styles.verificarButton}
                onPress={() => verificarMetasMutation.mutate({ ano_inventario_id: selectedAno })}
              >
                <Text style={styles.verificarButtonText}>Verificar Metas</Text>
              </Pressable>
            </View>

            <View style={styles.alertasList}>
              {alertas.slice(0, 3).map((alerta: any) => {
                const prioridadColors: Record<string, { border: string; icon: string }> = {
                  error: { border: '#F44336', icon: '🔴' },
                  warning: { border: '#FF9800', icon: '🟠' },
                  info: { border: '#2196F3', icon: '🔵' },
                  success: { border: '#4CAF50', icon: '🟢' },
                };
                const colors = prioridadColors[alerta.prioridad] || prioridadColors.info;

                return (
                  <View
                    key={alerta.id}
                    style={[styles.alertaCard, { borderLeftColor: colors.border }]}
                  >
                    <View style={styles.alertaContent}>
                      <Text style={styles.alertaIcon}>{colors.icon}</Text>
                      <View style={styles.alertaTexto}>
                        <Text style={styles.alertaTipo}>{alerta.tipo.toUpperCase()}</Text>
                        <Text style={styles.alertaMensaje}>{alerta.mensaje}</Text>
                        <Text style={styles.alertaCategoria}>{alerta.categoria}</Text>
                      </View>
                    </View>
                    <Pressable
                      style={styles.marcarLeidaButton}
                      onPress={() => marcarAlertaLeidaMutation.mutate({ alerta_id: alerta.id })}
                    >
                      <Text style={styles.marcarLeidaText}>✓</Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {alertas.length > 3 && (
              <Pressable
                style={styles.verTodasButton}
                onPress={() => router.push('/management/alertas' as any)}
              >
                <Text style={styles.verTodasText}>Ver todas las alertas ({alertas.length})</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.gestionarMetasButton}
              onPress={() => router.push('/management/metas' as any)}
            >
              <Text style={styles.gestionarMetasText}>Gestionar Metas</Text>
            </Pressable>
          </ThemedView>
        )}

        {/* Contenido del Dashboard */}
        {!selectedAno ? (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.noData}>
              Selecciona un año de inventario para ver el resumen de emisiones
            </ThemedText>
          </ThemedView>
        ) : isLoading ? (
          <ThemedView style={styles.card}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <ThemedText style={styles.loadingText}>Cargando datos...</ThemedText>
          </ThemedView>
        ) : !resumen || totalEmisiones === 0 ? (
          <ThemedView style={styles.card}>
            <ThemedText style={styles.noData}>
              No hay datos de emisiones para este año. Comienza ingresando datos en la pestaña Datos.
            </ThemedText>
            <Pressable
              style={styles.actionButton}
              onPress={() => router.push('/data' as any)}
            >
              <Text style={styles.actionButtonText}>Ir a Datos</Text>
            </Pressable>
          </ThemedView>
        ) : (
          <>
            {/* Total de Emisiones */}
            <View style={styles.totalCard}>
              <Text style={styles.totalLabel}>Total de Emisiones</Text>
              <Text style={styles.totalValue}>{totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</Text>
              <Text style={styles.totalUnit}>kg CO₂e</Text>
            </View>


        {/* Gráfico de Comparativa Multi-Anual */}
        {anosInventario && Array.isArray(anosInventario) && anosInventario.length > 1 && organizacion && (
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              📈 Evolución de Emisiones
            </ThemedText>
            <ComparativaAnualChart organizacionId={(organizacion as any).id} />
          </ThemedView>
        )}
            {/* Gráfico de Alcances */}
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
                      label={({ name, value }) => `${name}: ${value.toLocaleString('es-ES', { maximumFractionDigits: 0 })}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosAlcance.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number | undefined) => `${(value ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e`} />
                  </PieChart>
                </View>
                <View style={styles.legendContainer}>
                  {datosAlcance.map((item, index) => (
                    <View key={index} style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: item.color }]} />
                      <Text style={styles.legendText}>
                        {item.name}: {item.value.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e
                      </Text>
                    </View>
                  ))}
                </View>
              </ThemedView>
            )}

            {/* Gráfico de Campus */}
            {datosCampus.length > 0 && (
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Emisiones por Campus
                </ThemedText>
                <View style={styles.chartContainer}>
                  <BarChart
                    width={Dimensions.get('window').width - 64}
                    height={300}
                    data={datosCampus}
                    margin={{ top: 20, right: 20, bottom: 60, left: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis />
                    <Tooltip formatter={(value: number | undefined) => `${(value ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e`} />
                    <Bar dataKey="total" fill="#2E7D32">
                      {datosCampus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </View>
              </ThemedView>
            )}

            {/* Tabla de Categorías */}
            {datosCategoria.length > 0 && (
              <ThemedView style={styles.card}>
                <ThemedText type="subtitle" style={styles.cardTitle}>
                  Emisiones por Categoría
                </ThemedText>
                <View style={styles.table}>
                  <View style={styles.tableHeader}>
                    <Text style={styles.tableHeaderText}>Categoría</Text>
                    <Text style={styles.tableHeaderText}>Emisión (kg CO₂e)</Text>
                  </View>
                  {datosCategoria.map((item, index) => (
                    <View key={index} style={styles.tableRow}>
                      <Text style={styles.tableCellCategory}>{item.categoria}</Text>
                      <Text style={styles.tableCellValue}>
                        {item.emision.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </Text>
                    </View>
                  ))}
                </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    marginBottom: 0,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  alertasPanel: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 2,
    borderColor: '#FF9800',
    gap: 12,
  },
  alertasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertasHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertasTitle: {
    color: '#E65100',
  },
  alertasBadge: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  alertasBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  verificarButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  verificarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  alertasList: {
    gap: 8,
  },
  alertaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  alertaContent: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  alertaIcon: {
    fontSize: 24,
  },
  alertaTexto: {
    flex: 1,
    gap: 4,
  },
  alertaTipo: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#424242',
  },
  alertaMensaje: {
    fontSize: 14,
    color: '#212121',
  },
  alertaCategoria: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
  },
  marcarLeidaButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 16,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  marcarLeidaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  verTodasButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  verTodasText: {
    color: '#E65100',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  gestionarMetasButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  gestionarMetasText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
