import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { trpc } from '@/lib/trpc';

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState(1);
  const [organizacionNombre, setOrganizacionNombre] = useState('');
  const [anoBase, setAnoBase] = useState(new Date().getFullYear().toString());

  const createOrganizacionMutation = trpc.carbon.createOrganizacion.useMutation();
  const createAnoInventarioMutation = trpc.carbon.createAnoInventario.useMutation();

  const totalSteps = 5;
  const isLoading = createOrganizacionMutation.isPending || createAnoInventarioMutation.isPending;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFinish = async () => {
    if (!organizacionNombre.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre de tu organización');
      return;
    }

    const anoBaseNum = parseInt(anoBase);
    if (isNaN(anoBaseNum) || anoBaseNum < 2000 || anoBaseNum > 2100) {
      Alert.alert('Error', 'Por favor ingresa un año válido entre 2000 y 2100');
      return;
    }

    try {
      const org = await createOrganizacionMutation.mutateAsync({
        nombre: organizacionNombre.trim(),
        ano_base: anoBaseNum,
      });

      await createAnoInventarioMutation.mutateAsync({
        organizacion_id: org.id,
        ano: anoBaseNum,
        duplicar_factores: false,
      });

      Alert.alert(
        '¡Bienvenido!',
        'Tu organización ha sido creada exitosamente.',
        [{ text: 'Comenzar', onPress: () => router.replace('/(tabs)') }]
      );
    } catch (error) {
      console.error('Error:', error);
      Alert.alert('Error', 'No se pudo crear la organización.');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>🌱</Text>
            <ThemedText type="title" style={styles.stepTitle}>
              Bienvenido a la Calculadora de Huella de Carbono
            </ThemedText>
            <ThemedText style={styles.stepDescription}>
              Esta aplicación te ayudará a medir, monitorear y reducir las emisiones de GEI de tu organización según ISO 14064-1:2018.
            </ThemedText>
            <View style={styles.featureList}>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📊</Text>
                <ThemedText style={styles.featureText}>
                  Registra consumos de energía, combustibles, agua y residuos
                </ThemedText>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📈</Text>
                <ThemedText style={styles.featureText}>
                  Visualiza emisiones por alcance y categoría
                </ThemedText>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>🎯</Text>
                <ThemedText style={styles.featureText}>
                  Define metas de reducción y monitorea progreso
                </ThemedText>
              </View>
              <View style={styles.featureItem}>
                <Text style={styles.featureIcon}>📄</Text>
                <ThemedText style={styles.featureText}>
                  Genera reportes para auditorías
                </ThemedText>
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>📚</Text>
            <ThemedText type="title" style={styles.stepTitle}>
              Alcances de Emisiones
            </ThemedText>
            <ThemedText style={styles.stepDescription}>
              Las emisiones de GEI se clasifican en tres alcances:
            </ThemedText>
            <View style={styles.alcanceList}>
              <View style={[styles.alcanceCard, { backgroundColor: '#E8F5E9' }]}>
                <View style={styles.alcanceHeader}>
                  <Text style={styles.alcanceNumber}>1</Text>
                  <ThemedText type="subtitle">Alcance 1</ThemedText>
                </View>
                <ThemedText style={styles.alcanceSubtitle}>Emisiones Directas</ThemedText>
                <ThemedText style={styles.alcanceDescription}>
                  De fuentes propias o controladas.
                </ThemedText>
                <ThemedText style={styles.alcanceExamples}>
                  Ej: Combustibles en vehículos, calderas. Fugas de refrigerantes.
                </ThemedText>
              </View>

              <View style={[styles.alcanceCard, { backgroundColor: '#E3F2FD' }]}>
                <View style={styles.alcanceHeader}>
                  <Text style={styles.alcanceNumber}>2</Text>
                  <ThemedText type="subtitle">Alcance 2</ThemedText>
                </View>
                <ThemedText style={styles.alcanceSubtitle}>Emisiones Indirectas por Energía</ThemedText>
                <ThemedText style={styles.alcanceDescription}>
                  Por generación de electricidad comprada.
                </ThemedText>
                <ThemedText style={styles.alcanceExamples}>
                  Ej: Consumo eléctrico para iluminación, equipos, AC.
                </ThemedText>
              </View>

              <View style={[styles.alcanceCard, { backgroundColor: '#FFF3E0' }]}>
                <View style={styles.alcanceHeader}>
                  <Text style={styles.alcanceNumber}>3</Text>
                  <ThemedText type="subtitle">Alcance 3</ThemedText>
                </View>
                <ThemedText style={styles.alcanceSubtitle}>Otras Emisiones Indirectas</ThemedText>
                <ThemedText style={styles.alcanceDescription}>
                  De la cadena de valor.
                </ThemedText>
                <ThemedText style={styles.alcanceExamples}>
                  Ej: Tratamiento de agua, gestión de residuos, transporte.
                </ThemedText>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>🏢</Text>
            <ThemedText type="title" style={styles.stepTitle}>
              Crea tu Organización
            </ThemedText>
            <ThemedText style={styles.stepDescription}>
              Ingresa el nombre de tu institución.
            </ThemedText>
            <View style={styles.formContainer}>
              <ThemedText style={styles.label}>Nombre de la Organización *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Ej: Universidad Nacional"
                value={organizacionNombre}
                onChangeText={setOrganizacionNombre}
                placeholderTextColor="#999"
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>📅</Text>
            <ThemedText type="title" style={styles.stepTitle}>
              Define tu Año Base
            </ThemedText>
            <ThemedText style={styles.stepDescription}>
              Punto de referencia para medir reducciones futuras.
            </ThemedText>
            <View style={styles.formContainer}>
              <ThemedText style={styles.label}>Año Base *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="2024"
                value={anoBase}
                onChangeText={setAnoBase}
                keyboardType="numeric"
                placeholderTextColor="#999"
              />
              <ThemedText style={styles.hint}>
                Recomendamos el año actual o anterior.
              </ThemedText>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.emoji}>✅</Text>
            <ThemedText type="title" style={styles.stepTitle}>
              ¡Todo Listo!
            </ThemedText>
            <View style={styles.summaryBox}>
              <ThemedText type="subtitle" style={styles.summaryTitle}>Resumen</ThemedText>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Organización:</ThemedText>
                <ThemedText style={styles.summaryValue}>
                  {organizacionNombre || '(Sin nombre)'}
                </ThemedText>
              </View>
              <View style={styles.summaryRow}>
                <ThemedText style={styles.summaryLabel}>Año Base:</ThemedText>
                <ThemedText style={styles.summaryValue}>{anoBase}</ThemedText>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
        </View>
        <ThemedText style={styles.progressText}>
          Paso {currentStep} de {totalSteps}
        </ThemedText>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {renderStep()}
      </ScrollView>

      <View style={styles.navigationContainer}>
        {currentStep > 1 && (
          <Pressable style={styles.backButton} onPress={handlePrevious}>
            <Text style={styles.backButtonText}>← Anterior</Text>
          </Pressable>
        )}
        <View style={{ flex: 1 }} />
        {currentStep < totalSteps ? (
          <Pressable style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Siguiente →</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.finishButton, isLoading && styles.finishButtonDisabled]}
            onPress={handleFinish}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.finishButtonText}>Finalizar</Text>
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  progressContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  progressBar: { height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2E7D32' },
  progressText: { marginTop: 8, fontSize: 12, color: '#757575', textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },
  stepContent: { alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 16 },
  stepTitle: { textAlign: 'center', marginBottom: 16 },
  stepDescription: { textAlign: 'center', fontSize: 16, lineHeight: 24, color: '#616161', marginBottom: 24 },
  featureList: { width: '100%', gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#F5F5F5', borderRadius: 8 },
  featureIcon: { fontSize: 24 },
  featureText: { flex: 1, fontSize: 14, lineHeight: 20 },
  alcanceList: { width: '100%', gap: 16 },
  alcanceCard: { padding: 16, borderRadius: 12 },
  alcanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  alcanceNumber: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
  alcanceSubtitle: { fontSize: 14, fontWeight: '600', color: '#424242', marginBottom: 8 },
  alcanceDescription: { fontSize: 14, lineHeight: 20, color: '#616161', marginBottom: 8 },
  alcanceExamples: { fontSize: 13, lineHeight: 18, color: '#757575', fontStyle: 'italic' },
  formContainer: { width: '100%', gap: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#424242' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#FAFAFA' },
  hint: { fontSize: 12, color: '#757575', lineHeight: 18 },
  summaryBox: { width: '100%', padding: 16, backgroundColor: '#F5F5F5', borderRadius: 12, marginBottom: 16 },
  summaryTitle: { marginBottom: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  summaryLabel: { fontSize: 14, color: '#757575' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#424242' },
  navigationContainer: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#E0E0E0', gap: 12 },
  backButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  backButtonText: { fontSize: 16, color: '#424242', fontWeight: '600' },
  nextButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#2E7D32' },
  nextButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  finishButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#2E7D32', minWidth: 120, alignItems: 'center' },
  finishButtonDisabled: { opacity: 0.6 },
  finishButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
});
