// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ContenidoParaGuardar } from "./formulario/esquema";
import { formularioVacio } from "./formulario/esquema";

/**
 * El formulario de una planificación de carrera: lo que fijan estas tests es
 * que no manda nada sin lo obligatorio (y dice qué falta), que una ingesta
 * nueva cae media hora después de la anterior, y que lo que se guarda es lo
 * que se escribió —el tiempo como minutos, el alimento con su origen y su
 * medida—. Lo de antes de largar (minutos negativos) lo cubre `resumen.test.ts`.
 *
 * El buscador de alimentos abre un modal con su propia cadena de hooks: no es
 * lo que se prueba acá, y se reemplaza por un botón que agrega un gel.
 */

vi.mock("@/componentes/comunes/alimentos/BuscadorAlimento", () => ({
  BuscadorAlimento: ({
    onElegir,
  }: {
    onElegir: (a: Record<string, unknown>) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onElegir({
          id: "ali-gel",
          nombre: "Gel",
          marca: null,
          fuente: "BASE",
          referenciaExterna: null,
          caloriasPor100: 250,
          proteinasPor100: 0,
          carbohidratosPor100: 62.5,
          grasasPor100: 0,
          unidadBase: "GRAMO",
          medidas: [{ nombre: "unidad", cantidad: 40 }],
          categoria: null,
          imagenVersion: null,
        })
      }
    >
      Agregar gel
    </button>
  ),
}));

const { FormularioPlanificacion } = await import("./FormularioPlanificacion");

afterEach(() => cleanup());

function renderizar(onGuardar = vi.fn()) {
  render(
    <FormularioPlanificacion
      inicial={formularioVacio()}
      guardando={false}
      onGuardar={onGuardar}
      onCancelar={vi.fn()}
    />,
  );
  return onGuardar;
}

describe("FormularioPlanificacion", () => {
  it("no guarda sin nombre, distancia ni duración, y dice qué falta", async () => {
    const onGuardar = renderizar();
    await userEvent.click(
      screen.getByRole("button", { name: /Guardar planificación/ }),
    );
    expect(onGuardar).not.toHaveBeenCalled();
    expect(screen.getByText(/Poné un nombre/)).toBeTruthy();
    expect(screen.getByText(/distancia/)).toBeTruthy();
    expect(screen.getByText(/duración estimada como h:mm/)).toBeTruthy();
  });

  it("guarda la carrera y sus ingestas en minutos, con el gel copiado de la base", async () => {
    const onGuardar = renderizar();
    await userEvent.type(
      screen.getByLabelText("Nombre de la planificación"),
      "Media maratón",
    );
    await userEvent.type(screen.getByLabelText("Distancia (km)"), "21,1");
    await userEvent.type(
      screen.getByLabelText("Duración estimada (h:mm)"),
      "1:45",
    );

    // La primera ingesta arranca a los 0:30, la segunda media hora después.
    await userEvent.click(
      screen.getByRole("button", { name: /Agregar ingesta/ }),
    );
    await userEvent.click(
      screen.getByRole("button", { name: /Agregar ingesta/ }),
    );
    const tiempos = screen.getAllByLabelText(/Tiempo \(h:mm\)/);
    expect((tiempos[0] as HTMLInputElement).value).toBe("0:30");
    expect((tiempos[1] as HTMLInputElement).value).toBe("1:00");

    // Un gel en cada una.
    const geles = screen.getAllByRole("button", { name: "Agregar gel" });
    await userEvent.click(geles[0]!);
    await userEvent.click(geles[1]!);

    // El resumen en vivo ya cuenta los dos geles (50 g en 1:45 → 28,6 g/h).
    expect(screen.getByText("28,6 g/h")).toBeTruthy();

    await userEvent.click(
      screen.getByRole("button", { name: /Guardar planificación/ }),
    );
    expect(onGuardar).toHaveBeenCalledTimes(1);
    const contenido = onGuardar.mock.calls[0]![0] as ContenidoParaGuardar;
    expect(contenido.nombre).toBe("Media maratón");
    expect(contenido.carrera).toMatchObject({
      distanciaKm: 21.1,
      duracionEstimadaMin: 105,
    });
    expect(contenido.ingestas?.map((i) => i.minuto)).toEqual([30, 60]);
    expect(contenido.ingestas?.[0]?.alimentos?.[0]).toMatchObject({
      nombre: "Gel",
      medida: "unidad",
      cantidadMedida: 1,
      cantidadPorMedida: 40,
      alimentoOrigenId: "ali-gel",
    });
  });

  it("una duración escrita como «3» se marca y no deja la llegada en el minuto 3", async () => {
    renderizar();
    const campo = screen.getByLabelText("Duración estimada (h:mm)");
    await userEvent.type(campo, "3");
    await userEvent.click(
      screen.getByRole("button", { name: /Agregar ingesta/ }),
    );
    expect(screen.getByText(/tres horas es 3:00/)).toBeTruthy();
    expect(screen.queryByText(/Cae después de la llegada/)).toBeNull();

    // Escrita bien, dice cómo la leyó.
    await userEvent.type(campo, ":00");
    expect(screen.getByText("3:00 h")).toBeTruthy();
    expect(screen.queryByText(/tres horas es 3:00/)).toBeNull();
  });
});
