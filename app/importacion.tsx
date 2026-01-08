import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as XLSX from 'xlsx';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';

type CategoriaImportacion = 'combustibles' | 'energia' | 'aires' | 'extintores' | 'residuos' | 'agua';

interface DatosImportados {
  categoria: CategoriaImportacion;
  datos: any[];
  errores: string[];
}

export default function ImportacionScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaImportacion | null>(null);
  const [datosImportados, setDatosImportados] = useState<DatosImportados | null>(null);
  const [procesando, setProcesando] = useState(false);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const anoActual = anosInventario && Array.isArray(anosInventario) && anosInventario.length > 0 
    ? anosInventario[0] 
    : null;

  const importarDatosMutation = trpc.carbon.importarDatosMasivos.useMutation();

  const categorias = [
    { id: 'combustibles' as CategoriaImportacion, nombre: 'Combustibles', icono: '⛽', descripcion: 'Gasolina y diesel' },
    { id: 'energia' as CategoriaImportacion, nombre: 'Energía Eléctrica', icono: '⚡', descripcion: 'Consumo por campus' },
    { id: 'aires' as CategoriaImportacion, nombre: 'Aires Acondicionados', icono: '❄️', descripcion: 'Inventario de equipos' },
    { id: 'extintores' as CategoriaImportacion, nombre: 'Extintores', icono: '🧯', descripcion: 'Inventario de extintores' },
    { id: 'residuos' as CategoriaImportacion, nombre: 'Residuos Sólidos', icono: '♻️', descripcion: 'Gestión de residuos' },
    { id: 'agua' as CategoriaImportacion, nombre: 'Agua Potable', icono: '💧', descripcion: 'Consumo de agua' },
  ];

  const generarPlantilla = (categoria: CategoriaImportacion) => {
    let datos: any[] = [];
    let nombreArchivo = '';

    switch (categoria) {
      case 'combustibles':
        datos = [
          ['PLANTILLA DE IMPORTACIÓN - COMBUSTIBLES', '', '', ''],
          ['Instrucciones: Complete los datos a partir de la fila 4. No modifique los encabezados.', '', '', ''],
          ['', '', '', ''],
          ['Tipo', 'Cantidad (litros)', 'Fecha (YYYY-MM-DD)', 'Notas'],
          ['gasolina', 100, '2024-01-15', 'Ejemplo 1'],
          ['diesel', 50, '2024-01-20', 'Ejemplo 2'],
        ];
        nombreArchivo = 'plantilla_combustibles.xlsx';
        break;

      case 'energia':
        datos = [
          ['PLANTILLA DE IMPORTACIÓN - ENERGÍA ELÉCTRICA', '', '', ''],
          ['Instrucciones: Complete los datos a partir de la fila 4. Campus: 1=Robledo, 2=Fraternidad, 3=Floresta, 4=Prado, 5=Castilla', '', '', ''],
          ['', '', '', ''],
          ['Campus ID', 'Cantidad (kWh)', 'Fecha (YYYY-MM-DD)', 'Notas'],
          [1, 5000, '2024-01-15', 'Ejemplo 1'],
          [2, 3000, '2024-01-20', 'Ejemplo 2'],
        ];
        nombreArchivo = 'plantilla_energia.xlsx';
        break;

      case 'aires':
        datos = [
          ['PLANTILLA DE IMPORTACIÓN - AIRES ACONDICIONADOS', '', '', '', ''],
          ['Instrucciones: Complete los datos a partir de la fila 4. Tipo: Split, Central, Ventana. Gas: R-22, R-410A, R-134a', '', '', '', ''],
          ['', '', '', '', ''],
          ['Tipo', 'Cantidad', 'Capacidad (BTU)', 'Gas Refrigerante', 'Notas'],
          ['Split', 10, 12000, 'R-410A', 'Ejemplo 1'],
          ['Central', 2, 60000, 'R-22', 'Ejemplo 2'],
        ];
        nombreArchivo = 'plantilla_aires.xlsx';
        break;

      case 'extintores':
        datos = [
          ['PLANTILLA DE IMPORTACIÓN - EXTINTORES', '', '', '', ''],
          ['Instrucciones: Complete los datos a partir de la fila 4. Tipo: CO2, PQS, Halón. Agente: CO2, ABC, Halón-1211', '', '', '', ''],
          ['', '', '', '', ''],
          ['Tipo', 'Cantidad', 'Capacidad (kg)', 'Agente Extintor', 'Notas'],
          ['CO2', 15, 5, 'CO2', 'Ejemplo 1'],
          ['PQS', 20, 10, 'ABC', 'Ejemplo 2'],
        ];
        nombreArchivo = 'plantilla_extintores.xlsx';
        break;

      case 'residuos':
        datos = [
          ['PLANTILLA DE IMPORTACIÓN - RESIDUOS SÓLIDOS', '', '', ''],
          ['Instrucciones: Complete los datos a partir de la fila 4. Tipo: Ordinarios, Reciclables, Peligrosos, Orgánicos', '', '', ''],
          ['', '', '', ''],
          ['Tipo', 'Cantidad (kg)', 'Fecha (YYYY-MM-DD)', 'Notas'],
          ['Ordinarios', 500, '2024-01-15', 'Ejemplo 1'],
          ['Reciclables', 200, '2024-01-20', 'Ejemplo 2'],
        ];
        nombreArchivo = 'plantilla_residuos.xlsx';
        break;

      case 'agua':
        datos = [
          ['PLANTILLA DE IMPORTACIÓN - AGUA POTABLE', '', '', ''],
          ['Instrucciones: Complete los datos a partir de la fila 4.', '', '', ''],
          ['', '', '', ''],
          ['Cantidad (m³)', 'Fecha (YYYY-MM-DD)', 'Campus/Ubicación', 'Notas'],
          [100, '2024-01-15', 'Robledo', 'Ejemplo 1'],
          [75, '2024-01-20', 'Fraternidad', 'Ejemplo 2'],
        ];
        nombreArchivo = 'plantilla_agua.xlsx';
        break;
    }

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');

    if (Platform.OS === 'web') {
      XLSX.writeFile(wb, nombreArchivo);
    } else {
      Alert.alert('Información', 'La descarga de plantillas está disponible en la versión web');
    }
  };

  const seleccionarArchivo = async () => {
    if (!categoriaSeleccionada) {
      Alert.alert('Error', 'Por favor selecciona una categoría primero');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      setProcesando(true);
      const file = result.assets[0];
      
      // Leer archivo Excel
      const response = await fetch(file.uri);
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Validar y procesar datos
      const resultado = validarDatos(categoriaSeleccionada, jsonData);
      setDatosImportados(resultado);
      setProcesando(false);

      if (resultado.errores.length > 0) {
        Alert.alert('Advertencia', `Se encontraron ${resultado.errores.length} errores. Revisa los detalles.`);
      } else {
        Alert.alert('Éxito', `${resultado.datos.length} registros listos para importar`);
      }
    } catch (error) {
      console.error('Error al leer archivo:', error);
      Alert.alert('Error', 'No se pudo leer el archivo Excel');
      setProcesando(false);
    }
  };

  const validarDatos = (categoria: CategoriaImportacion, jsonData: any[]): DatosImportados => {
    const errores: string[] = [];
    const datosValidos: any[] = [];

    // Saltar las primeras 3 filas (título, instrucciones, vacía, encabezados)
    const filasDatos = jsonData.slice(4);

    filasDatos.forEach((fila: any, index: number) => {
      const numeroFila = index + 5; // +5 porque empezamos en la fila 5 del Excel

      switch (categoria) {
        case 'combustibles':
          if (!fila[0] || !fila[1]) {
            errores.push(`Fila ${numeroFila}: Tipo y cantidad son obligatorios`);
          } else if (!['gasolina', 'diesel'].includes(fila[0].toLowerCase())) {
            errores.push(`Fila ${numeroFila}: Tipo debe ser 'gasolina' o 'diesel'`);
          } else if (isNaN(fila[1]) || fila[1] <= 0) {
            errores.push(`Fila ${numeroFila}: Cantidad debe ser un número positivo`);
          } else {
            datosValidos.push({
              tipo: fila[0].toLowerCase(),
              cantidad: parseFloat(fila[1]),
              fecha: fila[2] || new Date().toISOString().split('T')[0],
              notas: fila[3] || '',
            });
          }
          break;

        case 'energia':
          if (!fila[0] || !fila[1]) {
            errores.push(`Fila ${numeroFila}: Campus ID y cantidad son obligatorios`);
          } else if (![1, 2, 3, 4, 5].includes(parseInt(fila[0]))) {
            errores.push(`Fila ${numeroFila}: Campus ID debe ser 1, 2, 3, 4 o 5`);
          } else if (isNaN(fila[1]) || fila[1] <= 0) {
            errores.push(`Fila ${numeroFila}: Cantidad debe ser un número positivo`);
          } else {
            datosValidos.push({
              campus_id: parseInt(fila[0]),
              cantidad_kwh: parseFloat(fila[1]),
              fecha: fila[2] || new Date().toISOString().split('T')[0],
              notas: fila[3] || '',
            });
          }
          break;

        // Agregar validaciones para otras categorías...
        default:
          datosValidos.push(fila);
      }
    });

    return {
      categoria,
      datos: datosValidos,
      errores,
    };
  };

  const confirmarImportacion = async () => {
    if (!datosImportados || !anoActual) {
      Alert.alert('Error', 'No hay datos para importar o no hay año de inventario activo');
      return;
    }

    Alert.alert(
      'Confirmar Importación',
      `¿Deseas importar ${datosImportados.datos.length} registros de ${categoriaSeleccionada}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Importar',
          onPress: async () => {
            try {
              setProcesando(true);
              const resultado = await importarDatosMutation.mutateAsync({
                ano_inventario_id: (anoActual as any).id,
                tipo: datosImportados.categoria === 'aires' ? 'aires_acondicionados' : datosImportados.categoria,
                datos: datosImportados.datos,
              });
              
              Alert.alert('Éxito', `Se importaron ${resultado.exitosos} registros exitosamente`, [
                { text: 'OK', onPress: () => router.back() }
              ]);
            } catch (error) {
              Alert.alert('Error', 'No se pudieron importar los datos');
            } finally {
              setProcesando(false);
            }
          },
        },
      ]
    );
  };

  if (!user || !organizacion) {
    return (
      <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedView style={styles.content}>
          <ThemedText type="title">Importación Masiva</ThemedText>
          <ThemedText style={styles.noAuth}>
            Debes iniciar sesión y tener una organización configurada
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
      <ThemedView style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>
        <ThemedText type="title">Importación Masiva</ThemedText>
        <ThemedText style={styles.subtitle}>
          Importa datos históricos desde archivos Excel
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          1. Selecciona la Categoría
        </ThemedText>
        <View style={styles.categoriaGrid}>
          {categorias.map((cat) => (
            <Pressable
              key={cat.id}
              style={[
                styles.categoriaCard,
                categoriaSeleccionada === cat.id && styles.categoriaCardSelected,
              ]}
              onPress={() => setCategoriaSeleccionada(cat.id)}
            >
              <Text style={styles.categoriaIcono}>{cat.icono}</Text>
              <ThemedText style={styles.categoriaNombre}>{cat.nombre}</ThemedText>
              <ThemedText style={styles.categoriaDescripcion}>{cat.descripcion}</ThemedText>
            </Pressable>
          ))}
        </View>
      </ThemedView>

      {categoriaSeleccionada && (
        <>
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              2. Descarga la Plantilla
            </ThemedText>
            <Pressable
              style={styles.downloadButton}
              onPress={() => generarPlantilla(categoriaSeleccionada)}
            >
              <Text style={styles.downloadButtonText}>📥 Descargar Plantilla Excel</Text>
            </Pressable>
            <ThemedText style={styles.hint}>
              Completa la plantilla con tus datos y guárdala en tu computadora
            </ThemedText>
          </ThemedView>

          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              3. Carga el Archivo Completado
            </ThemedText>
            <Pressable
              style={styles.uploadButton}
              onPress={seleccionarArchivo}
              disabled={procesando}
            >
              {procesando ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.uploadButtonText}>📤 Seleccionar Archivo Excel</Text>
              )}
            </Pressable>
          </ThemedView>
        </>
      )}

      {datosImportados && (
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Vista Previa
          </ThemedText>
          <View style={styles.previewCard}>
            <View style={styles.previewRow}>
              <ThemedText style={styles.previewLabel}>Registros válidos:</ThemedText>
              <ThemedText style={styles.previewValue}>{datosImportados.datos.length}</ThemedText>
            </View>
            <View style={styles.previewRow}>
              <ThemedText style={styles.previewLabel}>Errores:</ThemedText>
              <ThemedText style={[styles.previewValue, { color: '#D32F2F' }]}>
                {datosImportados.errores.length}
              </ThemedText>
            </View>
          </View>

          {datosImportados.errores.length > 0 && (
            <View style={styles.erroresContainer}>
              <ThemedText style={styles.erroresTitle}>Errores de Validación:</ThemedText>
              {datosImportados.errores.slice(0, 5).map((error, index) => (
                <ThemedText key={index} style={styles.errorText}>
                  • {error}
                </ThemedText>
              ))}
              {datosImportados.errores.length > 5 && (
                <ThemedText style={styles.errorText}>
                  ... y {datosImportados.errores.length - 5} errores más
                </ThemedText>
              )}
            </View>
          )}

          {datosImportados.datos.length > 0 && (
            <Pressable
              style={[styles.importButton, datosImportados.errores.length > 0 && styles.importButtonWarning]}
              onPress={confirmarImportacion}
              disabled={procesando}
            >
              <Text style={styles.importButtonText}>
                {datosImportados.errores.length > 0
                  ? '⚠️ Importar Solo Registros Válidos'
                  : '✅ Importar Todos los Registros'}
              </Text>
            </Pressable>
          )}
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 20 },
  header: { padding: 20, backgroundColor: '#FFFFFF', marginBottom: 16 },
  backButton: { marginBottom: 12 },
  backButtonText: { fontSize: 16, color: '#2E7D32', fontWeight: '600' },
  subtitle: { fontSize: 14, color: '#757575', marginTop: 8, lineHeight: 20 },
  section: { backgroundColor: '#FFFFFF', padding: 20, marginBottom: 16 },
  sectionTitle: { marginBottom: 16 },
  categoriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  categoriaCard: {
    width: '48%',
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  categoriaCardSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  categoriaIcono: { fontSize: 32, marginBottom: 8 },
  categoriaNombre: { fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  categoriaDescripcion: { fontSize: 12, color: '#757575', textAlign: 'center' },
  downloadButton: {
    backgroundColor: '#1976D2',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  downloadButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  uploadButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
  },
  uploadButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  hint: { fontSize: 12, color: '#757575', marginTop: 8, lineHeight: 18 },
  previewCard: { backgroundColor: '#F5F5F5', padding: 16, borderRadius: 8, marginBottom: 16 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  previewLabel: { fontSize: 14, color: '#757575' },
  previewValue: { fontSize: 14, fontWeight: '600' },
  erroresContainer: { backgroundColor: '#FFEBEE', padding: 16, borderRadius: 8, marginBottom: 16 },
  erroresTitle: { fontSize: 14, fontWeight: '600', color: '#D32F2F', marginBottom: 8 },
  errorText: { fontSize: 13, color: '#D32F2F', lineHeight: 20 },
  importButton: {
    backgroundColor: '#2E7D32',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  importButtonWarning: { backgroundColor: '#F57C00' },
  importButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  noAuth: { fontSize: 16, color: '#757575', textAlign: 'center', marginTop: 20, lineHeight: 24 },
});
