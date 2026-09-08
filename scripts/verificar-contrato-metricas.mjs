/**
 * Verifica que las métricas declaradas en respaldos/metricas-publicadas.yml
 * sean exactamente las que emite respaldos/respaldo.sh.
 *
 * POR QUÉ
 *
 * El consumidor de estas métricas vive en OTRO repositorio (`monitoreo`), así
 * que un renombre acá no rompe nada visible: la alerta del otro lado deja de
 * encontrar la métrica y simplemente no dispara nunca más. Como son las alertas
 * de respaldos, el modo de falla es creer que estás cubierto y no estarlo.
 *
 * Este check convierte ese silencio en un CI rojo, en el repositorio y en el
 * momento donde se causó.
 *
 * Se compara en las dos direcciones a propósito:
 *   - declarada pero no emitida  → el otro repo espera algo que no llega
 *   - emitida pero no declarada  → hay una métrica sin contrato, que alguien va
 *     a usar creyendo que es estable
 *
 * Sin dependencias: se lee el YAML con una expresión regular sobre las líneas
 * `- nombre:`, que alcanza para un archivo con esta forma y evita sumar un
 * parser al proyecto para un solo uso.
 */
import { readFileSync } from "node:fs";

const CONTRATO = "respaldos/metricas-publicadas.yml";
const EMISOR = "respaldos/respaldo.sh";

const declaradas = new Set(
  [...readFileSync(CONTRATO, "utf8").matchAll(/^\s*-\s*nombre:\s*(\S+)/gm)].map(
    (m) => m[1],
  ),
);

// En el script las métricas aparecen tanto en las líneas HELP/TYPE como en la
// que lleva el valor. Con capturar cualquier aparición del prefijo alcanza.
const emitidas = new Set(
  [
    ...readFileSync(EMISOR, "utf8").matchAll(
      /\b(nutricionista_respaldo_[a-z0-9_]+)\b/g,
    ),
  ].map((m) => m[1]),
);

const faltanEnEmisor = [...declaradas].filter((m) => !emitidas.has(m));
const faltanEnContrato = [...emitidas].filter((m) => !declaradas.has(m));

if (faltanEnEmisor.length === 0 && faltanEnContrato.length === 0) {
  console.log(
    `Contrato de métricas OK: ${declaradas.size} métricas declaradas y emitidas.`,
  );
  process.exit(0);
}

console.error("El contrato de métricas y el emisor NO coinciden.\n");

if (faltanEnEmisor.length > 0) {
  console.error(`Declaradas en ${CONTRATO} pero NO emitidas por ${EMISOR}:`);
  for (const m of faltanEnEmisor) console.error(`  - ${m}`);
  console.error(
    "\n  El repositorio `monitoreo` tiene alertas esperando estas métricas.",
  );
  console.error(
    "  Si las renombraste, seguí el procedimiento del encabezado del contrato:",
  );
  console.error(
    "  emitir ambos nombres → actualizar `monitoreo` → recién ahí sacar el viejo.\n",
  );
}

if (faltanEnContrato.length > 0) {
  console.error(`Emitidas por ${EMISOR} pero NO declaradas en ${CONTRATO}:`);
  for (const m of faltanEnContrato) console.error(`  - ${m}`);
  console.error(
    "\n  Agregalas al contrato con su significado, o no las emitas: una métrica",
  );
  console.error(
    "  sin contrato es una que alguien va a usar creyendo que es estable.\n",
  );
}

process.exit(1);
