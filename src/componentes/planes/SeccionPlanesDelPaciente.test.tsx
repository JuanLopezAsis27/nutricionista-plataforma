// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlanSalidaDto } from "@/aplicacion/dtos/plan.dto";

/**
 * Los planes del paciente se navegan como maestro/detalle: tarjetas que
 * resumen, y el plan elegido abierto en su lugar.
 *
 * Lo que fijan estas tests es lo que se rompe solo al tocar la pestaña: que con
 * varios planes NO se dibujen todos enteros (era el problema que las tarjetas
 * vinieron a resolver), que al abrir uno se vea ESE y no otro, y que
 * desasignarlo devuelva a la lista en vez de dejar una vista colgada de un plan
 * que el paciente ya no tiene.
 *
 * Los hooks de datos se sustituyen por dobles: el objetivo es la navegación de
 * la pestaña, no la capa de red.
 */

const desasignar = { mutate: vi.fn(), isPending: false };
let planes: PlanSalidaDto[] = [];

vi.mock("@/lib/hooks/usePlanes", () => ({
  usePlanes: () => ({
    delPaciente: () => ({ data: planes, isLoading: false }),
    desasignar,
    // Los usa el formulario de asignación, que acá no se abre.
    asignar: { mutate: vi.fn(), isPending: false },
    listar: () => ({ data: [], isLoading: false }),
  }),
}));

// La sección semanal es otra pestaña con su propia cadena de hooks; no es lo
// que se está probando.
vi.mock("@/componentes/planes-semanales/PlanSemanalDelPaciente", () => ({
  PlanSemanalDelPaciente: () => <div>plan semanal</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { SeccionPlanesDelPaciente } = await import("./SeccionPlanesDelPaciente");

/** Un plan de la app con una franja, lo mínimo para que `VistaPlan` dibuje. */
function plan(
  id: string,
  nombre: string,
  extra: Partial<PlanSalidaDto> = {},
): PlanSalidaDto {
  return {
    id,
    nombre,
    descripcion: null,
    esPlantilla: false,
    planOrigenId: null,
    archivado: false,
    caloriasMeta: null,
    proteinasMetaG: null,
    carbohidratosMetaG: null,
    grasasMetaG: null,
    contactosUtiles: null,
    comidas: [
      {
        id: `${id}-c1`,
        nombre: "Desayuno",
        horaDesde: null,
        horaHasta: null,
        orden: 0,
        opciones: [
          {
            id: `${id}-o1`,
            numero: 1,
            contenido: `Opción de ${nombre}`,
            recetaId: null,
            recetaNombre: null,
            recetaMacros: null,
            orden: 0,
          },
        ],
      },
    ],
    equivalencias: [],
    recomendaciones: [],
    modalidad: "APP",
    grupoId: null,
    grupoNombre: null,
    documentos: [],
    adjuntos: [],
    recetasVinculadas: [],
    creadoEn: new Date("2026-01-01"),
    actualizadoEn: new Date("2026-01-01"),
    ...extra,
  };
}

function renderizar() {
  return render(
    <SeccionPlanesDelPaciente
      pacienteId="pac-1"
      nombre="Ana"
      apellido="Gómez"
    />,
  );
}

beforeEach(() => {
  desasignar.mutate.mockClear();
  planes = [plan("pla-1", "Descenso"), plan("pla-2", "Volumen")];
});

afterEach(() => cleanup());

describe("SeccionPlanesDelPaciente", () => {
  it("lista los planes como tarjetas sin abrir ninguno", () => {
    renderizar();

    // Las dos tarjetas están, una por plan.
    expect(screen.getByRole("button", { name: /Descenso/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Volumen/ })).toBeTruthy();

    // Y el contenido de los planes NO: dibujarlos todos enteros es exactamente
    // lo que dejaba el tercero a cuatro pantallas de scroll.
    expect(screen.queryByText("Opción de Descenso")).toBeNull();
    expect(screen.queryByText("Opción de Volumen")).toBeNull();
  });

  it("al hacer clic en una tarjeta abre ESE plan y oculta las demás", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole("button", { name: /Volumen/ }));

    expect(screen.getByText("Opción de Volumen")).toBeTruthy();
    // El otro plan no quedó abierto atrás ni sigue como tarjeta.
    expect(screen.queryByText("Opción de Descenso")).toBeNull();
    expect(screen.queryByRole("button", { name: /Descenso/ })).toBeNull();
  });

  it("«Volver a los planes» devuelve a las tarjetas", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole("button", { name: /Descenso/ }));
    await usuario.click(
      screen.getByRole("button", { name: /Volver a los planes/ }),
    );

    expect(screen.queryByText("Opción de Descenso")).toBeNull();
    expect(screen.getByRole("button", { name: /Volumen/ })).toBeTruthy();
  });

  it("desasignar manda el plan ABIERTO, no otro", async () => {
    const usuario = userEvent.setup();
    renderizar();

    await usuario.click(screen.getByRole("button", { name: /Volumen/ }));
    await usuario.click(screen.getByRole("button", { name: /Desasignar/ }));

    // El botón de confirmar se busca DENTRO del diálogo: al abrirse, Radix deja
    // el resto de la página en aria-hidden, así que el de la vista ya no cuenta.
    // Que diga "Desasignar" y no "Eliminar" es parte de lo que se fija acá: el
    // plan no se borra, solo se corta el vínculo.
    const dialogo = within(screen.getByRole("dialog"));
    await usuario.click(dialogo.getByRole("button", { name: "Desasignar" }));

    expect(desasignar.mutate).toHaveBeenCalledWith(
      { planId: "pla-2", pacienteId: "pac-1" },
      expect.anything(),
    );
  });

  it("si el plan abierto deja de estar asignado, vuelve a las tarjetas", async () => {
    const usuario = userEvent.setup();
    const { rerender } = renderizar();

    await usuario.click(screen.getByRole("button", { name: /Volumen/ }));
    expect(screen.getByText("Opción de Volumen")).toBeTruthy();

    // Lo que devolvería la query después de desasignarlo: el id guardado ya no
    // está en la lista. Sin derivar el plan de la query, la vista seguiría
    // mostrando una copia congelada de algo que el paciente ya no tiene.
    planes = [plan("pla-1", "Descenso")];
    rerender(
      <SeccionPlanesDelPaciente
        pacienteId="pac-1"
        nombre="Ana"
        apellido="Gómez"
      />,
    );

    expect(screen.queryByText("Opción de Volumen")).toBeNull();
    expect(screen.getByRole("button", { name: /Descenso/ })).toBeTruthy();
  });

  it("sin planes no muestra tarjetas y lo dice", () => {
    planes = [];
    renderizar();

    expect(
      screen.getByText("El paciente no tiene ningún plan asignado."),
    ).toBeTruthy();
  });
});
