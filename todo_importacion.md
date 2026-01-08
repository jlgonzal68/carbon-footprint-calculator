# Importación Masiva de Datos desde Excel

## Generación de Plantillas
- [x] Crear plantilla Excel para combustibles (tipo, cantidad, fecha)
- [x] Crear plantilla Excel para energía (campus, cantidad kWh, fecha)
- [x] Crear plantilla Excel para aires acondicionados (tipo, cantidad, capacidad, gas)
- [x] Crear plantilla Excel para extintores (tipo, cantidad, capacidad, agente)
- [x] Crear plantilla Excel para residuos (tipo, cantidad, fecha)
- [x] Crear plantilla Excel para agua (cantidad m3, fecha)
- [x] Agregar instrucciones y ejemplos en cada plantilla

## Parser y Validación
- [x] Implementar parser de archivos Excel con librería XLSX
- [x] Validar estructura de columnas según tipo de plantilla
- [x] Validar tipos de datos (números, fechas, enumeraciones)
- [x] Validar rangos de valores permitidos
- [x] Generar reporte de errores de validación
- [x] Crear endpoint API para procesar importación masiva

## Interfaz de Usuario
- [x] Crear pantalla de importación con selector de categoría
- [x] Implementar carga de archivos Excel (drag & drop o selector)
- [x] Mostrar vista previa de datos antes de importar
- [x] Mostrar progreso de importación
- [x] Mostrar resumen de registros importados exitosamente
- [x] Mostrar errores de validación con detalles
- [x] Agregar botón para descargar plantillas
- [x] Integrar en menú de Configuración

## Pruebas
- [x] Probar importación de combustibles con datos válidos
- [x] Probar importación con datos inválidos y verificar errores
- [x] Probar importación masiva (100+ registros)
- [x] Verificar que los datos importados aparecen en Dashboard
