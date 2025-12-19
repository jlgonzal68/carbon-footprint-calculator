// Tipos para la aplicación de Huella de Carbono

export interface Organizacion {
  id: number;
  nombre: string;
  ano_base: number;
  fecha_creacion: string;
  usuario_id: string;
}

export interface Campus {
  id: number;
  organizacion_id: number;
  nombre: string;
  ubicacion?: string;
}

export type EstadoInventario = 'borrador' | 'completado' | 'reportado';

export interface AnoInventario {
  id: number;
  organizacion_id: number;
  ano: number;
  estado: EstadoInventario;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export type CategoriaEmision = 
  | 'combustible' 
  | 'energia' 
  | 'aire_acond' 
  | 'extintor' 
  | 'agua_potable' 
  | 'agua_residual' 
  | 'residuo_relleno' 
  | 'residuo_compostado' 
  | 'residuo_peligroso' 
  | 'residuo_reciclado';

export interface FactorEmision {
  id: number;
  ano_inventario_id: number;
  categoria: CategoriaEmision;
  tipo?: string;
  factor_emision: number;
  unidad: string;
  fuente?: string;
  fecha_actualizacion: string;
}

export type TipoCombustible = 'gasolina' | 'diesel';

export interface ConsumoCombustible {
  id: number;
  ano_inventario_id: number;
  tipo: TipoCombustible;
  cantidad: number;
  unidad: string;
  factor_emision: number;
  emision_co2e: number;
  fecha_registro: string;
}

export interface ConsumoEnergia {
  id: number;
  ano_inventario_id: number;
  campus_id: number;
  cantidad_kwh: number;
  factor_emision: number;
  emision_co2e: number;
  fecha_registro: string;
}

export type TipoEquipoAire = 'MiniSplit' | 'Cassete' | 'Pisotecho';

export interface InventarioAireAcond {
  id: number;
  ano_inventario_id: number;
  campus_id: number;
  tipo_equipo: TipoEquipoAire;
  capacidad_btu: number;
  capacidad_kg: number;
  cantidad: number;
  gas_refrigerante: string;
  gwp: number;
  k_instalacion: number;
  x_operacion: number;
  emision_instalacion: number;
  emision_operacion: number;
  emision_total_co2e: number;
  fecha_registro: string;
}

export type TipoExtintor = 'ABC' | 'CO2' | 'Espuma' | 'Agua';

export interface InventarioExtintor {
  id: number;
  ano_inventario_id: number;
  campus_id: number;
  tipo: TipoExtintor;
  peso_kg: number;
  cantidad: number;
  factor_emision: number;
  emision_co2e: number;
  fecha_registro: string;
}

export type TipoResiduo = 'relleno' | 'compostado' | 'peligroso' | 'reciclado';

export interface ResiduoSolido {
  id: number;
  ano_inventario_id: number;
  campus_id: number;
  tipo: TipoResiduo;
  cantidad_kg: number;
  factor_emision: number;
  emision_co2e: number;
  fecha_registro: string;
}

export interface ConsumoAgua {
  id: number;
  ano_inventario_id: number;
  campus_id: number;
  agua_potable_m3: number;
  agua_residual_m3: number;
  factor_emision_potable: number;
  factor_emision_residual: number;
  emision_potable_co2e: number;
  emision_residual_co2e: number;
  emision_total_co2e: number;
  fecha_registro: string;
}

export interface ResumenHuellaCarbono {
  id: number;
  ano_inventario_id: number;
  alcance_1: number;
  alcance_2: number;
  alcance_3: number;
  total_co2e: number;
  fecha_calculo: string;
}

// Tipos para formularios
export interface FormCombustible {
  tipo: TipoCombustible;
  cantidad: number;
}

export interface FormEnergia {
  campus_id: number;
  cantidad_kwh: number;
}

export interface FormAireAcond {
  campus_id: number;
  tipo_equipo: TipoEquipoAire;
  capacidad_btu: number;
  capacidad_kg: number;
  cantidad: number;
}

export interface FormExtintor {
  campus_id: number;
  tipo: TipoExtintor;
  peso_kg: number;
  cantidad: number;
}

export interface FormResiduo {
  campus_id: number;
  tipo: TipoResiduo;
  cantidad_kg: number;
}

export interface FormAgua {
  campus_id: number;
  agua_potable_m3: number;
  agua_residual_m3: number;
}

// Tipos para reportes
export interface EmisionesPorAlcance {
  alcance_1: number;
  alcance_2: number;
  alcance_3: number;
  total: number;
}

export interface EmisionesPorCategoria {
  combustibles: number;
  energia: number;
  aires_acondicionados: number;
  extintores: number;
  residuos: number;
  agua: number;
}

export interface EmisionesPorCampus {
  campus_id: number;
  campus_nombre: string;
  emisiones: number;
}

export interface ComparativaAnual {
  ano: number;
  total_co2e: number;
  alcance_1: number;
  alcance_2: number;
  alcance_3: number;
}

// Constantes
export const CAMPUS_NOMBRES = {
  1: 'Robledo',
  2: 'Fraternidad',
  3: 'Floresta',
  4: 'Prado',
  5: 'Castilla',
} as const;

export const TIPOS_COMBUSTIBLE: TipoCombustible[] = ['gasolina', 'diesel'];
export const TIPOS_EQUIPO_AIRE: TipoEquipoAire[] = ['MiniSplit', 'Cassete', 'Pisotecho'];
export const TIPOS_EXTINTOR: TipoExtintor[] = ['ABC', 'CO2', 'Espuma', 'Agua'];
export const TIPOS_RESIDUO: TipoResiduo[] = ['relleno', 'compostado', 'peligroso', 'reciclado'];

export const ESTADOS_INVENTARIO: EstadoInventario[] = ['borrador', 'completado', 'reportado'];

// Labels para UI
export const LABELS_COMBUSTIBLE = {
  gasolina: 'Gasolina Corriente E10',
  diesel: 'Diesel',
};

export const LABELS_RESIDUO = {
  relleno: 'Residuos a Relleno',
  compostado: 'Residuos Compostados',
  peligroso: 'Residuos Peligrosos',
  reciclado: 'Residuos Reciclados',
};

export const LABELS_ESTADO = {
  borrador: 'Borrador',
  completado: 'Completado',
  reportado: 'Reportado',
};
