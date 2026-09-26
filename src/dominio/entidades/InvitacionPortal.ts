import { ErrorValidacion } from "../errores/ErrorValidacion";

/** Estado completo de una invitación persistida. */
export interface PropiedadesInvitacionPortal {
  id: string;
  /** La ficha que queda en la cuenta de quien la canjee. */
  pacienteId: string;
  /** SHA-256 del código; el código en claro nunca se guarda. */
  codigoHash: string;
  expiraEn: Date;
  usadaEn: Date | null;
  creadoEn: Date;
}

/**
 * Invitación al portal (migración 80): el código que asocia una ficha a una
 * cuenta que YA existe.
 *
 * Es la única puerta para eso, y por diseño la abre la persona y no el
 * profesional: el código lo canjea alguien que entró con SU contraseña. Un
 * email o un usuario tipeados por el profesional pueden estar mal, y asociar
 * una ficha a la cuenta equivocada le muestra datos clínicos a otra persona.
 * Una persona con dos cuentas es incómodo; dos personas en una cuenta es una
 * filtración. Ver docs/CUENTAS-PACIENTE.md.
 */
export class InvitacionPortal {
  private constructor(private readonly props: PropiedadesInvitacionPortal) {}

  static crear(
    datos: { pacienteId: string; codigoHash: string; expiraEn: Date },
    id: string,
    ahora: Date = new Date(),
  ): InvitacionPortal {
    if (!datos.pacienteId) {
      throw new ErrorValidacion("La invitación tiene que ser de una ficha.");
    }
    if (!datos.codigoHash) {
      throw new ErrorValidacion("La invitación debe tener un código.");
    }
    if (datos.expiraEn.getTime() <= ahora.getTime()) {
      throw new ErrorValidacion(
        "El vencimiento de la invitación debe ser futuro.",
      );
    }
    return new InvitacionPortal({
      id,
      pacienteId: datos.pacienteId,
      codigoHash: datos.codigoHash,
      expiraEn: datos.expiraEn,
      usadaEn: null,
      creadoEn: ahora,
    });
  }

  static reconstruir(props: PropiedadesInvitacionPortal): InvitacionPortal {
    return new InvitacionPortal(props);
  }

  /** Sirve si no se usó y no venció. */
  estaVigente(ahora: Date = new Date()): boolean {
    return (
      this.props.usadaEn === null &&
      this.props.expiraEn.getTime() > ahora.getTime()
    );
  }

  get id(): string {
    return this.props.id;
  }
  get pacienteId(): string {
    return this.props.pacienteId;
  }
  get codigoHash(): string {
    return this.props.codigoHash;
  }
  get expiraEn(): Date {
    return this.props.expiraEn;
  }
  get usadaEn(): Date | null {
    return this.props.usadaEn;
  }
  get creadoEn(): Date {
    return this.props.creadoEn;
  }

  aPrimitivos(): PropiedadesInvitacionPortal {
    return { ...this.props };
  }
}
