import { Prisma } from "@prisma/client";

import { ErrorRestriccionDatos } from "@/dominio/errores/ErrorRestriccionDatos";

/**
 * Traduce los errores conocidos de Prisma a errores del dominio.
 *
 * Es la red que impide que un choque contra una restricción de Postgres llegue
 * a pantalla como «Ocurrió un error inesperado». Ese mensaje es el que pone el
 * middleware de tRPC a todo lo que no es un `ErrorDominio`, y para el
 * profesional no dice nada: no sabe qué campo repitió ni qué tiene que cambiar.
 *
 * **No reemplaza al chequeo explícito del caso de uso**, que puede dar un
 * mensaje mucho mejor porque sabe QUÉ se estaba haciendo ("ya tenés un paciente
 * con ese email: Juan Pérez"). Por eso el middleware, además de traducir,
 * reporta al monitor: llegar hasta acá significa que falta una validación
 * arriba.
 *
 * Solo se traducen los códigos en los que se puede decir algo útil sin
 * inventar. El resto sigue de largo y termina en el genérico, que para un
 * problema real de infraestructura es la respuesta correcta.
 */

/** Nombres de columna → cómo se llaman en la pantalla. */
const ETIQUETAS_CAMPO: Record<string, string> = {
  email: "email",
  telefono: "teléfono",
  telefonoE164: "teléfono",
  nombre: "nombre",
  clave: "clave",
  tokenHash: "token",
  idExterno: "identificador externo",
  fecha: "fecha",
  pacienteId: "paciente",
  nutricionistaId: "consultorio",
};

export function traducirErrorPrisma(
  error: unknown,
): ErrorRestriccionDatos | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return null;
  }

  switch (error.code) {
    // Violación de índice único.
    case "P2002":
      return new ErrorRestriccionDatos(
        `Ya existe un registro con ese ${listarCampos(error)}. Revisá los datos: tiene que ser distinto.`,
        "CONFLICTO",
      );

    // Violación de clave foránea: se apunta a algo que no existe.
    case "P2003":
      return new ErrorRestriccionDatos(
        "Uno de los datos relacionados ya no existe. Actualizá la pantalla y volvé a intentarlo.",
        "VALIDACION",
      );

    // Borrado bloqueado porque todavía cuelgan registros hijos.
    case "P2014":
      return new ErrorRestriccionDatos(
        "No se puede borrar porque todavía tiene información asociada. Eliminá o desvinculá esa información primero.",
        "CONFLICTO",
      );

    // La operación esperaba encontrar un registro y no estaba.
    case "P2025":
      return new ErrorRestriccionDatos(
        "El registro que intentabas modificar ya no existe. Puede haberlo borrado alguien más; actualizá la pantalla.",
        "NO_ENCONTRADO",
      );

    default:
      return null;
  }
}

/**
 * Los campos que chocaron, en castellano.
 *
 * Prisma los manda en `meta.target`, que según el motor es un array de
 * columnas o un string con el nombre del índice. Si no viene nada usable se
 * dice "dato" y no se inventa un nombre: es preferible a nombrar mal el campo
 * y mandar a alguien a corregir el que no era.
 */
function listarCampos(error: Prisma.PrismaClientKnownRequestError): string {
  const objetivo = error.meta?.target;

  const columnas =
    Array.isArray(objetivo) && objetivo.every((c) => typeof c === "string")
      ? objetivo
      : typeof objetivo === "string"
        ? [objetivo]
        : [];

  const legibles = columnas
    .map((columna) => ETIQUETAS_CAMPO[columna])
    .filter((etiqueta): etiqueta is string => Boolean(etiqueta));

  if (legibles.length === 0) return "dato";
  if (legibles.length === 1) return legibles[0]!;
  return `${legibles.slice(0, -1).join(", ")} y ${legibles[legibles.length - 1]!}`;
}
