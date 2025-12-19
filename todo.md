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
