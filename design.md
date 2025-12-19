# Diseño de Aplicación Móvil - Calculadora de Huella de Carbono

## Concepto General
Aplicación móvil profesional para instituciones educativas que permite calcular, analizar y reportar la huella de carbono siguiendo la norma ISO 14064-1:2018. La aplicación está diseñada para uso en orientación vertical (9:16) y optimizada para uso con una mano.

## Paleta de Colores
- **Color Primario**: Verde ecológico (#2E7D32) - Representa sostenibilidad y medio ambiente
- **Color Secundario**: Azul cielo (#1976D2) - Representa claridad y confianza
- **Color de Acento**: Naranja (#F57C00) - Para alertas y datos importantes
- **Texto Primario**: Gris oscuro (#212121)
- **Texto Secundario**: Gris medio (#757575)
- **Texto Deshabilitado**: Gris claro (#BDBDBD)
- **Fondo**: Blanco (#FFFFFF)
- **Fondo Secundario**: Gris muy claro (#F5F5F5)
- **Tarjetas**: Blanco con sombra sutil

## Tipografía
- **Título Grande**: 32pt, Bold, line-height 40pt
- **Título de Sección**: 24pt, SemiBold, line-height 32pt
- **Subtítulo**: 20pt, SemiBold, line-height 28pt
- **Cuerpo**: 16pt, Regular, line-height 24pt
- **Cuerpo Pequeño**: 14pt, Regular, line-height 20pt
- **Caption**: 12pt, Regular, line-height 16pt

## Espaciado
Sistema de 8pt grid:
- **Extra pequeño**: 8pt
- **Pequeño**: 12pt
- **Medio**: 16pt
- **Grande**: 24pt
- **Extra grande**: 32pt
- **Padding de pantalla**: 16pt

## Componentes de UI

### Bordes Redondeados
- **Botones**: 12pt
- **Tarjetas**: 16pt
- **Campos de entrada**: 8pt
- **Modales**: 24pt (esquinas superiores)

### Iconos
- **Tab bar**: 28pt (filled)
- **Botones**: 24pt (filled)
- **Listas**: 20pt (outline)

## Lista de Pantallas

### 1. Dashboard (Pantalla Principal)
**Contenido**:
- Resumen de huella de carbono del año actual
- Gráfico circular con emisiones por alcance (Alcance 1, 2, 3)
- Total de CO2e en toneladas
- Tarjetas con métricas clave por categoría
- Botón flotante para crear nuevo año de inventario

**Funcionalidad**:
- Seleccionar año de inventario desde un dropdown
- Ver comparativa con año anterior
- Navegar a detalles de cada categoría
- Acceso rápido a reportes

### 2. Años de Inventario
**Contenido**:
- Lista de años de inventario creados
- Estado de cada año (Borrador, Completado, Reportado)
- Año base marcado con badge especial
- Botón para crear nuevo año
- Opción de duplicar año anterior

**Funcionalidad**:
- Crear nuevo año de inventario
- Seleccionar año base
- Duplicar factores de emisión de año anterior
- Cambiar estado de inventario
- Eliminar año (solo borradores)

### 3. Campus
**Contenido**:
- Lista de los 5 campus (Robledo, Fraternidad, Floresta, Prado, Castilla)
- Resumen de emisiones por campus
- Gráfico de barras comparativo

**Funcionalidad**:
- Ver detalles de emisiones por campus
- Filtrar datos por campus
- Comparar campus entre sí

### 4. Factores de Emisión
**Contenido**:
- Lista de categorías (Combustibles, Energía, Aires Acondicionados, Extintores, Agua, Residuos)
- Factores de emisión por categoría
- Fuente de los factores
- Fecha de última actualización

**Funcionalidad**:
- Editar factores de emisión
- Importar factores desde plantilla
- Ver historial de cambios
- Copiar factores de año anterior

### 5. Ingreso de Combustibles
**Contenido**:
- Formulario para Gasolina
- Formulario para Diesel
- Unidad: galones
- Cálculo automático de emisiones
- Resumen de emisiones totales

**Funcionalidad**:
- Ingresar cantidad consumida
- Ver factor de emisión aplicado
- Calcular emisiones automáticamente
- Guardar datos

### 6. Ingreso de Energía
**Contenido**:
- Selector de campus
- Campo de entrada para kWh consumidos
- Factor de emisión para energía
- Cálculo automático de emisiones
- Lista de consumos por campus

**Funcionalidad**:
- Seleccionar campus
- Ingresar consumo de energía
- Ver emisiones calculadas
- Editar/eliminar registros

### 7. Inventario de Aires Acondicionados
**Contenido**:
- Lista de equipos por campus
- Filtro por campus
- Formulario para agregar equipo:
  - Tipo (MiniSplit, Cassete, Pisotecho)
  - Capacidad BTU
  - Capacidad kg
  - Cantidad de equipos
  - Gas refrigerante
- Cálculo automático de emisiones

**Funcionalidad**:
- Agregar nuevo equipo
- Editar equipo existente
- Eliminar equipo
- Filtrar por campus
- Ver total de emisiones por campus

### 8. Inventario de Extintores
**Contenido**:
- Lista de extintores por campus
- Filtro por campus
- Formulario para agregar extintor:
  - Tipo (ABC, CO2, Espuma, Agua)
  - Peso (kg)
  - Cantidad
- Cálculo automático de emisiones

**Funcionalidad**:
- Agregar nuevo extintor
- Editar extintor existente
- Eliminar extintor
- Filtrar por campus
- Ver total de emisiones por campus

### 9. Ingreso de Residuos
**Contenido**:
- Selector de campus
- Formularios para cada tipo:
  - Residuos a relleno
  - Residuos compostados
  - Residuos peligrosos
  - Residuos reciclados
- Unidad: kilogramos
- Cálculo automático de emisiones

**Funcionalidad**:
- Seleccionar campus
- Ingresar cantidad por tipo de residuo
- Ver emisiones calculadas
- Guardar datos

### 10. Ingreso de Agua
**Contenido**:
- Selector de campus
- Campo para agua potable (m³)
- Campo para agua residual (m³)
- Cálculo automático de emisiones

**Funcionalidad**:
- Seleccionar campus
- Ingresar consumos de agua
- Ver emisiones calculadas
- Guardar datos

### 11. Reportes
**Contenido**:
- Resumen ejecutivo
- Gráficos:
  - Emisiones por alcance
  - Emisiones por categoría
  - Emisiones por campus
  - Comparativa entre años
- Detalles por categoría
- Botón de exportar a PDF

**Funcionalidad**:
- Visualizar reportes
- Filtrar por año
- Exportar a PDF
- Compartir reporte

### 12. Configuración
**Contenido**:
- Información de la organización
- Año base
- Gestión de usuario
- Acerca de la aplicación
- Cerrar sesión

**Funcionalidad**:
- Editar información de organización
- Cambiar año base
- Ver información de usuario
- Cerrar sesión

## Flujos de Usuario Principales

### Flujo 1: Crear Nuevo Año de Inventario
1. Usuario abre la app → Dashboard
2. Usuario toca botón "Nuevo Año"
3. Usuario ingresa año y selecciona si duplicar factores del año anterior
4. Sistema crea año y muestra pantalla de factores de emisión
5. Usuario revisa/edita factores
6. Usuario guarda y regresa al Dashboard

### Flujo 2: Ingresar Datos de Consumo
1. Usuario selecciona año desde Dashboard
2. Usuario toca categoría (ej: Combustibles)
3. Usuario ingresa datos en formulario
4. Sistema calcula emisiones automáticamente
5. Usuario guarda datos
6. Sistema actualiza Dashboard con nuevas emisiones

### Flujo 3: Generar Reporte
1. Usuario navega a tab "Reportes"
2. Usuario selecciona año
3. Sistema muestra resumen con gráficos
4. Usuario toca "Exportar PDF"
5. Sistema genera PDF y permite compartir

## Navegación

### Tab Bar (Bottom Navigation)
1. **Dashboard** (Icono: house.fill)
2. **Datos** (Icono: square.and.pencil)
3. **Reportes** (Icono: chart.bar.fill)
4. **Configuración** (Icono: gearshape.fill)

### Navegación Secundaria
- Stack navigation dentro de cada tab
- Modales para formularios de ingreso
- Sheets para selección de campus/año

## Interacciones

### Gestos
- **Tap**: Seleccionar elementos, abrir detalles
- **Swipe**: Eliminar elementos de listas
- **Pull to refresh**: Actualizar datos en listas
- **Long press**: Mostrar opciones adicionales

### Feedback
- **Haptic feedback**: En botones importantes
- **Animaciones**: Transiciones suaves entre pantallas
- **Loading states**: Indicadores de carga durante cálculos
- **Success/Error messages**: Toast notifications

## Consideraciones de Diseño

### Accesibilidad
- Tamaños de texto escalables
- Contraste de colores WCAG AA
- Touch targets mínimo 44pt
- Soporte para VoiceOver/TalkBack

### Performance
- Carga lazy de listas largas
- Caché de datos calculados
- Optimización de gráficos

### Offline
- Almacenamiento local con AsyncStorage
- Sincronización cuando hay conexión
- Indicador de estado de conexión

## Componentes Reutilizables
- **CategoryCard**: Tarjeta para categorías en Dashboard
- **EmissionSummary**: Resumen de emisiones con icono
- **CampusSelector**: Dropdown para seleccionar campus
- **YearSelector**: Dropdown para seleccionar año
- **EmissionChart**: Gráfico circular de emisiones
- **DataInputForm**: Formulario genérico para ingreso de datos
- **InventoryList**: Lista de inventario con swipe actions
