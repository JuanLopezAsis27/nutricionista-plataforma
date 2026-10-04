import { describe, it, expect, vi, beforeEach } from "vitest";
import { Readable } from "node:stream";

/**
 * El respaldo es la exportación más grande que hay: TODO el consultorio. Acá
 * se verifica quién puede bajarlo, no el contenido del ZIP (las rutas las
 * decide `rutasRespaldo` y el índice `ArmarIndiceRespaldo`, con sus tests).
 */

type Sesion = { id: string; rol: "NUTRICIONISTA" | "PACIENTE" | "SUPERADMIN" } | null;
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
const armarRespaldo = vi.fn(async () => Readable.from([Buffer.from("PK")]));
vi.mock("@/servidor/respaldoZip", () => ({ armarRespaldo }));

const { GET } = await import("./route");

beforeEach(() => {
  vi.clearAllMocks();
  sesion = null;
});

describe("GET /api/respaldo", () => {
  it("sin sesión responde 401 y no arma nada", async () => {
    expect((await GET()).status).toBe(401);
    expect(armarRespaldo).not.toHaveBeenCalled();
  });

  it.each(["PACIENTE", "SUPERADMIN"] as const)(
    "un %s no puede bajarlo",
    async (rol) => {
      sesion = { id: "usr-1", rol };
      expect((await GET()).status).toBe(403);
      expect(armarRespaldo).not.toHaveBeenCalled();
    },
  );

  it("el profesional recibe el ZIP como descarga", async () => {
    sesion = { id: "usr-n", rol: "NUTRICIONISTA" };
    const respuesta = await GET();
    expect(respuesta.status).toBe(200);
    expect(respuesta.headers.get("Content-Type")).toBe("application/zip");
    expect(respuesta.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="respaldo-\d{4}-\d{2}-\d{2}\.zip"$/,
    );
    expect(await respuesta.text()).toBe("PK");
  });
});
