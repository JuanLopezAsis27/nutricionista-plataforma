import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Configuración de Vitest.
 *
 * Los casos de uso se testean con repositorios mock (que implementan las
 * interfaces del dominio), nunca contra Prisma directamente.
 *
 * `include` cubre .ts y .tsx: hasta la auditoría de calidad el patrón era solo
 * `*.test.ts`, así que los ~280 componentes de UI no podían tener tests aunque
 * alguien los escribiera —el runner ni los levantaba—.
 *
 * El entorno por defecto sigue siendo `node`: los ~170 archivos del dominio no
 * necesitan DOM y montar jsdom para todos encarece la corrida sin dar nada. Los
 * tests que sí lo necesitan lo piden por archivo con:
 *
 *     // @vitest-environment jsdom
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "@/dominio": resolve(__dirname, "./src/dominio"),
      "@/aplicacion": resolve(__dirname, "./src/aplicacion"),
      "@/infraestructura": resolve(__dirname, "./src/infraestructura"),
      "@/servidor": resolve(__dirname, "./src/servidor"),
      "@/componentes": resolve(__dirname, "./src/componentes"),
      "@/lib": resolve(__dirname, "./src/lib"),
    },
  },
});
