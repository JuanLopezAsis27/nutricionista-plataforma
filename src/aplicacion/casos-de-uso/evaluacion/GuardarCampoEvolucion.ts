import type { ICampoEvolucionRepositorio } from "@/dominio/repositorios/ICampoEvolucionRepositorio";
import {
  CampoEvolucion,
  MAXIMO_CAMPOS_EVOLUCION,
  type DatosCampoEvolucion,
} from "@/dominio/entidades/CampoEvolucion";
import { ErrorCampoEvolucionNoEncontrado } from "@/dominio/errores/ErrorCampoEvolucionNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: crear o renombrar un campo de evolución del consultorio.
 *
 * Con `id` edita el existente; sin `id` crea uno nuevo. Editar NUNCA toca la
 * clave (la entidad la preserva), así que renombrar un campo conserva lo que
 * ya está cargado en las evoluciones de los pacientes.
 */
export class GuardarCampoEvolucion {
  constructor(private readonly campos: ICampoEvolucionRepositorio) {}

  async ejecutar(
    datos: DatosCampoEvolucion & { id?: string },
  ): Promise<CampoEvolucion> {
    await this.verificarNombreLibre(datos.nombre, datos.id);

    if (datos.id) {
      const existente = await this.campos.obtenerPorId(datos.id);
      if (!existente) {
        throw new ErrorCampoEvolucionNoEncontrado(datos.id);
      }
      return this.campos.actualizar(existente.actualizar(datos));
    }

    const existentes = await this.campos.obtenerTodos();
    if (existentes.length >= MAXIMO_CAMPOS_EVOLUCION) {
      throw new ErrorValidacion(
        `No se pueden tener más de ${MAXIMO_CAMPOS_EVOLUCION} campos personalizados en las evoluciones.`,
      );
    }
    // Los nuevos van al final: el orden de la pantalla es el que el
    // profesional ve, y un campo que aparece en el medio sin haberlo pedido
    // desordena un formulario que ya tenía su lectura.
    const orden =
      datos.orden ??
      existentes.reduce((maximo, campo) => Math.max(maximo, campo.orden), 0) +
        1;

    return this.campos.crear(
      CampoEvolucion.crear({ ...datos, orden }, crypto.randomUUID()),
    );
  }

  private async verificarNombreLibre(
    nombre: string,
    idPropio?: string,
  ): Promise<void> {
    const conEseNombre = await this.campos.obtenerPorNombre(nombre?.trim());
    if (conEseNombre && conEseNombre.id !== idPropio) {
      throw new ErrorValidacion(
        `Ya existe un campo de evolución llamado «${nombre.trim()}».`,
      );
    }
  }
}
