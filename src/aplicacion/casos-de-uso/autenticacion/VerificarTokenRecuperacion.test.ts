import { describe, it, expect, vi } from "vitest";
import { VerificarTokenRecuperacion } from "./VerificarTokenRecuperacion";
import { TokenRecuperacion } from "@/dominio/entidades/TokenRecuperacion";
import {
  mockUsuarioRepositorio,
  mockTokenRecuperacionRepositorio,
  mockGeneradorTokens,
  mockReloj,
  usuarioEjemplo,
} from "../_ayudas-test";

const CREADO = new Date("2026-07-14T12:00:00Z");
const VENCE = new Date("2026-07-14T13:00:00Z");

function armar(
  ahora: Date,
  opciones: { usado?: boolean; activo?: boolean; existe?: boolean } = {},
) {
  const token = TokenRecuperacion.reconstruir({
    id: "tok-1",
    usuarioId: "usr-1",
    tokenHash: "hash:token-claro",
    expiraEn: VENCE,
    usadoEn: opciones.usado ? CREADO : null,
    creadoEn: CREADO,
  });
  const usuario = usuarioEjemplo();
  const usuarios = mockUsuarioRepositorio({
    obtenerPorId: vi.fn(async () =>
      opciones.activo === false ? usuario.cambiarActivo(false) : usuario,
    ),
  });
  return new VerificarTokenRecuperacion(
    usuarios,
    mockTokenRecuperacionRepositorio({
      obtenerPorHash: vi.fn(async () =>
        opciones.existe === false ? null : token,
      ),
    }),
    mockGeneradorTokens(),
    mockReloj(ahora),
  );
}

describe("VerificarTokenRecuperacion", () => {
  it("dentro de la hora, el enlace sirve", async () => {
    expect(
      await armar(new Date("2026-07-14T12:59:00Z")).ejecutar("token-claro"),
    ).toBe(true);
  });

  it("pasada la hora, ya no sirve", async () => {
    expect(await armar(VENCE).ejecutar("token-claro")).toBe(false);
    expect(
      await armar(new Date("2026-07-14T14:00:00Z")).ejecutar("token-claro"),
    ).toBe(false);
  });

  it("un enlace ya usado no sirve aunque esté en hora", async () => {
    expect(await armar(CREADO, { usado: true }).ejecutar("token-claro")).toBe(
      false,
    );
  });

  it("si la cuenta se desactivó, el enlace no sirve", async () => {
    expect(await armar(CREADO, { activo: false }).ejecutar("token-claro")).toBe(
      false,
    );
  });

  it("un token que no existe no sirve", async () => {
    expect(await armar(CREADO, { existe: false }).ejecutar("otro")).toBe(false);
  });
});
