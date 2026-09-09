import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Configuración de Capacitor.
 *
 * ## Por qué es un .ts y ya no un .json
 *
 * El archivo versionado traía clavado el servidor de desarrollo:
 *
 *     "server": { "url": "http://192.168.100.182:3000", "cleartext": true }
 *
 * Eso significa que CUALQUIER build hecho desde una copia limpia del repo —
 * incluido un release— salía hablando HTTP contra una IP de red local. Dos
 * problemas, y el segundo es peor que el primero:
 *
 *   1. Sin TLS, la cookie de sesión, las credenciales del login y los datos
 *      clínicos viajan en claro: cualquiera en la misma red los lee y los
 *      modifica. `cleartext: true` es justamente lo que le pide a Android que
 *      deje de exigir HTTPS.
 *   2. Esa IP es privada. En la red del usuario le pertenece a OTRO equipo, así
 *      que la app termina mandándole las credenciales a un tercero cualquiera.
 *
 * Un JSON no puede depender del entorno, así que la única forma de que el valor
 * de desarrollo no viaje al build de producción es que el valor NO ESTÉ en el
 * archivo. Por eso ahora se lee de una variable de entorno: si no está
 * definida, no se emite bloque `server` y la app usa sus assets empaquetados
 * contra el origen de producción, que es el comportamiento correcto por
 * defecto.
 *
 * ## Desarrollo: apuntar al servidor de tu máquina
 *
 *     CAP_SERVER_URL=http://192.168.1.50:3000 npx cap sync
 *
 * `cleartext` se habilita SOLO si esa URL es `http://`, y nunca en otro caso.
 * Ver docs/MOBILE.md.
 */

/** URL del servidor de desarrollo, si se pidió una. */
const urlServidor = process.env.CAP_SERVER_URL?.trim();

/**
 * Solo se permite tráfico sin cifrar cuando la URL pedida es explícitamente
 * `http://`. Así, aunque alguien defina la variable en un entorno equivocado,
 * no se habilita cleartext contra un destino https.
 */
const esHttpPlano = urlServidor?.startsWith("http://") ?? false;

if (urlServidor && esHttpPlano && process.env.NODE_ENV === "production") {
  throw new Error(
    "CAP_SERVER_URL apunta a http:// con NODE_ENV=production. " +
      "Un build de producción no puede hablar en texto plano.",
  );
}

const config: CapacitorConfig = {
  appId: "com.consultorio.app",
  appName: "Consultorio",
  webDir: "public",
  // El bloque `server` existe únicamente si se pidió un servidor de
  // desarrollo. En un build de release, `CAP_SERVER_URL` no está definida y
  // esta propiedad queda fuera del archivo generado.
  ...(urlServidor
    ? {
        server: {
          url: urlServidor,
          cleartext: esHttpPlano,
          androidScheme: "https",
        },
      }
    : {
        server: {
          androidScheme: "https",
        },
      }),
};

export default config;
