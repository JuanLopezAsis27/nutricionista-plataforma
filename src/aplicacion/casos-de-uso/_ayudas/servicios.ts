import { vi } from "vitest";
import type { IGeneradorTokens } from "@/dominio/servicios/IGeneradorTokens";
import type { IProveedorWhatsapp } from "@/dominio/servicios/IProveedorWhatsapp";
import type { IAsistenteAnalitico } from "@/dominio/servicios/IAsistenteAnalitico";
import type { IHasheadorContrasena } from "@/dominio/servicios/IHasheadorContrasena";
import type { IAlmacenamientoArchivos } from "@/dominio/servicios/IAlmacenamientoArchivos";
import type { IServicioEmail } from "@/dominio/servicios/IServicioEmail";
import type { IColaTrabajos } from "@/dominio/servicios/IColaTrabajos";
import type { IRelojFecha } from "@/dominio/servicios/IRelojFecha";
import type { IBusEventos } from "@/dominio/servicios/IBusEventos";
import type { IAsistenteNutricional } from "@/dominio/servicios/IAsistenteNutricional";
import type { IAnalisisComidaIA } from "@/dominio/servicios/IAnalisisComidaIA";
import type { IAnalisisPredictivo } from "@/dominio/servicios/IAnalisisPredictivo";

/**
 * Ayudas para los tests de casos de uso.
 *
 * Provee constructores de repositorios mock que implementan las interfaces
 * del dominio (nunca dependen de Prisma) y fábricas de entidades de ejemplo.
 * No es un archivo de test (no contiene `describe`).
 */

/**
 * Mocks de los puertos de salida que NO son repositorios: reloj, cola de
 * trabajos, email, WhatsApp, almacenamiento, IA.
 *
 * Van aparte de los repositorios porque se usan distinto: un test suele montar
 * un repositorio para preparar datos y un servicio para VERIFICAR un efecto
 * (que se mandó el mail, que se encoló el trabajo).
 */

export function mockGeneradorTokens(
  parcial: Partial<IGeneradorTokens> = {},
): IGeneradorTokens {
  return {
    // Genera un token determinista y su "hash" (prefijo) para tests.
    generar: vi.fn(() => ({ token: "token-claro", hash: "hash:token-claro" })),
    hashear: vi.fn((token: string) => `hash:${token}`),
    ...parcial,
  };
}

export function mockHasheador(): IHasheadorContrasena {
  return {
    hashear: vi.fn(async (plano: string) => `hash:${plano}`),
    verificar: vi.fn(
      async (plano: string, hash: string) => hash === `hash:${plano}`,
    ),
  };
}

export function mockAlmacenamientoArchivos(
  parcial: Partial<IAlmacenamientoArchivos> = {},
): IAlmacenamientoArchivos {
  return {
    subir: vi.fn(async () => {}),
    generarUrlLectura: vi.fn(
      async (clave: string) => `https://bucket.local/${clave}?firma`,
    ),
    descargar: vi.fn(async () => new Uint8Array([37, 80, 68, 70])), // "%PDF"
    eliminar: vi.fn(async () => {}),
    listarClaves: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockBusEventos(
  parcial: Partial<IBusEventos> = {},
): IBusEventos {
  return {
    publicar: vi.fn(async () => {}),

    suscribir: vi.fn(async function* () {}),
    ...parcial,
  };
}

export function mockProveedorWhatsapp(
  parcial: Partial<IProveedorWhatsapp> = {},
): IProveedorWhatsapp {
  return {
    modoActual: vi.fn(async () => "ENLACE" as const),
    preparar: vi.fn(async (m) => ({
      modo: "ENLACE" as const,
      enlace: `https://wa.me/${m.telefono}`,
    })),
    enviarPlantilla: vi.fn(async (e) => ({
      modo: "ENLACE" as const,
      enlace: `https://wa.me/${e.telefono}`,
    })),
    ...parcial,
  };
}

export function mockAsistenteAnalitico(
  parcial: Partial<IAsistenteAnalitico> = {},
): IAsistenteAnalitico {
  return {
    responder: vi.fn(async () => "respuesta analítica de demostración"),
    ...parcial,
  };
}

export function mockAsistenteNutricional(
  parcial: Partial<IAsistenteNutricional> = {},
): IAsistenteNutricional {
  return {
    responder: vi.fn(async () => "respuesta de demostración"),
    ...parcial,
  };
}

export function mockAnalisisComidaIA(
  parcial: Partial<IAnalisisComidaIA> = {},
): IAnalisisComidaIA {
  return {
    analizar: vi.fn(async () => ({
      descripcion: "plato demo",
      porcionEstimada: "1 plato",
      calorias: 500,
      proteinasG: 30,
      carbohidratosG: 40,
      grasasG: 20,
      confianza: 0.4,
      nota: "demo",
    })),
    ...parcial,
  };
}

export function mockAnalisisPredictivo(
  parcial: Partial<IAnalisisPredictivo> = {},
): IAnalisisPredictivo {
  return {
    insights: vi.fn(async () => []),
    ...parcial,
  };
}

export function mockServicioEmail(
  parcial: Partial<IServicioEmail> = {},
): IServicioEmail {
  return {
    enviar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockColaTrabajos(
  parcial: Partial<IColaTrabajos> = {},
): IColaTrabajos {
  return {
    encolar: vi.fn(async () => {}),
    ...parcial,
  };
}

export function mockReloj(
  fecha = new Date("2026-07-14T12:00:00Z"),
): IRelojFecha {
  return {
    ahora: vi.fn(() => fecha),
    hoy: vi.fn(
      () =>
        new Date(
          Date.UTC(
            fecha.getUTCFullYear(),
            fecha.getUTCMonth(),
            fecha.getUTCDate(),
          ),
        ),
    ),
  };
}
