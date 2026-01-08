import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/hooks/use-auth';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function ReportesGHGScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [anoSeleccionado, setAnoSeleccionado] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);
  const [incluirNotas, setIncluirNotas] = useState(true);
  const [incluirGraficos, setIncluirGraficos] = useState(true);

  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery(undefined, { enabled: !!user });
  const organizacion = organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 ? organizaciones[0] : null;

  const { data: anosInventario } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: (organizacion as any)?.id },
    { enabled: !!(organizacion as any)?.id }
  );

  const { data: datosReporte, isLoading: cargandoDatos } = trpc.carbon.getDatosReporteGHG.useQuery(
    { ano_inventario_id: anoSeleccionado! },
    { enabled: !!anoSeleccionado }
  );

  const generarReporteHTML = () => {
    if (!datosReporte) return '';

    const { ano_info, factores, resumen, alcance_1, alcance_2, alcance_3 } = datosReporte;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Reporte GHG Protocol - ${ano_info.organizacion_nombre}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 40px;
            color: #333;
            line-height: 1.6;
          }
          .portada {
            text-align: center;
            padding: 100px 0;
            page-break-after: always;
          }
          .portada h1 {
            font-size: 32px;
            color: #2E7D32;
            margin-bottom: 20px;
          }
          .portada h2 {
            font-size: 24px;
            color: #666;
            margin-bottom: 40px;
          }
          .portada .info {
            font-size: 18px;
            margin: 10px 0;
          }
          h1 {
            color: #2E7D32;
            border-bottom: 3px solid #2E7D32;
            padding-bottom: 10px;
            margin-top: 40px;
          }
          h2 {
            color: #1976D2;
            margin-top: 30px;
          }
          h3 {
            color: #F57C00;
            margin-top: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
          }
          th {
            background-color: #2E7D32;
            color: white;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .resumen-box {
            background-color: #E8F5E9;
            border-left: 4px solid #2E7D32;
            padding: 20px;
            margin: 20px 0;
          }
          .resumen-box h3 {
            margin-top: 0;
            color: #2E7D32;
          }
          .total {
            font-size: 24px;
            font-weight: bold;
            color: #2E7D32;
          }
          .metodologia {
            background-color: #F5F5F5;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 2px solid #ddd;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          .page-break {
            page-break-before: always;
          }
        </style>
      </head>
      <body>
        <!-- Portada -->
        <div class="portada">
          <h1>🌱 Inventario de Gases de Efecto Invernadero</h1>
          <h2>Reporte GHG Protocol</h2>
          <div class="info"><strong>Organización:</strong> ${ano_info.organizacion_nombre}</div>
          <div class="info"><strong>Año de Reporte:</strong> ${ano_info.ano}</div>
          <div class="info"><strong>Año Base:</strong> ${ano_info.ano_base ? 'Sí' : 'No'}</div>
          <div class="info"><strong>Fecha de Generación:</strong> ${new Date().toLocaleDateString('es-ES')}</div>
        </div>

        <!-- Resumen Ejecutivo -->
        <h1>1. Resumen Ejecutivo</h1>
        <div class="resumen-box">
          <h3>Emisiones Totales</h3>
          <div class="total">${(resumen.total_co2e || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</div>
          <p><strong>Alcance 1 (Emisiones Directas):</strong> ${(resumen.alcance_1_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</p>
          <p><strong>Alcance 2 (Energía Indirecta):</strong> ${(resumen.alcance_2_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</p>
          <p><strong>Alcance 3 (Otras Indirectas):</strong> ${(resumen.alcance_3_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</p>
        </div>

        <!-- Metodología -->
        <div class="page-break"></div>
        <h1>2. Metodología</h1>
        <div class="metodologia">
          <h3>Estándar Utilizado</h3>
          <p>Este inventario de gases de efecto invernadero ha sido elaborado siguiendo los lineamientos del <strong>GHG Protocol Corporate Accounting and Reporting Standard</strong>, desarrollado por el World Resources Institute (WRI) y el World Business Council for Sustainable Development (WBCSD).</p>
          
          <h3>Límites Organizacionales</h3>
          <p><strong>Enfoque:</strong> Control Operacional</p>
          <p><strong>Organización:</strong> ${ano_info.organizacion_nombre}</p>
          <p><strong>Sector:</strong> ${ano_info.sector || 'No especificado'}</p>
          
          <h3>Límites Operacionales</h3>
          <p>El inventario incluye las siguientes fuentes de emisión:</p>
          <ul>
            <li><strong>Alcance 1:</strong> Combustión estacionaria (combustibles), emisiones fugitivas (refrigerantes, extintores)</li>
            <li><strong>Alcance 2:</strong> Consumo de energía eléctrica</li>
            <li><strong>Alcance 3:</strong> Gestión de residuos, tratamiento de aguas residuales</li>
          </ul>
          
          <h3>Período de Reporte</h3>
          <p><strong>Año:</strong> ${ano_info.ano}</p>
          ${ano_info.fecha_inicio ? `<p><strong>Fecha Inicio:</strong> ${new Date(ano_info.fecha_inicio).toLocaleDateString('es-ES')}</p>` : ''}
          ${ano_info.fecha_fin ? `<p><strong>Fecha Fin:</strong> ${new Date(ano_info.fecha_fin).toLocaleDateString('es-ES')}</p>` : ''}
        </div>

        <!-- Factores de Emisión -->
        <div class="page-break"></div>
        <h1>3. Factores de Emisión Utilizados</h1>
        <table>
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Subcategoría</th>
              <th>Factor de Emisión</th>
              <th>Unidad</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Combustibles</td>
              <td>Gasolina</td>
              <td>${(factores.gasolina_kg_co2e_por_litro || 0).toFixed(4)}</td>
              <td>kg CO₂e/litro</td>
            </tr>
            <tr>
              <td>Combustibles</td>
              <td>Diesel</td>
              <td>${(factores.diesel_kg_co2e_por_litro || 0).toFixed(4)}</td>
              <td>kg CO₂e/litro</td>
            </tr>
            <tr>
              <td>Energía Eléctrica</td>
              <td>Red Nacional</td>
              <td>${(factores.energia_kg_co2e_por_kwh || 0).toFixed(4)}</td>
              <td>kg CO₂e/kWh</td>
            </tr>
            <tr>
              <td>Refrigerantes</td>
              <td>R-22</td>
              <td>${(factores.r22_kg_co2e_por_kg || 0).toFixed(0)}</td>
              <td>kg CO₂e/kg</td>
            </tr>
            <tr>
              <td>Refrigerantes</td>
              <td>R-410A</td>
              <td>${(factores.r410a_kg_co2e_por_kg || 0).toFixed(0)}</td>
              <td>kg CO₂e/kg</td>
            </tr>
            <tr>
              <td>Agua Potable</td>
              <td>Tratamiento</td>
              <td>${(factores.agua_potable_kg_co2e_por_m3 || 0).toFixed(4)}</td>
              <td>kg CO₂e/m³</td>
            </tr>
            <tr>
              <td>Agua Residual</td>
              <td>Tratamiento</td>
              <td>${(factores.agua_residual_kg_co2e_por_m3 || 0).toFixed(4)}</td>
              <td>kg CO₂e/m³</td>
            </tr>
          </tbody>
        </table>
        <p><em>Fuente: Factores de emisión basados en la Calculadora de Huella de Carbono ITM y factores de red eléctrica nacional.</em></p>

        <!-- Alcance 1 -->
        <div class="page-break"></div>
        <h1>4. Alcance 1: Emisiones Directas</h1>
        
        <h2>4.1 Combustión Estacionaria</h2>
        ${alcance_1.combustibles && alcance_1.combustibles.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tipo de Combustible</th>
              <th>Cantidad Total</th>
              <th>Factor Promedio</th>
              <th>Emisiones (kg CO₂e)</th>
            </tr>
          </thead>
          <tbody>
            ${alcance_1.combustibles.map((c: any) => `
            <tr>
              <td>${c.tipo_combustible}</td>
              <td>${(c.cantidad_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} litros</td>
              <td>${(c.factor_promedio || 0).toFixed(4)} kg CO₂e/litro</td>
              <td>${(c.emision_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p>No se registraron consumos de combustibles en este período.</p>'}

        <h2>4.2 Emisiones Fugitivas - Refrigerantes</h2>
        ${alcance_1.aires_acondicionados && alcance_1.aires_acondicionados.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tipo de Refrigerante</th>
              <th>Cantidad de Equipos</th>
              <th>Factor Promedio</th>
              <th>Emisiones (kg CO₂e)</th>
            </tr>
          </thead>
          <tbody>
            ${alcance_1.aires_acondicionados.map((a: any) => `
            <tr>
              <td>${a.tipo_refrigerante}</td>
              <td>${(a.cantidad_total || 0).toLocaleString('es-ES')}</td>
              <td>${(a.factor_promedio || 0).toFixed(0)} kg CO₂e/kg</td>
              <td>${(a.emision_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p>No se registraron equipos de aire acondicionado en este período.</p>'}

        <h2>4.3 Emisiones Fugitivas - Extintores</h2>
        ${alcance_1.extintores && alcance_1.extintores.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tipo de Extintor</th>
              <th>Cantidad</th>
              <th>Factor Promedio</th>
              <th>Emisiones (kg CO₂e)</th>
            </tr>
          </thead>
          <tbody>
            ${alcance_1.extintores.map((e: any) => `
            <tr>
              <td>${e.tipo}</td>
              <td>${(e.cantidad_total || 0).toLocaleString('es-ES')}</td>
              <td>${(e.factor_promedio || 0).toFixed(4)} kg CO₂e/kg</td>
              <td>${(e.emision_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p>No se registraron extintores en este período.</p>'}

        <!-- Alcance 2 -->
        <div class="page-break"></div>
        <h1>5. Alcance 2: Emisiones Indirectas por Energía</h1>
        
        <h2>5.1 Consumo de Energía Eléctrica</h2>
        ${alcance_2.energia && alcance_2.energia.cantidad_total_kwh ? `
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Consumo Total</td>
              <td>${(alcance_2.energia.cantidad_total_kwh || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kWh</td>
            </tr>
            <tr>
              <td>Factor de Emisión Promedio</td>
              <td>${(alcance_2.energia.factor_promedio || 0).toFixed(4)} kg CO₂e/kWh</td>
            </tr>
            <tr>
              <td><strong>Emisiones Totales</strong></td>
              <td><strong>${(alcance_2.energia.emision_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e</strong></td>
            </tr>
          </tbody>
        </table>
        ` : '<p>No se registraron consumos de energía eléctrica en este período.</p>'}

        <!-- Alcance 3 -->
        <div class="page-break"></div>
        <h1>6. Alcance 3: Otras Emisiones Indirectas</h1>
        
        <h2>6.1 Gestión de Residuos Sólidos</h2>
        ${alcance_3.residuos && alcance_3.residuos.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Tipo de Residuo</th>
              <th>Cantidad (kg)</th>
              <th>Factor Promedio</th>
              <th>Emisiones (kg CO₂e)</th>
            </tr>
          </thead>
          <tbody>
            ${alcance_3.residuos.map((r: any) => `
            <tr>
              <td>${r.tipo}</td>
              <td>${(r.cantidad_total_kg || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
              <td>${(r.factor_promedio || 0).toFixed(4)} kg CO₂e/kg</td>
              <td>${(r.emision_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : '<p>No se registraron residuos sólidos en este período.</p>'}

        <h2>6.2 Consumo y Tratamiento de Agua</h2>
        ${alcance_3.agua && (alcance_3.agua.agua_potable_total || alcance_3.agua.agua_residual_total) ? `
        <table>
          <thead>
            <tr>
              <th>Concepto</th>
              <th>Cantidad (m³)</th>
              <th>Factor</th>
              <th>Emisiones (kg CO₂e)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Agua Potable</td>
              <td>${(alcance_3.agua.agua_potable_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
              <td>${(alcance_3.agua.factor_potable || 0).toFixed(4)} kg CO₂e/m³</td>
              <td>${(alcance_3.agua.emision_potable || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            </tr>
            <tr>
              <td>Agua Residual</td>
              <td>${(alcance_3.agua.agua_residual_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
              <td>${(alcance_3.agua.factor_residual || 0).toFixed(4)} kg CO₂e/m³</td>
              <td>${(alcance_3.agua.emision_residual || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
            </tr>
          </tbody>
        </table>
        ` : '<p>No se registraron consumos de agua en este período.</p>'}

        <!-- Resumen Final -->
        <div class="page-break"></div>
        <h1>7. Resumen de Emisiones Totales</h1>
        <table>
          <thead>
            <tr>
              <th>Alcance</th>
              <th>Descripción</th>
              <th>Emisiones (kg CO₂e)</th>
              <th>Porcentaje</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Alcance 1</strong></td>
              <td>Emisiones Directas</td>
              <td>${(resumen.alcance_1_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
              <td>${resumen.total_co2e > 0 ? ((resumen.alcance_1_total / resumen.total_co2e) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><strong>Alcance 2</strong></td>
              <td>Emisiones Indirectas por Energía</td>
              <td>${(resumen.alcance_2_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
              <td>${resumen.total_co2e > 0 ? ((resumen.alcance_2_total / resumen.total_co2e) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr>
              <td><strong>Alcance 3</strong></td>
              <td>Otras Emisiones Indirectas</td>
              <td>${(resumen.alcance_3_total || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</td>
              <td>${resumen.total_co2e > 0 ? ((resumen.alcance_3_total / resumen.total_co2e) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr style="background-color: #E8F5E9; font-weight: bold;">
              <td colspan="2"><strong>TOTAL</strong></td>
              <td><strong>${(resumen.total_co2e || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })}</strong></td>
              <td><strong>100%</strong></td>
            </tr>
          </tbody>
        </table>

        <!-- Declaración de Conformidad -->
        <div class="page-break"></div>
        <h1>8. Declaración de Conformidad</h1>
        <div class="metodologia">
          <p>Este inventario de gases de efecto invernadero ha sido preparado de conformidad con el <strong>GHG Protocol Corporate Accounting and Reporting Standard</strong>.</p>
          
          <p><strong>Año Base:</strong> ${ano_info.ano_base ? `${ano_info.ano} (Año Base Establecido)` : 'Por definir'}</p>
          
          <p><strong>Límites Organizacionales:</strong> Se ha utilizado el enfoque de control operacional para definir los límites organizacionales del inventario.</p>
          
          <p><strong>Calidad de Datos:</strong> Los datos de actividad han sido obtenidos de registros internos de la organización. Los factores de emisión utilizados provienen de fuentes reconocidas como la Calculadora de Huella de Carbono del ITM y factores de red eléctrica nacional.</p>
          
          <p><strong>Exclusiones:</strong> Se han excluido del inventario las emisiones de fuentes no significativas que representan menos del 1% de las emisiones totales.</p>
        </div>

        <!-- Pie de Página -->
        <div class="footer">
          <p>Reporte generado el ${new Date().toLocaleDateString('es-ES')} a las ${new Date().toLocaleTimeString('es-ES')}</p>
          <p>Sistema de Gestión de Huella de Carbono | Versión 1.0</p>
        </div>
      </body>
      </html>
    `;
  };

  const generarReporte = async () => {
    if (!anoSeleccionado || !datosReporte) {
      Alert.alert('Error', 'Selecciona un año de inventario primero');
      return;
    }

    try {
      setGenerando(true);
      const html = generarReporteHTML();
      
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'web') {
        // En web, descargar directamente
        const link = document.createElement('a');
        link.href = uri;
        link.download = `Reporte_GHG_${datosReporte.ano_info.ano}_${datosReporte.ano_info.organizacion_nombre}.pdf`;
        link.click();
        Alert.alert('Éxito', 'Reporte generado y descargado exitosamente');
      } else {
        // En móvil, compartir
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          Alert.alert('Éxito', `Reporte generado en: ${uri}`);
        }
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      Alert.alert('Error', 'No se pudo generar el reporte');
    } finally {
      setGenerando(false);
    }
  };

  if (!user || !organizacion) {
    return (
      <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
        <ThemedView style={styles.content}>
          <ThemedText type="title">Reportes GHG Protocol</ThemedText>
          <ThemedText style={styles.noAuth}>
            Debes iniciar sesión y tener una organización configurada
          </ThemedText>
        </ThemedView>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]}>
      <ThemedView style={styles.content}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Volver</Text>
        </Pressable>

        <ThemedText type="title" style={styles.title}>
          📄 Reportes GHG Protocol
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Genera reportes formales compatibles con el estándar GHG Protocol
        </ThemedText>

        {/* Selector de Año */}
        <ThemedView style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            1. Selecciona el Año de Inventario
          </ThemedText>
          {anosInventario && Array.isArray(anosInventario) && anosInventario.length > 0 ? (
            <View style={styles.anosContainer}>
              {anosInventario.map((ano: any) => (
                <Pressable
                  key={ano.id}
                  style={[
                    styles.anoButton,
                    anoSeleccionado === ano.id && styles.anoButtonSelected,
                  ]}
                  onPress={() => setAnoSeleccionado(ano.id)}
                >
                  <Text
                    style={[
                      styles.anoText,
                      anoSeleccionado === ano.id && styles.anoTextSelected,
                    ]}
                  >
                    {ano.ano} {ano.ano_base ? '(Base)' : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.noData}>No hay años de inventario disponibles</ThemedText>
          )}
        </ThemedView>

        {/* Vista Previa */}
        {anoSeleccionado && (
          <ThemedView style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              2. Vista Previa del Reporte
            </ThemedText>
            {cargandoDatos ? (
              <ActivityIndicator size="large" color="#2E7D32" />
            ) : datosReporte ? (
              <View style={styles.preview}>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Organización:</Text>
                  <Text style={styles.previewValue}>{datosReporte.ano_info.organizacion_nombre}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Año:</Text>
                  <Text style={styles.previewValue}>{datosReporte.ano_info.ano}</Text>
                </View>
                <View style={styles.previewItem}>
                  <Text style={styles.previewLabel}>Emisiones Totales:</Text>
                  <Text style={styles.previewValue}>
                    {(datosReporte.resumen.total_co2e || 0).toLocaleString('es-ES', { maximumFractionDigits: 2 })} kg CO₂e
                  </Text>
                </View>
                <View style={styles.previewSections}>
                  <Text style={styles.previewSectionsTitle}>Secciones incluidas:</Text>
                  <Text style={styles.previewSection}>✓ Portada y datos de organización</Text>
                  <Text style={styles.previewSection}>✓ Resumen ejecutivo</Text>
                  <Text style={styles.previewSection}>✓ Metodología GHG Protocol</Text>
                  <Text style={styles.previewSection}>✓ Factores de emisión</Text>
                  <Text style={styles.previewSection}>✓ Desglose por alcances (1, 2, 3)</Text>
                  <Text style={styles.previewSection}>✓ Tablas resumen</Text>
                  <Text style={styles.previewSection}>✓ Declaración de conformidad</Text>
                </View>
              </View>
            ) : null}
          </ThemedView>
        )}

        {/* Botón de Generación */}
        {anoSeleccionado && datosReporte && (
          <Pressable
            style={[styles.generateButton, generando && styles.generateButtonDisabled]}
            onPress={generarReporte}
            disabled={generando}
          >
            {generando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.generateButtonText}>📥 Generar Reporte PDF</Text>
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
    padding: 20,
  },
  backButton: {
    marginBottom: 16,
  },
  backText: {
    fontSize: 16,
    color: '#2E7D32',
    fontWeight: '600',
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 12,
    color: '#2E7D32',
  },
  anosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  anoButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  anoButtonSelected: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  anoText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  anoTextSelected: {
    color: '#fff',
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
  },
  noAuth: {
    textAlign: 'center',
    color: '#999',
    padding: 20,
    fontSize: 16,
  },
  preview: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
  },
  previewItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 140,
  },
  previewValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  previewSections: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  previewSectionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  previewSection: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  generateButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  generateButtonDisabled: {
    opacity: 0.6,
  },
  generateButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
