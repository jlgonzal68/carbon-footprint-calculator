import { useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

type TipoImportacion = 'combustibles' | 'energia' | 'aires_acondicionados' | 'extintores' | 'residuos' | 'agua';

const TIPOS_DATOS = [
  { id: 'combustibles' as TipoImportacion, nombre: 'Combustibles', icono: '⛽', descripcion: 'Gasolina y Diesel' },
  { id: 'energia' as TipoImportacion, nombre: 'Energía', icono: '⚡', descripcion: 'Consumo eléctrico por campus' },
  { id: 'aires_acondicionados' as TipoImportacion, nombre: 'Aires Acondicionados', icono: '❄️', descripcion: 'Inventario de equipos' },
  { id: 'extintores' as TipoImportacion, nombre: 'Extintores', icono: '🧯', descripcion: 'Inventario de extintores' },
  { id: 'residuos' as TipoImportacion, nombre: 'Residuos', icono: '♻️', descripcion: 'Residuos sólidos por tipo' },
  { id: 'agua' as TipoImportacion, nombre: 'Agua', icono: '💧', descripcion: 'Agua potable y residual' },
];

const CAMPUS = [
  { id: 1, nombre: 'Robledo' },
  { id: 2, nombre: 'Fraternidad' },
  { id: 3, nombre: 'Floresta' },
  { id: 4, nombre: 'Prado' },
  { id: 5, nombre: 'Castilla' },
];

export default function ImportarDatosScreen() {
  const insets = useSafeAreaInsets();
  const [tipoSeleccionado, setTipoSeleccionado] = useState<TipoImportacion | null>(null);
  const [anoInventarioId, setAnoInventarioId] = useState<number | null>(null);
  const [datosImportar, setDatosImportar] = useState<any[]>([]);
  const [cargando, setCargando] = useState(false);

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery({ organizacion_id: 1 });
  const importarMutation = trpc.carbon.importarDatosMasivos.useMutation({
    onSuccess: (resultado: any) => {
      Alert.alert(
        'Importación Completada',
        `✅ ${resultado.exitosos} registros importados correctamente.\n${resultado.errores.length > 0 ? `❌ ${resultado.errores.length} errores encontrados.` : ''}`,
        [{ text: 'OK', onPress: () => limpiarFormulario() }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Error', `No se pudo importar: ${error.message}`);
    },
  });

  const limpiarFormulario = () => {
    setTipoSeleccionado(null);
    setAnoInventarioId(null);
    setDatosImportar([]);
  };

  const generarPlantilla = async () => {
    if (!tipoSeleccionado) return;

    let headers: string[] = [];
    let ejemplos: any[] = [];

    switch (tipoSeleccionado) {
      case 'combustibles':
        headers = ['tipo_combustible', 'cantidad', 'fecha_registro'];
        ejemplos = [
          { tipo_combustible: 'gasolina', cantidad: 100.5, fecha_registro: '2024-01-15' },
          { tipo_combustible: 'diesel', cantidad: 200.75, fecha_registro: '2024-01-20' },
        ];
        break;
      case 'energia':
        headers = ['campus_id', 'cantidad_kwh', 'fecha_registro'];
        ejemplos = [
          { campus_id: 1, cantidad_kwh: 5000, fecha_registro: '2024-01-15' },
          { campus_id: 2, cantidad_kwh: 3500, fecha_registro: '2024-01-15' },
        ];
        break;
      case 'aires_acondicionados':
        headers = ['campus_id', 'tipo_equipo', 'capacidad_btu', 'capacidad_kg', 'tipo_refrigerante', 'cantidad'];
        ejemplos = [
          { campus_id: 1, tipo_equipo: 'Split', capacidad_btu: 12000, capacidad_kg: 0.8, tipo_refrigerante: 'R-410A', cantidad: 10 },
          { campus_id: 2, tipo_equipo: 'Ventana', capacidad_btu: 18000, capacidad_kg: 1.2, tipo_refrigerante: 'R-22', cantidad: 5 },
        ];
        break;
      case 'extintores':
        headers = ['campus_id', 'tipo', 'peso_kg', 'cantidad'];
        ejemplos = [
          { campus_id: 1, tipo: 'CO2', peso_kg: 5, cantidad: 20 },
          { campus_id: 2, tipo: 'PQS', peso_kg: 10, cantidad: 15 },
        ];
        break;
      case 'residuos':
        headers = ['campus_id', 'tipo', 'cantidad_kg', 'fecha_registro'];
        ejemplos = [
          { campus_id: 1, tipo: 'relleno', cantidad_kg: 500, fecha_registro: '2024-01-15' },
          { campus_id: 1, tipo: 'reciclado', cantidad_kg: 200, fecha_registro: '2024-01-15' },
        ];
        break;
      case 'agua':
        headers = ['campus_id', 'agua_potable_m3', 'agua_residual_m3', 'fecha_registro'];
        ejemplos = [
          { campus_id: 1, agua_potable_m3: 150, agua_residual_m3: 150, fecha_registro: '2024-01-15' },
          { campus_id: 2, agua_potable_m3: 100, agua_residual_m3: 100, fecha_registro: '2024-01-15' },
        ];
        break;
    }

    // Crear workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(ejemplos);
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    // Generar archivo
    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const uri = (FileSystem as any).documentDirectory + `plantilla_${tipoSeleccionado}.xlsx`;
    
    await (FileSystem as any).writeAsStringAsync(uri, wbout, {
      encoding: (FileSystem as any).EncodingType.Base64,
    });

    if (Platform.OS === 'web') {
      // En web, descargar directamente
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
      link.download = `plantilla_${tipoSeleccionado}.xlsx`;
      link.click();
      Alert.alert('Éxito', 'Plantilla descargada correctamente');
    } else {
      // En móvil, compartir
      await Sharing.shareAsync(uri);
    }
  };

  const seleccionarArchivo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      if (result.canceled) return;

      setCargando(true);
      const uri = result.assets[0].uri;
      
      // Leer archivo
      const fileContent = await (FileSystem as any).readAsStringAsync(uri, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      // Parsear Excel
      const workbook = XLSX.read(fileContent, { type: 'base64' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const datos = XLSX.utils.sheet_to_json(firstSheet);

      setDatosImportar(datos);
      Alert.alert('Archivo Cargado', `${datos.length} filas detectadas`);
    } catch (error: any) {
      Alert.alert('Error', `No se pudo leer el archivo: ${error.message}`);
    } finally {
      setCargando(false);
    }
  };

  const importarDatos = () => {
    if (!tipoSeleccionado || !anoInventarioId || datosImportar.length === 0) {
      Alert.alert('Error', 'Selecciona un tipo de dato, año de inventario y carga un archivo');
      return;
    }

    Alert.alert(
      'Confirmar Importación',
      `¿Deseas importar ${datosImportar.length} registros de ${tipoSeleccionado}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          onPress: () => {
            importarMutation.mutate({
              tipo: tipoSeleccionado,
              ano_inventario_id: anoInventarioId,
              datos: datosImportar,
            });
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          📥 Importación Masiva
        </ThemedText>

        <ThemedView style={styles.infoCard}>
          <ThemedText style={styles.infoText}>
            Importa grandes volúmenes de datos desde archivos Excel. Descarga la plantilla, complétala con tus datos e impórtala.
          </ThemedText>
        </ThemedView>

        {/* Paso 1: Seleccionar Tipo de Dato */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            1️⃣ Selecciona el Tipo de Dato
          </ThemedText>
          <View style={styles.grid}>
            {TIPOS_DATOS.map((tipo) => (
              <Pressable
                key={tipo.id}
                style={[
                  styles.tipoCard,
                  tipoSeleccionado === tipo.id && styles.tipoCardSelected,
                ]}
                onPress={() => setTipoSeleccionado(tipo.id)}
              >
                <ThemedText style={styles.tipoIcon}>{tipo.icono}</ThemedText>
                <ThemedText style={styles.tipoNombre}>{tipo.nombre}</ThemedText>
                <ThemedText style={styles.tipoDescripcion}>{tipo.descripcion}</ThemedText>
              </Pressable>
            ))}
          </View>
        </ThemedView>

        {/* Paso 2: Seleccionar Año */}
        {tipoSeleccionado && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              2️⃣ Selecciona el Año de Inventario
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
        )}

        {/* Paso 3: Descargar Plantilla */}
        {tipoSeleccionado && anoInventarioId && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              3️⃣ Descarga la Plantilla
            </ThemedText>
            <Pressable style={styles.downloadButton} onPress={generarPlantilla}>
              <ThemedText style={styles.downloadButtonText}>
                📄 Descargar Plantilla Excel
              </ThemedText>
            </Pressable>
          </ThemedView>
        )}

        {/* Paso 4: Cargar Archivo */}
        {tipoSeleccionado && anoInventarioId && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              4️⃣ Carga el Archivo Completado
            </ThemedText>
            <Pressable
              style={styles.uploadButton}
              onPress={seleccionarArchivo}
              disabled={cargando}
            >
              {cargando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <ThemedText style={styles.uploadButtonText}>
                  📂 Seleccionar Archivo Excel
                </ThemedText>
              )}
            </Pressable>
            {datosImportar.length > 0 && (
              <ThemedView style={styles.previewCard}>
                <ThemedText style={styles.previewTitle}>
                  ✅ Archivo Cargado
                </ThemedText>
                <ThemedText style={styles.previewText}>
                  {datosImportar.length} registros listos para importar
                </ThemedText>
              </ThemedView>
            )}
          </ThemedView>
        )}

        {/* Paso 5: Importar */}
        {datosImportar.length > 0 && (
          <Pressable
            style={styles.importButton}
            onPress={importarDatos}
            disabled={importarMutation.isPending}
          >
            {importarMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={styles.importButtonText}>
                ⬆️ Importar Datos
              </ThemedText>
            )}
          </Pressable>
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
    gap: 20,
  },
  title: {
    marginBottom: 8,
  },
  infoCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
  },
  infoText: {
    fontSize: 14,
    color: '#2E7D32',
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: '#2E7D32',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tipoCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    gap: 8,
  },
  tipoCardSelected: {
    borderColor: '#2E7D32',
    backgroundColor: '#F1F8E9',
  },
  tipoIcon: {
    fontSize: 32,
  },
  tipoNombre: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  tipoDescripcion: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
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
  downloadButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  uploadButton: {
    backgroundColor: '#7B1FA2',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
    gap: 8,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  previewText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  importButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  importButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
