import { describe, it, expect } from "vitest";
import {
  renderizarPlantilla,
  renderizarPlantillaHtml,
  escaparHtml,
} from "./renderizar";

describe("renderizarPlantilla (texto plano)", () => {
  it("sustituye los placeholders con y sin espacios", () => {
    expect(
      renderizarPlantilla("Hola {{paciente}} y {{ profesional }}", {
        paciente: "Ana",
        profesional: "Lic. Pérez",
      }),
    ).toBe("Hola Ana y Lic. Pérez");
  });

  it("deja intactos los placeholders sin valor", () => {
    expect(
      renderizarPlantilla("Hola {{desconocido}}", { paciente: "Ana" }),
    ).toBe("Hola {{desconocido}}");
  });

  it("NO escapa: es la variante para WhatsApp y para el texto del email", () => {
    expect(
      renderizarPlantilla("Hola {{paciente}}", { paciente: "A & B" }),
    ).toBe("Hola A & B");
  });
});

describe("escaparHtml", () => {
  it("escapa los caracteres con significado en HTML", () => {
    expect(escaparHtml(`<a href="x">& '`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&amp; &#39;",
    );
  });

  it("escapa el ampersand primero, para no doble-escapar", () => {
    expect(escaparHtml("&lt;")).toBe("&amp;lt;");
  });
});

describe("renderizarPlantillaHtml", () => {
  it("respeta el HTML de la plantilla (lo escribe el profesional)", () => {
    expect(
      renderizarPlantillaHtml("<p><b>Hola</b> {{paciente}}</p>", {
        paciente: "Ana",
      }),
    ).toBe("<p><b>Hola</b> Ana</p>");
  });

  it("escapa los VALORES sustituidos", () => {
    // Un nombre de paciente con etiquetas: la plantilla es de confianza, el
    // dato no. Sin escapar, esto se inyectaba tal cual en el correo que sale.
    const html = renderizarPlantillaHtml("<p>Hola {{paciente}}</p>", {
      paciente: "<script>alert(1)</script>",
    });

    expect(html).toBe("<p>Hola &lt;script&gt;alert(1)&lt;/script&gt;</p>");
    expect(html).not.toContain("<script>");
  });

  it("neutraliza un atributo de evento inyectado por el valor", () => {
    const html = renderizarPlantillaHtml("<p>{{paciente}}</p>", {
      paciente: `"><img src=x onerror=alert(1)>`,
    });

    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("los valores inocentes se ven bien igual", () => {
    expect(
      renderizarPlantillaHtml("<p>{{paciente}}</p>", { paciente: "Ana Gómez" }),
    ).toBe("<p>Ana Gómez</p>");
  });
});
