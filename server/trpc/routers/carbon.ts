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
