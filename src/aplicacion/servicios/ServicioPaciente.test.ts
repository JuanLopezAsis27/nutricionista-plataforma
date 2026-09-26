import { describe, it, expect, vi, beforeEach } from "vitest";
import { ServicioPaciente } from "./ServicioPaciente";
import type { CrearPaciente } from "@/aplicacion/casos-de-uso/pacientes/CrearPaciente";
import type { CrearPacienteDesdeFicha } from "@/aplicacion/casos-de-uso/pacientes/CrearPacienteDesdeFicha";
import type { EnviarBienvenidaAlAlta } from "@/aplicacion/casos-de-uso/pacientes/EnviarBienvenidaAlAlta";
import type { ObtenerPacientes } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientes";
import type { ObtenerPacientePorId } from "@/aplicacion/casos-de-uso/pacientes/ObtenerPacientePorId";
import type { ActualizarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ActualizarPaciente";
import type { EliminarPaciente } from "@/aplicacion/casos-de-uso/pacientes/EliminarPaciente";
import type { EnviarBienvenidaMasiva } from "@/aplicacion/casos-de-uso/pacientes/EnviarBienvenidaMasiva";
import type { ArchivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ArchivarPaciente";
import type { ReactivarPaciente } from "@/aplicacion/casos-de-uso/pacientes/ReactivarPaciente";
import type { InterpretarFichaPaciente } from "@/aplicacion/casos-de-uso/pacientes/InterpretarFichaPaciente";
import { pacienteEjemplo } from "@/aplicacion/casos-de-uso/_ayudas-test";

/**
 * El email de bienvenida es una decisión del SERVICIO, no del caso de uso: los
 * dos caminos que dan de alta un paciente —el formulario y la ficha en
 * documento— tienen que mandarlo igual.
 *
 * Este test existe por lo que pasaba cuando no era así. El alta desde documento
 * no lo mandaba (era deliberado: "esa alta se hace con el paciente enfrente"),
 * y el resultado era que esa persona se quedaba sin sus datos de acceso sin que
 * nadie se enterara: el alta decía "creado" igual, y el problema aparecía
 * mucho después, cuando el paciente no podía entrar.
 *
 * Los casos de uso se doblan con `as unknown as`: acá no se prueba ninguno de
 * ellos —tienen su propio archivo— sino que el servicio los llame cuando
 * corresponde. El doble solo necesita `ejecutar`.
 */

const PACIENTE = pacienteEjemplo();

function doble<T>(ejecutar: ReturnType<typeof vi.fn>): T {
  return { ejecutar } as unknown as T;
}

const crear = vi.fn(async () => ({
  paciente: PACIENTE,
  cuentaExistente: false,
}));
const crearDesdeFicha = vi.fn(async () => ({
  paciente: PACIENTE,
  cuentaExistente: false,
  advertencias: [] as string[],
}));
const enviarBienvenida = vi.fn(async () => {});

function armar() {
  const noUsado = vi.fn();
  return new ServicioPaciente(
    doble<CrearPaciente>(crear),
    doble<ObtenerPacientes>(noUsado),
    doble<ObtenerPacientePorId>(noUsado),
    doble<ActualizarPaciente>(noUsado),
    doble<EliminarPaciente>(noUsado),
    doble<EnviarBienvenidaAlAlta>(enviarBienvenida),
    doble<EnviarBienvenidaMasiva>(noUsado),
    doble<ArchivarPaciente>(noUsado),
    doble<ReactivarPaciente>(noUsado),
    doble<InterpretarFichaPaciente>(noUsado),
    doble<CrearPacienteDesdeFicha>(crearDesdeFicha),
  );
}

/** Lo mínimo que pide el DTO del alta desde ficha. */
const DATOS_FICHA = {
  nombre: "Ana",
  apellido: "García",
  email: "ana@mail.com",
  password: "arroz-con-leche-2026",
  telefono: null,
  fechaNacimiento: null,
  sexo: null,
  notas: null,
  establecimientoHabitualId: null,
  historiaClinica: null,
  alertas: [],
  antropometria: null,
  laboratorios: [],
  archivoId: null,
};

describe("ServicioPaciente — el email de bienvenida", () => {
  beforeEach(() => {
    crear.mockClear();
    crearDesdeFicha.mockClear();
    enviarBienvenida.mockClear();
  });

  it("el alta por formulario manda la bienvenida", async () => {
    await armar().crearPaciente({
      nombre: "Ana",
      apellido: "García",
      email: "ana@mail.com",
      password: "arroz-con-leche-2026",
    });

    expect(enviarBienvenida).toHaveBeenCalledTimes(1);
  });

  it("el alta DESDE DOCUMENTO también la manda", async () => {
    // La regresión: acá no se mandaba nada.
    await armar().crearPacienteDesdeFicha(DATOS_FICHA);

    expect(enviarBienvenida).toHaveBeenCalledTimes(1);
  });

  it("manda la contraseña que eligió el profesional, no otra cosa", async () => {
    // Es el único mensaje que puede llevarla: la cuenta ya quedó hasheada y
    // el texto plano solo existe durante el alta.
    await armar().crearPacienteDesdeFicha(DATOS_FICHA);

    expect(enviarBienvenida).toHaveBeenCalledWith({
      paciente: PACIENTE,
      contrasena: "arroz-con-leche-2026",
      cuentaExistente: false,
    });
  });

  it("si la persona ya tenía cuenta, la bienvenida lo sabe y el alta lo informa", async () => {
    // Otra plantilla, sin contraseña: la suya no se tocó.
    crear.mockResolvedValueOnce({ paciente: PACIENTE, cuentaExistente: true });

    const salida = await armar().crearPaciente({
      nombre: "Ana",
      apellido: "García",
      email: "ana@mail.com",
      password: "arroz-con-leche-2026",
    });

    expect(salida.cuentaExistente).toBe(true);
    expect(enviarBienvenida).toHaveBeenCalledWith(
      expect.objectContaining({ cuentaExistente: true }),
    );
  });

  it("si la bienvenida falla, el alta desde documento NO falla", async () => {
    // El paciente ya está creado con su historia clínica y su medición: no se
    // puede perder todo eso porque el SMTP esté caído. Queda el envío manual.
    enviarBienvenida.mockRejectedValueOnce(new Error("SMTP caído"));

    const resultado = await armar().crearPacienteDesdeFicha(DATOS_FICHA);

    expect(resultado.paciente.email).toBe(PACIENTE.email);
  });
});
