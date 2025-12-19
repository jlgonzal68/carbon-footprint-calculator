import { ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

export default function ReportsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Reportes</ThemedText>
        <ThemedText style={{ marginTop: 4, opacity: 0.7 }}>
          Visualiza y exporta reportes de huella de carbono
        </ThemedText>
      </ThemedView>

      <ThemedView style={styles.content}>
        <ThemedText>Pantalla de reportes en desarrollo...</ThemedText>
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
