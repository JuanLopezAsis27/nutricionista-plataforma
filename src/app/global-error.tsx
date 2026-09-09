"use client";

import { useEffect } from "react";

/**
 * Error boundary global de la app (App Router).
 *
 * Captura errores de render no manejados en cualquier parte del árbol, reporta
 * al monitor vía `/api/monitoreo` (best-effort con sendBeacon) y muestra una
 * pantalla mínima con opción de reintentar. Debe renderizar su propio
 * `<html>`/`<body>` porque reemplaza el layout raíz.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    try {
      const cuerpo = JSON.stringify({
        mensaje: error.message,
        stack: error.stack,
        digest: error.digest,
        ruta:
          typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      // sendBeacon sobrevive a la navegación; fetch como respaldo.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/monitoreo",
          new Blob([cuerpo], { type: "application/json" }),
        );
      } else {
        void fetch("/api/monitoreo", {
          method: "POST",
          body: cuerpo,
          keepalive: true,
        });
      }
    } catch {
      // Nunca dejar que el reporte del error genere otro error.
    }
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#F1F1F3",
          color: "#1f2937",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            Algo salió mal
          </h1>
          <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
            Ocurrió un error inesperado. Ya quedó registrado. Podés reintentar.
          </p>
          <button
            onClick={() => reset()}
            style={{
              background: "#F4535E",
              color: "#fff",
              border: "none",
              padding: "0.65rem 1.25rem",
              borderRadius: "0.5rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
