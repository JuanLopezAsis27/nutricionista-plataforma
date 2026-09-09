// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Test de comportamiento del formulario de alta de paciente.
 *
 * Complementa a `coherencia-formularios.test.ts`: aquel verifica que las REGLAS
 * del formulario coincidan con las del servidor; este verifica que el
 * formulario efectivamente las APLIQUE al usarlo —que el error se muestre y que
 * no se dispare la mutación—.
 *
 * Los hooks de datos se sustituyen por dobles: el objetivo es el formulario,
 * no la capa de red.
 */

const crear = { mutate: vi.fn(), isPending: false };
const actualizar = { mutate: vi.fn(), isPending: false };

vi.mock("@/lib/hooks/usePacientes", () => ({
  usePacientes: () => ({ crear, actualizar }),
}));

// Con una sola sede el selector de establecimiento habitual no se dibuja, que
// es el caso del consultorio típico y deja intactos los tests de siempre.
vi.mock("@/lib/hooks/useEstablecimientos", () => ({
  useEstablecimientos: () => ({ listar: () => ({ data: [] }) }),
}));

const { FormularioPaciente } = await import("./FormularioPaciente");
const { LARGO_MINIMO_PASSWORD } = await import("@/aplicacion/dtos/password");

describe("FormularioPaciente (alta)", () => {
  beforeEach(() => {
    crear.mutate.mockClear();
    actualizar.mutate.mockClear();
  });

  /** Completa los campos obligatorios menos la contraseña. */
  async function completarBase(usuario: ReturnType<typeof userEvent.setup>) {
    await usuario.type(screen.getByLabelText("Nombre"), "Ana");
    await usuario.type(screen.getByLabelText("Apellido"), "Gomez");
    await usuario.type(screen.getByLabelText("Email"), "ana@ejemplo.test");
  }

  it("muestra el mínimo real de la política en el placeholder", () => {
    // El placeholder decía "Mínimo 6 caracteres" mientras el servidor exigía
    // otro número. Ahora sale de la constante, así que no puede volver a
    // desfasarse; el test la lee de ahí en vez de repetir el número, que es lo
    // que lo hizo fallar cuando la política pasó de 12 a 8.
    render(<FormularioPaciente onTerminado={vi.fn()} />);

    expect(
      screen.getByPlaceholderText(`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`),
    ).toBeInTheDocument();
  });

  it("no envía el alta si la contraseña no cumple la política", async () => {
    const usuario = userEvent.setup();
    render(<FormularioPaciente onTerminado={vi.fn()} />);

    await completarBase(usuario);
    await usuario.type(
      screen.getByLabelText("Contraseña de acceso del paciente"),
      "a".repeat(LARGO_MINIMO_PASSWORD - 1),
    );
    await usuario.click(screen.getByRole("button", { name: /guardar|crear/i }));

    // Lo que importa no es solo que se vea el error, sino que la mutación NO
    // salga: antes salía y el servidor la rechazaba.
    await waitFor(() => {
      expect(
        screen.getByText(
          new RegExp(`al menos ${LARGO_MINIMO_PASSWORD} caracteres`, "i"),
        ),
      ).toBeInTheDocument();
    });
    expect(crear.mutate).not.toHaveBeenCalled();
  });

  it("envía el alta cuando los datos son válidos", async () => {
    const usuario = userEvent.setup();
    render(<FormularioPaciente onTerminado={vi.fn()} />);

    await completarBase(usuario);
    await usuario.type(
      screen.getByLabelText("Contraseña de acceso del paciente"),
      "arroz-con-leche-2026",
    );
    await usuario.click(screen.getByRole("button", { name: /guardar|crear/i }));

    await waitFor(() => {
      expect(crear.mutate).toHaveBeenCalledTimes(1);
    });

    const [datos] = crear.mutate.mock.calls[0] as [Record<string, unknown>];
    expect(datos.nombre).toBe("Ana");
    expect(datos.apellido).toBe("Gomez");
    expect(datos.email).toBe("ana@ejemplo.test");
    expect(datos.password).toBe("arroz-con-leche-2026");
    // Los opcionales vacíos viajan como null, no como "": la entidad
    // distingue "sin teléfono" de "teléfono vacío".
    expect(datos.telefono).toBeNull();
    expect(datos.notas).toBeNull();
  });

  it("no pide contraseña al editar un paciente existente", () => {
    render(
      <FormularioPaciente
        pacienteInicial={{
          id: "pac-1",
          nombre: "Ana",
          apellido: "Gomez",
          email: "ana@ejemplo.test",
          telefono: null,
          telefonoE164: null,
          establecimientoHabitualId: null,
          fechaNacimiento: null,
          sexo: null,
          notas: null,
          archivadoEn: null,
          motivoArchivado: null,
          creadoEn: new Date(),
          actualizadoEn: new Date(),
        }}
        onTerminado={vi.fn()}
      />,
    );

    expect(
      screen.queryByLabelText("Contraseña de acceso del paciente"),
    ).not.toBeInTheDocument();
  });
});
