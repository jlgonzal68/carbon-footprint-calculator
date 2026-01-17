import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, ActivityIndicator, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const CAMPUS_NAMES: Record<number, string> = {
  1: 'Robledo',
  2: 'Fraternidad',
  3: 'Floresta',
  4: 'Prado',
  5: 'Castilla',
};

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [selectedAno, setSelectedAno] = useState<number | null>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  const { data: factores } = trpc.carbon.getFactoresEmision.useQuery(
    { ano_inventario_id: selectedAno! },
    { enabled: !!selectedAno }
  );

  const anoSeleccionado = (anosInventario as any[])?.find((a: any) => a.id === selectedAno);

  const generateHTMLReport = () => {
    if (!resumen || !organizacion || !anoSeleccionado) return '';

    const totalEmisiones = parseFloat(resumen.total_co2e || '0');
    const alcance1 = parseFloat(resumen.alcance_1_total || '0');
    const alcance2 = parseFloat(resumen.alcance_2_total || '0');
    const alcance3 = parseFloat(resumen.alcance_3_total || '0');

    const combustibles = parseFloat(resumen.combustibles_total || '0');
    const energia = parseFloat(resumen.energia_total || '0');
    const aires = parseFloat(resumen.aires_total || '0');
    const extintores = parseFloat(resumen.extintores_total || '0');
    const residuos = parseFloat(resumen.residuos_total || '0');
    const agua = parseFloat(resumen.agua_total || '0');

    const datosCampus = resumen.por_campus ? Object.entries(resumen.por_campus).map(([campusId, total]: [string, any]) => ({
      nombre: CAMPUS_NAMES[parseInt(campusId)] || `Campus ${campusId}`,
      total: parseFloat(total || '0'),
    })) : [];

    const fechaActual = new Date().toLocaleDateString('es-ES', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Huella de Carbono - ${anoSeleccionado.ano}</title>
  <style>
    @page {
      margin: 2cm;
      size: letter;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      border-bottom: 3px solid #2E7D32;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #2E7D32;
      font-size: 28px;
      margin: 10px 0;
    }
    
    .header p {
      color: #666;
      font-size: 14px;
      margin: 5px 0;
    }
    
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    
    .section-title {
      background-color: #2E7D32;
      color: white;
      padding: 10px 15px;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 15px;
      border-radius: 5px;
    }
    
    .subsection-title {
      color: #2E7D32;
      font-size: 16px;
      font-weight: bold;
      margin: 15px 0 10px 0;
      border-bottom: 2px solid #A5D6A7;
      padding-bottom: 5px;
    }
    
    .summary-box {
      background-color: #E8F5E9;
      border-left: 5px solid #2E7D32;
      padding: 20px;
      margin: 20px 0;
      border-radius: 5px;
    }
    
    .summary-box .total {
      font-size: 36px;
      font-weight: bold;
      color: #2E7D32;
      text-align: center;
      margin: 10px 0;
    }
    
    .summary-box .label {
      text-align: center;
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }
    
    table thead {
      background-color: #2E7D32;
      color: white;
    }
    
    table th, table td {
      padding: 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    
    table tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    
    table tbody tr:hover {
      background-color: #E8F5E9;
    }
    
    .number {
      text-align: right;
      font-weight: 600;
    }
    
    .methodology {
      background-color: #F5F5F5;
      padding: 15px;
      border-radius: 5px;
      font-size: 13px;
      line-height: 1.8;
    }
    
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #2E7D32;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    .alcance-box {
      display: inline-block;
      width: 30%;
      margin: 1%;
      padding: 15px;
      background-color: #F5F5F5;
      border-radius: 5px;
      text-align: center;
      vertical-align: top;
    }
    
    .alcance-box .alcance-title {
      font-weight: bold;
      color: #2E7D32;
      margin-bottom: 10px;
    }
    
    .alcance-box .alcance-value {
      font-size: 24px;
      font-weight: bold;
      color: #333;
    }
    
    .alcance-box .alcance-unit {
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <!-- PORTADA -->
  <div class="header">
    <h1>REPORTE DE HUELLA DE CARBONO</h1>
    <p style="font-size: 18px; font-weight: bold;">${(organizacion as any).nombre}</p>
    <p>Año de Inventario: ${anoSeleccionado.ano}</p>
    <p>Fecha de Generación: ${fechaActual}</p>
    <p style="margin-top: 20px; font-style: italic;">Conforme a ISO 14064-1:2018</p>
  </div>

  <!-- RESUMEN EJECUTIVO -->
  <div class="section">
    <div class="section-title">1. RESUMEN EJECUTIVO</div>
    
    <div class="summary-box">
      <div class="label">TOTAL DE EMISIONES DE GASES DE EFECTO INVERNADERO</div>
      <div class="total">${totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</div>
      <div class="label">kg CO₂e</div>
    </div>
    
    <p>
      El presente reporte documenta el inventario de emisiones de gases de efecto invernadero (GEI) de 
      <strong>${(organizacion as any).nombre}</strong> para el año ${anoSeleccionado.ano}, calculado conforme a los 
      lineamientos establecidos en la norma ISO 14064-1:2018.
    </p>
    
    <p>
      Las emisiones totales cuantificadas ascienden a <strong>${totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</strong>, 
      distribuidas en tres alcances según la clasificación del Protocolo de GEI.
    </p>
  </div>

  <!-- DISTRIBUCIÓN POR ALCANCES -->
  <div class="section">
    <div class="section-title">2. DISTRIBUCIÓN DE EMISIONES POR ALCANCE</div>
    
    <div style="text-align: center; margin: 20px 0;">
      <div class="alcance-box">
        <div class="alcance-title">ALCANCE 1</div>
        <div class="alcance-value">${alcance1.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</div>
        <div class="alcance-unit">kg CO₂e</div>
        <p style="font-size: 12px; margin-top: 10px;">Emisiones directas</p>
      </div>
      
      <div class="alcance-box">
        <div class="alcance-title">ALCANCE 2</div>
        <div class="alcance-value">${alcance2.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</div>
        <div class="alcance-unit">kg CO₂e</div>
        <p style="font-size: 12px; margin-top: 10px;">Emisiones indirectas por energía</p>
      </div>
      
      <div class="alcance-box">
        <div class="alcance-title">ALCANCE 3</div>
        <div class="alcance-value">${alcance3.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</div>
        <div class="alcance-unit">kg CO₂e</div>
        <p style="font-size: 12px; margin-top: 10px;">Otras emisiones indirectas</p>
      </div>
    </div>
    
    <div class="subsection-title">2.1 Descripción de Alcances</div>
    
    <p><strong>Alcance 1 - Emisiones Directas:</strong> Incluye emisiones de fuentes controladas directamente por la organización, 
    tales como combustión de combustibles fósiles en vehículos y equipos, fugas de refrigerantes de aires acondicionados, 
    y descargas de agentes extintores.</p>
    
    <p><strong>Alcance 2 - Emisiones Indirectas por Energía:</strong> Comprende emisiones derivadas de la generación de 
    electricidad consumida por la organización en sus instalaciones.</p>
    
    <p><strong>Alcance 3 - Otras Emisiones Indirectas:</strong> Abarca emisiones asociadas a actividades de la organización 
    pero que ocurren en fuentes no controladas directamente, como tratamiento de residuos sólidos, consumo de agua potable 
    y tratamiento de aguas residuales.</p>
  </div>

  <div class="page-break"></div>

  <!-- METODOLOGÍA -->
  <div class="section">
    <div class="section-title">3. METODOLOGÍA</div>
    
    <div class="subsection-title">3.1 Norma de Referencia</div>
    <div class="methodology">
      <p>El inventario de GEI se elaboró siguiendo los principios y requisitos de la norma internacional 
      <strong>ISO 14064-1:2018 - Gases de efecto invernadero. Parte 1: Especificación con orientación, a nivel de las organizaciones, 
      para la cuantificación y el informe de las emisiones y remociones de gases de efecto invernadero</strong>.</p>
    </div>
    
    <div class="subsection-title">3.2 Límites Organizacionales</div>
    <p>Se aplicó el enfoque de <strong>control operacional</strong>, incluyendo todas las instalaciones y actividades sobre las cuales 
    ${(organizacion as any).nombre} ejerce control operacional completo.</p>
    
    <div class="subsection-title">3.3 Límites Operacionales</div>
    <p>El inventario cubre las siguientes categorías de emisiones:</p>
    <ul>
      <li><strong>Combustibles:</strong> Consumo de gasolina y diesel en vehículos y equipos</li>
      <li><strong>Energía Eléctrica:</strong> Consumo de electricidad en los cinco campus</li>
      <li><strong>Aires Acondicionados:</strong> Fugas de gases refrigerantes</li>
      <li><strong>Extintores:</strong> Descargas de agentes extintores</li>
      <li><strong>Residuos Sólidos:</strong> Disposición en relleno sanitario, compostaje, residuos peligrosos y reciclaje</li>
      <li><strong>Agua:</strong> Consumo de agua potable y disposición de aguas residuales</li>
    </ul>
    
    <div class="subsection-title">3.4 Periodo de Reporte</div>
    <p>El inventario corresponde al año calendario <strong>${anoSeleccionado.ano}</strong> 
    (1 de enero al 31 de diciembre de ${anoSeleccionado.ano}).</p>
    
    <div class="subsection-title">3.5 Gases de Efecto Invernadero Incluidos</div>
    <p>El inventario cuantifica las emisiones de los siguientes GEI, expresadas en equivalentes de dióxido de carbono (CO₂e):</p>
    <ul>
      <li>Dióxido de carbono (CO₂)</li>
      <li>Metano (CH₄)</li>
      <li>Óxido nitroso (N₂O)</li>
      <li>Hidrofluorocarbonos (HFC)</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- RESULTADOS POR CATEGORÍA -->
  <div class="section">
    <div class="section-title">4. RESULTADOS POR CATEGORÍA DE EMISIÓN</div>
    
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Alcance</th>
          <th class="number">Emisiones (kg CO₂e)</th>
          <th class="number">% del Total</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Combustibles</td>
          <td>1</td>
          <td class="number">${combustibles.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">${totalEmisiones > 0 ? ((combustibles / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
        <tr>
          <td>Energía Eléctrica</td>
          <td>2</td>
          <td class="number">${energia.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">${totalEmisiones > 0 ? ((energia / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
        <tr>
          <td>Aires Acondicionados</td>
          <td>1</td>
          <td class="number">${aires.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">${totalEmisiones > 0 ? ((aires / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
        <tr>
          <td>Extintores</td>
          <td>1</td>
          <td class="number">${extintores.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">${totalEmisiones > 0 ? ((extintores / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
        <tr>
          <td>Residuos Sólidos</td>
          <td>3</td>
          <td class="number">${residuos.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">${totalEmisiones > 0 ? ((residuos / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
        <tr>
          <td>Agua</td>
          <td>3</td>
          <td class="number">${agua.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">${totalEmisiones > 0 ? ((agua / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
        </tr>
        <tr style="background-color: #E8F5E9; font-weight: bold;">
          <td colspan="2">TOTAL</td>
          <td class="number">${totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">100.0%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- RESULTADOS POR CAMPUS -->
  <div class="section">
    <div class="section-title">5. DISTRIBUCIÓN DE EMISIONES POR CAMPUS</div>
    
    <table>
      <thead>
        <tr>
          <th>Campus</th>
          <th class="number">Emisiones (kg CO₂e)</th>
          <th class="number">% del Total</th>
        </tr>
      </thead>
      <tbody>
        ${datosCampus.map(campus => `
          <tr>
            <td>${campus.nombre}</td>
            <td class="number">${campus.total.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            <td class="number">${totalEmisiones > 0 ? ((campus.total / totalEmisiones) * 100).toFixed(1) : '0.0'}%</td>
          </tr>
        `).join('')}
        <tr style="background-color: #E8F5E9; font-weight: bold;">
          <td>TOTAL</td>
          <td class="number">${totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
          <td class="number">100.0%</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- FACTORES DE EMISIÓN -->
  <div class="section">
    <div class="section-title">6. FACTORES DE EMISIÓN UTILIZADOS</div>
    
    <p>Los factores de emisión aplicados en el cálculo del inventario se presentan a continuación:</p>
    
    <table>
      <thead>
        <tr>
          <th>Categoría</th>
          <th>Factor de Emisión</th>
          <th>Unidad</th>
        </tr>
      </thead>
      <tbody>
        ${factores ? Object.entries(factores)
          .filter(([key]) => key !== 'id' && key !== 'ano_inventario_id')
          .map(([key, value]) => {
            const labels: Record<string, string> = {
              'gasolina_kg_co2e_por_litro': 'Gasolina',
              'diesel_kg_co2e_por_litro': 'Diesel',
              'energia_kg_co2e_por_kwh': 'Energía Eléctrica',
              'r22_kg_co2e_por_kg': 'Refrigerante R-22',
              'r410a_kg_co2e_por_kg': 'Refrigerante R-410A',
              'r134a_kg_co2e_por_kg': 'Refrigerante R-134a',
              'co2_extintor_kg_co2e_por_kg': 'CO₂ (Extintor)',
              'pqs_extintor_kg_co2e_por_kg': 'PQS (Extintor)',
              'residuo_relleno_kg_co2e_por_kg': 'Residuo a Relleno',
              'residuo_compostado_kg_co2e_por_kg': 'Residuo Compostado',
              'residuo_peligroso_kg_co2e_por_kg': 'Residuo Peligroso',
              'residuo_reciclado_kg_co2e_por_kg': 'Residuo Reciclado',
              'agua_potable_kg_co2e_por_m3': 'Agua Potable',
              'agua_residual_kg_co2e_por_m3': 'Agua Residual',
            };
            const units: Record<string, string> = {
              'gasolina_kg_co2e_por_litro': 'kg CO₂e/litro',
              'diesel_kg_co2e_por_litro': 'kg CO₂e/litro',
              'energia_kg_co2e_por_kwh': 'kg CO₂e/kWh',
              'r22_kg_co2e_por_kg': 'kg CO₂e/kg',
              'r410a_kg_co2e_por_kg': 'kg CO₂e/kg',
              'r134a_kg_co2e_por_kg': 'kg CO₂e/kg',
              'co2_extintor_kg_co2e_por_kg': 'kg CO₂e/kg',
              'pqs_extintor_kg_co2e_por_kg': 'kg CO₂e/kg',
              'residuo_relleno_kg_co2e_por_kg': 'kg CO₂e/kg',
              'residuo_compostado_kg_co2e_por_kg': 'kg CO₂e/kg',
              'residuo_peligroso_kg_co2e_por_kg': 'kg CO₂e/kg',
              'residuo_reciclado_kg_co2e_por_kg': 'kg CO₂e/kg',
              'agua_potable_kg_co2e_por_m3': 'kg CO₂e/m³',
              'agua_residual_kg_co2e_por_m3': 'kg CO₂e/m³',
            };
            return `
              <tr>
                <td>${labels[key] || key}</td>
                <td class="number">${parseFloat(String(value as any)).toFixed(4)}</td>
                <td>${units[key] || '-'}</td>
              </tr>
            `;
          }).join('') : ''}
      </tbody>
    </table>
    
    <p style="margin-top: 20px; font-size: 12px; font-style: italic;">
      Nota: Los factores de emisión se basan en las directrices del IPCC y metodologías reconocidas internacionalmente.
    </p>
  </div>

  <!-- CONCLUSIONES -->
  <div class="section">
    <div class="section-title">7. CONCLUSIONES Y RECOMENDACIONES</div>
    
    <p>
      El inventario de gases de efecto invernadero para el año ${anoSeleccionado.ano} ha sido completado conforme a los 
      requisitos de la norma ISO 14064-1:2018, proporcionando una base sólida para la gestión de emisiones de 
      ${(organizacion as any).nombre}.
    </p>
    
    <p><strong>Principales hallazgos:</strong></p>
    <ul>
      <li>Las emisiones totales ascienden a ${totalEmisiones.toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</li>
      <li>El Alcance ${alcance1 >= alcance2 && alcance1 >= alcance3 ? '1' : alcance2 >= alcance3 ? '2' : '3'} representa la mayor contribución a las emisiones totales</li>
      <li>Se recomienda implementar estrategias de reducción enfocadas en las categorías de mayor impacto</li>
      <li>Es fundamental mantener la continuidad del inventario para evaluar tendencias y efectividad de medidas de mitigación</li>
    </ul>
  </div>

  <!-- PIE DE PÁGINA -->
  <div class="footer">
    <p><strong>${(organizacion as any).nombre}</strong></p>
    <p>Reporte de Huella de Carbono ${anoSeleccionado.ano} | ISO 14064-1:2018</p>
    <p>Generado el ${fechaActual}</p>
  </div>
</body>
</html>
    `;
  };

  const handleGeneratePDF = async () => {
    if (!resumen || !organizacion || !anoSeleccionado) {
      Alert.alert('Error', 'No hay datos disponibles para generar el reporte');
      return;
    }

    try {
      setGeneratingPDF(true);
      const html = generateHTMLReport();
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'web') {
        // En web, abrir en nueva pestaña
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.print();
        }
      } else {
        // En móvil, compartir el PDF
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: `Reporte Huella de Carbono ${anoSeleccionado.ano}`,
          });
        } else {
          Alert.alert('Éxito', `PDF generado en: ${uri}`);
        }
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      Alert.alert('Error', 'No se pudo generar el PDF');
    } finally {
      setGeneratingPDF(false);
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
            📊 Reportes
          </ThemedText>
          <ThemedText style={styles.noAuth}>
            Inicia sesión para generar reportes de huella de carbono
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
          📊 Reportes de Huella de Carbono
        </ThemedText>

        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.cardTitle}>
            Seleccionar Año de Inventario
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
        </ThemedView>

        {selectedAno && (
          <>
            {isLoading ? (
              <ThemedView style={styles.card}>
                <ActivityIndicator size="large" color="#2E7D32" />
                <ThemedText style={styles.loadingText}>Cargando datos...</ThemedText>
              </ThemedView>
            ) : resumen ? (
              <>
                <ThemedView style={styles.previewCard}>
                  <ThemedText type="subtitle" style={styles.cardTitle}>
                    Vista Previa del Reporte
                  </ThemedText>
                  
                  <View style={styles.previewItem}>
                    <ThemedText style={styles.previewLabel}>Organización:</ThemedText>
                    <ThemedText style={styles.previewValue}>{(organizacion as any)?.nombre}</ThemedText>
                  </View>
                  
                  <View style={styles.previewItem}>
                    <ThemedText style={styles.previewLabel}>Año:</ThemedText>
                    <ThemedText style={styles.previewValue}>{anoSeleccionado?.ano}</ThemedText>
                  </View>
                  
                  <View style={styles.previewItem}>
                    <ThemedText style={styles.previewLabel}>Total de Emisiones:</ThemedText>
                    <ThemedText style={styles.previewValue}>
                      {parseFloat(resumen.total_co2e || '0').toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e
                    </ThemedText>
                  </View>
                  
                  <View style={styles.previewItem}>
                    <ThemedText style={styles.previewLabel}>Norma:</ThemedText>
                    <ThemedText style={styles.previewValue}>ISO 14064-1:2018</ThemedText>
                  </View>
                  
                  <View style={styles.divider} />
                  
                  <ThemedText style={styles.sectionLabel}>Contenido del Reporte:</ThemedText>
                  <View style={styles.contentList}>
                    <ThemedText style={styles.contentItem}>✓ Resumen Ejecutivo</ThemedText>
                    <ThemedText style={styles.contentItem}>✓ Distribución por Alcances (1, 2, 3)</ThemedText>
                    <ThemedText style={styles.contentItem}>✓ Metodología ISO 14064-1:2018</ThemedText>
                    <ThemedText style={styles.contentItem}>✓ Resultados por Categoría</ThemedText>
                    <ThemedText style={styles.contentItem}>✓ Distribución por Campus</ThemedText>
                    <ThemedText style={styles.contentItem}>✓ Factores de Emisión</ThemedText>
                    <ThemedText style={styles.contentItem}>✓ Conclusiones y Recomendaciones</ThemedText>
                  </View>
                </ThemedView>

                <Pressable
                  style={[styles.generateButton, generatingPDF && styles.generateButtonDisabled]}
                  onPress={handleGeneratePDF}
                  disabled={generatingPDF}
                >
                  {generatingPDF ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <ThemedText style={styles.generateButtonText}>
                      📄 Generar Reporte PDF
                    </ThemedText>
                  )}
                </Pressable>
              </>
            ) : (
              <ThemedView style={styles.card}>
                <ThemedText style={styles.noData}>
                  No hay datos disponibles para este año de inventario
                </ThemedText>
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
  title: {
    marginBottom: 8,
  },
  noAuth: {
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
  loadingText: {
    textAlign: 'center',
    marginTop: 8,
    color: '#757575',
  },
  noData: {
    textAlign: 'center',
    fontStyle: 'italic',
    color: '#757575',
    fontSize: 14,
  },
  previewCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    gap: 12,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  previewValue: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#A5D6A7',
    marginVertical: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
    marginTop: 8,
    marginBottom: 4,
  },
  contentList: {
    gap: 6,
  },
  contentItem: {
    fontSize: 14,
    color: '#424242',
    paddingLeft: 8,
  },
  generateButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
});
