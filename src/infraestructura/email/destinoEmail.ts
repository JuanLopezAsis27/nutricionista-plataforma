/**
 * A dónde salen realmente los emails, en una línea legible.
 *
 * Existe porque el modo de desarrollo tiene una trampa que no avisa: el
 * `docker-compose` levanta **Mailpit**, un capturador local, y `SMTP_HOST`
 * apunta ahí. Los recordatorios se envían y se registran como enviados, pero
 * NO salen a Internet: quien los espera en su casilla real concluye que la
 * función está rota, y no hay ningún error en ningún lado que lo desmienta.
 *
 * La detección de Mailpit es heurística (host local + el puerto 1025 del
 * compose) y por eso el texto dice "parece", no lo afirma.
 */
export function describirDestinoEmail(): string {
  const host = process.env.SMTP_HOST ?? "localhost";
  const puerto = Number(process.env.SMTP_PORT ?? 1025);
  const esLocal = ["localhost", "127.0.0.1", "::1", "mailpit"].includes(host);

  if (esLocal && puerto === 1025) {
    return `emails → ${host}:${puerto} — parece Mailpit: NO salen a Internet, se leen en http://localhost:8025`;
  }
  return `emails → ${host}:${puerto}`;
}
