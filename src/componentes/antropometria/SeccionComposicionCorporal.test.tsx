// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PlantillaAntropometricaDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { CampoPlantilla } from "@/dominio/entidades/PlantillaAntropometrica";
import { PLANTILLAS_BASE } from "@/dominio/entidades/plantillasBase";

/**
 * Cómo se elige QUÉ se carga en una medición nueva.
 *
 * Los dos protocolos son las plantillas principales y una propia se acomoda a
 * la que le da el cuero. Lo que fijan estas tests es esa dependencia, que no
 * falla ruidosamente si se rompe: una plantilla de 6 pliegues usada bajo el
 * protocolo de 5 componentes se guarda perfecto y produce una medición sin el
 * fraccionamiento, que es lo único que ese protocolo viene a contestar.
 */

/** Los props con los que el formulario quedó montado en el último render. */
let ultimosProps: { protocolo: string; camposVisibles: unknown } | null = null;

let listaPlantillas: PlantillaAntropometricaDto[] = [];

function plantilla(
  id: string,
  nombre: string,
  campos: CampoPlantilla[],
): PlantillaAntropometricaDto {
  return {
    id,
    nombre,
    descripcion: null,
    campos,
    alcance: {
      metodosGrasa: [],
      cincoMasas: false,
      somatotipo: false,
      faltaParaServir: [],
    },
    creadoEn: new Date("2026-01-01T00:00:00.000Z"),
  };
}

vi.mock("@/lib/hooks/useEvaluacion", () => ({
  useEvaluacion: () => ({
    obtenerComposicion: () => ({
      data: {
        mediciones: [],
        objetivos: [],
        sexo: "FEMENINO",
        valoresActuales: {},
      },
      isLoading: false,
      isError: false,
    }),
    obtenerPlantillas: () => ({ data: listaPlantillas, isLoading: false }),
    eliminarAntropometria: { mutate: vi.fn(), isPending: false },
  }),
}));

// Las otras vistas de la pestaña tienen su propia cadena de hooks y no
// participan de la elección de protocolo y plantilla.
vi.mock("./DashboardComposicion", () => ({
  DashboardComposicion: () => <div>dashboard</div>,
}));
vi.mock("./TarjetasMediciones", () => ({
  TarjetasMediciones: () => <div>mediciones</div>,
}));
vi.mock("./ObjetivosComposicion", () => ({
  ObjetivosComposicion: () => <div>objetivos</div>,
}));
vi.mock("./ImportadorMediciones", () => ({
  ImportadorMediciones: () => <div>importador</div>,
}));
vi.mock("./FormularioMedicion", () => ({
  FormularioMedicion: (props: {
    protocolo: string;
    camposVisibles: unknown;
  }) => {
    ultimosProps = {
      protocolo: props.protocolo,
      camposVisibles: props.camposVisibles,
    };
    return <div>formulario</div>;
  },
}));

const { SeccionComposicionCorporal } =
  await import("./SeccionComposicionCorporal");

const SEIS_PLIEGUES = PLANTILLAS_BASE.find((p) => p.clave === "SEIS_PLIEGUES")!;
const ISAK = PLANTILLAS_BASE.find((p) => p.clave === "ISAK_COMPLETO")!;

/** Abre el modal de medición nueva y devuelve el usuario de la interacción. */
async function abrirNueva() {
  const usuario = userEvent.setup();
  render(<SeccionComposicionCorporal pacienteId="pac-1" />);
  await usuario.click(screen.getByRole("button", { name: /Nueva medición/ }));
  return usuario;
}

beforeEach(() => {
  ultimosProps = null;
  listaPlantillas = [
    plantilla("pl-1", "Consulta rápida", SEIS_PLIEGUES.campos),
    plantilla("pl-2", "Perfil completo", ISAK.campos),
  ];
});

afterEach(() => cleanup());

describe("SeccionComposicionCorporal — qué se carga", () => {
  it("arranca en 2 componentes con los campos del protocolo", async () => {
    await abrirNueva();

    expect(ultimosProps?.protocolo).toBe("DOS_COMPONENTES");
    // Null = el formulario pide lo que el consultorio configuró para el
    // protocolo. No hay «perfil completo»: eso ya es uno de los protocolos.
    expect(ultimosProps?.camposVisibles).toBeNull();
    expect(
      screen.queryByRole("option", { name: /Perfil completo \(todos/ }),
    ).toBeNull();
  });

  it("en 5 componentes deshabilita la plantilla que no alcanza, y dice por qué", async () => {
    const usuario = await abrirNueva();

    await usuario.click(screen.getByRole("button", { name: /5 componentes/ }));
    await usuario.click(screen.getByRole("combobox", { name: /Plantilla/ }));

    const corta = await screen.findByRole("option", {
      name: /Consulta rápida/,
    });
    expect(corta).toHaveAttribute("aria-disabled", "true");
    expect(corta.textContent).toContain("no alcanza para este protocolo");

    // La que sí resuelve el fraccionamiento queda elegible.
    expect(
      screen.getByRole("option", { name: /Perfil completo · / }),
    ).not.toHaveAttribute("aria-disabled", "true");
  });

  it("al pasar a 5 componentes suelta la plantilla que dejó de servir", async () => {
    const usuario = await abrirNueva();

    await usuario.click(screen.getByRole("combobox", { name: /Plantilla/ }));
    await usuario.click(
      await screen.findByRole("option", { name: /Consulta rápida/ }),
    );
    expect(ultimosProps?.camposVisibles).toEqual(SEIS_PLIEGUES.campos);

    await usuario.click(screen.getByRole("button", { name: /5 componentes/ }));

    // Vuelve al protocolo solo: dejarla puesta cargaría una medición sin el
    // fraccionamiento bajo el protocolo que lo promete.
    expect(ultimosProps?.protocolo).toBe("CINCO_COMPONENTES");
    expect(ultimosProps?.camposVisibles).toBeNull();
  });

  it("una plantilla que sirve para los dos sobrevive al cambio de protocolo", async () => {
    const usuario = await abrirNueva();

    await usuario.click(screen.getByRole("combobox", { name: /Plantilla/ }));
    await usuario.click(
      await screen.findByRole("option", { name: /Perfil completo · / }),
    );

    await usuario.click(screen.getByRole("button", { name: /5 componentes/ }));

    expect(ultimosProps?.protocolo).toBe("CINCO_COMPONENTES");
    expect(ultimosProps?.camposVisibles).toEqual(ISAK.campos);
  });
});
