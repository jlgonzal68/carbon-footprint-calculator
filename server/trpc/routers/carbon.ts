import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../_core/trpc";
import mysql from 'mysql2/promise';

const getConnection = async () => mysql.createConnection(process.env.DATABASE_URL!);

// --- Output types used by frontend ---
interface AnoInventario { id: number; organizacion_id: number; ano: number; estado: string; }
interface FactorEmision { id: number; ano_inventario_id: number; categoria: string; tipo?: string | null; factor_emision: number; unidad?: string | null; fuente?: string | null; }
interface AireAcondicionado { id: number; ano_inventario_id: number; campus_id: number; marca?: string | null; modelo?: string | null; btu?: number | null; cantidad?: number | null; emision_total_co2e?: number | null; }
interface Alerta { id: number; ano_inventario_id?: number | null; prioridad?: string | null; tipo?: string | null; mensaje?: string | null; categoria?: string | null; leida?: number | null; fecha?: string | null }


const createOrganizacionSchema = z.object({ nombre: z.string().min(1), ano_base: z.number().int().min(2000).max(2100) });
const createAnoInventarioSchema = z.object({ organizacion_id: z.number().int().positive(), ano: z.number().int().min(2000).max(2100), duplicar_factores: z.boolean().optional() });
const createCombustibleSchema = z.object({ ano_inventario_id: z.number().int().positive(), tipo: z.enum(['gasolina','diesel']), cantidad: z.number().positive() });
const createEnergiaSchema = z.object({ ano_inventario_id: z.number().int().positive(), campus_id: z.number().int().positive(), cantidad_kwh: z.number().positive() });

// Zod output schemas
const AnoInventarioSchema = z.object({ id: z.number(), organizacion_id: z.number(), ano: z.number(), estado: z.string() });
const FactorEmisionSchema = z.object({ id: z.number(), ano_inventario_id: z.number(), categoria: z.string(), tipo: z.string().nullable().optional(), factor_emision: z.number(), unidad: z.string().nullable().optional(), fuente: z.string().nullable().optional() });
const AireAcondicionadoSchema = z.object({ id: z.number(), ano_inventario_id: z.number(), campus_id: z.number(), tipo_equipo: z.string().nullable().optional(), capacidad_btu: z.number().nullable().optional(), capacidad_kg: z.number().nullable().optional(), marca: z.string().nullable().optional(), modelo: z.string().nullable().optional(), btu: z.number().nullable().optional(), cantidad: z.number().nullable().optional(), emision_total_co2e: z.number().nullable().optional() });
const AlertaSchema = z.object({ id: z.number(), ano_inventario_id: z.number().nullable().optional(), prioridad: z.string().nullable().optional(), tipo: z.string().nullable().optional(), mensaje: z.string().nullable().optional(), categoria: z.string().nullable().optional(), leida: z.number().nullable().optional(), fecha: z.string().nullable().optional() });

const ComparativaItem = z.object({ ano: z.number(), alcance_1: z.number(), alcance_2: z.number(), alcance_3: z.number(), total: z.number() });
const ComparativaSchema = z.object({ datos: z.array(ComparativaItem), ano_mayor_emision: ComparativaItem.nullable(), ano_menor_emision: ComparativaItem.nullable() });

const EmisionesPorCategoriaSchema = z.object({ combustibles: z.number(), energia: z.number(), aires_acondicionados: z.number(), extintores: z.number(), residuos: z.number(), agua: z.number() });

export const carbonRouter = router({
  createOrganizacion: protectedProcedure.input(createOrganizacionSchema).mutation(async ({ input, ctx }) => {
    const db = await getConnection();
    try {
      const usuario_id = ctx.user.openId;
      const [result] = await db.execute(`INSERT INTO organizacion (nombre, ano_base, usuario_id) VALUES (?, ?, ?)`, [input.nombre, input.ano_base, usuario_id]);
      const organizacion_id = (result as any).insertId;
      const campusNombres = ['Robledo','Fraternidad','Floresta','Prado','Castilla'];
      for (const nombre of campusNombres) await db.execute(`INSERT INTO campus (organizacion_id, nombre) VALUES (?,?)`, [organizacion_id, nombre]);
      return { id: organizacion_id, nombre: input.nombre, ano_base: input.ano_base };
    } finally { try { await db.end(); } catch {} }
  }),

  getOrganizaciones: protectedProcedure.query(async ({ ctx }) => {
    const db = await getConnection();
    try {
      const usuario_id = ctx.user.openId;
      const [rows] = await db.execute(`SELECT * FROM organizacion WHERE usuario_id = ? ORDER BY fecha_creacion DESC`, [usuario_id]);
      return rows;
    } finally { await db.end(); }
  }),

  createAnoInventario: protectedProcedure.input(createAnoInventarioSchema).mutation(async ({ input }) => {
    const db = await getConnection();
    try {
      const [existing] = await db.execute(`SELECT id FROM ano_inventario WHERE organizacion_id = ? AND ano = ?`, [input.organizacion_id, input.ano]);
      if ((existing as any[]).length > 0) throw new TRPCError({ code: 'CONFLICT', message: 'El año de inventario ya existe' });
      const [result] = await db.execute(`INSERT INTO ano_inventario (organizacion_id, ano, estado) VALUES (?, ?, 'borrador')`, [input.organizacion_id, input.ano]);
      const ano_inventario_id = (result as any).insertId;
      if (input.duplicar_factores) {
        await db.execute(`INSERT INTO factores_emision (ano_inventario_id, categoria, tipo, factor_emision, unidad, fuente)
          SELECT ?, categoria, tipo, factor_emision, unidad, fuente FROM factores_emision WHERE ano_inventario_id = (
            SELECT id FROM ano_inventario WHERE organizacion_id = ? AND ano < ? ORDER BY ano DESC LIMIT 1
          )`, [ano_inventario_id, input.organizacion_id, input.ano]);
      } else {
        await insertDefaultFactores(db, ano_inventario_id);
      }
      await db.execute(`INSERT INTO resumen_huella_carbono (ano_inventario_id) VALUES (?)`, [ano_inventario_id]);
      return { id: ano_inventario_id, organizacion_id: input.organizacion_id, ano: input.ano, estado: 'borrador' };
    } finally { await db.end(); }
  }),

  createConsumoCombustible: protectedProcedure.input(createCombustibleSchema).mutation(async ({ input }) => {
    const db = await getConnection();
    try {
      const [factores] = await db.execute(`SELECT factor_emision FROM factores_emision WHERE ano_inventario_id = ? AND categoria = 'combustible' AND tipo = ?`, [input.ano_inventario_id, input.tipo]);
      if ((factores as any[]).length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Factor de emisión no encontrado' });
      const factor_emision = (factores as any[])[0].factor_emision;
      const emision_co2e = input.cantidad * factor_emision;
      const [existing] = await db.execute(`SELECT id FROM consumo_combustible WHERE ano_inventario_id = ? AND tipo = ?`, [input.ano_inventario_id, input.tipo]);
      if ((existing as any[]).length > 0) await db.execute(`UPDATE consumo_combustible SET cantidad = ?, factor_emision = ?, emision_co2e = ? WHERE ano_inventario_id = ? AND tipo = ?`, [input.cantidad, factor_emision, emision_co2e, input.ano_inventario_id, input.tipo]);
      else await db.execute(`INSERT INTO consumo_combustible (ano_inventario_id, tipo, cantidad, factor_emision, emision_co2e) VALUES (?, ?, ?, ?, ?)`, [input.ano_inventario_id, input.tipo, input.cantidad, factor_emision, emision_co2e]);
      await recalcularHuellaCarbono(db, input.ano_inventario_id);
      return { success: true, emision_co2e };
    } finally { await db.end(); }
  }),

  createConsumoEnergia: protectedProcedure.input(createEnergiaSchema).mutation(async ({ input }) => {
    const db = await getConnection();
    try {
      const [factores] = await db.execute(`SELECT factor_emision FROM factores_emision WHERE ano_inventario_id = ? AND categoria = 'energia'`, [input.ano_inventario_id]);
      if ((factores as any[]).length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Factor de emisión no encontrado para energía' });
      const factor_emision = (factores as any[])[0].factor_emision;
      const emision_co2e = input.cantidad_kwh * factor_emision;
      const [existing] = await db.execute(`SELECT id FROM consumo_energia WHERE ano_inventario_id = ? AND campus_id = ?`, [input.ano_inventario_id, input.campus_id]);
      if ((existing as any[]).length > 0) await db.execute(`UPDATE consumo_energia SET cantidad_kwh = ?, factor_emision = ?, emision_co2e = ? WHERE ano_inventario_id = ? AND campus_id = ?`, [input.cantidad_kwh, factor_emision, emision_co2e, input.ano_inventario_id, input.campus_id]);
      else await db.execute(`INSERT INTO consumo_energia (ano_inventario_id, campus_id, cantidad_kwh, factor_emision, emision_co2e) VALUES (?, ?, ?, ?, ?)`, [input.ano_inventario_id, input.campus_id, input.cantidad_kwh, factor_emision, emision_co2e]);
      await recalcularHuellaCarbono(db, input.ano_inventario_id);
      return { success: true, emision_co2e };
    } finally { await db.end(); }
  }),

  getResumenHuellaCarbono: protectedProcedure.input(z.object({ ano_inventario_id: z.number().int().positive() })).query(async ({ input }) => {
    const db = await getConnection();
    try {
      const [rows] = await db.execute(`SELECT * FROM resumen_huella_carbono WHERE ano_inventario_id = ?`, [input.ano_inventario_id]);
      if ((rows as any[]).length === 0) return { alcance_1: 0, alcance_2: 0, alcance_3: 0, total_co2e: 0 };
      return (rows as any[])[0];
    } finally { await db.end(); }
  }),
// (helpers moved to file end to keep single router object)

  // (removed duplicate residues/water block; single canonical copy exists later in file)

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

    // ============ STUBS / Compatibility endpoints ============
    // These are minimal implementations added to restore missing client calls
    getAnosInventario: protectedProcedure
      .input(z.object({ organizacion_id: z.number().int().positive() }).optional())
      .output(z.array(AnoInventarioSchema))
      .query(async ({ input }) => {
        const db = await getConnection();
        try {
          const [rows] = await db.execute(`SELECT * FROM ano_inventario WHERE organizacion_id = ? ORDER BY ano DESC`, [input?.organizacion_id || 0]);
          await db.end();
          return (rows as any[]) as AnoInventario[];
        } catch (e) { await db.end(); throw e; }
      }),

    getFactoresEmision: protectedProcedure
      .input(z.object({ ano_inventario_id: z.number().int().positive() }).optional())
      .output(z.array(FactorEmisionSchema))
      .query(async ({ input }) => {
        const db = await getConnection();
        try {
          const [rows] = await db.execute(`SELECT * FROM factores_emision WHERE ano_inventario_id = ?`, [input?.ano_inventario_id || null]);
          await db.end();
          return (rows as any[]) as FactorEmision[];
        } catch (e) { await db.end(); throw e; }
      }),

    getAiresAcondicionados: protectedProcedure
      .input(z.object({ ano_inventario_id: z.number().int().positive() }).optional())
      .output(z.array(AireAcondicionadoSchema))
      .query(async ({ input }) => {
        const db = await getConnection();
        try {
          const [rows] = await db.execute(`SELECT * FROM inventario_aires_acond WHERE ano_inventario_id = ?`, [input?.ano_inventario_id || null]);
          await db.end();
          return (rows as any[]) as AireAcondicionado[];
        } catch (e) { await db.end(); throw e; }
      }),

    createAireAcondicionado: protectedProcedure
      .input(z.object({ ano_inventario_id: z.number().int().positive(), campus_id: z.number().int().positive(), tipo_equipo: z.string().optional(), capacidad_btu: z.number().optional(), capacidad_kg: z.number().optional(), marca: z.string().optional(), modelo: z.string().optional(), btu: z.number().optional(), cantidad: z.number().optional() }))
      .mutation(async ({ input }) => {
        const db = await getConnection();
        try {
          const [res] = await db.execute(`INSERT INTO inventario_aires_acond (ano_inventario_id, campus_id, tipo_equipo, capacidad_btu, capacidad_kg, marca, modelo, btu, cantidad) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [input.ano_inventario_id, input.campus_id, input.tipo_equipo ?? null, input.capacidad_btu ?? input.btu ?? null, input.capacidad_kg ?? null, input.marca ?? null, input.modelo ?? null, input.btu ?? null, input.cantidad ?? null]);
          const id = (res as any).insertId;
          await recalcularHuellaCarbono(db, input.ano_inventario_id);
          await db.end();
          return { success: true, id } as { success: true; id: number };
        } catch (e) { await db.end(); throw e; }
      }),

    updateAireAcondicionado: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), tipo_equipo: z.string().optional(), capacidad_btu: z.number().optional(), capacidad_kg: z.number().optional(), marca: z.string().optional(), modelo: z.string().optional(), btu: z.number().optional(), cantidad: z.number().optional() }))
      .mutation(async ({ input }) => {
        const db = await getConnection();
        try {
          await db.execute(`UPDATE inventario_aires_acond SET tipo_equipo = ?, capacidad_btu = ?, capacidad_kg = ?, marca = ?, modelo = ?, btu = ?, cantidad = ? WHERE id = ?`, [input.tipo_equipo ?? null, input.capacidad_btu ?? input.btu ?? null, input.capacidad_kg ?? null, input.marca ?? null, input.modelo ?? null, input.btu ?? null, input.cantidad ?? null, input.id]);
          await db.end();
          return { success: true };
        } catch (e) { await db.end(); throw e; }
      }),

    deleteAireAcondicionado: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        const db = await getConnection();
        try {
          const [[row]] = await db.execute(`SELECT ano_inventario_id FROM inventario_aires_acond WHERE id = ?`, [input.id]) as any;
          await db.execute(`DELETE FROM inventario_aires_acond WHERE id = ?`, [input.id]);
          if (row && row.ano_inventario_id) await recalcularHuellaCarbono(db, row.ano_inventario_id);
          await db.end();
          return { success: true };
        } catch (e) { await db.end(); throw e; }
      }),

    getConsumosCombustible: protectedProcedure
      .input(z.object({ ano_inventario_id: z.number().int().positive() }).optional())
      .output(z.array(z.any()))
      .query(async ({ input }) => {
        const db = await getConnection();
        try {
          const [rows] = await db.execute(`SELECT * FROM consumo_combustible WHERE ano_inventario_id = ?`, [input?.ano_inventario_id || null]);
          await db.end();
          return (rows as any[]);
        } catch (e) { await db.end(); throw e; }
      }),

    updateCombustible: protectedProcedure.input(z.object({ id: z.number().int().optional(), ano_inventario_id: z.number().int().optional(), tipo: z.enum(['gasolina','diesel']).optional(), tipo_combustible: z.enum(['gasolina','diesel']).optional(), cantidad: z.number().positive() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        // If ID is provided, update by id
        if (input.id) {
          const [rows] = await db.execute(`SELECT ano_inventario_id, tipo FROM consumo_combustible WHERE id = ?`, [input.id]);
          if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Consumo no encontrado' }); }
          const r = (rows as any[])[0];
          const [factores] = await db.execute(`SELECT factor_emision FROM factores_emision WHERE ano_inventario_id = ? AND categoria = 'combustible' AND tipo = ?`, [r.ano_inventario_id, r.tipo]);
          const factor_emision = (factores as any[])[0]?.factor_emision ?? 0;
          const emision_co2e = input.cantidad * factor_emision;
          await db.execute(`UPDATE consumo_combustible SET cantidad = ?, factor_emision = ?, emision_co2e = ? WHERE id = ?`, [input.cantidad, factor_emision, emision_co2e, input.id]);
          await recalcularHuellaCarbono(db, r.ano_inventario_id);
          await db.end();
          return { success: true, emision_co2e };
        }
        // Otherwise require ano_inventario_id and tipo (support alias tipo_combustible)
        const tipoFinal = input.tipo ?? input.tipo_combustible;
        if (!input.ano_inventario_id || !tipoFinal) { await db.end(); throw new TRPCError({ code: 'BAD_REQUEST', message: 'ano_inventario_id and tipo are required' }); }
        const [factores] = await db.execute(`SELECT factor_emision FROM factores_emision WHERE ano_inventario_id = ? AND categoria = 'combustible' AND tipo = ?`, [input.ano_inventario_id, tipoFinal]);
        if ((factores as any[]).length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Factor de emisión no encontrado' });
        const factor_emision = (factores as any[])[0].factor_emision;
        const emision_co2e = input.cantidad * factor_emision;
        const [existing] = await db.execute(`SELECT id FROM consumo_combustible WHERE ano_inventario_id = ? AND tipo = ?`, [input.ano_inventario_id, input.tipo]);
        if ((existing as any[]).length > 0) await db.execute(`UPDATE consumo_combustible SET cantidad = ?, factor_emision = ?, emision_co2e = ? WHERE ano_inventario_id = ? AND tipo = ?`, [input.cantidad, factor_emision, emision_co2e, input.ano_inventario_id, tipoFinal]);
        else await db.execute(`INSERT INTO consumo_combustible (ano_inventario_id, tipo, cantidad, factor_emision, emision_co2e) VALUES (?, ?, ?, ?, ?)`, [input.ano_inventario_id, tipoFinal, input.cantidad, factor_emision, emision_co2e]);
        await recalcularHuellaCarbono(db, input.ano_inventario_id);
        await db.end();
        return { success: true, emision_co2e };
      } catch (e) { await db.end(); throw e; }
    }),

    deleteCombustible: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(`SELECT ano_inventario_id FROM consumo_combustible WHERE id = ?`, [input.id]);
        if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Consumo no encontrado' }); }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM consumo_combustible WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    getConsumosEnergia: protectedProcedure.input(z.object({ ano_inventario_id: z.number().int().positive() }).optional()).output(z.array(z.any())).query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(`SELECT * FROM consumo_energia WHERE ano_inventario_id = ?`, [input?.ano_inventario_id || null]);
        await db.end();
        return (rows as any[]);
      } catch (e) { await db.end(); throw e; }
    }),

    updateEnergia: protectedProcedure.input(z.object({ id: z.number().int().optional(), ano_inventario_id: z.number().int().optional(), campus_id: z.number().int().optional(), cantidad_kwh: z.number().positive() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        let anoId = input.ano_inventario_id;
        let campusId = input.campus_id;
        if (input.id && (!anoId || !campusId)) {
          const [rows] = await db.execute(`SELECT ano_inventario_id, campus_id FROM consumo_energia WHERE id = ?`, [input.id]);
          if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Consumo no encontrado' }); }
          anoId = anoId ?? (rows as any[])[0].ano_inventario_id;
          campusId = campusId ?? (rows as any[])[0].campus_id;
        }
        if (!anoId || !campusId) { await db.end(); throw new TRPCError({ code: 'BAD_REQUEST', message: 'ano_inventario_id and campus_id required' }); }
        const [factores] = await db.execute(`SELECT factor_emision FROM factores_emision WHERE ano_inventario_id = ? AND categoria = 'energia'`, [anoId]);
        if ((factores as any[]).length === 0) throw new TRPCError({ code: 'NOT_FOUND', message: 'Factor de emisión no encontrado para energía' });
        const factor_emision = (factores as any[])[0].factor_emision;
        const emision_co2e = input.cantidad_kwh * factor_emision;
        if (input.id) {
          await db.execute(`UPDATE consumo_energia SET campus_id = ?, cantidad_kwh = ?, factor_emision = ?, emision_co2e = ? WHERE id = ?`, [campusId, input.cantidad_kwh, factor_emision, emision_co2e, input.id]);
        } else {
          await db.execute(`INSERT INTO consumo_energia (ano_inventario_id, campus_id, cantidad_kwh, factor_emision, emision_co2e) VALUES (?, ?, ?, ?, ?)`, [anoId, campusId, input.cantidad_kwh, factor_emision, emision_co2e]);
        }
        await recalcularHuellaCarbono(db, anoId);
        await db.end();
        return { success: true, emision_co2e };
      } catch (e) { await db.end(); throw e; }
    }),

    deleteEnergia: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(`SELECT ano_inventario_id FROM consumo_energia WHERE id = ?`, [input.id]);
        if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Consumo no encontrado' }); }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM consumo_energia WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    updateExtintor: protectedProcedure.input(z.object({ id: z.number().int().positive(), peso_kg: z.number().optional(), cantidad: z.number().optional(), tipo: z.string().optional(), campus_id: z.number().int().optional() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(`SELECT ano_inventario_id FROM inventario_extintores WHERE id = ?`, [input.id]);
        if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Extintor no encontrado' }); }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`UPDATE inventario_extintores SET peso_kg = ?, cantidad = ?, tipo = ?, campus_id = ? WHERE id = ?`, [input.peso_kg ?? null, input.cantidad ?? null, input.tipo ?? null, input.campus_id ?? null, input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    updateResiduo: protectedProcedure.input(z.object({ id: z.number().int().optional(), ano_inventario_id: z.number().int().optional(), campus_id: z.number().int().optional(), tipo: z.string().optional(), cantidad_kg: z.number().optional() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        if (input.id) {
          const [rows] = await db.execute(`SELECT ano_inventario_id FROM residuos_solidos WHERE id = ?`, [input.id]);
          if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Residuo no encontrado' }); }
          const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
          await db.execute(`UPDATE residuos_solidos SET cantidad_kg = ?, tipo = ?, campus_id = ? WHERE id = ?`, [input.cantidad_kg ?? null, input.tipo ?? null, input.campus_id ?? null, input.id]);
          await recalcularHuellaCarbono(db, ano_inventario_id);
          await db.end();
          return { success: true };
        }
        if (!input.ano_inventario_id || !input.campus_id || !input.tipo) { await db.end(); throw new TRPCError({ code: 'BAD_REQUEST', message: 'Missing fields' }); }
        const [existing] = await db.execute(`SELECT id FROM residuos_solidos WHERE ano_inventario_id = ? AND campus_id = ? AND tipo = ?`, [input.ano_inventario_id, input.campus_id, input.tipo]);
        if ((existing as any[]).length > 0) {
          await db.execute(`UPDATE residuos_solidos SET cantidad_kg = ? WHERE id = ?`, [input.cantidad_kg ?? null, (existing as any[])[0].id]);
        } else {
          await db.execute(`INSERT INTO residuos_solidos (ano_inventario_id, campus_id, tipo, cantidad_kg) VALUES (?, ?, ?, ?)`, [input.ano_inventario_id, input.campus_id, input.tipo, input.cantidad_kg ?? null]);
        }
        await recalcularHuellaCarbono(db, input.ano_inventario_id!);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    deleteResiduo: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(`SELECT ano_inventario_id FROM residuos_solidos WHERE id = ?`, [input.id]);
        if ((rows as any[]).length === 0) { await db.end(); throw new TRPCError({ code: 'NOT_FOUND', message: 'Residuo no encontrado' }); }
        const ano_inventario_id = (rows as any[])[0].ano_inventario_id;
        await db.execute(`DELETE FROM residuos_solidos WHERE id = ?`, [input.id]);
        await recalcularHuellaCarbono(db, ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    updateFactoresEmision: protectedProcedure.input(z.object({ ano_inventario_id: z.number().int().positive(), factores: z.array(z.object({ id: z.number().int().optional(), categoria: z.string(), tipo: z.string().optional(), factor_emision: z.number(), unidad: z.string().optional(), fuente: z.string().optional() })) })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        for (const f of input.factores) {
          if (f.id) {
            await db.execute(`UPDATE factores_emision SET categoria = ?, tipo = ?, factor_emision = ?, unidad = ?, fuente = ? WHERE id = ?`, [f.categoria, f.tipo ?? null, f.factor_emision, f.unidad ?? null, f.fuente ?? null, f.id]);
          } else {
            await db.execute(`INSERT INTO factores_emision (ano_inventario_id, categoria, tipo, factor_emision, unidad, fuente) VALUES (?, ?, ?, ?, ?, ?)`, [input.ano_inventario_id, f.categoria, f.tipo ?? null, f.factor_emision, f.unidad ?? null, f.fuente ?? null]);
          }
        }
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    updateAgua: protectedProcedure.input(z.any()).mutation(async ({ input }) => ({ success: true })),
    deleteAgua: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => ({ success: true })),

    importarDatosMasivos: protectedProcedure.input(z.object({ tipo: z.string().optional(), ano_inventario_id: z.number().int().positive(), datos: z.any() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        // Expecting `datos` to be an object with optional arrays for diferentes tablas
        const d: any = input.datos || {};
        if (Array.isArray(d.combustibles)) {
          for (const c of d.combustibles) {
            await db.execute(`INSERT INTO consumo_combustible (ano_inventario_id, tipo, cantidad, factor_emision, emision_co2e) VALUES (?, ?, ?, ?, ?)`, [input.ano_inventario_id, c.tipo, c.cantidad, c.factor_emision ?? null, c.emision_co2e ?? null]);
          }
        }
        if (Array.isArray(d.energia)) {
          for (const e of d.energia) {
            await db.execute(`INSERT INTO consumo_energia (ano_inventario_id, campus_id, cantidad_kwh, factor_emision, emision_co2e) VALUES (?, ?, ?, ?, ?)`, [input.ano_inventario_id, e.campus_id, e.cantidad_kwh, e.factor_emision ?? null, e.emision_co2e ?? null]);
          }
        }
        if (Array.isArray(d.aires)) {
          for (const a of d.aires) {
            await db.execute(`INSERT INTO inventario_aires_acond (ano_inventario_id, campus_id, marca, modelo, btu, cantidad, emision_total_co2e) VALUES (?, ?, ?, ?, ?, ?, ?)`, [input.ano_inventario_id, a.campus_id, a.marca ?? null, a.modelo ?? null, a.btu ?? null, a.cantidad ?? null, a.emision_total_co2e ?? null]);
          }
        }
        await recalcularHuellaCarbono(db, input.ano_inventario_id);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    getAlertas: protectedProcedure
      .input(z.object({ ano_inventario_id: z.number().int().positive(), solo_no_leidas: z.boolean().optional() }).optional())
      .query(async ({ input }) => {
        const db = await getConnection();
        try {
          const params: any[] = [input?.ano_inventario_id ?? null];
          let sql = `SELECT id, ano_inventario_id, prioridad, tipo, mensaje, categoria, leida, fecha FROM alertas WHERE ano_inventario_id = ?`;
          if (input?.solo_no_leidas) sql += ` AND (leida = 0 OR leida IS NULL)`;
          sql += ` ORDER BY fecha DESC`;
          const [rows] = await db.execute(sql, params);
          await db.end();
          return (rows as any[]) as Alerta[];
        } catch (e) { await db.end(); throw e; }
      }),

    marcarAlertaLeida: protectedProcedure.input(z.object({ alerta_id: z.number().int().positive() })).mutation(async ({ input }) => {
      const db = await getConnection();
      try {
        await db.execute(`UPDATE alertas SET leida = 1 WHERE id = ?`, [input.alerta_id]);
        await db.end();
        return { success: true };
      } catch (e) { await db.end(); throw e; }
    }),

    verificarMetas: protectedProcedure.input(z.any()).mutation(async ({ input }) => {
      // forward to metas router in real implementation; keep simple here
      return { success: true };
    }),

    getProgresoMetas: protectedProcedure.input(z.any().optional()).query(async ({ input }) => {
      // Prefer the dedicated metas router; this provides a fallback that accepts either { organizacion_id } or { ano_inventario_id }
      const db = await getConnection();
      try {
        if (!input) { await db.end(); return []; }
        if (input.organizacion_id) {
          const [rows] = await db.execute(`SELECT * FROM metas_reduccion WHERE organizacion_id = ? ORDER BY ano_objetivo DESC`, [input.organizacion_id]);
          await db.end();
          return rows as any;
        }
        if (input.ano_inventario_id) {
          // compute progreso based on ano_inventario_id -> find organizacion and metas
          const [rows] = await db.execute(`SELECT * FROM metas_reduccion WHERE organizacion_id = (SELECT organizacion_id FROM ano_inventario WHERE id = ?) ORDER BY ano_objetivo DESC`, [input.ano_inventario_id]);
          await db.end();
          return rows as any;
        }
        await db.end();
        return [];
      } catch (e) { await db.end(); throw e; }
    }),

    createMeta: protectedProcedure.input(z.any()).mutation(async ({ input }) => ({ success: true })),
    deleteMeta: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async () => ({ success: true })),

    getRoles: protectedProcedure.query(async () => {
      // simple static roles list
      return [{ id: 'admin', name: 'Administrador' }, { id: 'user', name: 'Usuario' }];
    }),
    getUsuariosOrganizacion: protectedProcedure.input(z.object({ organizacion_id: z.number().int().positive() }).optional()).query(async ({ input }) => {
      const db = await getConnection();
      try {
        if (!input?.organizacion_id) { await db.end(); return []; }
        const [rows] = await db.execute(`SELECT u.id, u.openId as openId, u.name FROM users u JOIN organizacion_usuario ou ON ou.user_id = u.id WHERE ou.organizacion_id = ?`, [input.organizacion_id]);
        await db.end();
        return rows as any;
      } catch (e) { await db.end(); throw e; }
    }),
    asignarRolUsuario: protectedProcedure.input(z.any()).mutation(async ({ input }) => ({ success: true })),
    cambiarRolUsuario: protectedProcedure.input(z.any()).mutation(async ({ input }) => ({ success: true })),
    eliminarUsuarioOrganizacion: protectedProcedure.input(z.any()).mutation(async ({ input }) => ({ success: true })),
    getRolUsuario: protectedProcedure.input(z.any()).query(async ({ input }) => (null)),

  // ============ REPORTES ADICIONALES ============
  getEmisionesPorCategoria: protectedProcedure
    .input(z.object({ ano_inventario_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [combustibles] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM consumo_combustible WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        const [energia] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM consumo_energia WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        const [aires] = await db.execute(
          `SELECT COALESCE(SUM(emision_total_co2e), 0) as total FROM inventario_aires_acond WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        const [extintores] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM inventario_extintores WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        const [residuos] = await db.execute(
          `SELECT COALESCE(SUM(emision_co2e), 0) as total FROM residuos_solidos WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        const [agua] = await db.execute(
          `SELECT COALESCE(SUM(emision_total_co2e), 0) as total FROM consumo_agua WHERE ano_inventario_id = ?`,
          [input.ano_inventario_id]
        );

        await db.end();

        return {
          combustibles: (combustibles as any[])[0].total,
          energia: (energia as any[])[0].total,
          aires_acondicionados: (aires as any[])[0].total,
          extintores: (extintores as any[])[0].total,
          residuos: (residuos as any[])[0].total,
          agua: (agua as any[])[0].total,
        };
      } catch (error) {
        await db.end();
        throw error;
      }
    }),

    getComparativaAnual: protectedProcedure
    .input(z.object({ organizacion_id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getConnection();
      try {
        const [rows] = await db.execute(
          `SELECT ai.ano, rhc.alcance_1, rhc.alcance_2, rhc.alcance_3, rhc.total_co2e
           FROM ano_inventario ai
           JOIN resumen_huella_carbono rhc ON ai.id = rhc.ano_inventario_id
           WHERE ai.organizacion_id = ?
           ORDER BY ai.ano`,
          [input.organizacion_id]
        );
        await db.end();
        const datos = (rows as any[]).map((r: any) => ({ ...r, total: r.total_co2e ?? r.total ?? 0 }));
        let ano_mayor_emision = datos.length > 0 ? datos.reduce((a: any, b: any) => (b.total > a.total ? b : a)) : null;
        let ano_menor_emision = datos.length > 0 ? datos.reduce((a: any, b: any) => (b.total < a.total ? b : a)) : null;
        return { datos, ano_mayor_emision, ano_menor_emision } as any;
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
});

// ======= Helper functions =======

async function insertDefaultFactores(db: mysql.Connection, ano_inventario_id: number) {
  const factoresDefault = [
    { categoria: 'combustible', tipo: 'gasolina', factor_emision: 7.6181, unidad: 'kg CO2e/gal', fuente: 'Calculadora ITM' },
    { categoria: 'combustible', tipo: 'diesel', factor_emision: 10.149, unidad: 'kg CO2e/gal', fuente: 'Calculadora ITM' },
    { categoria: 'energia', tipo: null, factor_emision: 0.18, unidad: 'kg CO2e/kWh', fuente: 'Factor de red Colombia' },
    { categoria: 'agua_potable', tipo: null, factor_emision: 0.344, unidad: 'kg CO2e/m3', fuente: 'Calculadora ITM' },
    { categoria: 'agua_residual', tipo: null, factor_emision: 0.272, unidad: 'kg CO2e/m3', fuente: 'Calculadora ITM' },
  ];
  for (const f of factoresDefault) await db.execute(`INSERT INTO factores_emision (ano_inventario_id, categoria, tipo, factor_emision, unidad, fuente) VALUES (?, ?, ?, ?, ?, ?)`, [ano_inventario_id, f.categoria, f.tipo, f.factor_emision, f.unidad, f.fuente]);
}

async function recalcularHuellaCarbono(db: mysql.Connection, ano_inventario_id: number) {
  const [a1] = await db.execute(`SELECT COALESCE(SUM(emision_co2e),0) as alcance_1 FROM consumo_combustible WHERE ano_inventario_id = ?`, [ano_inventario_id]);
  const [a2] = await db.execute(`SELECT COALESCE(SUM(emision_co2e),0) as alcance_2 FROM consumo_energia WHERE ano_inventario_id = ?`, [ano_inventario_id]);
  const [a3] = await db.execute(`SELECT COALESCE(SUM(emision_total_co2e),0) as alcance_3 FROM consumo_agua WHERE ano_inventario_id = ?`, [ano_inventario_id]);
  const alcance_1 = (a1 as any[])[0]?.alcance_1 || 0;
  const alcance_2 = (a2 as any[])[0]?.alcance_2 || 0;
  const alcance_3 = (a3 as any[])[0]?.alcance_3 || 0;
  const total = alcance_1 + alcance_2 + alcance_3;
  await db.execute(`UPDATE resumen_huella_carbono SET alcance_1 = ?, alcance_2 = ?, alcance_3 = ?, total_co2e = ? WHERE ano_inventario_id = ?`, [alcance_1, alcance_2, alcance_3, total, ano_inventario_id]);
}
