import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function DataScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Ingreso de Datos</ThemedText>
        <ThemedText style={{ marginTop: 4, opacity: 0.7 }}>
          Registra los consumos y emisiones de tu institución
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText>Pantalla de ingreso de datos en desarrollo...</ThemedText>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  content: {
    padding: 16,
  },
});
