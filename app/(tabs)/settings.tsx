import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from 'expo-router';

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Configuración</ThemedText>
      </ThemedView>

      {isAuthenticated && user && (
        <>
          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <View style={styles.userInfo}>
              <View style={[styles.avatar, { backgroundColor: colors.tint }]}>
                <ThemedText style={{ color: "#FFFFFF", fontSize: 24, fontWeight: "600" }}>
                  {(user.name || user.email || "U").charAt(0).toUpperCase()}
                </ThemedText>
              </View>
              <View style={{ flex: 1, marginLeft: 16 }}>
                <ThemedText type="subtitle">{user.name || "Usuario"}</ThemedText>
                {user.email && (
                  <ThemedText style={{ color: colors.textSecondary, marginTop: 4 }}>
                    {user.email}
                  </ThemedText>
                )}
              </View>
            </View>

            <Pressable
              style={[styles.logoutButton, { backgroundColor: colors.error + "20" }]}
              onPress={logout}
            >
              <IconSymbol name="paperplane.fill" size={20} color={colors.error} />
              <ThemedText style={{ color: colors.error, marginLeft: 8, fontWeight: "600" }}>
                Cerrar Sesión
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
            <ThemedText type="subtitle" style={{ marginBottom: 12 }}>
              Gestión
            </ThemedText>
            
            <Pressable
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/organizacion')}
            >
              <ThemedText style={styles.menuIcon}>🏢</ThemedText>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>Organizaciones</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Gestionar información de la organización
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 20 }}>›</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/anos-inventario')}
            >
              <ThemedText style={styles.menuIcon}>📅</ThemedText>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>Años de Inventario</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Crear y gestionar años de inventario
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 20 }}>›</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/factores-emision')}
            >
              <ThemedText style={styles.menuIcon}>🔬</ThemedText>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>Factores de Emisión</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Actualizar factores según regulaciones
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 20 }}>›</ThemedText>
            </Pressable>

            <Pressable
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => navigateTo('/metas')}
            >
              <ThemedText style={styles.menuIcon}>🎯</ThemedText>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>Metas de Reducción</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Definir y monitorear metas de reducción
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 20 }}>›</ThemedText>
            </Pressable>
          </ThemedView>
        </>
      )}

      <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
        <ThemedText type="subtitle" style={{ marginBottom: 16 }}>
          Acerca de
        </ThemedText>
        <ThemedText style={{ color: colors.textSecondary, lineHeight: 24 }}>
          Calculadora de Huella de Carbono para instituciones educativas, basada en la norma ISO
          14064-1:2018.
        </ThemedText>
        <ThemedText style={{ color: colors.textSecondary, marginTop: 12, lineHeight: 24 }}>
          Versión 1.0.0
        </ThemedText>
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
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuIcon: {
    fontSize: 24,
  },
  menuContent: {
    flex: 1,
    gap: 4,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
});
