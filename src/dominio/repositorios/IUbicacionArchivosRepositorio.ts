/**
 * De quién es un archivo y lo que hace falta para nombrarlo en el respaldo.
 *
 * Es el arco de dueños de `archivos` (paciente, laboratorio, comida del
 * diario, grabación, plan, receta, material) ya resuelto hasta el PACIENTE
 * cuando lo hay: la foto de una comida es del paciente del registro del
 * diario, el audio es del paciente del turno.
 */
export type UbicacionArchivo =
  | {
      tipo: "PACIENTE";
      pacienteId: string;
      /** Cargada solo en las fotos de progreso (migración 63). */
      fechaProgreso: Date | null;
    }
  | { tipo: "LABORATORIO"; pacienteId: string; fecha: Date; titulo: string }
  | { tipo: "DIARIO"; pacienteId: string; fecha: Date; franja: string }
  | { tipo: "GRABACION"; pacienteId: string; fecha: Date; orden: number }
  | {
      tipo: "PLAN";
      plan: string;
      /** Un plan se asigna a varios pacientes, o a ninguno (migración 69). */
      pacienteIds: string[];
    }
  | { tipo: "RECETA"; receta: string }
  | { tipo: "MATERIAL"; material: string }
  /** Huérfano: el logo del membrete, una foto de perfil, un adjunto a medio subir. */
  | { tipo: "SIN_DUENO" };

export interface ArchivoUbicado {
  id: string;
  nombreOriginal: string;
  ubicacion: UbicacionArchivo;
}

/**
 * Todos los archivos del consultorio con su dueño resuelto, para armar el
 * respaldo. Interfaz aparte de `IArchivoRepositorio` (ISP): es una lectura de
 * un solo cliente que cruza media base, no una operación sobre un archivo.
 */
export interface IUbicacionArchivosRepositorio {
  listar(): Promise<ArchivoUbicado[]>;
}
