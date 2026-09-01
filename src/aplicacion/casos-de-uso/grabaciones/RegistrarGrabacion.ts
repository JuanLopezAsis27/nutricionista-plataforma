import type { IGrabacionConsultaRepositorio } from "@/dominio/repositorios/IGrabacionConsultaRepositorio";
import type { ITurnoRepositorio } from "@/dominio/repositorios/ITurnoRepositorio";
import type { IArchivoRepositorio } from "@/dominio/repositorios/IArchivoRepositorio";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";
import { GrabacionConsulta } from "@/dominio/entidades/GrabacionConsulta";
import { ErrorTurnoNoEncontrado } from "@/dominio/errores/ErrorTurnoNoEncontrado";
import { ErrorArchivoNoEncontrado } from "@/dominio/errores/ErrorArchivoNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/** Nombre de la cola que procesa la transcripción. */
export const COLA_TRANSCRIBIR_GRABACION = "transcribir-grabacion";

export interface DatosRegistrarGrabacion {
  turnoId: string;
  /** Audio ya subido al bucket (contexto `grabacion`), todavía sin dueño. */
  archivoId: string;
  duracionSegundos?: number | null;
}

/**
 * Caso de uso: registrar una grabación recién subida y mandarla a transcribir.
 *
 * El audio viaja por el route handler de archivos (multipart) y llega acá ya
 * subido pero huérfano; esto le da dueño y encola el trabajo. Es el mismo
 * patrón que las fotos de una receta, y por el mismo motivo: no hay id de
 * grabación hasta que la fila existe.
 *
 * La transcripción NO se hace acá. Un audio de una hora tarda minutos en un
 * proveedor remoto, y hacerlo en la request dejaría al profesional mirando una
 * ruedita al final de la consulta —o, más probable, cerrando la pestaña y
 * perdiendo el trabajo—.
 */
export class RegistrarGrabacion {
  constructor(
    private readonly grabaciones: IGrabacionConsultaRepositorio,
    private readonly turnos: ITurnoRepositorio,
    private readonly archivos: IArchivoRepositorio,
    private readonly cola: IColaTrabajos,
  ) {}

  async ejecutar(datos: DatosRegistrarGrabacion): Promise<GrabacionConsulta> {
    // El turno se comprueba aunque no se use después: el alcance de inquilino
    // filtra la lectura, así que "no aparece" es lo mismo que "no es de este
    // consultorio", y sin esto se podría colgar una grabación de un turno ajeno.
    const turno = await this.turnos.obtenerPorId(datos.turnoId);
    if (!turno) {
      throw new ErrorTurnoNoEncontrado(datos.turnoId);
    }

    const archivo = await this.archivos.obtenerPorId(datos.archivoId);
    if (!archivo) {
      throw new ErrorArchivoNoEncontrado(datos.archivoId);
    }

    // El archivo tiene que estar libre. Sin esto, mandar el id del audio de OTRA
    // grabación se lo robaría a esa —la FK es 1 a 1— y dejaría a la primera sin
    // audio, con su transcripción colgando de la nada.
    const dueno = await this.archivos.obtenerDueno(datos.archivoId);
    if (dueno && Object.values(dueno).some((valor) => valor != null)) {
      throw new ErrorValidacion("Ese archivo ya pertenece a otra cosa.");
    }

    const grabacion = GrabacionConsulta.crear(
      {
        turnoId: datos.turnoId,
        orden: await this.grabaciones.siguienteOrden(datos.turnoId),
        duracionSegundos: datos.duracionSegundos,
      },
      crypto.randomUUID(),
    );

    const creada = await this.grabaciones.crear(grabacion, datos.archivoId);

    // Encolar va DESPUÉS de guardar: si el encolado falla, la grabación queda
    // PENDIENTE y el barrido de rescate la levanta. Al revés —encolar antes— el
    // worker podría buscar una fila que todavía no existe.
    //
    // El trabajo lleva SOLO el id. El consultorio al que pertenece lo resuelve
    // el worker leyendo la fila en alcance global, que es para lo que sirve ese
    // alcance: mandarlo en el payload sería una segunda copia del vínculo, y
    // una que nadie valida contra la fila.
    await this.cola.encolar(COLA_TRANSCRIBIR_GRABACION, {
      grabacionId: creada.id,
    });

    return creada;
  }
}
