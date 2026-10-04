import { Readable } from "node:stream";
import type { ReadableStream as ReadableStreamNode } from "node:stream/web";
import archiver, { type Archiver } from "archiver";
import {
  servicioArchivo,
  servicioConfiguracion,
  servicioDiario,
  servicioEvaluacion,
  servicioPaciente,
  servicioPlan,
  servicioRespaldo,
} from "@/infraestructura/contenedor/contenedor";
import { generarExcelMediciones } from "@/infraestructura/excel/MedicionesExcel";
import { generarExcelDiario } from "@/infraestructura/excel/DiarioExcel";
import type { PacienteSalidaDto } from "@/aplicacion/dtos/paciente.dto";
import type { ConfiguracionSalidaDto } from "@/aplicacion/dtos/configuracion.dto";
import type { PacienteEnRespaldo } from "@/aplicacion/casos-de-uso/respaldo/ArmarIndiceRespaldo";
import { generarExcelPacientes } from "./excelPacientes";
import { renderizarEvaluacionDePaciente } from "./pdfEvaluacion";
import { renderizarPlanConRecetas } from "./pdfPlan";

/** Contenido de una entrada: se pide recién cuando le toca entrar al ZIP. */
type Contenido = () => Promise<Uint8Array | Readable | null>;

/** Hasta dónde se lee el diario: «todo». Un DATE de Postgres admite el año 9999. */
const FIN_DEL_DIARIO = new Date("9999-12-31T00:00:00Z");

/**
 * Arma el ZIP del respaldo del consultorio y lo devuelve como flujo.
 *
 * Qué va y en qué carpeta lo decide `ServicioRespaldo` (el índice); acá solo
 * se recorre ese índice y se va pidiendo cada cosa recién cuando le toca:
 * los archivos del bucket pasan como flujo y los PDF/Excel se generan de a
 * uno, así que la memoria no crece con el tamaño del consultorio. El ZIP
 * avanza al ritmo en que el navegador lo baja (contrapresión del flujo).
 *
 * Un archivo que falla (un objeto que ya no está en el bucket, un PDF que no
 * se pudo dibujar) no tira abajo el respaldo: se saltea y queda anotado en
 * `LEEME.txt`, que va al final justamente para poder contarlo.
 *
 * El índice se pide ANTES de devolver el flujo: si falla, la ruta todavía
 * puede responder con un error HTTP en vez de un ZIP cortado.
 *
 * Tiene que llamarse dentro de `conAlcanceDeSesion`: el recorrido es una
 * función async que arranca ahí, y el alcance del inquilino la acompaña en
 * cada `await` aunque la respuesta ya se haya devuelto.
 */
export async function armarRespaldo(): Promise<Readable> {
  const [indice, config, { pacientes }] = await Promise.all([
    servicioRespaldo().indice(),
    servicioConfiguracion().obtener(),
    servicioPaciente().obtenerPacientes({
      pagina: 1,
      porPagina: 100_000,
      incluirArchivados: true,
    }),
  ]);
  const fichas = new Map(pacientes.map((p) => [p.id, p]));
  const rutaDeArchivo = new Map(
    indice.archivos.map(({ archivoId, ruta }) => [archivoId, ruta]),
  );

  // `store`: casi todo lo que entra (PDF, fotos, audio, Excel, Word) ya viene
  // comprimido; volver a comprimirlo gasta CPU para ahorrar nada.
  const zip = archiver("zip", { store: true });
  const fallidos: string[] = [];

  async function agregar(ruta: string, contenido: Contenido): Promise<void> {
    let datos: Uint8Array | Readable | null;
    try {
      datos = await contenido();
    } catch (error) {
      fallidos.push(`${ruta} — ${motivo(error)}`);
      return;
    }
    if (datos) await entrada(zip, ruta, datos);
  }

  void (async () => {
    try {
      await agregar("Pacientes.xlsx", () => generarExcelPacientes(pacientes));

      for (const paciente of indice.pacientes) {
        // Alguien dado de alta entre el índice y el listado se lee aparte;
        // uno borrado en ese medio ya no tiene nada que respaldar.
        const ficha =
          fichas.get(paciente.id) ??
          (await servicioPaciente()
            .obtenerPacientePorId(paciente.id)
            .catch(() => null));
        if (!ficha) continue;
        for (const [ruta, contenido] of documentosDelPaciente(
          paciente,
          ficha,
          config,
          rutaDeArchivo,
        )) {
          await agregar(ruta, contenido);
        }
      }

      for (const { archivoId, ruta } of indice.archivos) {
        await agregar(ruta, async () => {
          const { contenido } = await servicioArchivo().abrirLectura(archivoId);
          return Readable.fromWeb(contenido as ReadableStreamNode<Uint8Array>);
        });
      }

      await entrada(
        zip,
        "LEEME.txt",
        Buffer.from(leeme(config, indice.pacientes.length, fallidos), "utf8"),
      );
      await zip.finalize();
    } catch (error) {
      // A mitad del flujo ya no hay respuesta HTTP que cambiar: cortarlo es
      // la única forma de que el navegador no dé por bueno un ZIP incompleto.
      zip.destroy(error instanceof Error ? error : new Error(String(error)));
    }
  })();

  return zip;
}

/** Lo que se GENERA para un paciente (además de sus archivos del bucket). */
function documentosDelPaciente(
  paciente: PacienteEnRespaldo,
  ficha: PacienteSalidaDto,
  config: ConfiguracionSalidaDto,
  rutaDeArchivo: ReadonlyMap<string, string>,
): [string, Contenido][] {
  const nombre = `${ficha.nombre} ${ficha.apellido}`;
  return [
    [paciente.evaluacion, () => renderizarEvaluacionDePaciente(ficha, config)],
    [
      paciente.mediciones,
      async () => {
        const { mediciones } =
          await servicioEvaluacion().antropometria.obtenerComposicion(ficha.id);
        return mediciones.length > 0
          ? generarExcelMediciones({ paciente: ficha, mediciones })
          : null;
      },
    ],
    [
      paciente.diario,
      async () => {
        const registros = await servicioDiario().obtenerRango(
          ficha.id,
          new Date(0),
          FIN_DEL_DIARIO,
        );
        if (registros.length === 0) return null;
        const prefijo = `${paciente.carpeta}/`;
        return generarExcelDiario({
          registros,
          rutaFoto: (archivoId) => {
            const ruta = rutaDeArchivo.get(archivoId);
            return ruta?.startsWith(prefijo)
              ? ruta.slice(prefijo.length)
              : null;
          },
        });
      },
    ],
    ...paciente.planes.map(({ planId, ruta }): [string, Contenido] => [
      ruta,
      async () =>
        renderizarPlanConRecetas({
          plan: await servicioPlan().obtenerPlanPorId(planId),
          nombrePaciente: nombre,
          config,
        }),
    ]),
  ];
}

/**
 * Agrega una entrada y espera a que el ZIP la termine de escribir. De a una:
 * así el siguiente PDF no se genera hasta que el anterior salió, y un flujo
 * del bucket no se abre hasta que le toca.
 */
function entrada(
  zip: Archiver,
  ruta: string,
  datos: Uint8Array | Readable,
): Promise<void> {
  return new Promise((resolver, rechazar) => {
    const soltar = (): void => {
      zip.off("entry", listo);
      zip.off("error", fallo);
      zip.off("close", cerrado);
    };
    const listo = (): void => {
      soltar();
      resolver();
    };
    const fallo = (error: Error): void => {
      soltar();
      if (datos instanceof Readable) datos.destroy();
      rechazar(error);
    };
    // El navegador canceló la descarga: el ZIP se destruye sin «error», y sin
    // esto la espera no terminaría nunca (ni se cerraría el flujo del bucket).
    const cerrado = (): void =>
      fallo(new Error("Se canceló la descarga del respaldo."));
    zip.once("entry", listo);
    zip.once("error", fallo);
    zip.once("close", cerrado);
    zip.append(datos instanceof Readable ? datos : Buffer.from(datos), {
      name: ruta,
    });
  });
}

function motivo(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function leeme(
  config: ConfiguracionSalidaDto,
  cantidadPacientes: number,
  fallidos: string[],
): string {
  const lineas = [
    `Respaldo de ${config.nombreProfesional}`,
    `Generado el ${new Date().toISOString().replace("T", " ").slice(0, 16)} (UTC)`,
    "",
    `Pacientes.xlsx       La lista de pacientes (${cantidadPacientes}, archivados incluidos).`,
    "Pacientes/           Una carpeta por paciente:",
    "  Evaluación.pdf       Historia clínica, laboratorios y evoluciones.",
    "  Mediciones.xlsx      Las mediciones antropométricas, una fila por consulta.",
    "  Diario.xlsx          El diario; la columna «Foto» dice qué archivo de Diario/ es.",
    "  Planes/              Los planes asignados (en PDF) y sus archivos.",
    "  Diario/              Las fotos de las comidas.",
    "  Laboratorios/        Los adjuntos de cada laboratorio.",
    "  Fotos de progreso/   Las fotos del antes y después.",
    "  Grabaciones/         El audio de las consultas grabadas.",
    "  Archivos/            Los demás archivos de la ficha.",
    "Sin paciente/        Lo que no es de un paciente: recetas, biblioteca,",
    "                     planes sin asignar y otros (logo, fotos de perfil).",
  ];
  if (fallidos.length > 0) {
    lineas.push(
      "",
      `No se pudieron incluir ${fallidos.length} archivo(s):`,
      ...fallidos.map((f) => `  - ${f}`),
    );
  }
  return lineas.join("\r\n") + "\r\n";
}
