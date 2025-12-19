# TODO - Calculadora de Huella de Carbono

## Configuración Inicial
- [x] Actualizar tema con colores ecológicos
- [x] Generar logo personalizado para la aplicación
- [x] Actualizar configuración de la app (nombre, slug)
- [x] Configurar iconos del tab bar

## Modelo de Datos y Base de Datos
- [x] Crear esquema de base de datos
- [x] Crear tablas: organizacion, campus, año_inventario, factores_emision
- [x] Crear tablas: consumo_combustible, consumo_energia, inventario_aires_acond
- [x] Crear tablas: inventario_extintores, residuos_solidos, consumo_agua
- [x] Crear tabla: resumen_huella_carbono
- [x] Crear procedimientos almacenados para cálculos

## Componentes Reutilizables
- [ ] Crear CategoryCard component
- [ ] Crear EmissionSummary component
- [ ] Crear CampusSelector component
- [ ] Crear YearSelector component
- [ ] Crear EmissionChart component (gráfico circular)
- [ ] Crear DataInputForm component
- [ ] Crear InventoryList component

## Pantallas - Tab Navigation
- [x] Configurar tab bar con 4 tabs (Dashboard, Datos, Reportes, Configuración)
- [x] Agregar iconos al tab bar

## Pantalla: Dashboard
- [x] Crear layout de Dashboard
- [x] Mostrar selector de año de inventario
- [x] Mostrar resumen de huella de carbono total
- [x] Mostrar gráfico circular de emisiones por alcance
- [ ] Mostrar tarjetas de categorías con métricas
- [ ] Agregar botón flotante para nuevo año
- [ ] Implementar comparativa con año anterior

## Pantalla: Años de Inventario
- [ ] Crear pantalla de lista de años
- [ ] Mostrar estado de cada año (Borrador, Completado, Reportado)
- [ ] Marcar año base con badge
- [ ] Implementar crear nuevo año
- [ ] Implementar duplicar año anterior
- [ ] Implementar cambiar estado de inventario
- [ ] Implementar eliminar año (solo borradores)

## Pantalla: Campus
- [ ] Crear pantalla de lista de campus
- [ ] Mostrar los 5 campus predefinidos
- [ ] Mostrar resumen de emisiones por campus
- [ ] Crear gráfico de barras comparativo
- [ ] Implementar filtro por campus

## Pantalla: Factores de Emisión
- [ ] Crear pantalla de factores de emisión
- [ ] Listar categorías de factores
- [ ] Mostrar factores por categoría
- [ ] Implementar editar factores
- [ ] Implementar importar factores desde plantilla
- [ ] Mostrar historial de cambios
- [ ] Implementar copiar factores de año anterior

## Pantalla: Ingreso de Combustibles
- [ ] Crear formulario para gasolina
- [ ] Crear formulario para diesel
- [ ] Mostrar factor de emisión
- [ ] Calcular emisiones automáticamente
- [ ] Mostrar resumen de emisiones totales
- [ ] Implementar guardar datos

## Pantalla: Ingreso de Energía
- [ ] Crear selector de campus
- [ ] Crear formulario de ingreso de kWh
- [ ] Mostrar factor de emisión
- [ ] Calcular emisiones automáticamente
- [ ] Mostrar lista de consumos por campus
- [ ] Implementar editar/eliminar registros

## Pantalla: Inventario de Aires Acondicionados
- [ ] Crear lista de equipos por campus
- [ ] Implementar filtro por campus
- [ ] Crear formulario para agregar equipo
- [ ] Implementar selector de tipo de equipo
- [ ] Calcular emisiones automáticamente
- [ ] Implementar editar equipo
- [ ] Implementar eliminar equipo
- [ ] Mostrar total de emisiones por campus

## Pantalla: Inventario de Extintores
- [ ] Crear lista de extintores por campus
- [ ] Implementar filtro por campus
- [ ] Crear formulario para agregar extintor
- [ ] Implementar selector de tipo de extintor
- [ ] Calcular emisiones automáticamente
- [ ] Implementar editar extintor
- [ ] Implementar eliminar extintor
- [ ] Mostrar total de emisiones por campus

## Pantalla: Ingreso de Residuos
- [ ] Crear selector de campus
- [ ] Crear formulario para residuos a relleno
- [ ] Crear formulario para residuos compostados
- [ ] Crear formulario para residuos peligrosos
- [ ] Crear formulario para residuos reciclados
- [ ] Calcular emisiones automáticamente
- [ ] Implementar guardar datos

## Pantalla: Ingreso de Agua
- [ ] Crear selector de campus
- [ ] Crear formulario para agua potable
- [ ] Crear formulario para agua residual
- [ ] Calcular emisiones automáticamente
- [ ] Implementar guardar datos

## Pantalla: Reportes
- [ ] Crear layout de reportes
- [ ] Implementar selector de año
- [ ] Mostrar resumen ejecutivo
- [ ] Crear gráfico de emisiones por alcance
- [ ] Crear gráfico de emisiones por categoría
- [ ] Crear gráfico de emisiones por campus
- [ ] Crear gráfico comparativo entre años
- [ ] Mostrar detalles por categoría
- [ ] Implementar exportar a PDF
- [ ] Implementar compartir reporte

## Pantalla: Configuración
- [ ] Crear pantalla de configuración
- [ ] Mostrar información de la organización
- [ ] Mostrar año base
- [ ] Mostrar información de usuario
- [ ] Implementar editar información de organización
- [ ] Implementar cambiar año base
- [ ] Agregar opción de cerrar sesión
- [ ] Agregar información "Acerca de"

## API y Backend
- [x] Crear endpoints para años de inventario
- [x] Crear endpoints para factores de emisión
- [x] Crear endpoints para consumo de combustibles
- [x] Crear endpoints para consumo de energía
- [x] Crear endpoints para inventario de aires acondicionados
- [x] Crear endpoints para inventario de extintores
- [x] Crear endpoints para residuos sólidos
- [x] Crear endpoints para consumo de agua
- [x] Crear endpoint para cálculo de huella de carbono
- [x] Crear endpoint para generación de reportes

## Cálculos y Lógica de Negocio
- [x] Implementar cálculo de emisiones de combustibles
- [x] Implementar cálculo de emisiones de energía
- [x] Implementar cálculo de emisiones de aires acondicionados
- [x] Implementar cálculo de emisiones de extintores
- [x] Implementar cálculo de emisiones de residuos
- [x] Implementar cálculo de emisiones de agua
- [x] Implementar agregación por alcance
- [x] Implementar agregación por campus
- [x] Implementar comparativa entre años

## Validaciones
- [ ] Validar campos requeridos
- [ ] Validar números positivos
- [ ] Validar factores de emisión
- [ ] Validar años válidos
- [ ] Validar año >= año base

## Datos Iniciales
- [ ] Insertar los 5 campus predefinidos
- [ ] Insertar factores de emisión por defecto
- [ ] Insertar tipos de aires acondicionados
- [ ] Insertar tipos de extintores

## Testing
- [ ] Probar flujo de creación de año
- [ ] Probar ingreso de datos de combustibles
- [ ] Probar ingreso de datos de energía
- [ ] Probar inventario de aires acondicionados
- [ ] Probar inventario de extintores
- [ ] Probar ingreso de residuos
- [ ] Probar ingreso de agua
- [ ] Probar cálculos de emisiones
- [ ] Probar generación de reportes

## Optimizaciones
- [ ] Implementar caché de datos
- [ ] Optimizar consultas a base de datos
- [ ] Implementar paginación en listas
- [ ] Optimizar renderizado de gráficos

## Documentación
- [ ] Documentar API endpoints
- [ ] Documentar modelo de datos
- [ ] Documentar fórmulas de cálculo
- [ ] Crear guía de usuario


## Nuevas Funcionalidades Web Completas (Solicitadas)
- [x] Crear pantalla de gestión de organizaciones (crear, editar, listar)
- [x] Crear pantalla de gestión de años de inventario (crear, duplicar, eliminar)
- [ ] Completar formularios de ingreso de combustibles con validaciones
- [ ] Completar formularios de ingreso de energía por campus
- [ ] Crear formularios completos de aires acondicionados
- [ ] Crear formularios completos de extintores
- [ ] Crear formularios completos de residuos sólidos
- [ ] Crear formularios completos de agua potable y residual
- [ ] Implementar gráficos interactivos en dashboard (Chart.js o Recharts)
- [ ] Crear pantalla de reportes con visualizaciones completas
- [ ] Implementar exportación de reportes a PDF
- [x] Optimizar diseño para pantallas de escritorio
- [ ] Agregar gestión de factores de emisión (editar, actualizar)


## Formularios de Ingreso de Datos (Nueva solicitud)
- [x] Crear formulario completo de ingreso de combustibles (gasolina y diesel)
- [x] Crear formulario completo de ingreso de energía por campus
- [x] Crear formulario completo de inventario de aires acondicionados
- [x] Crear formulario completo de inventario de extintores
- [x] Agregar validaciones en todos los formularios
- [x] Mostrar cálculo de emisiones en tiempo real
- [x] Implementar listado de registros con opciones de editar/eliminar


## Formularios de Ingreso de Datos (Nueva solicitud)
- [x] Crear formulario completo de ingreso de combustibles (gasolina y diesel)
- [x] Crear formulario completo de ingreso de energía por campus
- [x] Crear formulario completo de inventario de aires acondicionados
- [x] Crear formulario completo de inventario de extintores
- [x] Agregar validaciones en todos los formularios
- [x] Mostrar cálculo de emisiones en tiempo real
- [x] Implementar listado de registros con opciones de editar/eliminar


## Formularios Restantes (Nueva solicitud)
- [x] Crear formulario completo de residuos sólidos (clasificados por tipo)
- [x] Crear formulario completo de agua potable y residual
- [x] Actualizar pantalla de datos con navegación a nuevos formularios


## Funcionalidad de Edición y Eliminación (Nueva solicitud)
- [x] Agregar endpoints de API para actualizar y eliminar registros
- [x] Implementar modal de confirmación reutilizable
- [x] Agregar botones de editar y eliminar en formulario de combustibles
- [ ] Agregar botones de editar y eliminar en formulario de energía
- [ ] Agregar botones de editar y eliminar en formulario de aires acondicionados
- [ ] Agregar botones de editar y eliminar en formulario de extintores
- [ ] Agregar botones de editar y eliminar en formulario de residuos
- [ ] Agregar botones de editar y eliminar en formulario de agua


## Aplicar Edición/Eliminación a Formularios Restantes (Nueva solicitud)
- [x] Actualizar formulario de energía con edición y eliminación
- [x] Actualizar formulario de aires acondicionados con edición y eliminación
- [x] Actualizar formulario de extintores con edición y eliminación


## Completar CRUD en Formularios Restantes (Nueva solicitud)
- [x] Aplicar edición y eliminación al formulario de residuos sólidos
- [x] Aplicar edición y eliminación al formulario de agua


## Dashboard con Visualizaciones (Nueva solicitud)
- [x] Instalar Recharts y dependencias necesarias
- [x] Crear gráfico circular (PieChart) para emisiones por alcance (1, 2, 3)
- [x] Crear gráfico de barras (BarChart) para comparación entre campus
- [x] Crear tabla resumen con totales por categoría
- [x] Agregar selector de año de inventario en dashboard
- [x] Implementar carga de datos en tiempo real desde la base de datos
- [x] Agregar indicadores de totales y comparativas
- [x] Mejorar diseño responsivo del dashboard


## Módulo de Reportes con Exportación PDF (Nueva solicitud)
- [x] Instalar dependencias para generación de PDF (expo-print y expo-sharing)
- [x] Crear pantalla de reportes con selector de año
- [x] Implementar resumen ejecutivo con totales y comparativas
- [x] Agregar sección de metodología según ISO 14064-1:2018
- [x] Crear desglose detallado por categoría (combustibles, energía, etc.)
- [x] Agregar desglose por campus con totales
- [x] Incluir tabla de factores de emisión utilizados
- [x] Implementar función de generación de PDF
- [x] Agregar encabezados institucionales y pie de página
- [x] Incluir gráficos en el PDF (alcances y campus)
- [x] Agregar numeración de páginas
- [x] Implementar botón de descarga/compartir PDF


## Gestión de Factores de Emisión (Nueva solicitud)
- [x] Crear pantalla de gestión de factores de emisión en Configuración
- [x] Mostrar todos los factores del año seleccionado en formato editable
- [x] Agrupar factores por categoría (combustibles, energía, refrigerantes, etc.)
- [x] Implementar formulario de edición con validaciones
- [x] Agregar endpoint de API para actualizar factores de emisión
- [x] Mostrar unidades claramente para cada factor
- [x] Implementar confirmación antes de guardar cambios
- [ ] Agregar histórico de cambios en factores (opcional)
- [x] Recalcular automáticamente emisiones al actualizar factores
- [ ] Agregar botón para restaurar factores por defecto


## Importación Masiva de Datos (Nueva solicitud)
- [x] Instalar dependencias para manejo de Excel (xlsx)
- [x] Crear generador de plantillas Excel para cada tipo de dato
- [x] Crear endpoint de API para generar plantillas descargables
- [x] Crear endpoint de API para importar datos desde Excel
- [x] Implementar validación de datos importados
- [x] Crear pantalla de importación masiva
- [x] Agregar selector de tipo de dato a importar
- [x] Implementar carga de archivos Excel
- [x] Mostrar vista previa de datos antes de importar
- [x] Implementar importación con manejo de errores
- [x] Agregar enlace desde pantalla de Datos
- [x] Mostrar reporte de importación (éxitos y errores)


## Sistema de Metas y Alertas (Nueva solicitud)
- [x] Crear tabla de metas de reducción en base de datos
- [x] Crear tabla de alertas en base de datos
- [x] Crear endpoints de API para crear metas
- [x] Crear endpoints de API para obtener metas por año
- [x] Crear endpoints de API para actualizar metas
- [x] Crear endpoints de API para eliminar metas
- [x] Crear endpoint de API para calcular progreso de metas
- [x] Crear endpoint de API para obtener alertas activas
- [x] Crear pantalla de gestión de metas
- [x] Implementar formulario de creación de metas
- [x] Agregar selector de categoría y tipo de meta
- [x] Implementar visualización de progreso con barras de progreso
- [x] Crear tarjetas de metas con indicadores visuales
- [x] Implementar sistema de alertas automáticas
- [ ] Agregar notificaciones cuando se superen umbrales
- [ ] Crear panel de alertas en Dashboard
- [x] Implementar lógica de verificación de metas
- [x] Agregar enlace desde Configuración


## Panel de Alertas en Dashboard (Nueva solicitud)
- [x] Agregar componente de panel de alertas en Dashboard
- [x] Mostrar alertas activas con indicadores de prioridad
- [x] Implementar colores según nivel de alerta (info, warning, error, success)
- [x] Agregar funcionalidad para marcar alertas como leídas
- [x] Mostrar contador de alertas no leídas
- [x] Implementar botón para verificar metas automáticamente
- [x] Agregar enlace a pantalla de metas desde el panel


## Sistema de Usuarios y Roles (Nueva solicitud)
- [x] Crear tabla de roles en base de datos
- [x] Crear tabla de usuarios_organizacion para relacionar usuarios con organizaciones y roles
- [x] Definir tres roles: administrador, editor, visualizador
- [x] Crear endpoints de API para gestión de usuarios
- [x] Crear endpoint para asignar roles a usuarios
- [x] Crear endpoint para obtener usuarios de una organización
- [x] Crear endpoint para eliminar usuarios de una organización
- [x] Crear pantalla de gestión de usuarios
- [x] Implementar formulario para invitar usuarios
- [x] Mostrar lista de usuarios con sus roles
- [x] Implementar funcionalidad para cambiar roles
- [x] Implementar funcionalidad para eliminar usuarios
- [ ] Crear middleware de verificación de permisos
- [ ] Implementar control de acceso en formularios de ingreso de datos
- [ ] Implementar control de acceso en gestión de factores de emisión
- [ ] Implementar control de acceso en gestión de metas
- [ ] Implementar control de acceso en gestión de organizaciones
- [ ] Mostrar indicador de rol actual del usuario en la interfaz
- [x] Agregar enlace desde Configuración
