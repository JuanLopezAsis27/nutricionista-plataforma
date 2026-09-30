import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * El cambio de consultorio de un paciente. Que solo se pueda elegir una ficha
 * de la PROPIA cuenta lo decide `CambiarConsultorioActivo` (con su test); acá
 * se verifica que la ruta lo consulte ANTES de tocar nada: si se rechaza, ni
 * la cookie del dispositivo ni el JWT cambian.
 */

type Sesion = { id: string; rol: string } | null;
let sesion: Sesion = null;
const olvidarSesion = vi.fn();
vi.mock("@/lib/autenticacion/sesion", () => ({
  usuarioDeSesion: async () => sesion,
  olvidarSesion: (id: string) => olvidarSesion(id),
}));

const unstable_update = vi.fn(async (_datos: unknown) => null);
vi.mock("@/lib/autenticacion/auth", () => ({
  unstable_update: (datos: unknown) => unstable_update(datos),
}));

const recordarConsultorio = vi.fn(async (_pacienteId: string) => {});
vi.mock("@/lib/autenticacion/consultorioActivo", () => ({
  recordarConsultorio: (id: string) => recordarConsultorio(id),
}));

const cambiarConsultorio = vi.fn(async () => ({}));
vi.mock("@/infraestructura/contenedor/contenedor", () => ({
  servicioAutenticacion: () => ({ cambiarConsultorio }),
}));

vi.mock("@/infraestructura/monitoreo/monitor", () => ({
  monitorErrores: { capturar: vi.fn() },
}));
vi.mock("@/infraestructura/persistencia/erroresPrisma", () => ({
  traducirErrorPrisma: () => null,
}));

const { POST } = await import("./route");
const { ErrorAccesoDenegado } =
  await import("@/dominio/errores/ErrorAccesoDenegado");

function pedido(cuerpo: unknown): Request {
  return new Request("https://app.nutri.com/api/autenticacion/consultorio", {
    method: "POST",
    body: JSON.stringify(cuerpo),
  });
}

function nadaCambio(): void {
  expect(recordarConsultorio).not.toHaveBeenCalled();
  expect(unstable_update).not.toHaveBeenCalled();
  expect(olvidarSesion).not.toHaveBeenCalled();
}

beforeEach(() => {
  vi.clearAllMocks();
  sesion = { id: "usr-p", rol: "PACIENTE" };
});

describe("POST /api/autenticacion/consultorio", () => {
  it("con una ficha de su cuenta la recuerda y reemite la sesión", async () => {
    const respuesta = await POST(pedido({ pacienteId: "pac-2" }));

    expect(respuesta.status).toBe(200);
    expect(cambiarConsultorio).toHaveBeenCalledWith("usr-p", "pac-2");
    expect(recordarConsultorio).toHaveBeenCalledWith("pac-2");
    expect(olvidarSesion).toHaveBeenCalledWith("usr-p");
    expect(unstable_update).toHaveBeenCalledWith({
      user: { pacienteId: "pac-2" },
    });
  });

  it("con la ficha de OTRA persona responde 403 y no cambia nada", async () => {
    cambiarConsultorio.mockRejectedValueOnce(
      new ErrorAccesoDenegado("No tenés acceso a ese consultorio."),
    );

    const respuesta = await POST(pedido({ pacienteId: "pac-ajeno" }));

    expect(respuesta.status).toBe(403);
    nadaCambio();
  });

  it("sin sesión responde 401", async () => {
    sesion = null;

    expect((await POST(pedido({ pacienteId: "pac-2" }))).status).toBe(401);
    expect(cambiarConsultorio).not.toHaveBeenCalled();
    nadaCambio();
  });

  it.each(["NUTRICIONISTA", "SUPERADMIN"])(
    "un %s no elige consultorio (403)",
    async (rol) => {
      sesion = { id: "usr-x", rol };

      expect((await POST(pedido({ pacienteId: "pac-2" }))).status).toBe(403);
      expect(cambiarConsultorio).not.toHaveBeenCalled();
      nadaCambio();
    },
  );

  it("un cuerpo sin pacienteId responde 400", async () => {
    expect((await POST(pedido({}))).status).toBe(400);
    nadaCambio();
  });
});
