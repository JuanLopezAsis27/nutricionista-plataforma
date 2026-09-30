/**
 * IP de origen de la request, para el límite de intentos del login.
 *
 * El orden importa y antes estaba al revés. `X-Forwarded-For` es una lista que
 * cada proxy va ANEXANDO, así que el primer elemento es el que puso el cliente:
 * es un dato que el atacante controla por completo. Leerlo primero convertía el
 * límite de intentos por IP en decorativo — bastaba mandar un
 * `X-Forwarded-For: <aleatorio>` distinto en cada intento para que cada uno
 * cayera en un contador nuevo y el bloqueo no se disparara nunca.
 *
 * `X-Real-IP` lo escribe nuestro nginx con `$remote_addr` (ver
 * docs/nginx.conf.ejemplo), pisando cualquier valor que venga de afuera, así
 * que es la fuente confiable. Se lee primero.
 *
 * Si no está —despliegue sin ese proxy— se cae a `X-Forwarded-For` pero
 * tomando el ÚLTIMO elemento, que es el que agregó el proxy más cercano y no
 * el que eligió el cliente.
 */
export function ipDeSolicitud(peticion: Request | undefined): string {
  const real = peticion?.headers.get("x-real-ip")?.trim();
  if (real) return real;

  const reenviada = peticion?.headers.get("x-forwarded-for");
  if (reenviada) {
    const partes = reenviada
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (partes.length > 0) return partes[partes.length - 1]!;
  }
  return "desconocida";
}
