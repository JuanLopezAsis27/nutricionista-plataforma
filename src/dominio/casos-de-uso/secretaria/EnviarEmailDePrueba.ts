import type { IPlantillaEmailRepositorio } from "../../repositorios/IPlantillaEmailRepositorio";
import type { IEmailEnviadoRepositorio } from "../../repositorios/IEmailEnviadoRepositorio";
import type { IServicioEmail } from "../../servicios/IServicioEmail";
import type { IRelojFecha } from "../../servicios/IRelojFecha";
import { EmailEnviado } from "../../entidades/EmailEnviado";
import { ErrorPlantillaNoEncontrada } from "../../errores/ErrorPlantillaNoEncontrada";
import { variablesEjemplo } from "./variables";

/** Resultado del envío de prueba: lo renderizado + destinatario. */
export interface ResultadoPrueba {
  para: string;
  asunto: string;
}

/**
 * Caso de uso: enviar un email de prueba de una plantilla, con datos de
 * ejemplo, a una casilla indicada. Sirve para verificar el resultado en
 * Mailpit sin afectar a ningún paciente. Queda registrado en el log.
 */
export class EnviarEmailDePrueba {
  constructor(
    private readonly plantillas: IPlantillaEmailRepositorio,
    private readonly emails: IEmailEnviadoRepositorio,
    private readonly servicioEmail: IServicioEmail,
    private readonly reloj: IRelojFecha,
    private readonly nombreProfesional: string,
  ) {}

  async ejecutar(plantillaId: string, para: string): Promise<ResultadoPrueba> {
    const plantilla = await this.plantillas.obtenerPorId(plantillaId);
    if (!plantilla) {
      throw new ErrorPlantillaNoEncontrada(plantillaId);
    }

    const { asunto, html } = plantilla.renderizar(
      variablesEjemplo(this.nombreProfesional, this.reloj.hoy()),
    );

    await this.servicioEmail.enviar({ para, asunto: `[PRUEBA] ${asunto}`, html });

    await this.emails.registrar(
      EmailEnviado.crear(
        {
          plantillaClave: plantilla.clave,
          para,
          asunto,
          referenciaId: null, // prueba: sin idempotencia
          pacienteId: null,
        },
        crypto.randomUUID(),
        this.reloj.ahora(),
      ),
    );

    return { para, asunto };
  }
}
