import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

/**
 * Configuración de Vitest.
 * Los casos de uso se testean con repositorios mock (que implementan las
 * interfaces del dominio), nunca contra Prisma directamente.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
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
