import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import mysql from 'mysql2/promise';

// Crear conexión a la base de datos
const getConnection = async () => {
  return await mysql.createConnection(process.env.DATABASE_URL!);
};

// Esquemas de validación
const createOrganizacionSchema = z.object({
  nombre: z.string().min(1, "El nombre es requerido"),
  ano_base: z.number().int().min(2000).max(2100),
});

const createAnoInventarioSchema = z.object({
  organizacion_id: z.number().int().positive(),
  ano: z.number().int().min(2000).max(2100),
  duplicar_factores: z.boolean().optional(),
});

const updateEstadoInventarioSchema = z.object({
  ano_inventario_id: z.number().int().positive(),
  estado: z.enum(['borrador', 'completado', 'reportado']),
});

const createCombustibleSchema = z.object({
  ano_inventario_id: z.number().int().positive(),
  tipo: z.enum(['gasolina', 'diesel']),
  cantidad: z.number().positive(),
});

const createEnergiaSchema = z.object({
  ano_inventario_id: z.number().int().positive(),
  campus_id: z.number().int().positive(),
  cantidad_kwh: z.number().positive(),
});

export const carbonRouter = router({
  // ============ ORGANIZACIONES ============
  createOrganizacion: protectedProcedure
    .input(createOrganizacionSchema)
    .mutation(async ({ input, ctx }) => {
      const { nombre, ano_base } = input;
      const usuario_id = ctx.user.openId;
      const db = await getConnection();

      try {
        // Crear organización
        const [result] = await db.execute(
          `INSERT INTO organizacion (nombre, ano_base, usuario_id) VALUES (?, ?, ?)`,
          [nombre, ano_base, usuario_id]
        );
        
        const organizacion_id = (result as any).insertId;

        // Crear los 5 campus predefinidos
        const campusNombres = ['Robledo', 'Fraternidad', 'Floresta', 'Prado', 'Castilla'];
        for (const campusNombre of campusNombres) {
          await db.execute(
            `INSERT INTO campus (organizacion_id, nombre) VALUES (?, ?)`,
            [organizacion_id, campusNombre]
          );
        }

        await db.end();
        return { id: organizacion_id, nombre, ano_base };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getOrganizaciones: protectedProcedure.query(async ({ ctx }) => {
    const usuario_id = ctx.user.openId;
    const db = await getConnection();
    try {
      const [rows] = await db.execute(
        `SELECT * FROM organizacion WHERE usuario_id = ? ORDER BY fecha_creacion DESC`,
        [usuario_id]
      );
      await db.end();
      return rows;
    } catch (error) {
      await db.end();
      throw error;
    }
  }),

  // ============ CAMPUS ============
  getCampus: protectedProcedure
    .input(z.object({ organizacion_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT * FROM campus WHERE organizacion_id = ? ORDER BY id`,
          [input.organizacion_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ AÑOS DE INVENTARIO ============
  createAnoInventario: protectedProcedure
    .input(createAnoInventarioSchema)
    .mutation(async ({ input }) => {
      const { organizacion_id, ano, duplicar_factores } = input;
      const db = await getConnection();

      try {
        // Verificar que el año no exista
        const [existing] = await db.execute(
          `SELECT id FROM ano_inventario WHERE organizacion_id = ? AND ano = ?`,
          [organizacion_id, ano]
        );

        if ((existing as any[]).length > 0) {
          await db.end();
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'El año de inventario ya existe',
          });
        }

        // Crear año de inventario
        const [result] = await db.execute(
          `INSERT INTO ano_inventario (organizacion_id, ano, estado) VALUES (?, ?, 'borrador')`,
          [organizacion_id, ano]
        );

        const ano_inventario_id = (result as any).insertId;

        // Si se debe duplicar factores, copiar del año anterior
        if (duplicar_factores) {
          await db.execute(
            `INSERT INTO factores_emision (ano_inventario_id, categoria, tipo, factor_emision, unidad, fuente)
             SELECT ?, categoria, tipo, factor_emision, unidad, fuente
             FROM factores_emision
             WHERE ano_inventario_id = (
               SELECT id FROM ano_inventario 
               WHERE organizacion_id = ? AND ano < ? 
               ORDER BY ano DESC LIMIT 1
             )`,
            [ano_inventario_id, organizacion_id, ano]
          );
        } else {
          // Insertar factores de emisión por defecto
          await insertDefaultFactores(db, ano_inventario_id);
        }

        // Crear resumen de huella de carbono
        await db.execute(
          `INSERT INTO resumen_huella_carbono (ano_inventario_id) VALUES (?)`,
          [ano_inventario_id]
        );

        await db.end();
        return { id: ano_inventario_id, organizacion_id, ano, estado: 'borrador' };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getAnosInventario: protectedProcedure
    .input(z.object({ organizacion_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT * FROM ano_inventario WHERE organizacion_id = ? ORDER BY ano DESC`,
          [input.organizacion_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateEstadoInventario: protectedProcedure
    .input(updateEstadoInventarioSchema)
    .mutation(async ({ input }) => {
      const { ano_inventario_id, estado } = input;
      const db = await getConnection();
      try {
        await db.execute(
          `UPDATE ano_inventario SET estado = ? WHERE id = ?`,
          [estado, ano_inventario_id]
        );
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteAnoInventario: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        // Solo se pueden eliminar borradores
        const [rows] = await db.execute(
          `SELECT estado FROM ano_inventario WHERE id = ?`,
          [input.ano_inventario_id]
        );

        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Año de inventario no encontrado' });
        }

        if ((rows as any[])[0].estado !== 'borrador') {
          await db.end();
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Solo se pueden eliminar años en estado borrador',
          });
        }

        await db.execute(`DELETE FROM ano_inventario WHERE id = ?`, [input.ano_inventario_id]);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ FACTORES DE EMISIÓN ============
  getFactoresEmision: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT * FROM factores_emision WHERE ano_inventario_id = ? ORDER BY categoria, tipo`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateFactorEmision: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        factor_emision: z.number().positive(),
        fuente: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, factor_emision, fuente } = input;
      const db = await getConnection();
      try {
        await db.execute(
          `UPDATE factores_emision SET factor_emision = ?, fuente = ? WHERE id = ?`,
          [factor_emision, fuente || null, id]
        );
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ COMBUSTIBLES ============
  createConsumoCombustible: protectedProcedure
    .input(createCombustibleSchema)
    .mutation(async ({ input }) => {
      const { ano_inventario_id, tipo, cantidad } = input;
      const db = await getConnection();

      try {
        // Obtener factor de emisión
        const [factores] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = 'combustible' AND tipo = ?`,
          [ano_inventario_id, tipo]
        );

        if ((factores as any[]).length === 0) {
          await db.end();
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Factor de emisión no encontrado para este tipo de combustible',
          });
        }

        const factor_emision = (factores as any[])[0].factor_emision;
        const emision_co2e = cantidad * factor_emision;

        // Verificar si ya existe un registro para este tipo
        const [existing] = await db.execute(
          `SELECT id FROM consumo_combustible WHERE ano_inventario_id = ? AND tipo = ?`,
          [ano_inventario_id, tipo]
        );

        if ((existing as any[]).length > 0) {
          // Actualizar
          await db.execute(
            `UPDATE consumo_combustible SET cantidad = ?, factor_emision = ?, emision_co2e = ? 
             WHERE ano_inventario_id = ? AND tipo = ?`,
            [cantidad, factor_emision, emision_co2e, ano_inventario_id, tipo]
          );
        } else {
          // Insertar
          await db.execute(
            `INSERT INTO consumo_combustible (ano_inventario_id, tipo, cantidad, factor_emision, emision_co2e) 
             VALUES (?, ?, ?, ?, ?)`,
            [ano_inventario_id, tipo, cantidad, factor_emision, emision_co2e]
          );
        }

        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true, emision_co2e };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getConsumosCombustible: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT * FROM consumo_combustible WHERE ano_inventario_id = ? ORDER BY tipo`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ ENERGÍA ============
  createConsumoEnergia: protectedProcedure
    .input(createEnergiaSchema)
    .mutation(async ({ input }) => {
      const { ano_inventario_id, campus_id, cantidad_kwh } = input;
      const db = await getConnection();

      try {
        // Obtener factor de emisión
        const [factores] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = 'energia'`,
          [ano_inventario_id]
        );

        if ((factores as any[]).length === 0) {
          await db.end();
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Factor de emisión no encontrado para energía',
          });
        }

        const factor_emision = (factores as any[])[0].factor_emision;
        const emision_co2e = cantidad_kwh * factor_emision;

        // Verificar si ya existe
        const [existing] = await db.execute(
          `SELECT id FROM consumo_energia WHERE ano_inventario_id = ? AND campus_id = ?`,
          [ano_inventario_id, campus_id]
        );

        if ((existing as any[]).length > 0) {
          await db.execute(
            `UPDATE consumo_energia SET cantidad_kwh = ?, factor_emision = ?, emision_co2e = ? 
             WHERE ano_inventario_id = ? AND campus_id = ?`,
            [cantidad_kwh, factor_emision, emision_co2e, ano_inventario_id, campus_id]
          );
        } else {
          await db.execute(
            `INSERT INTO consumo_energia (ano_inventario_id, campus_id, cantidad_kwh, factor_emision, emision_co2e) 
             VALUES (?, ?, ?, ?, ?)`,
            [ano_inventario_id, campus_id, cantidad_kwh, factor_emision, emision_co2e]
          );
        }

        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true, emision_co2e };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getConsumosEnergia: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ce.*, c.nombre as campus_nombre 
           FROM consumo_energia ce
           JOIN campus c ON ce.campus_id = c.id
           WHERE ce.ano_inventario_id = ? 
           ORDER BY c.nombre`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ RESUMEN HUELLA DE CARBONO ============
  getResumenHuellaCarbono: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT * FROM resumen_huella_carbono WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        await db.end();

        if ((rows as any[]).length === 0) {
          return { alcance_1: 0, alcance_2: 0, alcance_3: 0, total_co2e: 0 };
        }

        return (rows as any[])[0];
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ REPORTES ============
  getEmisionesPorCampus: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT 
            c.id as campus_id,
            c.nombre as campus_nombre,
            COALESCE(SUM(ce.emision_co2e), 0) +
            COALESCE(SUM(iaa.emision_total_co2e), 0) +
            COALESCE(SUM(ie.emision_co2e), 0) +
            COALESCE(SUM(rs.emision_co2e), 0) +
            COALESCE(SUM(ca.emision_total_co2e), 0) as emisiones
          FROM campus c
          LEFT JOIN consumo_energia ce ON c.id = ce.campus_id AND ce.ano_inventario_id = ?
          LEFT JOIN inventario_aires_acond iaa ON c.id = iaa.campus_id AND iaa.ano_inventario_id = ?
          LEFT JOIN inventario_extintores ie ON c.id = ie.campus_id AND ie.ano_inventario_id = ?
          LEFT JOIN residuos_solidos rs ON c.id = rs.campus_id AND rs.ano_inventario_id = ?
          LEFT JOIN consumo_agua ca ON c.id = ca.campus_id AND ca.ano_inventario_id = ?
          WHERE c.organizacion_id = (SELECT organizacion_id FROM ano_inventario WHERE id = ?)
          GROUP BY c.id, c.nombre
          ORDER BY c.nombre`,
          [
            input.ano_inventario_id,
            input.ano_inventario_id,
            input.ano_inventario_id,
            input.ano_inventario_id,
            input.ano_inventario_id,
            input.ano_inventario_id,
          ]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ AIRES ACONDICIONADOS ============
  createAireAcondicionado: protectedProcedure
    .input(
      z.object({
        ano_inventario_id: z.number().int().positive(),
        campus_id: z.number().int().positive(),
        tipo_equipo: z.enum(['MiniSplit', 'Cassete', 'Pisotecho']),
        capacidad_btu: z.number().int().positive(),
        capacidad_kg: z.number().positive(),
        cantidad: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const { ano_inventario_id, campus_id, tipo_equipo, capacidad_btu, capacidad_kg, cantidad } = input;
      const db = await getConnection();

      try {
        const gas_refrigerante = 'R-410A';
        const gwp = 2088;
        const k_instalacion = 0.02;
        const x_operacion = 0.10;

        const emision_instalacion = capacidad_kg * k_instalacion * gwp * cantidad / 1000;
        const emision_operacion = capacidad_kg * x_operacion * gwp * cantidad / 1000;
        const emision_total_co2e = emision_instalacion + emision_operacion;

        const [result] = await db.execute(
          `INSERT INTO inventario_aires_acond 
           (ano_inventario_id, campus_id, tipo_equipo, capacidad_btu, capacidad_kg, cantidad, 
            gas_refrigerante, gwp, k_instalacion, x_operacion, emision_instalacion, emision_operacion, emision_total_co2e) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ano_inventario_id, campus_id, tipo_equipo, capacidad_btu, capacidad_kg, cantidad,
           gas_refrigerante, gwp, k_instalacion, x_operacion, emision_instalacion, emision_operacion, emision_total_co2e]
        );

        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true, id: (result as any).insertId, emision_total_co2e };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getAiresAcondicionados: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT iaa.*, c.nombre as campus_nombre 
           FROM inventario_aires_acond iaa
           JOIN campus c ON iaa.campus_id = c.id
           WHERE iaa.ano_inventario_id = ? 
           ORDER BY c.nombre, iaa.tipo_equipo`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteAireAcondicionado: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM inventario_aires_acond WHERE id = ?`,
          [input.id]
        );

        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Aire acondicionado no encontrado' });
        }

        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;

        await db.execute(`DELETE FROM inventario_aires_acond WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ EXTINTORES ============
  createExtintor: protectedProcedure
    .input(
      z.object({
        ano_inventario_id: z.number().int().positive(),
        campus_id: z.number().int().positive(),
        tipo: z.string(),
        peso_kg: z.number().positive(),
        cantidad: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const { ano_inventario_id, campus_id, tipo, peso_kg, cantidad } = input;
      const db = await getConnection();

      try {
        const [factores] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = 'extintor'`,
          [ano_inventario_id]
        );

        let factor_emision = 0.001;
        if ((factores as any[]).length > 0) {
          factor_emision = (factores as any[])[0].factor_emision;
        }

        const emision_co2e = peso_kg * cantidad * factor_emision;

        const [result] = await db.execute(
          `INSERT INTO inventario_extintores 
           (ano_inventario_id, campus_id, tipo, peso_kg, cantidad, factor_emision, emision_co2e) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [ano_inventario_id, campus_id, tipo, peso_kg, cantidad, factor_emision, emision_co2e]
        );

        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true, id: (result as any).insertId, emision_co2e };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getExtintores: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ie.*, c.nombre as campus_nombre 
           FROM inventario_extintores ie
           JOIN campus c ON ie.campus_id = c.id
           WHERE ie.ano_inventario_id = ? 
           ORDER BY c.nombre, ie.tipo`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteExtintor: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM inventario_extintores WHERE id = ?`,
          [input.id]
        );

        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Extintor no encontrado' });
        }

        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;

        await db.execute(`DELETE FROM inventario_extintores WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ RESIDUOS SÓLIDOS ============
  createResiduoSolido: protectedProcedure
    .input(
      z.object({
        ano_inventario_id: z.number().int().positive(),
        campus_id: z.number().int().positive(),
        tipo: z.enum(['relleno', 'compostado', 'peligroso', 'reciclado']),
        cantidad_kg: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const { ano_inventario_id, campus_id, tipo, cantidad_kg } = input;
      const db = await getConnection();

      try {
        const [factores] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = ?`,
          [ano_inventario_id, `residuo_${tipo}`]
        );

        if ((factores as any[]).length === 0) {
          await db.end();
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Factor de emisión no encontrado para este tipo de residuo',
          });
        }

        const factor_emision = (factores as any[])[0].factor_emision;
        const emision_co2e = cantidad_kg * factor_emision;

        const [existing] = await db.execute(
          `SELECT id FROM residuos_solidos WHERE ano_inventario_id = ? AND campus_id = ? AND tipo = ?`,
          [ano_inventario_id, campus_id, tipo]
        );

        if ((existing as any[]).length > 0) {
          await db.execute(
            `UPDATE residuos_solidos SET cantidad_kg = ?, factor_emision = ?, emision_co2e = ? 
             WHERE ano_inventario_id = ? AND campus_id = ? AND tipo = ?`,
            [cantidad_kg, factor_emision, emision_co2e, ano_inventario_id, campus_id, tipo]
          );
        } else {
          await db.execute(
            `INSERT INTO residuos_solidos 
             (ano_inventario_id, campus_id, tipo, cantidad_kg, factor_emision, emision_co2e) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [ano_inventario_id, campus_id, tipo, cantidad_kg, factor_emision, emision_co2e]
          );
        }

        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true, emision_co2e };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getResiduosSolidos: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT rs.*, c.nombre as campus_nombre 
           FROM residuos_solidos rs
           JOIN campus c ON rs.campus_id = c.id
           WHERE rs.ano_inventario_id = ? 
           ORDER BY c.nombre, rs.tipo`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ AGUA ============
  createConsumoAgua: protectedProcedure
    .input(
      z.object({
        ano_inventario_id: z.number().int().positive(),
        campus_id: z.number().int().positive(),
        agua_potable_m3: z.number().nonnegative(),
        agua_residual_m3: z.number().nonnegative(),
      })
    )
    .mutation(async ({ input }) => {
      const { ano_inventario_id, campus_id, agua_potable_m3, agua_residual_m3 } = input;
      const db = await getConnection();

      try {
        const [factorPotable] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = 'agua_potable'`,
          [ano_inventario_id]
        );

        const [factorResidual] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = 'agua_residual'`,
          [ano_inventario_id]
        );

        if ((factorPotable as any[]).length === 0 || (factorResidual as any[]).length === 0) {
          await db.end();
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Factores de emisión de agua no encontrados',
          });
        }

        const factor_emision_potable = (factorPotable as any[])[0].factor_emision;
        const factor_emision_residual = (factorResidual as any[])[0].factor_emision;

        const emision_potable_co2e = agua_potable_m3 * factor_emision_potable;
        const emision_residual_co2e = agua_residual_m3 * factor_emision_residual;
        const emision_total_co2e = emision_potable_co2e + emision_residual_co2e;

        const [existing] = await db.execute(
          `SELECT id FROM consumo_agua WHERE ano_inventario_id = ? AND campus_id = ?`,
          [ano_inventario_id, campus_id]
        );

        if ((existing as any[]).length > 0) {
          await db.execute(
            `UPDATE consumo_agua 
             SET agua_potable_m3 = ?, agua_residual_m3 = ?, 
                 factor_emision_potable = ?, factor_emision_residual = ?,
                 emision_potable_co2e = ?, emision_residual_co2e = ?, emision_total_co2e = ?
             WHERE ano_inventario_id = ? AND campus_id = ?`,
            [agua_potable_m3, agua_residual_m3, factor_emision_potable, factor_emision_residual,
             emision_potable_co2e, emision_residual_co2e, emision_total_co2e, ano_inventario_id, campus_id]
          );
        } else {
          await db.execute(
            `INSERT INTO consumo_agua 
             (ano_inventario_id, campus_id, agua_potable_m3, agua_residual_m3, 
              factor_emision_potable, factor_emision_residual, emision_potable_co2e, 
              emision_residual_co2e, emision_total_co2e) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [ano_inventario_id, campus_id, agua_potable_m3, agua_residual_m3,
             factor_emision_potable, factor_emision_residual, emision_potable_co2e,
             emision_residual_co2e, emision_total_co2e]
          );
        }

        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true, emision_total_co2e };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getConsumosAgua: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ca.*, c.nombre as campus_nombre 
           FROM consumo_agua ca
           JOIN campus c ON ca.campus_id = c.id
           WHERE ca.ano_inventario_id = ? 
           ORDER BY c.nombre`,
          [input.ano_inventario_id]
        );
        await db.end();
        return rows;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ ACTUALIZAR Y ELIMINAR ============
  
  updateCombustible: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      tipo_combustible: z.enum(['gasolina', 'diesel']),
      cantidad: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const { id, tipo_combustible, cantidad } = input;
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM consumo_combustible WHERE id = ?`,
          [id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        
        const [factores] = await db.execute(
          `SELECT factor_emision FROM factores_emision 
           WHERE ano_inventario_id = ? AND categoria = 'combustible' AND tipo = ?`,
          [ano_inventario_id, tipo_combustible]
        );
        const factor_emision = (factores as any[])[0]?.factor_emision || 0;
        const emision_co2e = cantidad * factor_emision;
        
        await db.execute(
          `UPDATE consumo_combustible SET tipo_combustible = ?, cantidad = ?, emision_co2e = ? WHERE id = ?`,
          [tipo_combustible, cantidad, emision_co2e, id]
        );
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteCombustible: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM consumo_combustible WHERE id = ?`,
          [input.id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM consumo_combustible WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateEnergia: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      cantidad_kwh: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const { id, cantidad_kwh } = input;
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM consumo_energia WHERE id = ?`,
          [id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        
        const [factores] = await db.execute(
          `SELECT factor_emision FROM factores_emision WHERE ano_inventario_id = ? AND categoria = 'energia'`,
          [ano_inventario_id]
        );
        const factor_emision = (factores as any[])[0]?.factor_emision || 0;
        const emision_co2e = cantidad_kwh * factor_emision;
        
        await db.execute(
          `UPDATE consumo_energia SET cantidad_kwh = ?, emision_co2e = ? WHERE id = ?`,
          [cantidad_kwh, emision_co2e, id]
        );
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteEnergia: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM consumo_energia WHERE id = ?`,
          [input.id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM consumo_energia WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateAireAcondicionado: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      capacidad_btu: z.number().positive(),
      capacidad_kg: z.number().positive(),
      cantidad: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const { id, capacidad_btu, capacidad_kg, cantidad } = input;
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM inventario_aires_acond WHERE id = ?`,
          [id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        const emision_co2e = capacidad_kg * cantidad * 0.001;
        
        await db.execute(
          `UPDATE inventario_aires_acond SET capacidad_btu = ?, capacidad_kg = ?, cantidad = ?, emision_total_co2e = ? WHERE id = ?`,
          [capacidad_btu, capacidad_kg, cantidad, emision_co2e, id]
        );
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateExtintor: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      peso_kg: z.number().positive(),
      cantidad: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const { id, peso_kg, cantidad } = input;
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id, factor_emision FROM inventario_extintores WHERE id = ?`,
          [id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        const factor_emision = (rows as any[])[0].factor_emision;
        const emision_co2e = peso_kg * cantidad * factor_emision;
        
        await db.execute(
          `UPDATE inventario_extintores SET peso_kg = ?, cantidad = ?, emision_co2e = ? WHERE id = ?`,
          [peso_kg, cantidad, emision_co2e, id]
        );
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateResiduo: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      cantidad_kg: z.number().positive(),
    }))
    .mutation(async ({ input }) => {
      const { id, cantidad_kg } = input;
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id, factor_emision FROM residuos_solidos WHERE id = ?`,
          [id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        const factor_emision = (rows as any[])[0].factor_emision;
        const emision_co2e = cantidad_kg * factor_emision;
        
        await db.execute(
          `UPDATE residuos_solidos SET cantidad_kg = ?, emision_co2e = ? WHERE id = ?`,
          [cantidad_kg, emision_co2e, id]
        );
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteResiduo: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM residuos_solidos WHERE id = ?`,
          [input.id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM residuos_solidos WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateAgua: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      agua_potable_m3: z.number().nonnegative(),
      agua_residual_m3: z.number().nonnegative(),
    }))
    .mutation(async ({ input }) => {
      const { id, agua_potable_m3, agua_residual_m3 } = input;
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id, factor_emision_potable, factor_emision_residual FROM consumo_agua WHERE id = ?`,
          [id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        const factor_emision_potable = (rows as any[])[0].factor_emision_potable;
        const factor_emision_residual = (rows as any[])[0].factor_emision_residual;
        
        const emision_potable_co2e = agua_potable_m3 * factor_emision_potable;
        const emision_residual_co2e = agua_residual_m3 * factor_emision_residual;
        const emision_total_co2e = emision_potable_co2e + emision_residual_co2e;
        
        await db.execute(
          `UPDATE consumo_agua SET agua_potable_m3 = ?, agua_residual_m3 = ?, 
           emision_potable_co2e = ?, emision_residual_co2e = ?, emision_total_co2e = ? WHERE id = ?`,
          [agua_potable_m3, agua_residual_m3, emision_potable_co2e, emision_residual_co2e, emision_total_co2e, id]
        );
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteAgua: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ano_inventario_id FROM consumo_agua WHERE id = ?`,
          [input.id]
        );
        if ((rows as any[]).length === 0) {
          await db.end();
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Registro no encontrado' });
        }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM consumo_agua WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateFactoresEmision: protectedProcedure
    .input(z.object({
      ano_inventario_id: z.number().int().positive(),
      gasolina_kg_co2e_por_litro: z.number().nonnegative(),
      diesel_kg_co2e_por_litro: z.number().nonnegative(),
      energia_kg_co2e_por_kwh: z.number().nonnegative(),
      r22_kg_co2e_por_kg: z.number().nonnegative(),
      r410a_kg_co2e_por_kg: z.number().nonnegative(),
      r134a_kg_co2e_por_kg: z.number().nonnegative(),
      co2_extintor_kg_co2e_por_kg: z.number().nonnegative(),
      pqs_extintor_kg_co2e_por_kg: z.number().nonnegative(),
      residuo_relleno_kg_co2e_por_kg: z.number().nonnegative(),
      residuo_compostado_kg_co2e_por_kg: z.number().nonnegative(),
      residuo_peligroso_kg_co2e_por_kg: z.number().nonnegative(),
      residuo_reciclado_kg_co2e_por_kg: z.number().nonnegative(),
      agua_potable_kg_co2e_por_m3: z.number().nonnegative(),
      agua_residual_kg_co2e_por_m3: z.number().nonnegative(),
    }))
    .mutation(async ({ input }) => {
      const { ano_inventario_id, ...factores } = input;
      const db = await getConnection();
      try {
        // Actualizar factores en la tabla factores_emision_ano
        await db.execute(
          `UPDATE factores_emision_ano SET 
            gasolina_kg_co2e_por_litro = ?,
            diesel_kg_co2e_por_litro = ?,
            energia_kg_co2e_por_kwh = ?,
            r22_kg_co2e_por_kg = ?,
            r410a_kg_co2e_por_kg = ?,
            r134a_kg_co2e_por_kg = ?,
            co2_extintor_kg_co2e_por_kg = ?,
            pqs_extintor_kg_co2e_por_kg = ?,
            residuo_relleno_kg_co2e_por_kg = ?,
            residuo_compostado_kg_co2e_por_kg = ?,
            residuo_peligroso_kg_co2e_por_kg = ?,
            residuo_reciclado_kg_co2e_por_kg = ?,
            agua_potable_kg_co2e_por_m3 = ?,
            agua_residual_kg_co2e_por_m3 = ?
          WHERE ano_inventario_id = ?`,
          [
            factores.gasolina_kg_co2e_por_litro,
            factores.diesel_kg_co2e_por_litro,
            factores.energia_kg_co2e_por_kwh,
            factores.r22_kg_co2e_por_kg,
            factores.r410a_kg_co2e_por_kg,
            factores.r134a_kg_co2e_por_kg,
            factores.co2_extintor_kg_co2e_por_kg,
            factores.pqs_extintor_kg_co2e_por_kg,
            factores.residuo_relleno_kg_co2e_por_kg,
            factores.residuo_compostado_kg_co2e_por_kg,
            factores.residuo_peligroso_kg_co2e_por_kg,
            factores.residuo_reciclado_kg_co2e_por_kg,
            factores.agua_potable_kg_co2e_por_m3,
            factores.agua_residual_kg_co2e_por_m3,
            ano_inventario_id,
          ]
        );

        // Recalcular emisiones de combustibles
        await db.execute(
          `UPDATE consumo_combustible cc
           JOIN factores_emision_ano fe ON cc.ano_inventario_id = fe.ano_inventario_id
           SET cc.factor_emision = CASE 
             WHEN cc.tipo_combustible = 'gasolina' THEN fe.gasolina_kg_co2e_por_litro
             WHEN cc.tipo_combustible = 'diesel' THEN fe.diesel_kg_co2e_por_litro
             ELSE cc.factor_emision
           END,
           cc.emision_co2e = cc.cantidad * CASE 
             WHEN cc.tipo_combustible = 'gasolina' THEN fe.gasolina_kg_co2e_por_litro
             WHEN cc.tipo_combustible = 'diesel' THEN fe.diesel_kg_co2e_por_litro
             ELSE cc.factor_emision
           END
           WHERE cc.ano_inventario_id = ?`,
          [ano_inventario_id]
        );

        // Recalcular emisiones de energía
        await db.execute(
          `UPDATE consumo_energia ce
           JOIN factores_emision_ano fe ON ce.ano_inventario_id = fe.ano_inventario_id
           SET ce.factor_emision = fe.energia_kg_co2e_por_kwh,
           ce.emision_co2e = ce.cantidad_kwh * fe.energia_kg_co2e_por_kwh
           WHERE ce.ano_inventario_id = ?`,
          [ano_inventario_id]
        );

        // Recalcular emisiones de aires acondicionados
        await db.execute(
          `UPDATE inventario_aires_acond iaa
           JOIN factores_emision_ano fe ON iaa.ano_inventario_id = fe.ano_inventario_id
           SET iaa.factor_emision = CASE 
             WHEN iaa.tipo_refrigerante = 'R-22' THEN fe.r22_kg_co2e_por_kg
             WHEN iaa.tipo_refrigerante = 'R-410A' THEN fe.r410a_kg_co2e_por_kg
             WHEN iaa.tipo_refrigerante = 'R-134a' THEN fe.r134a_kg_co2e_por_kg
             ELSE iaa.factor_emision
           END,
           iaa.emision_total_co2e = iaa.capacidad_kg * CASE 
             WHEN iaa.tipo_refrigerante = 'R-22' THEN fe.r22_kg_co2e_por_kg
             WHEN iaa.tipo_refrigerante = 'R-410A' THEN fe.r410a_kg_co2e_por_kg
             WHEN iaa.tipo_refrigerante = 'R-134a' THEN fe.r134a_kg_co2e_por_kg
             ELSE iaa.factor_emision
           END
           WHERE iaa.ano_inventario_id = ?`,
          [ano_inventario_id]
        );

        // Recalcular emisiones de extintores
        await db.execute(
          `UPDATE inventario_extintores ie
           JOIN factores_emision_ano fe ON ie.ano_inventario_id = fe.ano_inventario_id
           SET ie.factor_emision = CASE 
             WHEN ie.tipo = 'CO2' THEN fe.co2_extintor_kg_co2e_por_kg
             WHEN ie.tipo = 'PQS' THEN fe.pqs_extintor_kg_co2e_por_kg
             ELSE ie.factor_emision
           END,
           ie.emision_co2e = ie.peso_kg * ie.cantidad * CASE 
             WHEN ie.tipo = 'CO2' THEN fe.co2_extintor_kg_co2e_por_kg
             WHEN ie.tipo = 'PQS' THEN fe.pqs_extintor_kg_co2e_por_kg
             ELSE ie.factor_emision
           END
           WHERE ie.ano_inventario_id = ?`,
          [ano_inventario_id]
        );

        // Recalcular emisiones de residuos
        await db.execute(
          `UPDATE residuos_solidos rs
           JOIN factores_emision_ano fe ON rs.ano_inventario_id = fe.ano_inventario_id
           SET rs.factor_emision = CASE 
             WHEN rs.tipo = 'relleno' THEN fe.residuo_relleno_kg_co2e_por_kg
             WHEN rs.tipo = 'compostado' THEN fe.residuo_compostado_kg_co2e_por_kg
             WHEN rs.tipo = 'peligroso' THEN fe.residuo_peligroso_kg_co2e_por_kg
             WHEN rs.tipo = 'reciclado' THEN fe.residuo_reciclado_kg_co2e_por_kg
             ELSE rs.factor_emision
           END,
           rs.emision_co2e = rs.cantidad_kg * CASE 
             WHEN rs.tipo = 'relleno' THEN fe.residuo_relleno_kg_co2e_por_kg
             WHEN rs.tipo = 'compostado' THEN fe.residuo_compostado_kg_co2e_por_kg
             WHEN rs.tipo = 'peligroso' THEN fe.residuo_peligroso_kg_co2e_por_kg
             WHEN rs.tipo = 'reciclado' THEN fe.residuo_reciclado_kg_co2e_por_kg
             ELSE rs.factor_emision
           END
           WHERE rs.ano_inventario_id = ?`,
          [ano_inventario_id]
        );

        // Recalcular emisiones de agua
        await db.execute(
          `UPDATE consumo_agua ca
           JOIN factores_emision_ano fe ON ca.ano_inventario_id = fe.ano_inventario_id
           SET ca.factor_emision_potable = fe.agua_potable_kg_co2e_por_m3,
           ca.factor_emision_residual = fe.agua_residual_kg_co2e_por_m3,
           ca.emision_potable_co2e = ca.agua_potable_m3 * fe.agua_potable_kg_co2e_por_m3,
           ca.emision_residual_co2e = ca.agua_residual_m3 * fe.agua_residual_kg_co2e_por_m3,
           ca.emision_total_co2e = (ca.agua_potable_m3 * fe.agua_potable_kg_co2e_por_m3) + (ca.agua_residual_m3 * fe.agua_residual_kg_co2e_por_m3)
           WHERE ca.ano_inventario_id = ?`,
          [ano_inventario_id]
        );

        // Recalcular huella de carbono total
        await recalcularHuellaCarbono(db, ano_inventario_id);
        
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  importarDatosMasivos: protectedProcedure
    .input(z.object({
      tipo: z.enum(['combustibles', 'energia', 'aires_acondicionados', 'extintores', 'residuos', 'agua']),
      ano_inventario_id: z.number().int().positive(),
      datos: z.array(z.any()),
    }))
    .mutation(async ({ input }) => {
      const { tipo, ano_inventario_id, datos } = input;
      const db = await getConnection();
      const resultados = { exitosos: 0, errores: [] as any[] };

      try {
        // Obtener factores de emisión del año
        const [factoresRows] = await db.execute(
          `SELECT * FROM factores_emision_ano WHERE ano_inventario_id = ?`,
          [ano_inventario_id]
        );
        const factores = (factoresRows as any[])[0];

        for (let i = 0; i < datos.length; i++) {
          const fila = datos[i];
          try {
            if (tipo === 'combustibles') {
              const factor = fila.tipo_combustible === 'gasolina' 
                ? factores.gasolina_kg_co2e_por_litro 
                : factores.diesel_kg_co2e_por_litro;
              const emision_co2e = fila.cantidad * factor;
              await db.execute(
                `INSERT INTO consumo_combustible (ano_inventario_id, tipo_combustible, cantidad, factor_emision, emision_co2e, fecha_registro)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [ano_inventario_id, fila.tipo_combustible, fila.cantidad, factor, emision_co2e, fila.fecha_registro || new Date()]
              );
            } else if (tipo === 'energia') {
              const emision_co2e = fila.cantidad_kwh * factores.energia_kg_co2e_por_kwh;
              await db.execute(
                `INSERT INTO consumo_energia (ano_inventario_id, campus_id, cantidad_kwh, factor_emision, emision_co2e, fecha_registro)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [ano_inventario_id, fila.campus_id, fila.cantidad_kwh, factores.energia_kg_co2e_por_kwh, emision_co2e, fila.fecha_registro || new Date()]
              );
            } else if (tipo === 'aires_acondicionados') {
              const factor = fila.tipo_refrigerante === 'R-22' ? factores.r22_kg_co2e_por_kg
                : fila.tipo_refrigerante === 'R-410A' ? factores.r410a_kg_co2e_por_kg
                : factores.r134a_kg_co2e_por_kg;
              const emision_total_co2e = fila.capacidad_kg * factor;
              await db.execute(
                `INSERT INTO inventario_aires_acond (ano_inventario_id, campus_id, tipo_equipo, capacidad_btu, capacidad_kg, tipo_refrigerante, cantidad, factor_emision, emision_total_co2e)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [ano_inventario_id, fila.campus_id, fila.tipo_equipo, fila.capacidad_btu, fila.capacidad_kg, fila.tipo_refrigerante, fila.cantidad, factor, emision_total_co2e]
              );
            } else if (tipo === 'extintores') {
              const factor = fila.tipo === 'CO2' ? factores.co2_extintor_kg_co2e_por_kg : factores.pqs_extintor_kg_co2e_por_kg;
              const emision_co2e = fila.peso_kg * fila.cantidad * factor;
              await db.execute(
                `INSERT INTO inventario_extintores (ano_inventario_id, campus_id, tipo, peso_kg, cantidad, factor_emision, emision_co2e)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [ano_inventario_id, fila.campus_id, fila.tipo, fila.peso_kg, fila.cantidad, factor, emision_co2e]
              );
            } else if (tipo === 'residuos') {
              const factor = fila.tipo === 'relleno' ? factores.residuo_relleno_kg_co2e_por_kg
                : fila.tipo === 'compostado' ? factores.residuo_compostado_kg_co2e_por_kg
                : fila.tipo === 'peligroso' ? factores.residuo_peligroso_kg_co2e_por_kg
                : factores.residuo_reciclado_kg_co2e_por_kg;
              const emision_co2e = fila.cantidad_kg * factor;
              await db.execute(
                `INSERT INTO residuos_solidos (ano_inventario_id, campus_id, tipo, cantidad_kg, factor_emision, emision_co2e, fecha_registro)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [ano_inventario_id, fila.campus_id, fila.tipo, fila.cantidad_kg, factor, emision_co2e, fila.fecha_registro || new Date()]
              );
            } else if (tipo === 'agua') {
              const emision_potable_co2e = fila.agua_potable_m3 * factores.agua_potable_kg_co2e_por_m3;
              const emision_residual_co2e = fila.agua_residual_m3 * factores.agua_residual_kg_co2e_por_m3;
              const emision_total_co2e = emision_potable_co2e + emision_residual_co2e;
              await db.execute(
                `INSERT INTO consumo_agua (ano_inventario_id, campus_id, agua_potable_m3, agua_residual_m3, factor_emision_potable, factor_emision_residual, emision_potable_co2e, emision_residual_co2e, emision_total_co2e, fecha_registro)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [ano_inventario_id, fila.campus_id, fila.agua_potable_m3, fila.agua_residual_m3, factores.agua_potable_kg_co2e_por_m3, factores.agua_residual_kg_co2e_por_m3, emision_potable_co2e, emision_residual_co2e, emision_total_co2e, fila.fecha_registro || new Date()]
              );
            }
            resultados.exitosos++;
          } catch (error: any) {
            resultados.errores.push({ fila: i + 2, error: error.message });
          }
        }

        // Recalcular huella de carbono
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return resultados;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ METAS Y ALERTAS ============

  createMeta: protectedProcedure
    .input(z.object({
      ano_inventario_id: z.number().int().positive(),
      categoria: z.enum(['total', 'alcance_1', 'alcance_2', 'alcance_3', 'combustibles', 'energia', 'aires_acondicionados', 'extintores', 'residuos', 'agua']),
      tipo_meta: z.enum(['reduccion_porcentual', 'valor_absoluto']),
      valor_objetivo: z.number(),
      valor_base: z.number().optional(),
      ano_base: z.number().int().optional(),
      descripcion: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [result] = await db.execute(
          `INSERT INTO metas_reduccion (ano_inventario_id, categoria, tipo_meta, valor_objetivo, valor_base, ano_base, descripcion)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [input.ano_inventario_id, input.categoria, input.tipo_meta, input.valor_objetivo, input.valor_base || null, input.ano_base || null, input.descripcion || null]
        );
        await db.end();
        return { id: (result as any).insertId };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getMetas: protectedProcedure
    .input(z.object({
      ano_inventario_id: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [metas] = await db.execute(
          `SELECT * FROM metas_reduccion WHERE ano_inventario_id = ? ORDER BY fecha_creacion DESC`,
          [input.ano_inventario_id]
        );
        await db.end();
        return metas;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getProgresoMetas: protectedProcedure
    .input(z.object({
      ano_inventario_id: z.number().int().positive(),
    }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        // Obtener resumen de huella de carbono
        const [resumenRows] = await db.execute(
          `SELECT * FROM resumen_huella_carbono WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const resumen = (resumenRows as any[])[0];

        // Obtener emisiones por categoría
        const [combustiblesRows] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM consumo_combustible WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const [energiaRows] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM consumo_energia WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const [airesRows] = await db.execute(
          `SELECT COALESCE(SUM(emision_total_co2e), 0) as total FROM inventario_aires_acond WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const [extintoresRows] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM inventario_extintores WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const [residuosRows] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM residuos_solidos WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const [aguaRows] = await db.execute(
          `SELECT COALESCE(SUM(emision_total_co2e), 0) as total FROM consumo_agua WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        const emisionesActuales: any = {
          total: resumen?.total_co2e || 0,
          alcance_1: resumen?.alcance_1 || 0,
          alcance_2: resumen?.alcance_2 || 0,
          alcance_3: resumen?.alcance_3 || 0,
          combustibles: (combustiblesRows as any[])[0].total,
          energia: (energiaRows as any[])[0].total,
          aires_acondicionados: (airesRows as any[])[0].total,
          extintores: (extintoresRows as any[])[0].total,
          residuos: (residuosRows as any[])[0].total,
          agua: (aguaRows as any[])[0].total,
        };

        // Obtener metas
        const [metas] = await db.execute(
          `SELECT * FROM metas_reduccion WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        // Calcular progreso para cada meta
        const metasConProgreso = (metas as any[]).map((meta) => {
          const emisionActual = emisionesActuales[meta.categoria] || 0;
          let progreso = 0;
          let cumplida = false;

          if (meta.tipo_meta === 'reduccion_porcentual' && meta.valor_base) {
            const reduccionObjetivo = meta.valor_base * (meta.valor_objetivo / 100);
            const valorObjetivo = meta.valor_base - reduccionObjetivo;
            const reduccionActual = meta.valor_base - emisionActual;
            progreso = (reduccionActual / reduccionObjetivo) * 100;
            cumplida = emisionActual <= valorObjetivo;
          } else if (meta.tipo_meta === 'valor_absoluto') {
            progreso = meta.valor_objetivo > 0 ? (emisionActual / meta.valor_objetivo) * 100 : 0;
            cumplida = emisionActual <= meta.valor_objetivo;
          }

          return {
            ...meta,
            emision_actual: emisionActual,
            progreso: Math.round(progreso),
            cumplida,
          };
        });

        await db.end();
        return metasConProgreso;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  updateMeta: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      valor_objetivo: z.number().optional(),
      descripcion: z.string().optional(),
      estado: z.enum(['activa', 'cumplida', 'no_cumplida', 'en_progreso']).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const updates: string[] = [];
        const values: any[] = [];

        if (input.valor_objetivo !== undefined) {
          updates.push('valor_objetivo = ?');
          values.push(input.valor_objetivo);
        }
        if (input.descripcion !== undefined) {
          updates.push('descripcion = ?');
          values.push(input.descripcion);
        }
        if (input.estado !== undefined) {
          updates.push('estado = ?');
          values.push(input.estado);
        }

        if (updates.length > 0) {
          values.push(input.id);
          await db.execute(
            `UPDATE metas_reduccion SET ${updates.join(', ')} WHERE id = ?`,
            values
          );
        }

        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  deleteMeta: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
    }))
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

  getAlertas: protectedProcedure
    .input(z.object({
      ano_inventario_id: z.number().int().positive(),
      solo_no_leidas: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        let query = 'SELECT * FROM alertas WHERE ano_inventario_id = ?';
        const params: any[] = [input.ano_inventario_id];

        if (input.solo_no_leidas) {
          query += ' AND leida = FALSE';
        }

        query += ' ORDER BY fecha_creacion DESC';

        const [alertas] = await db.execute(query, params);
        await db.end();
        return alertas;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  marcarAlertaLeida: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        await db.execute('UPDATE alertas SET leida = TRUE WHERE id = ?', [input.id]);
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  verificarMetas: protectedProcedure
    .input(z.object({
      ano_inventario_id: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        // Obtener progreso de metas
        const [metas] = await db.execute(
          `SELECT * FROM metas_reduccion WHERE ano_inventario_id = ? AND estado = 'activa'`,
          [input.ano_inventario_id]
        );

        // Obtener emisiones actuales (similar a getProgresoMetas)
        const [resumenRows] = await db.execute(
          `SELECT * FROM resumen_huella_carbono WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );
        const resumen = (resumenRows as any[])[0];

        const alertasCreadas = [];

        for (const meta of metas as any[]) {
          let emisionActual = 0;
          
          // Obtener emisión actual según categoría
          if (meta.categoria === 'total') {
            emisionActual = resumen?.total_co2e || 0;
          } else if (meta.categoria.startsWith('alcance_')) {
            emisionActual = resumen?.[meta.categoria] || 0;
          } else {
            // Obtener de tablas específicas
            const tablas: any = {
              combustibles: 'consumo_combustible',
              energia: 'consumo_energia',
              aires_acondicionados: 'inventario_aires_acond',
              extintores: 'inventario_extintores',
              residuos: 'residuos_solidos',
              agua: 'consumo_agua',
            };
            const tabla = tablas[meta.categoria];
            if (tabla) {
              const columna = tabla.includes('inventario') ? 'emision_total_co2e' : 'emision_co2e';
              const [rows] = await db.execute(
                `SELECT COALESCE(SUM(${columna}), 0) as total FROM ${tabla} WHERE ano_inventario_id = ?`,
                [input.ano_inventario_id]
              );
              emisionActual = (rows as any[])[0].total;
            }
          }

          // Verificar si se superó la meta
          let superada = false;
          let mensaje = '';

          if (meta.tipo_meta === 'reduccion_porcentual' && meta.valor_base) {
            const reduccionObjetivo = meta.valor_base * (meta.valor_objetivo / 100);
            const valorObjetivo = meta.valor_base - reduccionObjetivo;
            if (emisionActual > valorObjetivo) {
              superada = true;
              mensaje = `La meta de reducción del ${meta.valor_objetivo}% en ${meta.categoria} fue superada. Emisión actual: ${emisionActual.toFixed(2)} kg CO2e, objetivo: ${valorObjetivo.toFixed(2)} kg CO2e.`;
            }
          } else if (meta.tipo_meta === 'valor_absoluto') {
            if (emisionActual > meta.valor_objetivo) {
              superada = true;
              mensaje = `La meta de ${meta.valor_objetivo} kg CO2e en ${meta.categoria} fue superada. Emisión actual: ${emisionActual.toFixed(2)} kg CO2e.`;
            }
          }

          // Crear alerta si se superó
          if (superada) {
            await db.execute(
              `INSERT INTO alertas (ano_inventario_id, meta_id, tipo_alerta, categoria, mensaje, nivel)
               VALUES (?, ?, 'meta_superada', ?, ?, 'error')`,
              [input.ano_inventario_id, meta.id, meta.categoria, mensaje]
            );
            alertasCreadas.push({ categoria: meta.categoria, mensaje });
          }
        }

        await db.end();
        return { alertas_creadas: alertasCreadas.length, alertas: alertasCreadas };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  // ============ GESTIÓN DE USUARIOS Y ROLES ============

  getRoles: protectedProcedure.query(async () => {
    const db = await getConnection();
    try {
      const [roles] = await db.execute('SELECT * FROM roles ORDER BY id');
      await db.end();
      return roles;
    } catch (error) {
      await db.end();
      throw error;
    }
  }),

  getUsuariosOrganizacion: protectedProcedure
    .input(z.object({ organizacion_id: z.number() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [usuarios] = await db.execute(
          `SELECT uo.*, r.nombre as rol_nombre, r.descripcion as rol_descripcion
           FROM usuarios_organizacion uo
           JOIN roles r ON uo.rol_id = r.id
           WHERE uo.organizacion_id = ?
           ORDER BY uo.created_at DESC`,
          [input.organizacion_id]
        );
        await db.end();
        return usuarios;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  getRolUsuario: protectedProcedure
    .input(z.object({ user_id: z.string(), organizacion_id: z.number() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [result] = await db.execute(
          `SELECT uo.*, r.nombre as rol_nombre, r.permisos
           FROM usuarios_organizacion uo
           JOIN roles r ON uo.rol_id = r.id
           WHERE uo.user_id = ? AND uo.organizacion_id = ?`,
          [input.user_id, input.organizacion_id]
        );
        await db.end();
        const usuarios = result as any[];
        return usuarios.length > 0 ? usuarios[0] : null;
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  asignarRolUsuario: protectedProcedure
    .input(z.object({
      user_id: z.string(),
      organizacion_id: z.number(),
      rol_id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        await db.execute(
          `INSERT INTO usuarios_organizacion (user_id, organizacion_id, rol_id)
           VALUES (?, ?, ?)
           ON DUPLICATE KEY UPDATE rol_id = ?`,
          [input.user_id, input.organizacion_id, input.rol_id, input.rol_id]
        );
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  cambiarRolUsuario: protectedProcedure
    .input(z.object({
      id: z.number(),
      rol_id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        await db.execute(
          'UPDATE usuarios_organizacion SET rol_id = ? WHERE id = ?',
          [input.rol_id, input.id]
        );
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

  eliminarUsuarioOrganizacion: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        await db.execute(
          'DELETE FROM usuarios_organizacion WHERE id = ?',
          [input.id]
        );
        await db.end();
        return { success: true };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

});

// ============ FUNCIONES AUXILIARES ============

async function insertDefaultFactores(db: mysql.Connection, ano_inventario_id: number) {
  const factoresDefault = [
    // Combustibles
    { categoria: 'combustible', tipo: 'gasolina', factor_emision: 7.6181, unidad: 'kg CO2e/gal', fuente: 'Calculadora ITM' },
    { categoria: 'combustible', tipo: 'diesel', factor_emision: 10.149, unidad: 'kg CO2e/gal', fuente: 'Calculadora ITM' },
    // Energía
    { categoria: 'energia', tipo: null, factor_emision: 0.18, unidad: 'kg CO2e/kWh', fuente: 'Factor de red Colombia' },
    // Agua
    { categoria: 'agua_potable', tipo: null, factor_emision: 0.344, unidad: 'kg CO2e/m3', fuente: 'Calculadora ITM' },
    { categoria: 'agua_residual', tipo: null, factor_emision: 0.272, unidad: 'kg CO2e/m3', fuente: 'Calculadora ITM' },
    // Residuos
    { categoria: 'residuo_relleno', tipo: null, factor_emision: 0.5, unidad: 'kg CO2e/kg', fuente: 'Estimado' },
    { categoria: 'residuo_compostado', tipo: null, factor_emision: 0.1, unidad: 'kg CO2e/kg', fuente: 'Estimado' },
    { categoria: 'residuo_peligroso', tipo: null, factor_emision: 1.5, unidad: 'kg CO2e/kg', fuente: 'Estimado' },
    { categoria: 'residuo_reciclado', tipo: null, factor_emision: 0.05, unidad: 'kg CO2e/kg', fuente: 'Estimado' },
  ];

  for (const factor of factoresDefault) {
    await db.execute(
      `INSERT INTO factores_emision (ano_inventario_id, categoria, tipo, factor_emision, unidad, fuente) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [ano_inventario_id, factor.categoria, factor.tipo, factor.factor_emision, factor.unidad, factor.fuente]
    );
  }
}

async function recalcularHuellaCarbono(db: mysql.Connection, ano_inventario_id: number) {
  // Calcular Alcance 1 (combustibles + aires acondicionados + extintores)
  const [alcance1Result] = await db.execute(
    `SELECT 
      COALESCE(SUM(cc.emision_co2e), 0) +
      COALESCE(SUM(iaa.emision_total_co2e), 0) +
      COALESCE(SUM(ie.emision_co2e), 0) as alcance_1
    FROM ano_inventario ai
    LEFT JOIN consumo_combustible cc ON ai.id = cc.ano_inventario_id
    LEFT JOIN inventario_aires_acond iaa ON ai.id = iaa.ano_inventario_id
    LEFT JOIN inventario_extintores ie ON ai.id = ie.ano_inventario_id
    WHERE ai.id = ?`,
    [ano_inventario_id]
  );

  // Calcular Alcance 2 (energía eléctrica)
  const [alcance2Result] = await db.execute(
    `SELECT COALESCE(SUM(emision_co2e), 0) as alcance_2
    FROM consumo_energia
    WHERE ano_inventario_id = ?`,
    [ano_inventario_id]
  );

  // Calcular Alcance 3 (agua + residuos)
  const [alcance3Result] = await db.execute(
    `SELECT 
      COALESCE(SUM(ca.emision_total_co2e), 0) +
      COALESCE(SUM(rs.emision_co2e), 0) as alcance_3
    FROM ano_inventario ai
    LEFT JOIN consumo_agua ca ON ai.id = ca.ano_inventario_id
    LEFT JOIN residuos_solidos rs ON ai.id = rs.ano_inventario_id
    WHERE ai.id = ?`,
    [ano_inventario_id]
  );

  const alcance_1 = (alcance1Result as any[])[0].alcance_1;
  const alcance_2 = (alcance2Result as any[])[0].alcance_2;
  const alcance_3 = (alcance3Result as any[])[0].alcance_3;
  const total_co2e = alcance_1 + alcance_2 + alcance_3;

  // Actualizar resumen
  await db.execute(
    `UPDATE resumen_huella_carbono 
     SET alcance_1 = ?, alcance_2 = ?, alcance_3 = ?, total_co2e = ?
     WHERE ano_inventario_id = ?`,
    [alcance_1, alcance_2, alcance_3, total_co2e, ano_inventario_id]
  );
}
