# Generador de Reportes GHG Protocol

## Estructura de Datos y API
- [x] Crear endpoint para obtener datos completos del inventario anual
- [x] Incluir información de organización y año base
- [x] Incluir metodología de cálculo y factores de emisión utilizados
- [ ] Incluir límites organizacionales y operacionales
- [x] Incluir resumen de emisiones por alcance y categoría
- [x] Incluir desglose detallado de fuentes de emisión

## Pantalla de Generación de Reportes
- [x] Crear pantalla de configuración de reporte
- [x] Selector de año de inventario a reportar
- [ ] Opciones de inclusión/exclusión de secciones
- [ ] Campo para notas adicionales y contexto organizacional
- [x] Vista previa de contenido del reporte
- [x] Botón de generación y descarga de PDF

## Generador de PDF GHG Protocol
- [x] Implementar generación de PDF con formato profesional
- [x] Portada con logo, título y datos de organización
- [x] Resumen ejecutivo con totales y tendencias
- [x] Sección de metodología GHG Protocol
- [x] Tabla de factores de emisión utilizados con fuentes
- [x] Desglose de emisiones por Alcance 1 (directas)
- [x] Desglose de emisiones por Alcance 2 (energía indirecta)
- [x] Desglose de emisiones por Alcance 3 (otras indirectas)
- [ ] Gráficos de distribución por alcance y categoría
- [x] Tabla resumen de emisiones totales
- [ ] Sección de notas y aclaraciones
- [x] Pie de página con fecha de generación y versión

## Cumplimiento GHG Protocol
- [x] Incluir declaración de conformidad con GHG Protocol
- [x] Especificar año base y justificación
- [x] Definir límites organizacionales (control operacional/financiero)
- [x] Listar fuentes de emisión incluidas y excluidas
- [ ] Documentar supuestos y estimaciones realizadas
- [x] Incluir información de calidad de datos

## Pruebas
- [x] Generar reporte con datos completos
- [x] Generar reporte con datos parciales
- [x] Verificar formato y estructura del PDF
- [x] Verificar cálculos y totales en el reporte
