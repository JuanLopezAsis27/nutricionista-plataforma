// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Test de regresión del alta desde documento.
 *
 * Cubre un fallo que no dejaba rastro: el esquema del formulario —compartido
 * con `FormularioPaciente`— exigía `establecimientoHabitualId`, un campo que
 * ESTA pantalla no dibuja. Zod lo rechazaba por faltante, `handleSubmit` no
 * llamaba al envío, y como el campo no estaba en pantalla no había ningún
 * `<FormMessage>` donde apareciera el motivo. El síntoma era «aprieto "Crear
 * paciente" y no pasa nada»: sin error en consola, sin pedido en la red y sin
 * ninguna pista de por dónde empezar a mirar.
 *
 * Por eso el test que importa es el primero: que apretar el botón con datos
 * válidos EFECTIVAMENTE dispare la mutación.
 */

const crearDesdeFicha = { mutate: vi.fn(), isPending: false };
const interpretarFicha = { mutate: vi.fn(), isPending: false };
const toastError = vi.fn();

/** Las sedes del consultorio; cada test las fija antes de renderizar. */
let sedes: { id: string; nombre: string }[] = [];

vi.mock("@/lib/hooks/usePacientes", () => ({
  usePacientes: () => ({ crearDesdeFicha, interpretarFicha }),
}));

vi.mock("@/lib/hooks/useEstablecimientos", () => ({
  useEstablecimientos: () => ({ listar: () => ({ data: sedes }) }),
}));

vi.mock("sonner", () => ({
  toast: { error: toastError, success: vi.fn(), warning: vi.fn() },
}));

// El subidor no participa del caso: la ficha se inyecta ya "leída" disparando
// el onSubido, que es lo que hace el componente real al terminar la subida.
vi.mock("@/componentes/comunes/SubidorArchivo", () => ({
  SubidorArchivo: ({ onSubido }: { onSubido: (a: { id: string }) => void }) => (
    <button type="button" onClick={() => onSubido({ id: "arch-1" })}>
      Subir documento
    </button>
  ),
}));

const { AltaPacienteDesdeDocumento } =
  await import("./AltaPacienteDesdeDocumento");

/** Lo que devuelve la IA al leer la ficha: lo mínimo para llegar al paso 2. */
const FICHA_LEIDA = {
  paciente: {
    nombre: "Ana",
    apellido: "Gomez",
    email: "ana@ejemplo.test",
    telefono: null,
    fechaNacimiento: null,
    sexo: null,
    notas: null,
  },
  historiaClinica: {},
  camposPersonalizados: [],
  alertas: [],
  antropometria: null,
  laboratorios: [],
};

/** Deja el componente en el paso 2, con el formulario ya precargado. */
async function llegarAlFormulario(usuario: ReturnType<typeof userEvent.setup>) {
  interpretarFicha.mutate.mockImplementation(
    (
      _entrada: unknown,
      opciones: { onSuccess: (ficha: typeof FICHA_LEIDA) => void },
    ) => opciones.onSuccess(FICHA_LEIDA),
  );

  render(<AltaPacienteDesdeDocumento onTerminado={vi.fn()} />);
  await usuario.click(screen.getByRole("button", { name: "Subir documento" }));

  await waitFor(() => {
    expect(screen.getByLabelText("Nombre")).toBeInTheDocument();
  });
}

describe("AltaPacienteDesdeDocumento", () => {
  beforeEach(() => {
    crearDesdeFicha.mutate.mockClear();
    interpretarFicha.mutate.mockReset();
    toastError.mockClear();
    // Consultorio de una sola sede: ahí el selector no se dibuja, que es el
    // caso típico y el que tenían los tests de siempre.
    sedes = [{ id: "est-1", nombre: "Consultorio centro" }];
  });

  it("crea el paciente al apretar el botón con los datos completos", async () => {
    const usuario = userEvent.setup();
    await llegarAlFormulario(usuario);

    await usuario.type(
      screen.getByLabelText("Contraseña de acceso del paciente"),
      "arroz-con-leche-2026",
    );
    await usuario.click(screen.getByRole("button", { name: "Crear paciente" }));

    // La regresión: esto se quedaba en cero y el botón parecía roto.
    await waitFor(() => {
      expect(crearDesdeFicha.mutate).toHaveBeenCalledTimes(1);
    });

    const [datos] = crearDesdeFicha.mutate.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(datos.email).toBe("ana@ejemplo.test");
    expect(datos.password).toBe("arroz-con-leche-2026");
    expect(datos.archivoId).toBe("arch-1");
    // Con una sola sede no se preguntó, así que viaja sin preferencia.
    expect(datos.establecimientoHabitualId).toBeNull();
  });

  it("con una sola sede no dibuja el selector", async () => {
    // No hay preferencia que expresar: preguntarlo sería pedir una decisión
    // que no existe. Mismo criterio que en el alta normal.
    const usuario = userEvent.setup();
    await llegarAlFormulario(usuario);

    expect(
      screen.queryByText("Establecimiento habitual"),
    ).not.toBeInTheDocument();
  });

  it("con varias sedes deja elegir la habitual y la manda", async () => {
    sedes = [
      { id: "est-1", nombre: "Consultorio centro" },
      { id: "est-2", nombre: "Consultorio norte" },
    ];
    const usuario = userEvent.setup();
    await llegarAlFormulario(usuario);

    await usuario.type(
      screen.getByLabelText("Contraseña de acceso del paciente"),
      "arroz-con-leche-2026",
    );
    await usuario.click(screen.getByRole("combobox", { name: /habitual/i }));
    await usuario.click(
      await screen.findByRole("option", { name: "Consultorio norte" }),
    );
    await usuario.click(screen.getByRole("button", { name: "Crear paciente" }));

    await waitFor(() => {
      expect(crearDesdeFicha.mutate).toHaveBeenCalledTimes(1);
    });

    const [datos] = crearDesdeFicha.mutate.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(datos.establecimientoHabitualId).toBe("est-2");
  });

  it("«Sin preferencia» viaja como null, no como el texto del select", async () => {
    // El valor centinela del formulario no puede llegar a la base: ahí
    // «ninguna» es NULL, y guardar "SIN_SEDE" dejaría un id que no resuelve
    // contra ningún establecimiento.
    sedes = [
      { id: "est-1", nombre: "Consultorio centro" },
      { id: "est-2", nombre: "Consultorio norte" },
    ];
    const usuario = userEvent.setup();
    await llegarAlFormulario(usuario);

    await usuario.type(
      screen.getByLabelText("Contraseña de acceso del paciente"),
      "arroz-con-leche-2026",
    );
    await usuario.click(screen.getByRole("button", { name: "Crear paciente" }));

    await waitFor(() => {
      expect(crearDesdeFicha.mutate).toHaveBeenCalledTimes(1);
    });

    const [datos] = crearDesdeFicha.mutate.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(datos.establecimientoHabitualId).toBeNull();
  });

  it("si la validación rechaza algo, lo dice en vez de no hacer nada", async () => {
    // La otra mitad del arreglo: aunque el rechazo venga de un campo que esta
    // pantalla no dibuja, el profesional tiene que enterarse de por qué no se
    // guardó. Acá el motivo es la contraseña vacía.
    const usuario = userEvent.setup();
    await llegarAlFormulario(usuario);

    await usuario.click(screen.getByRole("button", { name: "Crear paciente" }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledTimes(1);
    });
    expect(crearDesdeFicha.mutate).not.toHaveBeenCalled();

    const [mensaje] = toastError.mock.calls[0] as [string];
    expect(mensaje).toMatch(/contraseña/i);
  });
});
