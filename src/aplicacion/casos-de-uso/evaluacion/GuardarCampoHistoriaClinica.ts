import type { ICampoHistoriaClinicaRepositorio } from "@/dominio/repositorios/ICampoHistoriaClinicaRepositorio";
import {
  CampoHistoriaClinica,
  MAXIMO_CAMPOS_PERSONALIZADOS,
  type DatosCampoHistoriaClinica,
} from "@/dominio/entidades/CampoHistoriaClinica";
import { ErrorCampoHistoriaClinicaNoEncontrado } from "@/dominio/errores/ErrorCampoHistoriaClinicaNoEncontrado";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";

/**
 * Caso de uso: crear o renombrar un campo personalizado del consultorio.
 *
 * Con `id` edita el existente; sin `id` crea uno nuevo. Editar NUNCA toca la
 * clave (la entidad la preserva), así que renombrar un campo conserva lo que
 * ya está cargado en las historias de los pacientes.
 */
export class GuardarCampoHistoriaClinica {
  constructor(private readonly campos: ICampoHistoriaClinicaRepositorio) {}

  async ejecutar(
    datos: DatosCampoHistoriaClinica & { id?: string },
  ): Promise<CampoHistoriaClinica> {
    await this.verificarNombreLibre(datos.nombre, datos.id);

    if (datos.id) {
      const existente = await this.campos.obtenerPorId(datos.id);
      if (!existente) {
        throw new ErrorCampoHistoriaClinicaNoEncontrado(datos.id);
      }
      return this.campos.actualizar(existente.actualizar(datos));
    }

    const existentes = await this.campos.obtenerTodos();
    if (existentes.length >= MAXIMO_CAMPOS_PERSONALIZADOS) {
      throw new ErrorValidacion(
        `No se pueden tener más de ${MAXIMO_CAMPOS_PERSONALIZADOS} campos personalizados en la historia clínica.`,
      );
    }
    // Los nuevos van al final: el orden de la pantalla es el que el
    // profesional ve, y un campo que aparece en el medio sin haberlo pedido
    // desordena una ficha que ya tenía su lectura.
    const orden =
      datos.orden ??
      existentes.reduce((maximo, campo) => Math.max(maximo, campo.orden), 0) +
        1;

    return this.campos.crear(
      CampoHistoriaClinica.crear({ ...datos, orden }, crypto.randomUUID()),
    );
  }

  private async verificarNombreLibre(
    nombre: string,
    idPropio?: string,
  ): Promise<void> {
    const conEseNombre = await this.campos.obtenerPorNombre(nombre?.trim());
    if (conEseNombre && conEseNombre.id !== idPropio) {
      throw new ErrorValidacion(
        `Ya existe un campo personalizado llamado «${nombre.trim()}».`,
      );
    }
  }
}
