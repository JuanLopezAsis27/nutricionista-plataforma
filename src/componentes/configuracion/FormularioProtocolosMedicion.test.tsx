// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CAMPOS_PROTOCOLO_POR_DEFECTO,
  ETIQUETAS_PROTOCOLO,
} from "@/dominio/entidades/protocolosMedicion";
import type { CampoPlantilla } from "@/dominio/entidades/PlantillaAntropometrica";

/**
 * La personalización de los dos protocolos.
 *
 * Lo que fijan estas tests es lo que hace que podar no sea a ciegas ni
 * peligroso: que las medidas del fraccionamiento de Kerr NO se puedan sacar
 * del protocolo de 5 componentes, que el de 2 no se pueda quedar sin ninguna
 * ecuación de grasa, y que mientras se destilda la pantalla diga qué deja de
 * calcularse y con qué medida se recupera.
 *
 * El hook de datos se sustituye por un doble: lo que se prueba es la regla en
 * pantalla, no la capa de red.
 */

const guardar = { mutate: vi.fn(), isPending: false };
let camposDos: CampoPlantilla[] = [];
let camposCinco: CampoPlantilla[] = [];

vi.mock("@/lib/hooks/useConfiguracion", () => ({
  useConfiguracion: () => ({
    obtener: () => ({
      data: {
        camposDosComponentes: camposDos,
        camposCincoComponentes: camposCinco,
      },
      isLoading: false,
    }),
    guardar,
  }),
}));

const { FormularioProtocolosMedicion } =
  await import("./FormularioProtocolosMedicion");

/** El editor de un protocolo, por su nombre. */
function editor(protocolo: "DOS_COMPONENTES" | "CINCO_COMPONENTES") {
  return within(
    screen.getByRole("region", { name: ETIQUETAS_PROTOCOLO[protocolo] }),
  );
}

beforeEach(() => {
  guardar.mutate.mockClear();
  camposDos = [...CAMPOS_PROTOCOLO_POR_DEFECTO.DOS_COMPONENTES];
  camposCinco = [...CAMPOS_PROTOCOLO_POR_DEFECTO.CINCO_COMPONENTES];
});

afterEach(() => cleanup());

describe("FormularioProtocolosMedicion — 5 componentes", () => {
  it("no deja destildar una medida del fraccionamiento de Kerr", () => {
    render(<FormularioProtocolosMedicion />);

    // El perímetro de cabeza solo existe en el modelo de Kerr: sacarlo dejaría
    // al protocolo sin lo único que lo distingue del de 2 componentes.
    const cabeza = editor("CINCO_COMPONENTES").getByRole("switch", {
      name: "Perímetro de cabeza",
    });

    expect(cabeza).toBeDisabled();
    expect(cabeza.getAttribute("aria-checked")).toBe("true");
  });

  it("sí deja sacar una medida que el fraccionamiento no usa", async () => {
    render(<FormularioProtocolosMedicion />);
    const cinco = editor("CINCO_COMPONENTES");

    // La cintura máxima se anota por seguimiento clínico; ningún modelo la usa.
    const maxima = cinco.getByRole("switch", {
      name: "Perímetro de cintura máxima",
    });
    expect(maxima).toBeEnabled();

    await userEvent.click(maxima);
    expect(maxima.getAttribute("aria-checked")).toBe("false");

    await userEvent.click(cinco.getByRole("button", { name: /Guardar/ }));
    expect(guardar.mutate).toHaveBeenCalledTimes(1);

    const enviado = guardar.mutate.mock.calls[0]![0] as {
      camposCincoComponentes: string[];
    };
    expect(enviado.camposCincoComponentes).not.toContain("circCinturaMaxima");
    expect(enviado.camposCincoComponentes).toContain("circCabeza");
    // Guarda SOLO su protocolo: el otro editor no tiene por qué revisarse
    // para cambiar este.
    expect(enviado).not.toHaveProperty("camposDosComponentes");
  });

  it("al sacar la cresta ilíaca avisa qué ecuación deja de calcularse", async () => {
    render(<FormularioProtocolosMedicion />);
    const cinco = editor("CINCO_COMPONENTES");

    expect(cinco.queryByText(/Durnin/)).not.toBeNull();

    await userEvent.click(
      cinco.getByRole("switch", { name: "Pliegue de cresta ilíaca" }),
    );

    // El motivo es la mitad del dato: sin la medida nombrada, ver desaparecer
    // la ecuación no dice cuál campo volver a tildar.
    const perdida = cinco.getByText(/Durnin/).closest("li");
    expect(perdida?.textContent).toContain("Falta pliegue de cresta ilíaca");
  });
});

describe("FormularioProtocolosMedicion — 2 componentes", () => {
  it("deja podar mientras quede una ecuación de grasa en pie", async () => {
    render(<FormularioProtocolosMedicion />);
    const dos = editor("DOS_COMPONENTES");

    // Muslo y pantorrilla se llevan puesto Yuhasz/Carter, pero Faulkner sigue.
    await userEvent.click(
      dos.getByRole("switch", { name: "Pliegue de muslo" }),
    );
    await userEvent.click(
      dos.getByRole("switch", { name: "Pliegue de pantorrilla" }),
    );

    expect(dos.getByRole("button", { name: /Guardar/ })).toBeEnabled();
    expect(dos.queryByText(/No queda ninguna ecuación de grasa/)).toBeNull();
  });

  it("sin ninguna ecuación de grasa bloquea el guardado y dice qué falta", async () => {
    render(<FormularioProtocolosMedicion />);
    const dos = editor("DOS_COMPONENTES");

    // El tricipital lo usan las seis: sacarlo solo a él deja al protocolo sin
    // ningún porcentaje que mostrar.
    await userEvent.click(
      dos.getByRole("switch", { name: "Pliegue tricipital" }),
    );

    expect(
      dos.getByText(/No queda ninguna ecuación de grasa/).textContent,
    ).toContain("pliegue tricipital");
    expect(dos.getByRole("button", { name: /Guardar/ })).toBeDisabled();

    await userEvent.click(dos.getByRole("button", { name: /Guardar/ }));
    expect(guardar.mutate).not.toHaveBeenCalled();
  });

  it("las medidas de Kerr no están bloqueadas acá: este protocolo no las necesita", () => {
    render(<FormularioProtocolosMedicion />);

    expect(
      editor("DOS_COMPONENTES").getByRole("switch", {
        name: "Perímetro de cabeza",
      }),
    ).toBeEnabled();
  });
});
