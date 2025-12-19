import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { trpc } from "@/lib/trpc";

export default function DashboardScreen() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<number | null>(null);

  // Queries
  const { data: organizaciones, isLoading: loadingOrgs } = trpc.carbon.getOrganizaciones.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: anosInventario, isLoading: loadingYears } = trpc.carbon.getAnosInventario.useQuery(
    { organizacion_id: selectedOrgId! },
    { enabled: !!selectedOrgId }
  );

  const { data: resumen, isLoading: loadingResumen } = trpc.carbon.getResumenHuellaCarbono.useQuery(
    { ano_inventario_id: selectedYearId! },
    { enabled: !!selectedYearId }
  );

  // Auto-select first organization and year
  useEffect(() => {
    if (organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 && !selectedOrgId) {
      setSelectedOrgId((organizaciones as any)[0].id);
    }
  }, [organizaciones, selectedOrgId]);

  useEffect(() => {
    if (anosInventario && (anosInventario as any[]).length > 0 && !selectedYearId) {
      setSelectedYearId((anosInventario as any)[0].id);
    }
  }, [anosInventario, selectedYearId]);

  if (authLoading) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.emptyState}>
          <IconSymbol name="leaf.fill" size={64} color={colors.tint} />
          <ThemedText type="title" style={styles.emptyTitle}>
            Calculadora de Huella de Carbono
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            Inicia sesión para comenzar a calcular la huella de carbono de tu institución educativa
          </ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={() => router.push("/modal")}
          >
            <ThemedText style={styles.buttonText}>Iniciar Sesión</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (loadingOrgs) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.tint} />
        <ThemedText style={{ marginTop: 16, color: colors.textSecondary }}>
          Cargando datos...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!organizaciones || !Array.isArray(organizaciones) || organizaciones.length === 0) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={styles.emptyState}>
          <IconSymbol name="building.2.fill" size={64} color={colors.tint} />
          <ThemedText type="title" style={styles.emptyTitle}>
            No hay organizaciones
          </ThemedText>
          <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
            Crea tu primera organización para comenzar a calcular la huella de carbono
          </ThemedText>
          <Pressable
            style={[styles.button, { backgroundColor: colors.tint }]}
            onPress={() => router.push("/(tabs)/settings")}
          >
            <ThemedText style={styles.buttonText}>Crear Organización</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Dashboard</ThemedText>
        <ThemedText style={{ color: colors.textSecondary, marginTop: 4 }}>
          Resumen de Huella de Carbono
        </ThemedText>
      </ThemedView>

      {/* Selector de Año */}
      {anosInventario && (anosInventario as any[]).length > 0 && (
        <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
            Año de Inventario
          </ThemedText>
          <View style={styles.yearSelector}>
            {(anosInventario as any[]).map((ano: any) => (
              <Pressable
                key={ano.id}
                style={[
                  styles.yearButton,
                  {
                    backgroundColor:
                      selectedYearId === ano.id ? colors.tint : colors.backgroundSecondary,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => setSelectedYearId(ano.id)}
              >
                <ThemedText
                  style={{
                    color: selectedYearId === ano.id ? "#FFFFFF" : colors.text,
                    fontWeight: selectedYearId === ano.id ? "600" : "400",
                  }}
                >
                  {ano.ano}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ThemedView>
      )}

      {/* Resumen de Emisiones */}
      {loadingResumen ? (
        <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
          <ActivityIndicator size="large" color={colors.tint} />
        </ThemedView>
      ) : resumen ? (
        <>
          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.totalCard}>
              <IconSymbol name="leaf.fill" size={48} color={colors.success} />
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText style={{ color: colors.textSecondary }}>Total CO₂e</ThemedText>
                <ThemedText type="title" style={{ color: colors.success }}>
                  {((resumen as any).total_co2e / 1000).toFixed(2)} t
                </ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Toneladas de CO₂ equivalente
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
              Emisiones por Alcance
            </ThemedText>

            <View style={styles.alcanceRow}>
              <View style={styles.alcanceItem}>
                <View style={[styles.alcanceBadge, { backgroundColor: colors.error + "20" }]}>
                  <IconSymbol name="flame.fill" size={24} color={colors.error} />
                </View>
                <ThemedText style={[styles.alcanceLabel, { color: colors.textSecondary }]}>
                  Alcance 1
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                  {((resumen as any).alcance_1 / 1000).toFixed(2)} t
                </ThemedText>
                <ThemedText style={[styles.alcanceDesc, { color: colors.textSecondary }]}>
                  Emisiones directas
                </ThemedText>
              </View>

              <View style={styles.alcanceItem}>
                <View style={[styles.alcanceBadge, { backgroundColor: colors.warning + "20" }]}>
                  <IconSymbol name="bolt.fill" size={24} color={colors.warning} />
                </View>
                <ThemedText style={[styles.alcanceLabel, { color: colors.textSecondary }]}>
                  Alcance 2
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                  {((resumen as any).alcance_2 / 1000).toFixed(2)} t
                </ThemedText>
                <ThemedText style={[styles.alcanceDesc, { color: colors.textSecondary }]}>
                  Energía eléctrica
                </ThemedText>
              </View>

              <View style={styles.alcanceItem}>
                <View style={[styles.alcanceBadge, { backgroundColor: colors.secondary + "20" }]}>
                  <IconSymbol name="drop.fill" size={24} color={colors.secondary} />
                </View>
                <ThemedText style={[styles.alcanceLabel, { color: colors.textSecondary }]}>
                  Alcance 3
                </ThemedText>
                <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>
                  {((resumen as any).alcance_3 / 1000).toFixed(2)} t
                </ThemedText>
                <ThemedText style={[styles.alcanceDesc, { color: colors.textSecondary }]}>
                  Otras emisiones
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          <Pressable
            style={[styles.button, { backgroundColor: colors.tint, marginHorizontal: 16 }]}
            onPress={() => router.push("/(tabs)/data")}
          >
            <ThemedText style={styles.buttonText}>Ingresar Datos</ThemedText>
          </Pressable>
        </>
      ) : (
        <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.emptyState}>
            <IconSymbol name="doc.text.fill" size={48} color={colors.textSecondary} />
            <ThemedText style={{ marginTop: 12, color: colors.textSecondary }}>
              No hay datos disponibles para este año
            </ThemedText>
          </View>
        </ThemedView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    marginTop: 16,
    textAlign: "center",
  },
  emptyText: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  button: {
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  yearSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  yearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
  },
  totalCard: {
    flexDirection: "row",
    alignItems: "center",
  },
  alcanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  alcanceItem: {
    flex: 1,
    alignItems: "center",
  },
  alcanceBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  alcanceLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  alcanceDesc: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
});
