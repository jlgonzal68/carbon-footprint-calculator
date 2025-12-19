import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';
import { trpc } from '@/lib/trpc';

export type Permission = 
  | 'ver_datos'
  | 'ingresar_datos'
  | 'editar_datos'
  | 'eliminar_datos'
  | 'gestionar_factores'
  | 'gestionar_metas'
  | 'gestionar_organizacion'
  | 'gestionar_usuarios'
  | 'generar_reportes';

export interface UserRole {
  id: number;
  nombre: string;
  descripcion: string;
  permisos: Record<Permission, boolean>;
}

export function usePermissions(organizacionId?: number) {
  const { user, isAuthenticated } = useAuth();
  const [rol, setRol] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: rolData } = trpc.carbon.getRolUsuario.useQuery(
    { 
      user_id: user?.openId || '', 
      organizacion_id: organizacionId || 0 
    },
    { 
      enabled: !!user?.openId && !!organizacionId && isAuthenticated 
    }
  );

  useEffect(() => {
    if (rolData) {
      const rolInfo = rolData as any;
      setRol({
        id: rolInfo.rol_id,
        nombre: rolInfo.rol_nombre,
        descripcion: rolInfo.rol_descripcion,
        permisos: typeof rolInfo.rol_permisos === 'string' 
          ? JSON.parse(rolInfo.rol_permisos)
          : rolInfo.rol_permisos,
      });
      setLoading(false);
    } else if (!organizacionId || !isAuthenticated) {
      setLoading(false);
    }
  }, [rolData, organizacionId, isAuthenticated]);

  const hasPermission = (permission: Permission): boolean => {
    if (!rol) return false;
    return rol.permisos[permission] === true;
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  const isAdmin = (): boolean => {
    return rol?.nombre === 'administrador';
  };

  const isEditor = (): boolean => {
    return rol?.nombre === 'editor';
  };

  const isViewer = (): boolean => {
    return rol?.nombre === 'visualizador';
  };

  const canCreate = (): boolean => {
    return hasPermission('ingresar_datos');
  };

  const canEdit = (): boolean => {
    return hasPermission('editar_datos');
  };

  const canDelete = (): boolean => {
    return hasPermission('eliminar_datos');
  };

  const canManageFactors = (): boolean => {
    return hasPermission('gestionar_factores');
  };

  const canManageGoals = (): boolean => {
    return hasPermission('gestionar_metas');
  };

  const canManageOrganization = (): boolean => {
    return hasPermission('gestionar_organizacion');
  };

  const canManageUsers = (): boolean => {
    return hasPermission('gestionar_usuarios');
  };

  const canGenerateReports = (): boolean => {
    return hasPermission('generar_reportes');
  };

  return {
    rol,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isEditor,
    isViewer,
    canCreate,
    canEdit,
    canDelete,
    canManageFactors,
    canManageGoals,
    canManageOrganization,
    canManageUsers,
    canGenerateReports,
  };
}
