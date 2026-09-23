import { describe, it, expect, vi } from "vitest";
import { CrearPlantillaWhatsapp } from "./CrearPlantillaWhatsapp";
import { ActualizarPlantillaWhatsapp } from "./ActualizarPlantillaWhatsapp";
import { EliminarPlantillaWhatsapp } from "./EliminarPlantillaWhatsapp";
import {
  RegistrarEstadosPlantillasMeta,
  MOTIVO_NO_EXISTE_EN_META,
} from "./RegistrarEstadosPlantillasMeta";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import { ErrorValidacion } from "@/dominio/errores/ErrorValidacion";
import {
  mockPlantillaWhatsappRepositorio,
  mockAdministradorPlantillasMeta,
  mockEnlaceConfirmacionTurno,
  plantillaWhatsappEjemplo,
} from "../_ayudas-test";

/**
 * Tests de las plantillas que la app da de alta y sigue en Meta.
 *
 * La regla que atraviesa todo: **Meta va primero**. Si Meta rechaza el alta o
 * la edición, no se guarda nada, y la plantilla de la app sigue diciendo lo
 * mismo que la que Meta tiene. Al revés, la app mostraría un texto y al
 * paciente le llegaría otro.
 */

const DATOS = {
  nombre: "Recordatorio con botones",
  cuerpo: "Hola {{paciente}}, te espero el {{fecha}} a las {{hora}}.",
  claveMeta: "recordatorio_botones",
  idiomaMeta: "es_AR",
  // El formulario de "crear en Meta" no pide el orden: lo deduce la app.
  variablesMeta: [],
  diasAntes: null,
  predeterminada: false,
  activa: true,
  botones: [
    {
      tipo: "RESPUESTA_RAPIDA" as const,
      texto: "Confirmo",
      accion: "CONFIRMAR_TURNO" as const,
    },
    {
      tipo: "URL" as const,
      texto: "Confirmar online",
      destino: "CONFIRMACION_TURNO" as const,
      url: null,
    },
  ],
};

describe("CrearPlantillaWhatsapp con enviarAMeta", () => {
  it("la da de alta en Meta con el cuerpo numerado y los botones, y guarda el id", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => [plantillaWhatsappEjemplo()]),
    });
    const administrador = mockAdministradorPlantillasMeta();
    const caso = new CrearPlantillaWhatsapp(
      repositorio,
      administrador,
      mockEnlaceConfirmacionTurno(),
    );

    const creada = await caso.ejecutar(DATOS, { enviarAMeta: true });

    expect(administrador.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        nombre: "recordatorio_botones",
        categoria: "UTILITY",
        cuerpo: "Hola {{1}}, te espero el {{2}} a las {{3}}.",
        ejemplosCuerpo: expect.arrayContaining(["Juan Pérez"]),
        botones: [
          { tipo: "QUICK_REPLY", texto: "Confirmo" },
          {
            tipo: "URL",
            texto: "Confirmar online",
            // URL dinámica: Meta completa el token en cada envío.
            url: "https://app.test/confirmar-turno?token={{1}}",
            ejemplo: "https://app.test/confirmar-turno?token=ejemplo",
          },
        ],
      }),
    );
    expect(creada.idMeta).toBe("meta-1");
    expect(creada.estadoMeta).toBe("EN_REVISION");
    expect(creada.variablesMeta).toEqual(["paciente", "fecha", "hora"]);
    // En revisión todavía no puede salir por la API.
    expect(creada.admiteEnvioPorApi).toBe(false);
  });

  it("si Meta la rechaza no se guarda nada", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio();
    const caso = new CrearPlantillaWhatsapp(
      repositorio,
      mockAdministradorPlantillasMeta({
        crear: vi.fn(async () => {
          throw new ErrorValidacion("Meta rechazó el pedido: nombre repetido");
        }),
      }),
      mockEnlaceConfirmacionTurno(),
    );

    await expect(caso.ejecutar(DATOS, { enviarAMeta: true })).rejects.toThrow(
      /nombre repetido/,
    );
    expect(repositorio.crear).not.toHaveBeenCalled();
  });

  it("frena antes de llamar a Meta lo que Meta rechazaría (variable al final)", async () => {
    const administrador = mockAdministradorPlantillasMeta();
    const caso = new CrearPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio(),
      administrador,
      mockEnlaceConfirmacionTurno(),
    );

    await expect(
      caso.ejecutar(
        { ...DATOS, cuerpo: "Te espero, {{paciente}}" },
        { enviarAMeta: true },
      ),
    ).rejects.toThrow(ErrorValidacion);
    expect(administrador.crear).not.toHaveBeenCalled();
  });

  it("sin enviarAMeta no toca Meta", async () => {
    const administrador = mockAdministradorPlantillasMeta();
    const caso = new CrearPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio(),
      administrador,
      mockEnlaceConfirmacionTurno(),
    );

    await caso.ejecutar({ ...DATOS, claveMeta: null, botones: [] });

    expect(administrador.crear).not.toHaveBeenCalled();
  });
});

/** Una plantilla ya dada de alta en Meta por la app, y aprobada. */
function enMeta(): PlantillaWhatsapp {
  return plantillaWhatsappEjemplo({
    cuerpo: DATOS.cuerpo,
    claveMeta: DATOS.claveMeta,
    variablesMeta: ["paciente", "fecha", "hora"],
  }).registrarAltaEnMeta("meta-1", "APROBADA");
}

describe("ActualizarPlantillaWhatsapp sobre una plantilla de Meta", () => {
  it("si cambia el cuerpo, edita en Meta y la vuelve a revisión", async () => {
    const administrador = mockAdministradorPlantillasMeta();
    const caso = new ActualizarPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio({
        obtenerPorId: vi.fn(async () => enMeta()),
      }),
      administrador,
      mockEnlaceConfirmacionTurno(),
    );

    const editada = await caso.ejecutar("pla-wa-1", {
      cuerpo: "Hola {{paciente}}, ¿venís el {{fecha}}?",
    });

    expect(administrador.editar).toHaveBeenCalledWith(
      "meta-1",
      expect.objectContaining({ cuerpo: "Hola {{1}}, ¿venís el {{2}}?" }),
    );
    expect(editada.estadoMeta).toBe("EN_REVISION");
    expect(editada.variablesMeta).toEqual(["paciente", "fecha"]);
  });

  it("marcarla predeterminada no la manda a revisión de nuevo", async () => {
    const administrador = mockAdministradorPlantillasMeta();
    const caso = new ActualizarPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio({
        obtenerPorId: vi.fn(async () => enMeta()),
      }),
      administrador,
      mockEnlaceConfirmacionTurno(),
    );

    const editada = await caso.ejecutar("pla-wa-1", { predeterminada: true });

    expect(administrador.editar).not.toHaveBeenCalled();
    expect(editada.estadoMeta).toBe("APROBADA");
  });

  it("si Meta rechaza la edición, no se guarda el texto nuevo", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio({
      obtenerPorId: vi.fn(async () => enMeta()),
    });
    const caso = new ActualizarPlantillaWhatsapp(
      repositorio,
      mockAdministradorPlantillasMeta({
        editar: vi.fn(async () => {
          throw new ErrorValidacion(
            "Meta rechazó el pedido: límite de ediciones",
          );
        }),
      }),
      mockEnlaceConfirmacionTurno(),
    );

    await expect(
      caso.ejecutar("pla-wa-1", { cuerpo: "Hola {{paciente}}, nos vemos." }),
    ).rejects.toThrow(/límite/);
    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});

describe("EliminarPlantillaWhatsapp", () => {
  it("borra en Meta la que dio de alta la app", async () => {
    const administrador = mockAdministradorPlantillasMeta();
    const plantilla = plantillaWhatsappEjemplo({
      claveMeta: "recordatorio_botones",
      variablesMeta: ["paciente", "fecha", "hora", "profesional"],
      predeterminada: false,
    }).registrarAltaEnMeta("meta-1", "APROBADA");
    const caso = new EliminarPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio({
        obtenerPorId: vi.fn(async () => plantilla),
      }),
      administrador,
    );

    await caso.ejecutar(plantilla.id);

    expect(administrador.eliminar).toHaveBeenCalledWith(
      "recordatorio_botones",
      "meta-1",
    );
  });

  it("NO toca en Meta una vinculada a mano: la creó otra persona", async () => {
    const administrador = mockAdministradorPlantillasMeta();
    const plantilla = plantillaWhatsappEjemplo({
      claveMeta: "hecha_a_mano",
      variablesMeta: ["paciente", "fecha", "hora", "profesional"],
      predeterminada: false,
    });
    const caso = new EliminarPlantillaWhatsapp(
      mockPlantillaWhatsappRepositorio({
        obtenerPorId: vi.fn(async () => plantilla),
      }),
      administrador,
    );

    await caso.ejecutar(plantilla.id);

    expect(administrador.eliminar).not.toHaveBeenCalled();
  });
});

describe("RegistrarEstadosPlantillasMeta", () => {
  const remota = {
    idMeta: "meta-1",
    nombre: "recordatorio_botones",
    idioma: "es_AR",
    estado: "RECHAZADA" as const,
    motivo: "Formato inválido",
  };

  it("aplica el estado a la dada de alta desde la app, por su id de Meta", async () => {
    const enRevision = plantillaWhatsappEjemplo({
      claveMeta: "recordatorio_botones",
      variablesMeta: ["paciente", "fecha", "hora", "profesional"],
    }).registrarAltaEnMeta("meta-1", "EN_REVISION");
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => [enRevision]),
    });

    const cambiadas = await new RegistrarEstadosPlantillasMeta(
      repositorio,
    ).ejecutar([remota]);

    expect(cambiadas).toBe(1);
    const guardada = vi.mocked(repositorio.actualizar).mock.calls[0]![0];
    expect(guardada.estadoMeta).toBe("RECHAZADA");
    expect(guardada.motivoEstadoMeta).toBe("Formato inválido");
  });

  it("a la vinculada a mano la encuentra por nombre e idioma", async () => {
    const aMano = plantillaWhatsappEjemplo({
      claveMeta: "recordatorio_botones",
      variablesMeta: ["paciente", "fecha", "hora", "profesional"],
    });
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => [aMano]),
    });

    await new RegistrarEstadosPlantillasMeta(repositorio).ejecutar([
      { ...remota, idMeta: "otro-id", estado: "PAUSADA" },
    ]);

    const guardada = vi.mocked(repositorio.actualizar).mock.calls[0]![0];
    expect(guardada.estadoMeta).toBe("PAUSADA");
    // Sigue siendo "a mano": saber el estado no la vuelve administrada.
    expect(guardada.idMeta).toBeNull();
  });

  it("con la lista COMPLETA, la que no está en Meta queda deshabilitada; el webhook no deduce ausencias", async () => {
    const aMano = plantillaWhatsappEjemplo({
      claveMeta: "no_existe_en_meta",
      variablesMeta: ["paciente", "fecha", "hora", "profesional"],
    });
    const repositorio = mockPlantillaWhatsappRepositorio({
      listar: vi.fn(async () => [aMano]),
    });
    const caso = new RegistrarEstadosPlantillasMeta(repositorio);

    expect(await caso.ejecutar([remota])).toBe(0);
    expect(await caso.ejecutar([remota], { completa: true })).toBe(1);
    const guardada = vi.mocked(repositorio.actualizar).mock.calls[0]![0];
    expect(guardada.estadoMeta).toBe("DESHABILITADA");
    expect(guardada.motivoEstadoMeta).toBe(MOTIVO_NO_EXISTE_EN_META);
  });
});
