/**
 * La URL pública de la app, resuelta en UN solo lugar.
 *
 * Es el origen con el que la gente entra desde afuera (`https://tudominio.com`),
 * que no tiene por qué parecerse a la dirección donde el proceso escucha: en
 * Docker el servidor se ata a `0.0.0.0:3000` y nginx lo publica en otro lado.
 *
 * **Por qué existe este archivo en vez de leer `process.env` donde haga falta.**
 * El OAuth de Google usa este valor DOS veces y en momentos distintos: para
 * armar el `redirect_uri` que se le manda a Google, y para volver al panel
 * cuando Google devuelve el control. Si las dos puntas no resuelven igual, el
 * flujo se corta justo en el medio —con los tokens ya guardados— y el navegador
 * queda en una dirección que no existe. Ver `docs/DESPLIEGUE.md`.
 *
 * `AUTH_URL` es la alternativa porque Auth.js ya la exige para lo suyo: quien
 * tenga esa puesta y se olvide de `APP_URL` no termina con dos orígenes
 * distintos conviviendo.
 */
export function urlPublica(): string {
  const base =
    process.env.APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  // Sin barra final: todo lo que se concatena arranca con "/".
  return base.replace(/\/$/, "");
}
