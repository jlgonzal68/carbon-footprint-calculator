import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { utils, write } from 'xlsx';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

const CAMPUS_NAMES: Record<number, string> = {
  1: 'Robledo',
  2: 'Fraternidad',
  3: 'Floresta',
  4: 'Prado',
  5: 'Castilla',
};

export default function ExportacionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: datosExportacion } = trpc.carbon.getDatosExportacion.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const handleExportarExcel = async () => {
    if (!datosExportacion || !selectedAno) {
      Alert.alert('Error', 'No hay datos para exportar');
      return;
    }

    setIsExporting(true);

    try {
      const { anoInfo, combustibles, energia, airesAcond, extintores, residuos, agua, resumen } = datosExportacion;

      // Crear libro de Excel
      const wb = utils.book_new();

      // Hoja 1: Resumen
      const resumenData = [
        ['RESUMEN DE HUELLA DE CARBONO'],
        ['Organización:', anoInfo.organizacion_nombre || ''],
        ['Año de Inventario:', anoInfo.ano || ''],
        ['Año Base:', anoInfo.ano_base ? 'Sí' : 'No'],
        [],
        ['EMISIONES POR ALCANCE'],
        ['Alcance', 'Emisiones (kg CO₂e)'],
        ['Alcance 1 - Emisiones Directas', parseFloat(resumen.alcance_1_total || '0').toFixed(2)],
        ['Alcance 2 - Emisiones Indirectas por Energía', parseFloat(resumen.alcance_2_total || '0').toFixed(2)],
        ['Alcance 3 - Otras Emisiones Indirectas', parseFloat(resumen.alcance_3_total || '0').toFixed(2)],
        ['TOTAL', parseFloat(resumen.total_co2e || '0').toFixed(2)],
        [],
        ['EMISIONES POR CATEGORÍA'],
        ['Categoría', 'Emisiones (kg CO₂e)'],
        ['Combustibles', parseFloat(resumen.combustibles_total || '0').toFixed(2)],
        ['Energía Eléctrica', parseFloat(resumen.energia_total || '0').toFixed(2)],
        ['Aires Acondicionados', parseFloat(resumen.aires_total || '0').toFixed(2)],
        ['Extintores', parseFloat(resumen.extintores_total || '0').toFixed(2)],
        ['Residuos Sólidos', parseFloat(resumen.residuos_total || '0').toFixed(2)],
        ['Agua', parseFloat(resumen.agua_total || '0').toFixed(2)],
      ];
      const wsResumen = utils.aoa_to_sheet(resumenData);
      utils.book_append_sheet(wb, wsResumen, 'Resumen');

      // Hoja 2: Combustibles
      if (combustibles && combustibles.length > 0) {
        const combustiblesData = [
          ['CONSUMO DE COMBUSTIBLES'],
          ['ID', 'Tipo', 'Cantidad (L)', 'Factor Emisión', 'Emisión CO₂e (kg)', 'Fecha Registro'],
          ...combustibles.map((c: any) => [
            c.id,
            c.tipo_combustible,
            parseFloat(c.cantidad_litros).toFixed(2),
            parseFloat(c.factor_emision).toFixed(4),
            parseFloat(c.emision_co2e).toFixed(2),
            new Date(c.fecha_registro).toLocaleDateString('es-ES'),
          ]),
        ];
        const wsCombustibles = utils.aoa_to_sheet(combustiblesData);
        utils.book_append_sheet(wb, wsCombustibles, 'Combustibles');
      }

      // Hoja 3: Energía
      if (energia && energia.length > 0) {
        const energiaData = [
          ['CONSUMO DE ENERGÍA ELÉCTRICA'],
          ['ID', 'Campus', 'Consumo (kWh)', 'Factor Emisión', 'Emisión CO₂e (kg)', 'Fecha Registro'],
          ...energia.map((e: any) => [
            e.id,
            CAMPUS_NAMES[e.campus_id] || `Campus ${e.campus_id}`,
            parseFloat(e.consumo_kwh).toFixed(2),
            parseFloat(e.factor_emision).toFixed(4),
            parseFloat(e.emision_co2e).toFixed(2),
            new Date(e.fecha_registro).toLocaleDateString('es-ES'),
          ]),
        ];
        const wsEnergia = utils.aoa_to_sheet(energiaData);
        utils.book_append_sheet(wb, wsEnergia, 'Energía');
      }

      // Hoja 4: Aires Acondicionados
      if (airesAcond && airesAcond.length > 0) {
        const airesData = [
          ['INVENTARIO DE AIRES ACONDICIONADOS'],
          ['ID', 'Campus', 'Tipo Equipo', 'Capacidad BTU', 'Capacidad kg', 'Cantidad', 'Factor Emisión', 'Emisión CO₂e (kg)', 'Fecha Registro'],
          ...airesAcond.map((a: any) => [
            a.id,
            CAMPUS_NAMES[a.campus_id] || `Campus ${a.campus_id}`,
            a.tipo_equipo,
            parseFloat(a.capacidad_btu).toFixed(0),
            parseFloat(a.capacidad_kg).toFixed(2),
            a.cantidad,
            parseFloat(a.factor_emision).toFixed(4),
            parseFloat(a.emision_total_co2e).toFixed(2),
            new Date(a.fecha_registro).toLocaleDateString('es-ES'),
          ]),
        ];
        const wsAires = utils.aoa_to_sheet(airesData);
        utils.book_append_sheet(wb, wsAires, 'Aires Acondicionados');
      }

      // Hoja 5: Extintores
      if (extintores && extintores.length > 0) {
        const extintoresData = [
          ['INVENTARIO DE EXTINTORES'],
          ['ID', 'Campus', 'Tipo Extintor', 'Peso (kg)', 'Cantidad', 'Factor Emisión', 'Emisión CO₂e (kg)', 'Fecha Registro'],
          ...extintores.map((e: any) => [
            e.id,
            CAMPUS_NAMES[e.campus_id] || `Campus ${e.campus_id}`,
            e.tipo_extintor,
            parseFloat(e.peso_kg).toFixed(2),
            e.cantidad,
            parseFloat(e.factor_emision).toFixed(4),
            parseFloat(e.emision_co2e).toFixed(2),
            new Date(e.fecha_registro).toLocaleDateString('es-ES'),
          ]),
        ];
        const wsExtintores = utils.aoa_to_sheet(extintoresData);
        utils.book_append_sheet(wb, wsExtintores, 'Extintores');
      }

      // Hoja 6: Residuos
      if (residuos && residuos.length > 0) {
        const residuosData = [
          ['RESIDUOS SÓLIDOS'],
          ['ID', 'Campus', 'Tipo Residuo', 'Cantidad (kg)', 'Factor Emisión', 'Emisión CO₂e (kg)', 'Fecha Registro'],
          ...residuos.map((r: any) => [
            r.id,
            CAMPUS_NAMES[r.campus_id] || `Campus ${r.campus_id}`,
            r.tipo_residuo,
            parseFloat(r.cantidad_kg).toFixed(2),
            parseFloat(r.factor_emision).toFixed(4),
            parseFloat(r.emision_co2e).toFixed(2),
            new Date(r.fecha_registro).toLocaleDateString('es-ES'),
          ]),
        ];
        const wsResiduos = utils.aoa_to_sheet(residuosData);
        utils.book_append_sheet(wb, wsResiduos, 'Residuos');
      }

      // Hoja 7: Agua
      if (agua && agua.length > 0) {
        const aguaData = [
          ['CONSUMO DE AGUA'],
          ['ID', 'Campus', 'Consumo (m³)', 'Factor Potable', 'Factor Residual', 'Emisión Potable (kg)', 'Emisión Residual (kg)', 'Emisión Total (kg)', 'Fecha Registro'],
          ...agua.map((a: any) => [
            a.id,
            CAMPUS_NAMES[a.campus_id] || `Campus ${a.campus_id}`,
            parseFloat(a.consumo_m3).toFixed(2),
            parseFloat(a.factor_emision_potable).toFixed(4),
            parseFloat(a.factor_emision_residual).toFixed(4),
            parseFloat(a.emision_potable_co2e).toFixed(2),
            parseFloat(a.emision_residual_co2e).toFixed(2),
            parseFloat(a.emision_total_co2e).toFixed(2),
            new Date(a.fecha_registro).toLocaleDateString('es-ES'),
          ]),
        ];
        const wsAgua = utils.aoa_to_sheet(aguaData);
        utils.book_append_sheet(wb, wsAgua, 'Agua');
      }

      // Generar archivo Excel
      const wbout = write(wb, { type: 'base64', bookType: 'xlsx' });
      const fileName = `HuellaCarbono_${anoInfo.organizacion_nombre}_${anoInfo.ano}.xlsx`;

      if (Platform.OS === 'web') {
        // En web, descargar directamente
        const s2ab = (s: string) => {
          const buf = new ArrayBuffer(s.length);
          const view = new Uint8Array(buf);
          for (let i = 0; i < s.length; i++) {
            view[i] = s.charCodeAt(i) & 0xFF;
          }
          return buf;
        };
        const blob = new Blob([s2ab(atob(wbout))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        Alert.alert('Éxito', 'Archivo Excel descargado correctamente');
      } else {
        // En móvil, guardar y compartir
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, wbout, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert('Éxito', `Archivo guardado en: ${fileUri}`);
        }
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      Alert.alert('Error', 'No se pudo exportar el archivo Excel');
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <ThemedView style={styles.content}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            📊 Exportación de Datos
          </ThemedText>
          <ThemedText style={styles.noAuth}>
            Inicia sesión para exportar datos
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
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            📊 Exportación de Datos
          </ThemedText>
          <ThemedText style={styles.noOrg}>
            No tienes una organización configurada
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          📊 Exportación de Datos
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Exportar datos a Excel
          </ThemedText>
          <ThemedText style={styles.description}>
            Selecciona un año de inventario para exportar todos los datos ingresados (consumos, inventarios, emisiones calculadas) a un archivo Excel organizado por categorías.
          </ThemedText>
        </ThemedView>

        {/* Selector de Año */}
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Año de Inventario
          </ThemedText>
          {!anosInventario || (Array.isArray(anosInventario) && anosInventario.length === 0) ? (
            <ThemedText style={styles.noData}>
              No hay años de inventario disponibles
            </ThemedText>
          ) : (
            <View style={styles.anoSelector}>
              {Array.isArray(anosInventario) && anosInventario.map((ano: any) => (
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

        {/* Vista Previa */}
        {selectedAno && datosExportacion && (
          <ThemedView style={styles.card}>
            <ThemedText type="subtitle" style={styles.cardTitle}>
              Vista Previa de Exportación
            </ThemedText>
            <View style={styles.previewContainer}>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Organización:</Text>
                <Text style={styles.previewValue}>{datosExportacion.anoInfo.organizacion_nombre}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Año:</Text>
                <Text style={styles.previewValue}>{datosExportacion.anoInfo.ano}</Text>
              </View>
              <View style={styles.previewRow}>
                <Text style={styles.previewLabel}>Total Emisiones:</Text>
                <Text style={styles.previewValue}>
                  {parseFloat(datosExportacion.resumen.total_co2e || '0').toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e
                </Text>
              </View>
            </View>

            <View style={styles.categoriesContainer}>
              <ThemedText style={styles.categoriesTitle}>Hojas a exportar:</ThemedText>
              <View style={styles.categoryList}>
                <Text style={styles.categoryItem}>✓ Resumen General</Text>
                {datosExportacion.combustibles.length > 0 && (
                  <Text style={styles.categoryItem}>✓ Combustibles ({datosExportacion.combustibles.length} registros)</Text>
                )}
                {datosExportacion.energia.length > 0 && (
                  <Text style={styles.categoryItem}>✓ Energía ({datosExportacion.energia.length} registros)</Text>
                )}
                {datosExportacion.airesAcond.length > 0 && (
                  <Text style={styles.categoryItem}>✓ Aires Acondicionados ({datosExportacion.airesAcond.length} registros)</Text>
                )}
                {datosExportacion.extintores.length > 0 && (
                  <Text style={styles.categoryItem}>✓ Extintores ({datosExportacion.extintores.length} registros)</Text>
                )}
                {datosExportacion.residuos.length > 0 && (
                  <Text style={styles.categoryItem}>✓ Residuos ({datosExportacion.residuos.length} registros)</Text>
                )}
                {datosExportacion.agua.length > 0 && (
                  <Text style={styles.categoryItem}>✓ Agua ({datosExportacion.agua.length} registros)</Text>
                )}
              </View>
            </View>

            <Pressable
              style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
              onPress={handleExportarExcel}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.exportButtonText}>Exportar a Excel</Text>
              )}
            </Pressable>
          </ThemedView>
        )}

        {selectedAno && !datosExportacion && (
          <ThemedView style={styles.card}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <ThemedText style={styles.loadingText}>Cargando datos...</ThemedText>
          </ThemedView>
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
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
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
  description: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 20,
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
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
    fontSize: 14,
  },
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#757575',
  },
  previewContainer: {
    gap: 8,
    paddingVertical: 8,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  previewValue: {
    fontSize: 14,
    color: '#616161',
  },
  categoriesContainer: {
    marginTop: 8,
    gap: 8,
  },
  categoriesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  categoryList: {
    gap: 4,
  },
  categoryItem: {
    fontSize: 14,
    color: '#424242',
    paddingLeft: 8,
  },
  exportButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  exportButtonDisabled: {
    opacity: 0.6,
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
