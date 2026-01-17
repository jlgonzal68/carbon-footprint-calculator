import { z } from 'zod';
import { protectedProcedure, router } from '../../_core/trpc';
import { getConnection } from '../../db';

export const metasRouter = router({
  // Crear nueva meta de reducción
  createMetaReduccion: protectedProcedure
    .input(z.object({
      organizacion_id: z.number(),
      tipo_meta: z.enum(['porcentaje', 'absoluto']),
      valor_objetivo: z.number(),
      ano_objetivo: z.number(),
      ano_base: z.number(),
      alcances_incluidos: z.string().default('1,2,3'),
      descripcion: z.string().optional(),
      responsable: z.string().optional(),
      fecha_limite: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [result] = await db.execute(
          `INSERT INTO metas_reduccion 
           (organizacion_id, tipo_meta, valor_objetivo, ano_objetivo, ano_base, alcances_incluidos, descripcion, responsable, fecha_limite)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            input.organizacion_id,
            input.tipo_meta,
            input.valor_objetivo,
            input.ano_objetivo,
            input.ano_base,
            input.alcances_incluidos,
            input.descripcion || null,
            input.responsable || null,
            input.fecha_limite || null,
          ]
        );
        await db.end();
        return { success: true, id: (result as any).insertId };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // Obtener metas de una organización
  getMetasReduccion: protectedProcedure
    .input(z.object({ organizacion_id: z.number() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [metas] = await db.execute(
          `SELECT * FROM metas_reduccion WHERE organizacion_id = ? ORDER BY ano_objetivo DESC`,
          [input.organizacion_id]
        );
        await db.end();
        return metas;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // Actualizar meta existente
  updateMetaReduccion: protectedProcedure
    .input(z.object({
      id: z.number(),
      tipo_meta: z.enum(['porcentaje', 'absoluto']).optional(),
      valor_objetivo: z.number().optional(),
      ano_objetivo: z.number().optional(),
      ano_base: z.number().optional(),
      alcances_incluidos: z.string().optional(),
      descripcion: z.string().optional(),
      responsable: z.string().optional(),
      fecha_limite: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const updates: string[] = [];
        const values: any[] = [];
        
        if (input.tipo_meta) {
          updates.push('tipo_meta = ?');
          values.push(input.tipo_meta);
        }
        if (input.valor_objetivo !== undefined) {
          updates.push('valor_objetivo = ?');
          values.push(input.valor_objetivo);
        }
        if (input.ano_objetivo) {
          updates.push('ano_objetivo = ?');
          values.push(input.ano_objetivo);
        }
        if (input.ano_base) {
          updates.push('ano_base = ?');
          values.push(input.ano_base);
        }
        if (input.alcances_incluidos) {
          updates.push('alcances_incluidos = ?');
          values.push(input.alcances_incluidos);
        }
        if (input.descripcion !== undefined) {
          updates.push('descripcion = ?');
          values.push(input.descripcion);
        }
        if (input.responsable !== undefined) {
          updates.push('responsable = ?');
          values.push(input.responsable);
        }
        if (input.fecha_limite !== undefined) {
          updates.push('fecha_limite = ?');
          values.push(input.fecha_limite);
        }
        
        values.push(input.id);
        
        await db.execute(
          `UPDATE metas_reduccion SET ${updates.join(', ')} WHERE id = ?`,
          values
        );
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // Eliminar meta
  deleteMetaReduccion: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        await db.execute('DELETE FROM metas_reduccion WHERE id = ?', [input.id]);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // Obtener progreso de metas con cálculo de estado
  getProgresoMetas: protectedProcedure
    .input(z.object({ organizacion_id: z.number() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        // Obtener todas las metas de la organización
        const [metas] = await db.execute(
          `SELECT * FROM metas_reduccion WHERE organizacion_id = ? ORDER BY ano_objetivo DESC`,
          [input.organizacion_id]
        );
        
        const metasConProgreso = [];
        
        for (const meta of metas as any[]) {
          // Obtener emisiones del año base
          const [anoBase] = await db.execute(
            `SELECT ai.id, rhc.alcance_1, rhc.alcance_2, rhc.alcance_3, rhc.total_co2e
             FROM ano_inventario ai
             JOIN resumen_huella_carbono rhc ON ai.id = rhc.ano_inventario_id
             WHERE ai.organizacion_id = ? AND ai.ano = ?
             LIMIT 1`,
            [input.organizacion_id, meta.ano_base]
          );
          
          // Obtener emisiones del año actual más reciente
          const [anoActual] = await db.execute(
            `SELECT ai.id, ai.ano, rhc.alcance_1, rhc.alcance_2, rhc.alcance_3, rhc.total_co2e
             FROM ano_inventario ai
             JOIN resumen_huella_carbono rhc ON ai.id = rhc.ano_inventario_id
             WHERE ai.organizacion_id = ? AND ai.ano <= ?
             ORDER BY ai.ano DESC
             LIMIT 1`,
            [input.organizacion_id, meta.ano_objetivo]
          );
          
          if ((anoBase as any[]).length === 0 || (anoActual as any[]).length === 0) {
            metasConProgreso.push({
              ...meta,
              progreso: 0,
              estado: 'sin_datos',
              emision_base: 0,
              emision_actual: 0,
              emision_objetivo: 0,
            });
            continue;
          }
          
          const baseData = (anoBase as any[])[0];
          const actualData = (anoActual as any[])[0];
          
          // Calcular emisiones según alcances incluidos
          const alcances = meta.alcances_incluidos.split(',').map((a: string) => parseInt(a.trim()));
          let emisionBase = 0;
          let emisionActual = 0;
          
          if (alcances.includes(1)) {
            emisionBase += parseFloat(baseData.alcance_1 || 0);
            emisionActual += parseFloat(actualData.alcance_1 || 0);
          }
          if (alcances.includes(2)) {
            emisionBase += parseFloat(baseData.alcance_2 || 0);
            emisionActual += parseFloat(actualData.alcance_2 || 0);
          }
          if (alcances.includes(3)) {
            emisionBase += parseFloat(baseData.alcance_3 || 0);
            emisionActual += parseFloat(actualData.alcance_3 || 0);
          }
          
          // Calcular emisión objetivo
          let emisionObjetivo;
          if (meta.tipo_meta === 'porcentaje') {
            const reduccionPorcentaje = meta.valor_objetivo / 100;
            emisionObjetivo = emisionBase * (1 - reduccionPorcentaje);
          } else {
            emisionObjetivo = meta.valor_objetivo;
          }
          
          // Calcular progreso
          const reduccionLograda = emisionBase - emisionActual;
          const reduccionNecesaria = emisionBase - emisionObjetivo;
          const progreso = reduccionNecesaria > 0 ? (reduccionLograda / reduccionNecesaria) * 100 : 0;
          
          // Determinar estado semáforo
          let estado;
          if (progreso >= 70) {
            estado = 'verde'; // Cumpliendo
          } else if (progreso >= 40) {
            estado = 'amarillo'; // En riesgo
          } else {
            estado = 'rojo'; // Incumpliendo
          }
          
          metasConProgreso.push({
            ...meta,
            progreso: Math.min(Math.max(progreso, 0), 100),
            estado,
            emision_base: emisionBase,
            emision_actual: emisionActual,
            emision_objetivo: emisionObjetivo,
            ano_actual: actualData.ano,
          });
        }
        
        await db.end();
        return metasConProgreso;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),
});
