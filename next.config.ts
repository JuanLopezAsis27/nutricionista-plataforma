import type { NextConfig } from "next";

/**
 * Configuración de Next.js 16 (App Router).
 * Se mantiene mínima: la lógica vive en las capas internas, no en la presentación.
 */
const config: NextConfig = {
  reactStrictMode: true,
  // Genera un servidor autónomo mínimo (.next/standalone) para empaquetar la
  // app en una imagen Docker liviana. Ver Dockerfile (stage runner).
  output: "standalone",
  // Las variables de entorno sensibles nunca se exponen al cliente.
  // Solo las que empiezan con NEXT_PUBLIC_ llegan al navegador.
};

export default config;
