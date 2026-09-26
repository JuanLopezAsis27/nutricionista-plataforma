import { describe, it, expect } from "vitest";
import { crearEsquemaPaciente } from "./pacientes/FormularioPaciente";
import { esquema as esquemaRestablecer } from "./auth/FormularioRestablecer";
import { crearPacienteConAccesoDto } from "@/aplicacion/dtos/paciente.dto";
import { restablecerPasswordDto } from "@/aplicacion/dtos/autenticacion.dto";
import { LARGO_MINIMO_PASSWORD } from "@/aplicacion/dtos/password";

/**
 * Coherencia entre la validación del formulario y la del servidor.
 *
 * EL PROBLEMA QUE CUBRE: cada formulario define su propio esquema Zod y el
 * router valida con el DTO. Son dos escrituras de la misma regla, y nada las
 * ata. Cuando divergen no falla nada visible: el formulario acepta un valor,
 * el usuario lo envía, y el servidor lo rechaza con un error que la pantalla
 * decía que no correspondía.
 *
 * Esto no es hipotético. Al escribir estos tests había DOS divergencias reales:
 * `FormularioPaciente` y `FormularioRestablecer` exigían 6 caracteres de
 * contraseña mientras el servidor exigía 12 y rechazaba las obvias. La política
 * se había unificado en `dtos/password.ts` durante la auditoría de seguridad,
 * pero los dos formularios se quedaron con la regla vieja escrita a mano.
 *
 * LA DIRECCIÓN IMPORTA: el formulario puede ser MÁS estricto que el servidor
 * (guiar antes de enviar), nunca MENOS. Menos estricto es prometerle al usuario
 * algo que el backend va a rechazar.
 */

/** Contraseñas que la política vigente debe rechazar. */
const RECHAZADAS = [
  ["corta", "abc123"],
  // Justo debajo del mínimo, que hoy es 8. Sin caracteres repetidos a
  // propósito: con "aaaaaaa" el rechazo vendría de la regla de las obvias y el
  // caso dejaría de mirar el largo, que es lo que quiere mirar.
  ["de 7, justo debajo del mínimo", "melon-5"],
  ["obvia de la lista", "contrasena123"],
  ["un solo carácter repetido", "aaaaaaaaaaaa"],
] as const;

/** Contraseña válida según la política. */
const VALIDA = "arroz-con-leche-2026";

describe("FormularioPaciente vs crearPacienteConAccesoDto", () => {
  const esquemaAlta = crearEsquemaPaciente(false);

  const pacienteBase = {
    nombre: "Ana",
    apellido: "Gomez",
    email: "ana@ejemplo.test",
    telefono: "",
    fechaNacimiento: "",
    sexo: "FEMENINO" as const,
    // El formulario siempre manda un valor: el id de la sede o SIN_SEDE.
    establecimientoHabitualId: "SIN_SEDE",
    notas: "",
    // El acceso al portal es opcional desde la migración 80; el alta lo
    // ofrece marcado.
    darAcceso: true,
    nombreUsuario: "",
  };

  /** Lo mismo que manda el formulario, en la forma del DTO. */
  const enServidor = (acceso: Record<string, unknown> | null) =>
    crearPacienteConAccesoDto.safeParse({
      nombre: "Ana",
      apellido: "Gomez",
      email: "ana@ejemplo.test",
      acceso,
    });

  it.each(RECHAZADAS)(
    "el formulario rechaza la contraseña %s, igual que el servidor",
    (_caso, password) => {
      // El servidor la rechaza...
      expect(enServidor({ password }).success).toBe(false);

      // ...y el formulario también, ANTES de enviarla.
      const enFormulario = esquemaAlta.safeParse({
        ...pacienteBase,
        password,
      });
      expect(enFormulario.success).toBe(false);
    },
  );

  it("ambos aceptan una contraseña que cumple la política", () => {
    expect(
      esquemaAlta.safeParse({ ...pacienteBase, password: VALIDA }).success,
    ).toBe(true);
    expect(enServidor({ password: VALIDA }).success).toBe(true);
  });

  it("sin acceso al portal, ninguno pide contraseña", () => {
    expect(
      esquemaAlta.safeParse({ ...pacienteBase, darAcceso: false }).success,
    ).toBe(true);
    expect(enServidor(null).success).toBe(true);
  });

  it("al editar no se pide contraseña: es otro flujo", () => {
    // La edición no crea la cuenta, así que exigir contraseña ahí bloquearía
    // cambiar un teléfono. El test fija que la diferencia es deliberada.
    const esquemaEdicion = crearEsquemaPaciente(true);

    expect(esquemaEdicion.safeParse(pacienteBase).success).toBe(true);
    expect(esquemaAlta.safeParse(pacienteBase).success).toBe(false);
  });

  it("el formulario exige nombre y apellido, igual que el DTO", () => {
    for (const campo of ["nombre", "apellido"] as const) {
      const datos = { ...pacienteBase, password: VALIDA, [campo]: "" };
      expect(esquemaAlta.safeParse(datos).success, `campo ${campo}`).toBe(
        false,
      );
    }
  });

  it("el email es opcional en los dos, pero si está tiene que ser un email", () => {
    const sinEmail = {
      ...pacienteBase,
      email: "",
      darAcceso: false,
    };
    expect(esquemaAlta.safeParse(sinEmail).success).toBe(true);
    expect(
      crearPacienteConAccesoDto.safeParse({
        nombre: "Ana",
        apellido: "Gomez",
        email: "",
      }).success,
    ).toBe(true);

    expect(
      esquemaAlta.safeParse({ ...sinEmail, email: "no-es-un-email" }).success,
    ).toBe(false);
    expect(
      crearPacienteConAccesoDto.safeParse({
        nombre: "Ana",
        apellido: "Gomez",
        email: "no-es-un-email",
      }).success,
    ).toBe(false);
  });

  it("sin email y con acceso, los dos exigen un nombre de usuario válido", () => {
    const sinEmail = { ...pacienteBase, email: "", password: VALIDA };
    // Sin usuario no hay con qué entrar (el servidor lo dice en el caso de
    // uso; el formulario lo frena antes).
    expect(esquemaAlta.safeParse(sinEmail).success).toBe(false);
    expect(
      esquemaAlta.safeParse({ ...sinEmail, nombreUsuario: "juan.perez" })
        .success,
    ).toBe(true);

    // Un usuario con arroba es inválido en los dos: el login no podría
    // distinguirlo de un email.
    expect(
      esquemaAlta.safeParse({ ...sinEmail, nombreUsuario: "juan@perez" })
        .success,
    ).toBe(false);
    expect(
      enServidor({ nombreUsuario: "juan@perez", password: VALIDA }).success,
    ).toBe(false);
  });
});

describe("FormularioRestablecer vs restablecerPasswordDto", () => {
  it.each(RECHAZADAS)(
    "el formulario rechaza la contraseña %s, igual que el servidor",
    (_caso, password) => {
      const enServidor = restablecerPasswordDto.safeParse({
        token: "token-valido",
        password,
      });
      expect(enServidor.success).toBe(false);

      const enFormulario = esquemaRestablecer.safeParse({
        password,
        confirmar: password,
      });
      expect(enFormulario.success).toBe(false);
    },
  );

  it("acepta una contraseña válida cuando las dos coinciden", () => {
    expect(
      esquemaRestablecer.safeParse({ password: VALIDA, confirmar: VALIDA })
        .success,
    ).toBe(true);
  });

  it("rechaza cuando la confirmación no coincide", () => {
    // Regla propia del formulario: el servidor no la tiene (recibe una sola
    // contraseña). Es un caso legítimo de "el formulario es MÁS estricto".
    const resultado = esquemaRestablecer.safeParse({
      password: VALIDA,
      confirmar: `${VALIDA}-distinta`,
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.issues[0]?.path).toEqual(["confirmar"]);
    }
  });

  it("el flujo de recuperación no puede degradar la política", () => {
    // Este es el escenario que la auditoría de seguridad cerró en el servidor:
    // alguien con una contraseña de 12 no puede terminar con una de 6 pasando
    // por "olvidé mi contraseña". El test lo fija también en la UI, que era por
    // donde se estaba prometiendo lo contrario.
    const aUnCaracterDelMinimo = "a".repeat(LARGO_MINIMO_PASSWORD - 1);

    expect(
      esquemaRestablecer.safeParse({
        password: aUnCaracterDelMinimo,
        confirmar: aUnCaracterDelMinimo,
      }).success,
    ).toBe(false);
  });
});
