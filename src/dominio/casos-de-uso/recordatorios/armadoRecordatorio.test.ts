import { describe, it, expect } from "vitest";
import { armarRecordatorio } from "./armadoRecordatorio";
import { ConfiguracionConsultorio } from "../../entidades/ConfiguracionConsultorio";
import {
  turnoEjemplo,
  pacienteEjemplo,
  configuracionEjemplo,
  plantillaWhatsappEjemplo,
} from "../_ayudas-test";

/**
 * Tests del armado del recordatorio.
 *
 * POR QUÉ IMPORTA MÁS DE LO QUE SU TAMAÑO SUGIERE: esta función produce el
 * texto exacto que le llega al paciente. No decide *si* se manda —eso es
 * `EnviarRecordatorioWhatsapp`— sino *qué dice*, y un error acá sale impreso en
 * cada mensaje del consultorio.
 *
 * Y la comparten TRES caminos: la vista previa (que no escribe nada), el envío
 * masivo manual y el barrido automático. Que la vista previa muestre algo
 * distinto de lo que sale es el modo silencioso en que esto se rompe: nadie
 * revisa un mensaje que ya vio bien en pantalla.
 */

function config(cambios: Record<string, unknown> = {}) {
  const base = configuracionEjemplo().aPrimitivos();
  return ConfiguracionConsultorio.reconstruir({ ...base, ...cambios });
}

describe("armarRecordatorio — el texto que lee el paciente", () => {
  it("sustituye las variables de la plantilla por los datos del turno", () => {
    const armado = armarRecordatorio(
      turnoEjemplo({
        fecha: new Date("2026-07-01T00:00:00.000Z"),
        hora: "10:30",
      }),
      pacienteEjemplo({
        nombre: "Ana",
        apellido: "García",
        telefono: "1155554444",
      }),
      config({ nombreProfesional: "Lic. Marta Ruiz" }),
      plantillaWhatsappEjemplo({
        cuerpo:
          "Hola {{paciente}}, te espero el {{fecha}} a las {{hora}}. {{profesional}}",
      }),
    );

    expect(armado.mensaje).toBe(
      "Hola Ana García, te espero el 01/07/2026 a las 10:30. Lic. Marta Ruiz",
    );
  });

  it("formatea la fecha en DD/MM/AAAA por componentes UTC", () => {
    // Las fechas de turno se guardan a medianoche UTC. Si el formateo usara la
    // zona local, un turno del 1 de julio se anunciaría como 30 de junio a
    // cualquiera que corra el worker al oeste de Greenwich.
    const armado = armarRecordatorio(
      turnoEjemplo({ fecha: new Date("2026-03-05T00:00:00.000Z") }),
      pacienteEjemplo({ telefono: "1155554444" }),
      config(),
      plantillaWhatsappEjemplo({ cuerpo: "{{fecha}}" }),
    );

    expect(armado.mensaje).toBe("05/03/2026");
  });

  it("usa un tratamiento genérico si el consultorio no cargó el nombre", () => {
    // Sin esto el paciente recibiría "te espera " y nada más: el campo es
    // opcional en la configuración.
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({ telefono: "1155554444" }),
      config({ nombreProfesional: null }),
      plantillaWhatsappEjemplo({ cuerpo: "Te espera {{profesional}}" }),
    );

    expect(armado.mensaje).toBe("Te espera tu nutricionista");
  });

  it("expone el nombre completo del paciente, no solo el de pila", () => {
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({
        nombre: "Ana",
        apellido: "García",
        telefono: "1155554444",
      }),
      config(),
      plantillaWhatsappEjemplo(),
    );

    expect(armado.nombrePaciente).toBe("Ana García");
  });
});

describe("armarRecordatorio — el teléfono de destino", () => {
  it("normaliza a E.164 sin '+', como lo pide el proveedor", () => {
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({ telefono: "011 15 5555-4444" }),
      config(),
      plantillaWhatsappEjemplo(),
    );

    expect(armado.telefono).toMatch(/^\d+$/);
    expect(armado.telefono.startsWith("54")).toBe(true);
  });

  it("usa el prefijo de país del consultorio", () => {
    // Un consultorio fuera de Argentina carga los números sin prefijo local.
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({ telefono: "612345678" }),
      config({ whatsappPrefijoPais: "34" }),
      plantillaWhatsappEjemplo(),
    );

    expect(armado.telefono.startsWith("34")).toBe(true);
  });
});

describe("armarRecordatorio — envío por plantilla de Meta", () => {
  it("no arma envío por API si la plantilla no tiene clave de Meta", () => {
    // Sin clave aprobada solo sirve como texto: el proveedor por enlace no la
    // necesita y el de la API la rechazaría fuera de la ventana de 24 h.
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({ telefono: "1155554444" }),
      config(),
      plantillaWhatsappEjemplo({ claveMeta: null }),
    );

    expect(armado.envioPlantilla).toBeNull();
  });

  it("respeta el ORDEN de las variables de Meta: es el contrato", () => {
    // Meta numera los parámetros ({{1}}, {{2}}…) en vez de nombrarlos, así que
    // el orden del array ES el significado. Invertir dos posiciones no rompe
    // nada técnico: manda "Hola 10:30, te espero el Ana García".
    const armado = armarRecordatorio(
      turnoEjemplo({
        fecha: new Date("2026-07-01T00:00:00.000Z"),
        hora: "10:30",
      }),
      pacienteEjemplo({
        nombre: "Ana",
        apellido: "García",
        telefono: "1155554444",
      }),
      config({ nombreProfesional: "Lic. Marta Ruiz" }),
      plantillaWhatsappEjemplo({
        claveMeta: "recordatorio_turno",
        idiomaMeta: "es_AR",
        variablesMeta: ["paciente", "fecha", "hora", "profesional"],
      }),
    );

    expect(armado.envioPlantilla).not.toBeNull();
    expect(armado.envioPlantilla?.parametros).toEqual([
      "Ana García",
      "01/07/2026",
      "10:30",
      "Lic. Marta Ruiz",
    ]);
  });

  it("sigue el orden declarado aunque no sea el natural", () => {
    // El orden lo decide la plantilla aprobada en Meta, no el sentido común:
    // si allá {{1}} es la hora, acá tiene que salir la hora primero.
    const armado = armarRecordatorio(
      turnoEjemplo({ hora: "10:30" }),
      pacienteEjemplo({
        nombre: "Ana",
        apellido: "García",
        telefono: "1155554444",
      }),
      config(),
      plantillaWhatsappEjemplo({
        claveMeta: "recordatorio_turno",
        variablesMeta: ["hora", "paciente"],
      }),
    );

    expect(armado.envioPlantilla?.parametros).toEqual(["10:30", "Ana García"]);
  });

  it("una variable inexistente ni siquiera llega hasta acá: hay dos redes antes", () => {
    // `armarRecordatorio` tiene un `?? ""` para variables desconocidas, pero es
    // defensa REDUNDANTE, y por partida doble:
    //
    //   1. el TIPO de `variablesMeta` es la unión de las variables válidas, así
    //      que escribir una inventada no compila (de ahí el cast de abajo);
    //   2. y si llegara igual —de la base, de un JSON— `PlantillaWhatsapp` la
    //      rechaza al construirse.
    //
    // El test apunta a la red 2, que es la que protege al paciente de recibir
    // un "undefined" en su mensaje: si mañana esa validación se relajara,
    // el tipo solo no alcanzaría, y acá se vería.
    expect(() =>
      plantillaWhatsappEjemplo({
        claveMeta: "recordatorio_turno",
        variablesMeta: ["paciente", "variableInexistente"] as never,
      }),
    ).toThrow(/no es una variable del recordatorio/);
  });

  it("el textoEquivalente es el MISMO mensaje que se ve en la vista previa", () => {
    // El log de auditoría tiene que decir qué leyó el paciente, no
    // "plantilla_turno". Y el enlace wa.me usa este texto cuando no hay API.
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({ telefono: "1155554444" }),
      config(),
      plantillaWhatsappEjemplo({
        claveMeta: "recordatorio_turno",
        cuerpo: "Hola {{paciente}}",
      }),
    );

    expect(armado.envioPlantilla?.textoEquivalente).toBe(armado.mensaje);
  });

  it("el teléfono del envío por API es el mismo que el del armado", () => {
    const armado = armarRecordatorio(
      turnoEjemplo(),
      pacienteEjemplo({ telefono: "011 15 5555-4444" }),
      config(),
      plantillaWhatsappEjemplo({ claveMeta: "recordatorio_turno" }),
    );

    expect(armado.envioPlantilla?.telefono).toBe(armado.telefono);
  });
});
