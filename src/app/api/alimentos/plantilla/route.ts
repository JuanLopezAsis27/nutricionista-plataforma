import { NextResponse } from "next/server";
import { usuarioDeSesion } from "@/lib/autenticacion/sesion";
import { aRespuestaError } from "@/servidor/errores-http";
import { conAlcanceDeSesion } from "@/servidor/alcanceRequest";
import {
  escribirPlanillaAlimentos,
  type AlimentoParaPlanilla,
} from "@/infraestructura/nutricion/escribirPlanillaAlimentos";
import { respuestaPlanilla } from "@/servidor/respuestaPlanilla";

export const runtime = "nodejs";

/** Filas de ejemplo: un sólido, un líquido en ml y uno con medida casera. */
const EJEMPLOS: AlimentoParaPlanilla[] = [
  {
    nombre: "Pechuga de pollo",
    marca: null,
    caloriasPor100: 165,
    proteinasPor100: 31,
    carbohidratosPor100: 0,
    grasasPor100: 3.6,
    categoria: "CARNES",
    unidadBase: "GRAMO",
    medidas: [],
  },
  {
    nombre: "Leche descremada",
    marca: null,
    caloriasPor100: 35,
    proteinasPor100: 3.4,
    carbohidratosPor100: 5,
    grasasPor100: 0.4,
    categoria: "LACTEOS",
    unidadBase: "MILILITRO",
    medidas: [
      { nombre: "taza", cantidad: 240 },
      { nombre: "vaso", cantidad: 200 },
    ],
  },
  {
    nombre: "Huevo",
    marca: null,
    caloriasPor100: 143,
    proteinasPor100: 12.6,
    carbohidratosPor100: 0.7,
    grasasPor100: 9.5,
    categoria: "HUEVOS",
    unidadBase: "GRAMO",
    medidas: [{ nombre: "unidad", cantidad: 50 }],
  },
];

/**
 * GET /api/alimentos/plantilla — descarga el modelo de Excel para importar
 * alimentos, con las mismas columnas que espera `parsearPlanillaAlimentos` y
 * que trae la descarga de la lista (`escribirPlanillaAlimentos`).
 * NUTRICIONISTA y SUPERADMIN.
 */
export function GET(): Promise<NextResponse> {
  return conAlcanceDeSesion(async () => {
    const usuario = await usuarioDeSesion();
    if (!usuario) {
      return NextResponse.json(
        { error: "Necesitás iniciar sesión." },
        { status: 401 },
      );
    }
    // El modelo es el mismo para la lista de un consultorio y para el catálogo
    // de la plataforma, que carga el SUPERADMIN.
    if (usuario.rol !== "NUTRICIONISTA" && usuario.rol !== "SUPERADMIN") {
      return NextResponse.json({ error: "No tenés permiso." }, { status: 403 });
    }

    try {
      const contenido = await escribirPlanillaAlimentos([
        { nombre: "Alimentos", alimentos: EJEMPLOS },
      ]);
      return respuestaPlanilla(contenido, "plantilla-alimentos.xlsx");
    } catch (error) {
      return aRespuestaError(error);
    }
  });
}
