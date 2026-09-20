// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Lo que fija esta test es la razón de ser del proveedor: **cerrar el panel no
 * corta la grabación**.
 *
 * No es algo que se vea en una revisión de código ni que rompa la compilación.
 * Mientras el grabador vivió dentro del diálogo, cerrarlo desmontaba el
 * componente y con él el `MediaRecorder`; volver a poner ahí el `useGrabadorAudio`
 * —o montar el proveedor dentro de una pantalla en vez del layout— devuelve el
 * problema exacto sin que falle nada más. De ahí que la test compruebe lo que
 * compruebe: que después de minimizar, el grabador NO recibió `detener` ni
 * `descartar`, y que la píldora sigue en pantalla contando.
 *
 * El grabador se sustituye por un doble: `MediaRecorder` y `getUserMedia` no
 * existen en jsdom, y lo que se prueba es de quién es el grabador, no cómo
 * graba.
 */

const grabador = {
  estado: "INACTIVO" as string,
  fallo: null,
  segundos: 0,
  grabando: false,
  comenzar: vi.fn(),
  pausar: vi.fn(),
  reanudar: vi.fn(),
  detener: vi.fn(),
  descartar: vi.fn(),
};

/** Pone al doble a grabar, como lo dejaría un `comenzar` exitoso. */
function empezarAGrabar(): void {
  grabador.comenzar.mockImplementation(() => {
    grabador.estado = "GRABANDO";
    grabador.grabando = true;
    grabador.segundos = 12;
    return Promise.resolve(true);
  });
}

vi.mock("./useGrabadorAudio", async () => {
  const real =
    await vi.importActual<typeof import("./useGrabadorAudio")>(
      "./useGrabadorAudio",
    );
  return { ...real, useGrabadorAudio: () => grabador };
});

const registrar = { mutate: vi.fn(), isPending: false };
vi.mock("@/lib/hooks/useGrabaciones", () => ({
  useGrabaciones: () => ({
    // El panel lo llama para listar las grabaciones ya guardadas; acá no hay.
    deTurno: () => ({ data: undefined, isLoading: false }),
    registrar,
    eliminar: { mutate: vi.fn(), isPending: false },
    reintentar: { mutate: vi.fn(), isPending: false },
    regenerarResumen: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/lib/hooks/useSubirArchivo", () => ({
  useSubirArchivo: () => ({ subir: vi.fn(), subiendo: false }),
}));

const { ProveedorGrabacionConsulta, useAbrirGrabacion } =
  await import("./ProveedorGrabacionConsulta");

/**
 * Una pantalla cualquiera del panel: lo único que hace es abrir el panel, y
 * por el mismo hook que usan las de verdad (`useAbrirGrabacion`, el contexto
 * liviano que no sigue al cronómetro).
 */
function PantallaCualquiera() {
  const abrirPanel = useAbrirGrabacion();
  return (
    <button
      onClick={() => abrirPanel({ id: "tur-1", pacienteNombre: "Ana Gómez" })}
    >
      Grabar el turno
    </button>
  );
}

function renderizar() {
  return render(
    <ProveedorGrabacionConsulta>
      <PantallaCualquiera />
    </ProveedorGrabacionConsulta>,
  );
}

beforeEach(() => {
  grabador.estado = "INACTIVO";
  grabador.grabando = false;
  grabador.segundos = 0;
  vi.clearAllMocks();
});

afterEach(() => cleanup());

describe("ProveedorGrabacionConsulta", () => {
  it("al minimizar sigue grabando y deja la píldora con los controles", async () => {
    const usuario = userEvent.setup();
    empezarAGrabar();
    renderizar();

    await usuario.click(
      screen.getByRole("button", { name: "Grabar el turno" }),
    );
    await usuario.click(
      screen.getByRole("button", { name: /Grabar la consulta/ }),
    );
    expect(grabador.comenzar).toHaveBeenCalled();

    await usuario.click(screen.getByRole("button", { name: /Minimizar/ }));

    // Lo que importa: el panel se fue, la grabación no.
    expect(
      screen.queryByText("Grabación de la consulta · Ana Gómez"),
    ).toBeNull();
    expect(grabador.detener).not.toHaveBeenCalled();
    expect(grabador.descartar).not.toHaveBeenCalled();

    // Y queda a la vista de quién es la consulta que se está grabando, con
    // el cronómetro corriendo y el botón de cortar.
    expect(screen.getByText("Ana Gómez")).toBeTruthy();
    expect(screen.getByText(/0:12/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Terminar/ })).toBeTruthy();
  });

  it("desde la píldora se vuelve al panel del turno que se está grabando", async () => {
    const usuario = userEvent.setup();
    empezarAGrabar();
    renderizar();

    await usuario.click(
      screen.getByRole("button", { name: "Grabar el turno" }),
    );
    await usuario.click(
      screen.getByRole("button", { name: /Grabar la consulta/ }),
    );
    await usuario.click(screen.getByRole("button", { name: /Minimizar/ }));

    await usuario.click(
      screen.getByRole("button", { name: "Abrir la grabación de la consulta" }),
    );

    expect(
      screen.getByRole("button", { name: /Terminar y guardar/ }),
    ).toBeTruthy();
  });

  it("si el micrófono no abre no da la grabación por empezada", async () => {
    const usuario = userEvent.setup();
    // `comenzar` no lanza: deja el estado en ERROR y devuelve false. Dar el
    // turno por grabando ahí dejaría una píldora que no graba nada.
    grabador.comenzar.mockImplementation(() => {
      grabador.estado = "ERROR";
      return Promise.resolve(false);
    });
    renderizar();

    await usuario.click(
      screen.getByRole("button", { name: "Grabar el turno" }),
    );
    await usuario.click(
      screen.getByRole("button", { name: /Grabar la consulta/ }),
    );

    expect(
      screen.queryByRole("region", {
        name: "Grabación de la consulta en curso",
      }),
    ).toBeNull();
  });
});
