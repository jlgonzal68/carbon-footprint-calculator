import { ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemedText } from './themed-text';
import { Permission, usePermissions } from '@/hooks/use-permissions';

interface ProtectedActionProps {
  children: ReactNode;
  permission: Permission | Permission[];
  organizacionId?: number;
  requireAll?: boolean; // Si es true, requiere todos los permisos; si es false, requiere al menos uno
  fallback?: ReactNode; // Componente a mostrar si no tiene permiso
  showMessage?: boolean; // Mostrar mensaje de "No tiene permisos"
  hide?: boolean; // Si es true, oculta completamente; si es false, muestra deshabilitado
}

export function ProtectedAction({
  children,
  permission,
  organizacionId,
  requireAll = false,
  fallback,
  showMessage = false,
  hide = false,
}: ProtectedActionProps) {
  const permissions = usePermissions(organizacionId);

  if (permissions.loading) {
    return null;
  }

  const hasAccess = Array.isArray(permission)
    ? requireAll
      ? permissions.hasAllPermissions(permission)
      : permissions.hasAnyPermission(permission)
    : permissions.hasPermission(permission);

  if (!hasAccess) {
    if (hide) {
      return null;
    }

    if (fallback) {
      return <>{fallback}</>;
    }

    if (showMessage) {
      return (
        <View style={styles.noPermissionContainer}>
          <Text style={styles.lockIcon}>🔒</Text>
          <ThemedText style={styles.noPermissionText}>
            No tiene permisos para realizar esta acción
          </ThemedText>
          <ThemedText style={styles.roleHint}>
            Rol actual: {permissions.rol?.nombre || 'Sin rol asignado'}
          </ThemedText>
        </View>
      );
    }

    return null;
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  noPermissionContainer: {
    padding: 24,
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    margin: 16,
  },
  lockIcon: {
    fontSize: 48,
  },
  noPermissionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
    textAlign: 'center',
  },
  roleHint: {
    fontSize: 14,
    color: '#F57C00',
    textAlign: 'center',
    fontStyle: 'italic',
    textTransform: 'capitalize',
  },
});
