import { describe, it, expect, vi } from "vitest";
import { ListarRecordatoriosPendientes } from "./recordatorios/ListarRecordatoriosPendientes";
import { ObtenerVistaPreviaRecordatorio } from "./recordatorios/ObtenerVistaPreviaRecordatorio";
import { desmarcarOtrasPredeterminadas } from "./recordatorios/predeterminada";
import { ObtenerMaterialesPaginado } from "./biblioteca/ObtenerMaterialesPaginado";
import { ObtenerMetricasDelPaciente } from "./metricas/ObtenerMetricasDelPaciente";
import { renderizarPlantilla } from "./whatsapp/plantilla";
import { RecordatorioWhatsapp } from "@/dominio/entidades/RecordatorioWhatsapp";
import { ConfiguracionConsultorio } from "@/dominio/entidades/ConfiguracionConsultorio";
import type { PlantillaWhatsapp } from "@/dominio/entidades/PlantillaWhatsapp";
import {
  mockRecordatorioWhatsappRepositorio,
  mockPacienteRepositorio,
  mockTurnoRepositorio,
  mockConfiguracionRepositorio,
  mockPlantillaWhatsappRepositorio,
  mockProveedorWhatsapp,
  mockMaterialRepositorio,
  mockMetricaDispositivoRepositorio,
  pacienteEjemplo,
  turnoEjemplo,
  plantillaWhatsappEjemplo,
} from "./_ayudas-test";

/** Los últimos casos de uso que quedaban sin cubrir. */

describe("renderizarPlantilla", () => {
  it("reemplaza los placeholders por sus valores", () => {
    expect(
      renderizarPlantilla("Hola {{paciente}}, el {{fecha}}", {
        paciente: "Ana",
        fecha: "01/07/2026",
      }),
    ).toBe("Hola Ana, el 01/07/2026");
  });

  it("reemplaza TODAS las apariciones de la misma variable", () => {
    // Un recordatorio suele nombrar al paciente al principio y al final.
    expect(
      renderizarPlantilla("{{paciente}}, te espero. Saludos, {{paciente}}", {
        paciente: "Ana",
      }),
    ).toBe("Ana, te espero. Saludos, Ana");
  });
});

describe("desmarcarOtrasPredeterminadas", () => {
  it("desmarca las demás y NO toca la que se está marcando", async () => {
    // `idNueva` es lo que evita que la plantilla se desmarque a sí misma en el
    // mismo acto de marcarse.
    const repositorio = mockPlantillaWhatsappRepositorio();
    const nueva = plantillaWhatsappEjemplo({ predeterminada: true }, "pla-1");
    const otra = plantillaWhatsappEjemplo({ predeterminada: true }, "pla-2");

    await desmarcarOtrasPredeterminadas(repositorio, [nueva, otra], "pla-1");

    const tocadas = (
      repositorio.actualizar as ReturnType<typeof vi.fn>
    ).mock.calls.map(([p]) => (p as PlantillaWhatsapp).aPrimitivos().id);
    expect(tocadas).toEqual(["pla-2"]);
  });

  it("no escribe nada si ninguna otra era predeterminada", async () => {
    const repositorio = mockPlantillaWhatsappRepositorio();
    const otra = plantillaWhatsappEjemplo({ predeterminada: false }, "pla-2");

    await desmarcarOtrasPredeterminadas(repositorio, [otra], null);

    expect(repositorio.actualizar).not.toHaveBeenCalled();
  });
});

describe("ListarRecordatoriosPendientes", () => {
  function pendiente(turnoId = "tur-1") {
    return RecordatorioWhatsapp.crear(
      {
        turnoId,
        pacienteId: "pac-1",
        telefono: "541155554444",
        mensaje: "Recordatorio de turno",
        usuarioId: "user-1",
        estado: "PREPARADO",
      },
      "rec-1",
      new Date("2026-07-01T09:00:00.000Z"),
    );
  }

  function armar(turno: ReturnType<typeof turnoEjemplo> | null) {
    return new ListarRecordatoriosPendientes(
      mockRecordatorioWhatsappRepositorio({
        pendientesDeConfirmar: vi.fn(async () => [pendiente()]),
      }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () => pacienteEjemplo()),
      }),
      mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turno) }),
    );
  }

  it("lista el pendiente de un turno vigente, con su enlace", async () => {
    const lista = await armar(turnoEjemplo()).ejecutar();

    expect(lista).toHaveLength(1);
    expect(lista[0]!.enlace).toContain("wa.me");
    expect(lista[0]!.mensaje).toBe("Recordatorio de turno");
  });

  it("DESCARTA el pendiente si el turno se canceló después", async () => {
    // Mostrarlo sería invitar a mandar un mensaje equivocado: el paciente
    // recibiría el recordatorio de un turno que ya no existe.
    const cancelado = turnoEjemplo();
    cancelado.cambiarEstado("CANCELADO");

    expect(await armar(cancelado).ejecutar()).toEqual([]);
  });

  it("descarta el pendiente cuyo paciente ya no existe", async () => {
    const caso = new ListarRecordatoriosPendientes(
      mockRecordatorioWhatsappRepositorio({
        pendientesDeConfirmar: vi.fn(async () => [pendiente()]),
      }),
      mockPacienteRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      mockTurnoRepositorio(),
    );

    expect(await caso.ejecutar()).toEqual([]);
  });
});

describe("ObtenerVistaPreviaRecordatorio", () => {
  function armar(claveMeta: string | null) {
    return new ObtenerVistaPreviaRecordatorio(
      mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => turnoEjemplo()) }),
      mockPacienteRepositorio({
        obtenerPorId: vi.fn(async () =>
          pacienteEjemplo({ telefono: "1155554444" }),
        ),
      }),
      mockConfiguracionRepositorio({
        obtener: vi.fn(async () => ConfiguracionConsultorio.porDefecto()),
      }),
      mockPlantillaWhatsappRepositorio({
        obtenerPredeterminada: vi.fn(async () =>
          plantillaWhatsappEjemplo({ claveMeta }),
        ),
      }),
      mockProveedorWhatsapp({ modoActual: vi.fn(async () => "API" as const) }),
    );
  }

  it("devuelve el texto ya armado, listo para retocar", async () => {
    const vista = await armar(null).ejecutar("tur-1");

    expect(vista.turnoId).toBe("tur-1");
    expect(vista.mensaje.length).toBeGreaterThan(0);
    expect(vista.mensaje).not.toContain("{{");
  });

  it("avisa si la plantilla saldría por la vía aprobada de Meta", async () => {
    // Importa para la UI: retocar el texto la baja a texto libre, y eso fuera
    // de la ventana de 24 h no sale. Sin este dato el profesional edita y el
    // envío falla sin explicación.
    expect(
      (await armar("recordatorio_24h").ejecutar("tur-1")).usaPlantillaAprobada,
    ).toBe(true);
    expect((await armar(null).ejecutar("tur-1")).usaPlantillaAprobada).toBe(
      false,
    );
  });

  it("falla si el turno no existe", async () => {
    const caso = new ObtenerVistaPreviaRecordatorio(
      mockTurnoRepositorio({ obtenerPorId: vi.fn(async () => null) }),
      mockPacienteRepositorio(),
      mockConfiguracionRepositorio(),
      mockPlantillaWhatsappRepositorio(),
      mockProveedorWhatsapp(),
    );

    await expect(caso.ejecutar("tur-inexistente")).rejects.toThrow();
  });
});

describe("ObtenerMaterialesPaginado", () => {
  it("pide la página y el total en PARALELO, con el mismo filtro", async () => {
    // El total tiene que contar sobre el filtro pero SIN la paginación: si le
    // pasara el límite, el paginador diría que hay una sola página siempre.
    const repositorio = mockMaterialRepositorio({
      listar: vi.fn(async () => []),
      contar: vi.fn(async () => 42),
    });
    const caso = new ObtenerMaterialesPaginado(repositorio);

    const pagina = await caso.ejecutar({
      pagina: 2,
      porPagina: 10,
      texto: "guia",
    });

    const [filtroListar] = (repositorio.listar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Record<string, unknown>];
    const [filtroContar] = (repositorio.contar as ReturnType<typeof vi.fn>).mock
      .calls[0] as [Record<string, unknown>];

    expect(filtroListar.texto).toBe("guia");
    expect(filtroListar.limite).toBe(10);
    expect(filtroListar.desplazamiento).toBe(10);
    // El contador NO recibe paginación.
    expect(filtroContar.texto).toBe("guia");
    expect(filtroContar.limite).toBeUndefined();
    expect(pagina.total).toBe(42);
  });
});

describe("ObtenerMetricasDelPaciente", () => {
  it("pide el rango completo, con desde y hasta en ese orden", async () => {
    // Los dos son Date y estan uno al lado del otro: invertirlos devuelve una
    // lista vacia sin fallar, y el grafico del paciente aparece en blanco sin
    // que nada indique por que.
    const repositorio = mockMetricaDispositivoRepositorio();
    const desde = new Date("2026-01-01T00:00:00.000Z");
    const hasta = new Date("2026-02-01T00:00:00.000Z");

    await new ObtenerMetricasDelPaciente(repositorio).ejecutar(
      "pac-1",
      desde,
      hasta,
    );

    expect(repositorio.listarPorRango).toHaveBeenCalledWith(
      "pac-1",
      desde,
      hasta,
    );
  });
});
