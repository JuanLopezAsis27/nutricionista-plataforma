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

  // Fase 3: el módulo Dietas evolucionó a Planes Nutricionales.
  // Los enlaces/favoritos viejos siguen funcionando.
  async redirects() {
    return [
      { source: "/dashboard/dietas", destination: "/dashboard/planes", permanent: true },
      { source: "/dashboard/dietas/:id", destination: "/dashboard/planes", permanent: true },
      { source: "/mi-dieta", destination: "/mi-plan", permanent: true },
      // Secretaría se fusionó con Recordatorios: era media tarea en otra
      // pantalla, con su propio botón de envío y su propio texto.
      {
        source: "/dashboard/plantillas",
        destination: "/dashboard/recordatorios",
        permanent: true,
      },
    ];
  },
};

export default config;
