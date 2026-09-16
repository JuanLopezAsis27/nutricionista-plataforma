// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { MedicionComposicionDto } from "@/aplicacion/dtos/evaluacion.dto";
import type { MetodoGrasa } from "@/dominio/servicios/grasaPorPliegues";
import { EvolucionGrasa } from "./EvolucionMasas";
import { TEMAS_COMPOSICION } from "./paleta";

/**
 * La serie de grasa se lee en dos posiciones —una ecuación o todas— y lo que
 * las tests fijan es lo que NO puede cambiar entre las dos: el color de cada
 * ecuación y el valor que se muestra escrito al lado.
 *
 * El gráfico en sí vive dentro de un `ResponsiveContainer`, que en jsdom mide
 * 0px y no dibuja nada. La leyenda con los valores está afuera a propósito
 * —es el canal de texto que no depende del color— y es lo que se puede
 * comprobar acá.
 */
function medicion(
  fecha: string,
  porcentajes: Partial<Record<MetodoGrasa, number>>,
): MedicionComposicionDto {
  return {
    id: fecha,
    fecha: new Date(`${fecha}T00:00:00.000Z`),
    resultado: {
      grasaPorPliegues: {
        resultados: Object.entries(porcentajes).map(([metodo, porcentaje]) => ({
          metodo: metodo as MetodoGrasa,
          porcentajeGrasa: porcentaje,
          masaGrasaKg: porcentaje,
          masaLibreGrasaKg: 100 - porcentaje,
        })),
        faltantes: [],
      },
    },
  } as unknown as MedicionComposicionDto;
}

const SERIE = [
  medicion("2024-03-01", { YUHASZ_CARTER: 22.4, FAULKNER: 19.1 }),
  medicion("2024-06-01", { YUHASZ_CARTER: 20.8, FAULKNER: 17.6 }),
];

const TEMA = TEMAS_COMPOSICION.light;

/** El color con el que la leyenda pinta la llave de una ecuación. */
function colorEnLeyenda(etiqueta: string): string | undefined {
  const fila = screen.getByText(etiqueta).closest("li");
  return fila?.querySelector<HTMLElement>("span[aria-hidden]")?.style
    .backgroundColor;
}

afterEach(() => cleanup());

describe("EvolucionGrasa", () => {
  it("con todas las ecuaciones escribe el último valor de cada una", () => {
    render(
      <EvolucionGrasa
        mediciones={SERIE}
        metodos={["YUHASZ_CARTER", "FAULKNER"]}
        tema={TEMA}
      />,
    );

    expect(screen.getByText("Yuhasz / Carter (6 pliegues)")).toBeVisible();
    expect(screen.getByText("Faulkner (4 pliegues)")).toBeVisible();
    // El de la ÚLTIMA consulta, no el de la primera ni un promedio.
    expect(screen.getByText("20,80 %")).toBeVisible();
    expect(screen.getByText("17,60 %")).toBeVisible();
    expect(screen.queryByText("22,40 %")).toBeNull();
  });

  it("filtrada a una ecuación deja solo esa, sin repintarla", () => {
    const { unmount } = render(
      <EvolucionGrasa
        mediciones={SERIE}
        metodos={["YUHASZ_CARTER", "FAULKNER"]}
        tema={TEMA}
      />,
    );
    const conTodas = colorEnLeyenda("Faulkner (4 pliegues)");
    unmount();

    render(
      <EvolucionGrasa mediciones={SERIE} metodos={["FAULKNER"]} tema={TEMA} />,
    );

    expect(screen.queryByText("Yuhasz / Carter (6 pliegues)")).toBeNull();
    expect(screen.getByText("Faulkner (4 pliegues)")).toBeVisible();
    // El color sale del índice del método en el enum, no de su posición en el
    // gráfico: filtrar no puede repintar a las que quedan.
    expect(colorEnLeyenda("Faulkner (4 pliegues)")).toBe(conTodas);
  });

  it("con una sola consulta no dibuja una serie", () => {
    render(
      <EvolucionGrasa
        mediciones={[SERIE[0]!]}
        metodos={["YUHASZ_CARTER", "FAULKNER"]}
        tema={TEMA}
      />,
    );

    expect(screen.getByText(/vas a ver la evolución/)).toBeVisible();
    expect(screen.queryByText("Faulkner (4 pliegues)")).toBeNull();
  });

  it("ignora una ecuación que ninguna consulta resolvió", () => {
    render(
      <EvolucionGrasa
        mediciones={SERIE}
        metodos={["YUHASZ_CARTER", "WITHERS"]}
        tema={TEMA}
      />,
    );

    expect(screen.getByText("Yuhasz / Carter (6 pliegues)")).toBeVisible();
    expect(screen.queryByText(/Withers/)).toBeNull();
  });
});
