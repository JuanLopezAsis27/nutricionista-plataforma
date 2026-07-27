// Arranca el servidor autónomo de Next.js (output: "standalone").
//
// `next start` NO es compatible con `output: standalone`; el entrypoint real es
// `.next/standalone/server.js`. Ese bundle no incluye los estáticos ni /public,
// así que los copiamos al lado (lo mismo que hará el Dockerfile de producción) y
// luego levantamos el server. Cross-platform (usa fs/child_process de Node).
import { cpSync, existsSync } from "node:fs";
import { spawn } from "node:child_process";

const STANDALONE = ".next/standalone";

if (!existsSync(`${STANDALONE}/server.js`)) {
  console.error('No existe .next/standalone/server.js. Corré "npm run build" primero.');
  process.exit(1);
}

// Copiar los assets que el bundle standalone no trae.
for (const [origen, destino] of [
  [".next/static", `${STANDALONE}/.next/static`],
  ["public", `${STANDALONE}/public`],
]) {
  if (existsSync(origen)) cpSync(origen, destino, { recursive: true });
}

// En dev/local cargamos .env; en producción las variables ya están en el entorno.
const args = [];
if (existsSync(".env")) args.push("--env-file=.env");
args.push(`${STANDALONE}/server.js`);

spawn("node", args, { stdio: "inherit" }).on("exit", (codigo) => process.exit(codigo ?? 0));
