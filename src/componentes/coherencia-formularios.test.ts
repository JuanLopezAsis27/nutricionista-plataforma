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
  ["de 11, justo debajo del mínimo", "a".repeat(11)],
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
    notas: "",
  };

  it.each(RECHAZADAS)(
    "el formulario rechaza la contraseña %s, igual que el servidor",
    (_caso, password) => {
      // El servidor la rechaza...
      const enServidor = crearPacienteConAccesoDto.safeParse({
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@ejemplo.test",
        password,
      });
      expect(enServidor.success).toBe(false);

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

    expect(
      crearPacienteConAccesoDto.safeParse({
        nombre: "Ana",
        apellido: "Gomez",
        email: "ana@ejemplo.test",
        password: VALIDA,
      }).success,
    ).toBe(true);
  });

  it("al editar no se pide contraseña: es otro flujo", () => {
    // La edición no crea la cuenta, así que exigir contraseña ahí bloquearía
    // cambiar un teléfono. El test fija que la diferencia es deliberada.
    const esquemaEdicion = crearEsquemaPaciente(true);

    expect(esquemaEdicion.safeParse(pacienteBase).success).toBe(true);
    expect(esquemaAlta.safeParse(pacienteBase).success).toBe(false);
  });

  it("el formulario exige nombre, apellido y email, igual que el DTO", () => {
    for (const campo of ["nombre", "apellido"] as const) {
      const datos = { ...pacienteBase, password: VALIDA, [campo]: "" };
      expect(esquemaAlta.safeParse(datos).success, `campo ${campo}`).toBe(
        false,
      );
    }

    expect(
      esquemaAlta.safeParse({
        ...pacienteBase,
        password: VALIDA,
        email: "no-es-un-email",
      }).success,
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
