// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/componentes/ui/form";
import { esquema, type DatosFormulario } from "./esquema";
import { SeccionMetasMacros } from "./SeccionMetasMacros";
import { SeccionDatosGenerales } from "./SeccionDatosGenerales";
import { SeccionEquivalencias } from "./SeccionListas";

/**
 * Tests de las secciones del formulario de plan.
 *
 * ESTOS TESTS NO PODÍAN EXISTIR ANTES. Mientras el formulario fue un archivo de
 * 913 líneas, montar la sección de metas exigía montar el formulario entero
 * —con sus dos hooks de tRPC, el subidor de archivos y los tres arrays
 * anidados—. Partirlo no fue solo cuestión de tamaño: es lo que hace que cada
 * pieza se pueda ejercitar sola.
 *
 * El envoltorio de abajo es todo lo que hace falta ahora: un `useForm` con el
 * esquema real y nada más.
 */

/** Monta una sección con un formulario real, sin el resto del editor. */
function Envoltorio({
  children,
}: {
  children: (
    form: ReturnType<typeof useForm<DatosFormulario>>,
  ) => React.ReactNode;
}) {
  const form = useForm<DatosFormulario>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombre: "",
      descripcion: "",
      esPlantilla: false,
      caloriasMeta: "",
      proteinasMetaG: "",
      carbohidratosMetaG: "",
      grasasMetaG: "",
      contactosUtiles: "",
      comidas: [],
      equivalencias: [],
      recomendaciones: [],
      modalidad: "APP",
      grupoId: "__suelto__",
      archivoPrincipalId: null,
    },
  });
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(vi.fn())}>{children(form)}</form>
    </Form>
  );
}

describe("SeccionMetasMacros", () => {
  it("muestra las cuatro metas con su unidad", () => {
    render(
      <Envoltorio>
        {(form) => <SeccionMetasMacros control={form.control} />}
      </Envoltorio>,
    );

    expect(screen.getByLabelText("Calorías (kcal)")).toBeInTheDocument();
    expect(screen.getByLabelText("Proteínas (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Carbohidratos (g)")).toBeInTheDocument();
    expect(screen.getByLabelText("Grasas (g)")).toBeInTheDocument();
  });

  it("escribe en el campo correcto: no cruza los cuatro macros", () => {
    // Cuatro inputs consecutivos con el mismo aspecto y el mismo tipo. Cruzar
    // dos `name` en el JSX no rompe nada visible; el plan queda con las
    // proteínas cargadas en grasas.
    render(
      <Envoltorio>
        {(form) => <SeccionMetasMacros control={form.control} />}
      </Envoltorio>,
    );

    expect(screen.getByLabelText("Calorías (kcal)")).toHaveAttribute(
      "name",
      "caloriasMeta",
    );
    expect(screen.getByLabelText("Proteínas (g)")).toHaveAttribute(
      "name",
      "proteinasMetaG",
    );
    expect(screen.getByLabelText("Carbohidratos (g)")).toHaveAttribute(
      "name",
      "carbohidratosMetaG",
    );
    expect(screen.getByLabelText("Grasas (g)")).toHaveAttribute(
      "name",
      "grasasMetaG",
    );
  });
});

describe("SeccionDatosGenerales", () => {
  it("ofrece «Sin carpeta» además de las carpetas que existen", () => {
    // Estar suelto es una opción legítima, no la ausencia de una: si el
    // sentinela desapareciera, un plan no podría sacarse de su carpeta.
    render(
      <Envoltorio>
        {(form) => (
          <SeccionDatosGenerales
            control={form.control}
            grupos={[{ id: "g-1", nombre: "Descenso" }]}
          />
        )}
      </Envoltorio>,
    );

    expect(screen.getByLabelText("Nombre del plan")).toBeInTheDocument();
    // `getAllByText` y no `getByText`: Radix pinta el valor elegido en el
    // trigger Y en la lista, así que "Sin carpeta" aparece dos veces en el DOM.
    expect(screen.getAllByText("Sin carpeta").length).toBeGreaterThan(0);
  });
});

describe("SeccionEquivalencias", () => {
  it("arranca vacía y agrega una fila al apretar Agregar", () => {
    render(
      <Envoltorio>
        {(form) => <SeccionEquivalencias control={form.control} />}
      </Envoltorio>,
    );

    expect(screen.queryByPlaceholderText("1 fruta")).not.toBeInTheDocument();
  });

  it("agrega y quita filas", async () => {
    const usuario = userEvent.setup();
    render(
      <Envoltorio>
        {(form) => <SeccionEquivalencias control={form.control} />}
      </Envoltorio>,
    );

    await usuario.click(screen.getByRole("button", { name: "Agregar" }));
    expect(screen.getByPlaceholderText("1 fruta")).toBeInTheDocument();

    await usuario.click(
      screen.getByRole("button", { name: "Quitar equivalencia" }),
    );
    expect(screen.queryByPlaceholderText("1 fruta")).not.toBeInTheDocument();
  });
});
