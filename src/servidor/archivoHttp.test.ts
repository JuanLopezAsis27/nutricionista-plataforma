import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * El servido de archivos del bucket: quién puede leer y con qué cabeceras
 * sale. La regla de qué archivo ve un paciente es de `PuedeVerArchivoPaciente`
 * (con su propio test); acá se verifica que las rutas la CONSULTEN y la
 * respeten, y que el contenido clínico salga como corresponde.
 */

type Sesion = {
  id: string;
  rol: "NUTRICIONISTA" | "PACIENTE" | "SUPERADMIN";
  pacienteId?: string | null;
} | null;
let sesion: Sesion = null;
vi.mock("@/lib/autenticacion/sesion", () => ({
  usuarioDeSesion: async () => sesion,
}));

// El alcance lo fija la sesión real; acá no hay request.
vi.mock("@/servidor/alcanceRequest", () => ({
  conAlcanceDeSesion: <T>(fn: () => Promise<T>) => fn(),
}));

// Tipado aparte para que un test pueda devolver `null` (bucket sin tamaño).
type LecturaDelServicio = {
  archivo: { mimeType: string; nombreOriginal: string };
  contenido: ReadableStream<Uint8Array>;
  tamanoBytes: number | null;
};

const servicio = {
  puedeVerPaciente: vi.fn(async () => true),
  obtenerContenido: vi.fn(async () => ({
    archivo: {
      mimeType: "application/pdf",
      nombreOriginal: 'Plan "Pérez"\r\n.pdf',
    },
    contenido: Buffer.from("%PDF-1.7"),
  })),
  abrirLectura: vi.fn(async (): Promise<LecturaDelServicio> => ({
    archivo: {
      mimeType: "application/pdf",
      nombreOriginal: 'Plan "Pérez"\r\n.pdf',
    },
    contenido: new Blob(["%PDF-1.7"]).stream(),
    tamanoBytes: 8,
  })),
};
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  servicioArchivo: () => servicio,
}));

vi.mock("@/infraestructura/documentos/documentoWordAHtml", () => ({
  documentoWordAHtml: vi.fn(async () => "<p>plan</p>"),
  paginaDocumentoIlegible: () => "<p>ilegible</p>",
}));

vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: vi.fn() },
}));
vi.mock("@/infraestructura/persistencia/erroresPrisma", () => ({
  traducirErrorPrisma: () => null,
}));

const { responderArchivo, responderDocumentoComoHtml, nombreSeguro } =
  await import("./archivoHttp");
const { ErrorArchivoNoEncontrado } =
  await import("@/dominio/errores/ErrorArchivoNoEncontrado");

const id = (valor = "arc-1") => Promise.resolve({ id: valor });

beforeEach(() => {
  vi.clearAllMocks();
  sesion = null;
});

describe("responderArchivo — autorización", () => {
  it("sin sesión responde 401 y no lee el bucket", async () => {
    const respuesta = await responderArchivo(id(), "inline");

    expect(respuesta.status).toBe(401);
    expect(servicio.abrirLectura).not.toHaveBeenCalled();
    expect(servicio.obtenerContenido).not.toHaveBeenCalled();
  });

  it("un paciente sin permiso sobre el archivo recibe 403 y no lee el bucket", async () => {
    sesion = { id: "usr-pac", rol: "PACIENTE", pacienteId: "pac-1" };
    servicio.puedeVerPaciente.mockResolvedValueOnce(false);

    const respuesta = await responderArchivo(id(), "inline");

    expect(respuesta.status).toBe(403);
    expect(servicio.puedeVerPaciente).toHaveBeenCalledWith("arc-1", {
      usuarioId: "usr-pac",
      pacienteId: "pac-1",
    });
    expect(servicio.abrirLectura).not.toHaveBeenCalled();
  });

  it("un paciente con permiso lo recibe", async () => {
    sesion = { id: "usr-pac", rol: "PACIENTE", pacienteId: "pac-1" };

    const respuesta = await responderArchivo(id(), "inline");

    expect(respuesta.status).toBe(200);
  });

  it("un SUPERADMIN también pasa por el control de paciente (no es el profesional)", async () => {
    sesion = { id: "usr-admin", rol: "SUPERADMIN" };
    servicio.puedeVerPaciente.mockResolvedValueOnce(false);

    expect((await responderArchivo(id(), "inline")).status).toBe(403);
  });

  it("el nutricionista no pasa por el control de paciente: lo acota el inquilino", async () => {
    sesion = { id: "usr-nutri", rol: "NUTRICIONISTA" };

    const respuesta = await responderArchivo(id(), "attachment");

    expect(respuesta.status).toBe(200);
    expect(servicio.puedeVerPaciente).not.toHaveBeenCalled();
  });

  it("un archivo que no existe sale por el borde de errores, no como 500", async () => {
    sesion = { id: "usr-nutri", rol: "NUTRICIONISTA" };
    servicio.abrirLectura.mockRejectedValueOnce(
      new ErrorArchivoNoEncontrado("arc-x"),
    );

    expect((await responderArchivo(id("arc-x"), "inline")).status).toBe(404);
  });
});

describe("responderArchivo — cabeceras", () => {
  beforeEach(() => {
    sesion = { id: "usr-nutri", rol: "NUTRICIONISTA" };
  });

  it("sale privado, sin sniffing y con una CSP que no ejecuta nada", async () => {
    const respuesta = await responderArchivo(id(), "inline");

    expect(respuesta.headers.get("Content-Type")).toBe("application/pdf");
    // Contenido clínico: nunca en una caché compartida.
    expect(respuesta.headers.get("Cache-Control")).toMatch(/^private/);
    expect(respuesta.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(respuesta.headers.get("Content-Security-Policy")).toMatch(
      /script-src 'none'/,
    );
  });

  it("la disposición distingue ver de bajar, con el nombre saneado", async () => {
    const ver = await responderArchivo(id(), "inline");
    const bajar = await responderArchivo(id(), "attachment");

    expect(ver.headers.get("Content-Disposition")).toBe(
      'inline; filename="Plan Perez.pdf"',
    );
    expect(bajar.headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("pasa el contenido del bucket como flujo, sin juntarlo en memoria", async () => {
    const respuesta = await responderArchivo(id(), "inline");

    expect(servicio.abrirLectura).toHaveBeenCalledWith("arc-1");
    expect(servicio.obtenerContenido).not.toHaveBeenCalled();
    expect(await respuesta.text()).toBe("%PDF-1.7");
    expect(respuesta.headers.get("Content-Length")).toBe("8");
  });

  it("sin el tamaño del bucket no inventa un Content-Length", async () => {
    servicio.abrirLectura.mockResolvedValueOnce({
      archivo: { mimeType: "application/pdf", nombreOriginal: "plan.pdf" },
      contenido: new Blob(["%PDF-1.7"]).stream(),
      tamanoBytes: null,
    });

    const respuesta = await responderArchivo(id(), "inline");

    expect(respuesta.headers.get("Content-Length")).toBeNull();
  });
});

describe("responderDocumentoComoHtml", () => {
  beforeEach(() => {
    sesion = { id: "usr-nutri", rol: "NUTRICIONISTA" };
  });

  it("un archivo que no es Word responde 415", async () => {
    expect((await responderDocumentoComoHtml(id())).status).toBe(415);
  });

  it("el Word convertido sale en una CSP con sandbox", async () => {
    servicio.obtenerContenido.mockResolvedValueOnce({
      archivo: {
        mimeType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        nombreOriginal: "plan.docx",
      },
      contenido: Buffer.from("PK"),
    });

    const respuesta = await responderDocumentoComoHtml(id());

    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Security-Policy")).toMatch(
      /^sandbox;/,
    );
  });

  it("sin permiso tampoco lo convierte", async () => {
    sesion = { id: "usr-pac", rol: "PACIENTE", pacienteId: "pac-1" };
    servicio.puedeVerPaciente.mockResolvedValueOnce(false);

    expect((await responderDocumentoComoHtml(id())).status).toBe(403);
    expect(servicio.obtenerContenido).not.toHaveBeenCalled();
  });
});

describe("nombreSeguro", () => {
  it("saca tildes, comillas y saltos de línea (inyección de cabeceras)", () => {
    expect(nombreSeguro('Plan "Pérez"\r\nSet-Cookie: x.pdf')).toBe(
      "Plan PerezSet-Cookie x.pdf",
    );
  });

  it("un nombre que queda vacío pasa a «archivo»", () => {
    expect(nombreSeguro("ñ€∑")).toBe("n");
    expect(nombreSeguro("€∑")).toBe("archivo");
  });
});
