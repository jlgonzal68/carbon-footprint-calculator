import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { trpc } from '@/lib/trpc';
import { ThemedText } from './themed-text';

interface ComparativaAnualChartProps {
  organizacionId: number;
}

export function ComparativaAnualChart({ organizacionId }: ComparativaAnualChartProps) {
  const { data: comparativa, isLoading } = trpc.carbon.getComparativaAnual.useQuery(
    { organizacion_id: organizacionId },
    { enabled: !!organizacionId }
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.loadingText}>Cargando comparativa...</ThemedText>
      </View>
    );
  }

  if (!comparativa || !comparativa.datos || comparativa.datos.length === 0) {
    return (
      <View style={styles.container}>
        <ThemedText style={styles.noData}>No hay datos suficientes para mostrar la comparativa</ThemedText>
      </View>
    );
  }

  const { datos, ano_mayor_emision, ano_menor_emision } = comparativa;

  // Preparar datos para el gráfico
  const chartData = datos.map((d: any) => ({
    ano: d.ano.toString(),
    'Alcance 1': parseFloat(d.alcance_1.toFixed(2)),
    'Alcance 2': parseFloat(d.alcance_2.toFixed(2)),
    'Alcance 3': parseFloat(d.alcance_3.toFixed(2)),
    'Total': parseFloat(d.total.toFixed(2)),
  }));

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ano" />
            <YAxis />
            <Tooltip 
              formatter={(value: number | undefined) => `${(value ?? 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e`}
            />
            <Legend />
            <Line type="monotone" dataKey="Total" stroke="#2E7D32" strokeWidth={3} dot={{ r: 5 }} />
            <Line type="monotone" dataKey="Alcance 1" stroke="#1976D2" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Alcance 2" stroke="#F57C00" strokeWidth={2} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="Alcance 3" stroke="#7B1FA2" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </View>

      {/* Análisis de Tendencias */}
      <View style={styles.analysisContainer}>
        <View style={styles.analysisRow}>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>🔺 Mayor Emisión</Text>
            <Text style={styles.analysisValue}>
              {ano_mayor_emision?.ano} - {ano_mayor_emision?.total.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg CO₂e
            </Text>
          </View>
          <View style={styles.analysisItem}>
            <Text style={styles.analysisLabel}>🔻 Menor Emisión</Text>
            <Text style={styles.analysisValue}>
              {ano_menor_emision?.ano} - {ano_menor_emision?.total.toLocaleString('es-ES', { maximumFractionDigits: 0 })} kg CO₂e
            </Text>
          </View>
        </View>

        {/* Tendencias año tras año */}
        <View style={styles.trendsContainer}>
          <ThemedText style={styles.trendsTitle}>Cambios Interanuales:</ThemedText>
          {datos.map((d: any, index: number) => {
            if (index === 0) return null;
            const icon = d.tendencia === 'reduccion' ? '↓' : d.tendencia === 'aumento' ? '↑' : '→';
            const color = d.tendencia === 'reduccion' ? '#4CAF50' : d.tendencia === 'aumento' ? '#F44336' : '#757575';
            return (
              <View key={d.ano} style={styles.trendItem}>
                <Text style={[styles.trendIcon, { color }]}>{icon}</Text>
                <Text style={styles.trendText}>
                  {d.ano}: {d.cambio_porcentual > 0 ? '+' : ''}{d.cambio_porcentual.toFixed(1)}%
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    color: '#757575',
  },
  noData: {
    textAlign: 'center',
    padding: 20,
    color: '#757575',
  },
  chartWrapper: {
    height: 300,
    marginBottom: 16,
  },
  analysisContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  analysisItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  analysisLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  analysisValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  trendsContainer: {
    marginTop: 8,
  },
  trendsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#212121',
  },
  trendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  trendIcon: {
    fontSize: 18,
    marginRight: 8,
    fontWeight: 'bold',
  },
  trendText: {
    fontSize: 13,
    color: '#424242',
  },
});
