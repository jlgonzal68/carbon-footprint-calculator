-- Esquema de Base de Datos para Calculadora de Huella de Carbono
-- Basado en ISO 14064-1:2018

-- Tabla: organizacion
CREATE TABLE IF NOT EXISTS organizacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  ano_base INT NOT NULL,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usuario_id VARCHAR(255) NOT NULL,
  INDEX idx_usuario (usuario_id)
);

-- Tabla: campus
CREATE TABLE IF NOT EXISTS campus (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizacion_id INT NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255),
  FOREIGN KEY (organizacion_id) REFERENCES organizacion(id) ON DELETE CASCADE,
  INDEX idx_organizacion (organizacion_id)
);

-- Tabla: ano_inventario
CREATE TABLE IF NOT EXISTS ano_inventario (
  id INT AUTO_INCREMENT PRIMARY KEY,
  organizacion_id INT NOT NULL,
  ano INT NOT NULL,
  estado ENUM('borrador', 'completado', 'reportado') DEFAULT 'borrador',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (organizacion_id) REFERENCES organizacion(id) ON DELETE CASCADE,
  UNIQUE KEY unique_org_ano (organizacion_id, ano),
  INDEX idx_organizacion_ano (organizacion_id, ano)
);

-- Tabla: factores_emision
CREATE TABLE IF NOT EXISTS factores_emision (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  categoria ENUM('combustible', 'energia', 'aire_acond', 'extintor', 'agua_potable', 'agua_residual', 'residuo_relleno', 'residuo_compostado', 'residuo_peligroso', 'residuo_reciclado') NOT NULL,
  tipo VARCHAR(100),
  factor_emision DECIMAL(15, 6) NOT NULL,
  unidad VARCHAR(50) NOT NULL,
  fuente VARCHAR(255),
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  INDEX idx_ano_categoria (ano_inventario_id, categoria)
);

-- Tabla: consumo_combustible
CREATE TABLE IF NOT EXISTS consumo_combustible (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  tipo ENUM('gasolina', 'diesel') NOT NULL,
  cantidad DECIMAL(15, 3) NOT NULL,
  unidad VARCHAR(20) DEFAULT 'gal',
  factor_emision DECIMAL(15, 6) NOT NULL,
  emision_co2e DECIMAL(15, 3) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  INDEX idx_ano_tipo (ano_inventario_id, tipo)
);

-- Tabla: consumo_energia
CREATE TABLE IF NOT EXISTS consumo_energia (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  campus_id INT NOT NULL,
  cantidad_kwh DECIMAL(15, 3) NOT NULL,
  factor_emision DECIMAL(15, 6) NOT NULL,
  emision_co2e DECIMAL(15, 3) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campus(id) ON DELETE CASCADE,
  INDEX idx_ano_campus (ano_inventario_id, campus_id)
);

-- Tabla: inventario_aires_acond
CREATE TABLE IF NOT EXISTS inventario_aires_acond (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  campus_id INT NOT NULL,
  tipo_equipo VARCHAR(50) NOT NULL,
  capacidad_btu INT NOT NULL,
  capacidad_kg DECIMAL(10, 3) NOT NULL,
  cantidad INT NOT NULL,
  gas_refrigerante VARCHAR(20) NOT NULL,
  gwp INT NOT NULL,
  k_instalacion DECIMAL(5, 2) NOT NULL,
  x_operacion DECIMAL(5, 2) NOT NULL,
  emision_instalacion DECIMAL(15, 3) NOT NULL,
  emision_operacion DECIMAL(15, 3) NOT NULL,
  emision_total_co2e DECIMAL(15, 3) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campus(id) ON DELETE CASCADE,
  INDEX idx_ano_campus (ano_inventario_id, campus_id)
);

-- Tabla: inventario_extintores
CREATE TABLE IF NOT EXISTS inventario_extintores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  campus_id INT NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  peso_kg DECIMAL(10, 3) NOT NULL,
  cantidad INT NOT NULL,
  factor_emision DECIMAL(15, 6) NOT NULL,
  emision_co2e DECIMAL(15, 3) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campus(id) ON DELETE CASCADE,
  INDEX idx_ano_campus (ano_inventario_id, campus_id)
);

-- Tabla: residuos_solidos
CREATE TABLE IF NOT EXISTS residuos_solidos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  campus_id INT NOT NULL,
  tipo ENUM('relleno', 'compostado', 'peligroso', 'reciclado') NOT NULL,
  cantidad_kg DECIMAL(15, 3) NOT NULL,
  factor_emision DECIMAL(15, 6) NOT NULL,
  emision_co2e DECIMAL(15, 3) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campus(id) ON DELETE CASCADE,
  INDEX idx_ano_campus_tipo (ano_inventario_id, campus_id, tipo)
);

-- Tabla: consumo_agua
CREATE TABLE IF NOT EXISTS consumo_agua (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  campus_id INT NOT NULL,
  agua_potable_m3 DECIMAL(15, 3) NOT NULL,
  agua_residual_m3 DECIMAL(15, 3) NOT NULL,
  factor_emision_potable DECIMAL(15, 6) NOT NULL,
  factor_emision_residual DECIMAL(15, 6) NOT NULL,
  emision_potable_co2e DECIMAL(15, 3) NOT NULL,
  emision_residual_co2e DECIMAL(15, 3) NOT NULL,
  emision_total_co2e DECIMAL(15, 3) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  FOREIGN KEY (campus_id) REFERENCES campus(id) ON DELETE CASCADE,
  INDEX idx_ano_campus (ano_inventario_id, campus_id)
);

-- Tabla: resumen_huella_carbono
CREATE TABLE IF NOT EXISTS resumen_huella_carbono (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ano_inventario_id INT NOT NULL,
  alcance_1 DECIMAL(15, 3) NOT NULL DEFAULT 0,
  alcance_2 DECIMAL(15, 3) NOT NULL DEFAULT 0,
  alcance_3 DECIMAL(15, 3) NOT NULL DEFAULT 0,
  total_co2e DECIMAL(15, 3) NOT NULL DEFAULT 0,
  fecha_calculo TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (ano_inventario_id) REFERENCES ano_inventario(id) ON DELETE CASCADE,
  UNIQUE KEY unique_ano_inventario (ano_inventario_id)
);

-- Insertar campus predefinidos (se ejecutará después de crear una organización)
-- Los campus se crearán mediante la aplicación cuando se cree la primera organización

-- Insertar factores de emisión por defecto (basados en documentos proporcionados)
-- Estos se insertarán mediante la aplicación cuando se cree el primer año de inventario
