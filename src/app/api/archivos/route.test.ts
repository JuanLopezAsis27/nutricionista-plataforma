import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * La subida de archivos. Lo que decide la ruta —y no el caso de uso— es de
 * QUIÉN queda el archivo: el profesional elige el paciente (de su consultorio);
 * el paciente, nunca: el archivo es de su propia ficha aunque mande otro id, y
 * solo en los contextos que le tocan. Tipos y tamaños los valida `SubirArchivo`.
 */

type Sesion = {
  id: string;
  rol: "NUTRICIONISTA" | "PACIENTE" | "SUPERADMIN";
  pacienteId: string | null;
} | null;
let sesion: Sesion = null;
vi.mock("@/lib/autenticacion/sesion", () => ({
  usuarioDeSesion: async () => sesion,
}));
vi.mock("@/servidor/alcanceRequest", () => ({
  conAlcanceDeSesion: <T>(fn: () => Promise<T>) => fn(),
}));
vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: vi.fn() },
}));
vi.mock("@/infraestructura/persistencia/erroresPrisma", () => ({
  traducirErrorPrisma: () => null,
}));

const subir = vi.fn(async () => ({ id: "arc-1" }));
const obtenerPacientePorId = vi.fn(async () => ({ id: "pac-1" }));
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  servicioArchivo: () => ({ subir }),
  servicioPaciente: () => ({ obtenerPacientePorId }),
}));

const { POST } = await import("./route");
const { ErrorPacienteNoEncontrado } =
  await import("@/dominio/errores/ErrorPacienteNoEncontrado");

function subida(campos: Record<string, string>, conArchivo = true): Request {
  const formulario = new FormData();
  if (conArchivo) {
    formulario.set(
      "archivo",
      new File(["contenido"], "analisis.pdf", { type: "application/pdf" }),
    );
  }
  for (const [clave, valor] of Object.entries(campos)) {
    formulario.set(clave, valor);
  }
  return new Request("https://app.nutri.com/api/archivos", {
    method: "POST",
    body: formulario,
  });
}

/** El dueño con el que se mandó a guardar. */
function duenoGuardado(): unknown {
  const [datos] = subir.mock.calls[0] as unknown as [{ dueno?: unknown }];
  return datos.dueno;
}

beforeEach(() => {
  vi.clearAllMocks();
  sesion = null;
});

describe("POST /api/archivos", () => {
  it("sin sesión responde 401 sin guardar", async () => {
    expect((await POST(subida({ contexto: "laboratorio" }))).status).toBe(401);
    expect(subir).not.toHaveBeenCalled();
  });

  describe("el profesional", () => {
    beforeEach(() => {
      sesion = { id: "usr-n", rol: "NUTRICIONISTA", pacienteId: null };
    });

    it("sube a la ficha del paciente que indica, después de verificar que es suyo", async () => {
      const respuesta = await POST(
        subida({ contexto: "laboratorio", pacienteId: "pac-1" }),
      );

      expect(respuesta.status).toBe(201);
      expect(obtenerPacientePorId).toHaveBeenCalledWith("pac-1");
      expect(duenoGuardado()).toEqual({ pacienteId: "pac-1" });
    });

    it("un paciente que no es de su consultorio da 404 y no guarda nada", async () => {
      obtenerPacientePorId.mockRejectedValueOnce(
        new ErrorPacienteNoEncontrado("pac-ajeno"),
      );

      const respuesta = await POST(
        subida({ contexto: "laboratorio", pacienteId: "pac-ajeno" }),
      );

      expect(respuesta.status).toBe(404);
      expect(subir).not.toHaveBeenCalled();
    });

    it("sin paciente queda huérfano, para vincularlo después (receta nueva)", async () => {
      await POST(subida({ contexto: "receta" }));

      expect(duenoGuardado()).toBeUndefined();
    });
  });

  describe("el paciente", () => {
    beforeEach(() => {
      sesion = { id: "usr-p", rol: "PACIENTE", pacienteId: "pac-1" };
    });

    it("sube la foto de su comida a SU ficha", async () => {
      expect((await POST(subida({ contexto: "foto-comida" }))).status).toBe(
        201,
      );
      expect(duenoGuardado()).toEqual({ pacienteId: "pac-1" });
    });

    it("aunque mande el id de OTRA ficha, el archivo queda en la suya", async () => {
      await POST(subida({ contexto: "foto-comida", pacienteId: "pac-ajeno" }));

      expect(duenoGuardado()).toEqual({ pacienteId: "pac-1" });
    });

    it("la foto de perfil no se cuelga de la ficha (es de la cuenta)", async () => {
      await POST(subida({ contexto: "perfil" }));

      expect(duenoGuardado()).toBeUndefined();
    });

    it.each(["laboratorio", "receta", "plan"])(
      "no sube en el contexto «%s», que es del profesional (403)",
      async (contexto) => {
        expect((await POST(subida({ contexto }))).status).toBe(403);
        expect(subir).not.toHaveBeenCalled();
      },
    );
  });

  it("sin el campo archivo o con un contexto inválido responde 400", async () => {
    sesion = { id: "usr-n", rol: "NUTRICIONISTA", pacienteId: null };

    expect(
      (await POST(subida({ contexto: "laboratorio" }, false))).status,
    ).toBe(400);
    expect((await POST(subida({ contexto: "cualquiera" }))).status).toBe(400);
    expect(subir).not.toHaveBeenCalled();
  });
});
