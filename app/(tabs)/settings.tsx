//import { View, Text, Pressable, ScrollView, Platform, Alert } from 'react-native';
import { Pressable, ScrollView, StyleSheet, View, Text, Platform, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "light"];
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  const getLoginUrl = () => {
    const serverUrl = process.env.EXPO_PUBLIC_OAUTH_SERVER_URL || 'http://localhost:3001';
    const baseUrl = `${serverUrl}/oauth/authorize`;
    const clientId = process.env.EXPO_PUBLIC_OAUTH_CLIENT_ID || 'jlgonzal';
    const redirectUri = Platform.OS === 'web'
      ? `${window.location.origin}/oauth/callback`
      : 'manusapp://oauth/callback';
    const state = Math.random().toString(36).substring(7);
    return `${baseUrl}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
  };

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true);
      const loginUrl = getLoginUrl();

      if (Platform.OS === 'web') {
        window.location.href = loginUrl;
        return;
      }

      const result = await WebBrowser.openAuthSessionAsync(loginUrl, undefined, {
        preferEphemeralSession: false,
        showInRecents: true,
      });

      if (result.type === 'success' && result.url) {
        try {
          let url: URL;
          if (result.url.startsWith('exp://') || result.url.startsWith('exps://')) {
            const urlStr = result.url.replace(/^exp(s)?:\/\//, 'http://');
            url = new URL(urlStr);
          } else {
            url = new URL(result.url);
          }

          const code = url.searchParams.get('code');
          const state = url.searchParams.get('state');
          const error = url.searchParams.get('error');

          if (error) {
            console.error('[Auth] OAuth error:', error);
            return;
          }

          if (code && state) {
            router.push({ pathname: '/oauth/callback' as any, params: { code, state } });
          }
        } catch (err) {
          console.error('[Auth] Failed to parse callback URL:', err);
          const codeMatch = result.url.match(/[?&]code=([^&]+)/);
          const stateMatch = result.url.match(/[?&]state=([^&]+)/);

          if (codeMatch && stateMatch) {
            const code = decodeURIComponent(codeMatch[1]);
            const state = decodeURIComponent(stateMatch[1]);
            router.push({ pathname: '/oauth/callback' as any, params: { code, state } });
          }
        }
      }
    } catch (error) {
      console.error('[Auth] Login error:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.backgroundSecondary }]}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }}
    >
      <ThemedView style={styles.header}>
        <ThemedText type="title">Configuración</ThemedText>
      </ThemedView>

      {!isAuthenticated && !loading && (
        <ThemedView style={[styles.card, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={{ marginBottom: 12, textAlign: 'center' }}>
            Bienvenido
          </ThemedText>
          <ThemedText style={{ color: colors.textSecondary, lineHeight: 22, textAlign: 'center', marginBottom: 20 }}>
            Inicia sesión para acceder a tu calculadora de huella de carbono y gestionar tus datos de emisiones.
          </ThemedText>
          <Pressable
            style={[styles.loginButton, { backgroundColor: colors.tint }]}
            onPress={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <ThemedText style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                Iniciar Sesión
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>
      )}

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
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => router.push('/metas-reduccion' as any)}
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

            <Pressable
              style={[styles.menuItem, { borderBottomWidth: 0 }]}
              onPress={() => navigateTo('/usuarios')}
            >
              <ThemedText style={styles.menuIcon}>👥</ThemedText>
              <View style={styles.menuContent}>
            <Pressable
              style={[styles.menuItem, { borderBottomColor: colors.border }]}
              onPress={() => navigateTo('/exportacion')}
            >
              <ThemedText style={styles.menuIcon}>📊</ThemedText>
              <View style={styles.menuContent}>
            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/importacion" as any)}
            >
              <Text style={styles.menuIcon}>📥</Text>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>Importar Datos</ThemedText>
              </View>
            </Pressable>

            <Pressable
              style={styles.menuItem}
              onPress={() => router.push("/reportes-ghg" as any)}
            >
              <Text style={styles.menuIcon}>📄</Text>
              <View style={styles.menuContent}>
                <ThemedText style={styles.menuTitle}>Reportes GHG Protocol</ThemedText>
              </View>
            </Pressable>

                <ThemedText style={styles.menuTitle}>Exportar Datos</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Exportar datos a Excel para auditorías
                </ThemedText>
              </View>
              <ThemedText style={{ color: colors.textSecondary, fontSize: 20 }}>›</ThemedText>
            </Pressable>
                <ThemedText style={styles.menuTitle}>Gestión de Usuarios</ThemedText>
                <ThemedText style={{ color: colors.textSecondary, fontSize: 13 }}>
                  Administrar usuarios y permisos
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
  loginButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
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
