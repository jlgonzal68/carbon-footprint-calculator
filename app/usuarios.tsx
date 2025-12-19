import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { trpc } from '@/lib/trpc';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ConfirmModal } from '@/components/confirm-modal';

export default function UsuariosScreen() {
  const router = useRouter();
  const [organizacionId, setOrganizacionId] = useState<number | null>(null);
  const [nuevoUserId, setNuevoUserId] = useState('');
  const [rolSeleccionado, setRolSeleccionado] = useState<number | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<any>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<any>(null);

  // Obtener primera organización del usuario
  const { data: organizaciones } = trpc.carbon.getOrganizaciones.useQuery();
  const { data: roles } = trpc.carbon.getRoles.useQuery();
  const { data: usuarios, refetch: refetchUsuarios } = trpc.carbon.getUsuariosOrganizacion.useQuery(
    { organizacion_id: organizacionId! },
    { enabled: !!organizacionId }
  );

  const asignarMutation = trpc.carbon.asignarRolUsuario.useMutation({
    onSuccess: () => {
      setNuevoUserId('');
      setRolSeleccionado(null);
      refetchUsuarios();
      Alert.alert('Éxito', 'Usuario agregado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const cambiarRolMutation = trpc.carbon.cambiarRolUsuario.useMutation({
    onSuccess: () => {
      setUsuarioEditando(null);
      refetchUsuarios();
      Alert.alert('Éxito', 'Rol actualizado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
    },
  });

  const eliminarMutation = trpc.carbon.eliminarUsuarioOrganizacion.useMutation({
    onSuccess: () => {
      setShowDeleteModal(false);
      setUsuarioAEliminar(null);
      refetchUsuarios();
      Alert.alert('Éxito', 'Usuario eliminado correctamente');
    },
    onError: (error) => {
      Alert.alert('Error', error.message);
      setShowDeleteModal(false);
    },
  });

  useEffect(() => {
    if (organizaciones && Array.isArray(organizaciones) && organizaciones.length > 0 && !organizacionId) {
      setOrganizacionId((organizaciones as any[])[0].id);
    }
  }, [organizaciones, organizacionId]);

  const handleAgregar = () => {
    if (!nuevoUserId.trim()) {
      Alert.alert('Error', 'Por favor ingrese un ID de usuario');
      return;
    }
    if (!rolSeleccionado) {
      Alert.alert('Error', 'Por favor seleccione un rol');
      return;
    }
    if (!organizacionId) {
      Alert.alert('Error', 'No hay organización seleccionada');
      return;
    }

    asignarMutation.mutate({
      user_id: nuevoUserId.trim(),
      organizacion_id: organizacionId,
      rol_id: rolSeleccionado,
    });
  };

  const handleCambiarRol = (usuario: any, nuevoRolId: number) => {
    cambiarRolMutation.mutate({
      id: usuario.id,
      rol_id: nuevoRolId,
    });
  };

  const handleEliminar = (usuario: any) => {
    setUsuarioAEliminar(usuario);
    setShowDeleteModal(true);
  };

  const confirmarEliminar = () => {
    if (usuarioAEliminar) {
      eliminarMutation.mutate({ id: usuarioAEliminar.id });
    }
  };

  const getRolColor = (rolNombre: string) => {
    switch (rolNombre) {
      case 'administrador':
        return '#D32F2F';
      case 'editor':
        return '#1976D2';
      case 'visualizador':
        return '#388E3C';
      default:
        return '#757575';
    }
  };

  const getRolIcon = (rolNombre: string) => {
    switch (rolNombre) {
      case 'administrador':
        return '👑';
      case 'editor':
        return '✏️';
      case 'visualizador':
        return '👁️';
      default:
        return '👤';
    }
  };

  if (!organizacionId) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#2E7D32" />
        <ThemedText style={{ marginTop: 16 }}>Cargando...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </Pressable>
          <ThemedText type="title" style={styles.title}>
            👥 Gestión de Usuarios
          </ThemedText>
        </View>

        {/* Formulario de Agregar Usuario */}
        <View style={styles.formCard}>
          <ThemedText type="subtitle" style={styles.formTitle}>
            Agregar Nuevo Usuario
          </ThemedText>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>ID de Usuario</ThemedText>
            <TextInput
              style={styles.input}
              value={nuevoUserId}
              onChangeText={setNuevoUserId}
              placeholder="Ingrese el ID del usuario"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText style={styles.label}>Rol</ThemedText>
            <View style={styles.rolesGrid}>
              {roles && (roles as any[]).map((rol) => (
                <Pressable
                  key={rol.id}
                  style={[
                    styles.rolChip,
                    rolSeleccionado === rol.id && styles.rolChipSelected,
                    { borderColor: getRolColor(rol.nombre) },
                  ]}
                  onPress={() => setRolSeleccionado(rol.id)}
                >
                  <Text style={styles.rolIcon}>{getRolIcon(rol.nombre)}</Text>
                  <Text
                    style={[
                      styles.rolNombre,
                      rolSeleccionado === rol.id && styles.rolNombreSelected,
                    ]}
                  >
                    {rol.nombre}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable
            style={[styles.agregarButton, asignarMutation.isPending && styles.buttonDisabled]}
            onPress={handleAgregar}
            disabled={asignarMutation.isPending}
          >
            {asignarMutation.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.agregarButtonText}>Agregar Usuario</Text>
            )}
          </Pressable>
        </View>

        {/* Lista de Usuarios */}
        <View style={styles.usuariosCard}>
          <ThemedText type="subtitle" style={styles.usuariosTitle}>
            Usuarios de la Organización
          </ThemedText>

          {usuarios && (usuarios as any[]).length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <ThemedText style={styles.emptyText}>
                No hay usuarios asignados a esta organización
              </ThemedText>
            </View>
          ) : (
            <View style={styles.usuariosList}>
              {usuarios && (usuarios as any[]).map((usuario) => (
                <View key={usuario.id} style={styles.usuarioCard}>
                  <View style={styles.usuarioInfo}>
                    <View style={styles.usuarioHeader}>
                      <Text style={styles.usuarioIcon}>
                        {getRolIcon(usuario.rol_nombre)}
                      </Text>
                      <View style={styles.usuarioTexto}>
                        <ThemedText type="defaultSemiBold" style={styles.usuarioId}>
                          {usuario.user_id}
                        </ThemedText>
                        <View
                          style={[
                            styles.rolBadge,
                            { backgroundColor: getRolColor(usuario.rol_nombre) },
                          ]}
                        >
                          <Text style={styles.rolBadgeText}>{usuario.rol_nombre}</Text>
                        </View>
                      </View>
                    </View>

                    {usuarioEditando?.id === usuario.id ? (
                      <View style={styles.editarRolContainer}>
                        <ThemedText style={styles.editarLabel}>Cambiar rol:</ThemedText>
                        <View style={styles.rolesGridSmall}>
                          {roles && (roles as any[]).map((rol) => (
                            <Pressable
                              key={rol.id}
                              style={[
                                styles.rolChipSmall,
                                { borderColor: getRolColor(rol.nombre) },
                              ]}
                              onPress={() => {
                                handleCambiarRol(usuario, rol.id);
                              }}
                            >
                              <Text style={styles.rolNombreSmall}>{rol.nombre}</Text>
                            </Pressable>
                          ))}
                        </View>
                        <Pressable
                          style={styles.cancelarButton}
                          onPress={() => setUsuarioEditando(null)}
                        >
                          <Text style={styles.cancelarButtonText}>Cancelar</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.usuarioAcciones}>
                        <Pressable
                          style={styles.editarButton}
                          onPress={() => setUsuarioEditando(usuario)}
                        >
                          <Text style={styles.editarButtonText}>✏️ Cambiar Rol</Text>
                        </Pressable>
                        <Pressable
                          style={styles.eliminarButton}
                          onPress={() => handleEliminar(usuario)}
                        >
                          <Text style={styles.eliminarButtonText}>🗑️</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Información de Roles */}
        <View style={styles.infoCard}>
          <ThemedText type="subtitle" style={styles.infoTitle}>
            ℹ️ Información de Roles
          </ThemedText>
          {roles && (roles as any[]).map((rol) => {
            const permisos = typeof rol.permisos === 'string' 
              ? JSON.parse(rol.permisos) 
              : rol.permisos;
            
            return (
              <View key={rol.id} style={styles.rolInfo}>
                <View style={styles.rolInfoHeader}>
                  <Text style={styles.rolInfoIcon}>{getRolIcon(rol.nombre)}</Text>
                  <ThemedText type="defaultSemiBold" style={styles.rolInfoNombre}>
                    {rol.nombre}
                  </ThemedText>
                </View>
                <ThemedText style={styles.rolInfoDescripcion}>
                  {rol.descripcion}
                </ThemedText>
                <View style={styles.permisosContainer}>
                  <ThemedText style={styles.permisosLabel}>Permisos:</ThemedText>
                  <View style={styles.permisosList}>
                    {Object.entries(permisos).filter(([_, valor]) => valor).map(([permiso]) => (
                      <View key={permiso} style={styles.permisoChip}>
                        <Text style={styles.permisoText}>
                          {permiso.replace(/_/g, ' ')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <ConfirmModal
        visible={showDeleteModal}
        title="Eliminar Usuario"
        message={`¿Está seguro que desea eliminar al usuario ${usuarioAEliminar?.user_id} de esta organización?`}
        onConfirm={confirmarEliminar}
        onCancel={() => {
          setShowDeleteModal(false);
          setUsuarioAEliminar(null);
        }}
        confirmText="Eliminar"
        cancelText="Cancelar"
        danger
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  header: {
    gap: 12,
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#2E7D32',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: '#2E7D32',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    color: '#212121',
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FAFAFA',
  },
  rolesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  rolChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  rolChipSelected: {
    backgroundColor: '#E8F5E9',
  },
  rolIcon: {
    fontSize: 20,
  },
  rolNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    textTransform: 'capitalize',
  },
  rolNombreSelected: {
    color: '#2E7D32',
  },
  agregarButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  agregarButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  usuariosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usuariosTitle: {
    color: '#212121',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  usuariosList: {
    gap: 12,
  },
  usuarioCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
  },
  usuarioInfo: {
    gap: 12,
  },
  usuarioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  usuarioIcon: {
    fontSize: 32,
  },
  usuarioTexto: {
    flex: 1,
    gap: 6,
  },
  usuarioId: {
    fontSize: 16,
    color: '#212121',
  },
  rolBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  rolBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  usuarioAcciones: {
    flexDirection: 'row',
    gap: 8,
  },
  editarButton: {
    flex: 1,
    backgroundColor: '#1976D2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  editarButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  eliminarButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eliminarButtonText: {
    fontSize: 18,
  },
  editarRolContainer: {
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  editarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  rolesGridSmall: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  rolChipSmall: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: '#FFFFFF',
  },
  rolNombreSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#424242',
    textTransform: 'capitalize',
  },
  cancelarButton: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  cancelarButtonText: {
    color: '#757575',
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  infoTitle: {
    color: '#1565C0',
  },
  rolInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  rolInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rolInfoIcon: {
    fontSize: 24,
  },
  rolInfoNombre: {
    fontSize: 16,
    color: '#212121',
    textTransform: 'capitalize',
  },
  rolInfoDescripcion: {
    fontSize: 14,
    color: '#616161',
    fontStyle: 'italic',
  },
  permisosContainer: {
    gap: 8,
  },
  permisosLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
  },
  permisosList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permisoChip: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  permisoText: {
    fontSize: 11,
    color: '#2E7D32',
    textTransform: 'capitalize',
  },
});
