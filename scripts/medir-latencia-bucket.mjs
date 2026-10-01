/**
 * Mide cuánto tarda en llegar un archivo desde el MinIO local y desde el bucket
 * de OVH, para decidir si el almacenamiento puede salir del disco del VPS.
 *
 * Compara los MISMOS objetos en los dos lados: los del MinIO y la copia que el
 * respaldo deja en `ovh/<OVH_S3_BUCKET>/bucket/<clave>`. Usa el mismo SDK y un
 * cliente por lado con la conexión reutilizada, que es como pide los archivos
 * la app (`AlmacenamientoMinIO`).
 *
 * ## Solo lectura, a propósito
 *
 * Únicamente lista y descarga. NUNCA conectar la app ni el worker al bucket de
 * respaldos: `LimpiarArchivosHuerfanos` lista el bucket ENTERO y borra lo que no
 * tenga fila en `archivos`, que ahí son todos los volcados de la base.
 *
 * ## Cómo se corre (en el VPS, sin Node en el host)
 *
 * Adentro del contenedor del worker, que ya tiene `@aws-sdk/client-s3` y las
 * variables `S3_*` del MinIO. Las de OVH se pasan con `-e`. El script entra por
 * stdin, así que no hace falta redesplegar la imagen:
 *
 *   set -a; . <(grep -E '^OVH_S3_' .env.produccion); set +a
 *   docker compose -p nutri_prod -f docker-compose.prod.yml exec -T \
 *     -e OVH_S3_ENDPOINT -e OVH_S3_ACCESS_KEY -e OVH_S3_SECRET_KEY \
 *     -e OVH_S3_BUCKET -e OVH_S3_REGION \
 *     -e MUESTRAS=12 -e REPETICIONES=5 \
 *     worker node --input-type=module - < scripts/medir-latencia-bucket.mjs
 *
 * ## Qué informa
 *
 * - **Primer byte (TTFB)**: hasta que llegan las cabeceras. Es lo que se suma a
 *   cada `<img>` del recetario, sea cual sea el tamaño.
 * - **Total**: hasta el último byte. Depende del tamaño y del ancho de banda.
 * - **Conexión fría**: el primer pedido de cada lado, que incluye DNS y TLS. La
 *   app lo paga una vez por conexión, no por archivo; se informa aparte para no
 *   ensuciar las medianas.
 */
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const MUESTRAS = Number(process.env.MUESTRAS ?? 12);
const REPETICIONES = Number(process.env.REPETICIONES ?? 5);
const PREFIJO_COPIA = process.env.OVH_PREFIJO ?? "bucket/";

function requerida(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`[latencia] falta la variable ${nombre}.`);
    process.exit(1);
  }
  return valor;
}

const local = {
  nombre: "MinIO local",
  bucket: requerida("S3_BUCKET"),
  prefijo: "",
  cliente: new S3Client({
    endpoint: requerida("S3_ENDPOINT"),
    region: process.env.S3_REGION ?? "us-east-1",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: requerida("S3_ACCESS_KEY"),
      secretAccessKey: requerida("S3_SECRET_KEY"),
    },
  }),
};

const nube = {
  nombre: "OVH",
  bucket: requerida("OVH_S3_BUCKET"),
  prefijo: PREFIJO_COPIA,
  cliente: new S3Client({
    endpoint: requerida("OVH_S3_ENDPOINT"),
    region: requerida("OVH_S3_REGION"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: requerida("OVH_S3_ACCESS_KEY"),
      secretAccessKey: requerida("OVH_S3_SECRET_KEY"),
    },
  }),
};

/**
 * Todos los objetos del MinIO, con su tamaño. Paginado: con una sola página
 * entraban los primeros 1000 por orden alfabético, que eran todos de un mismo
 * prefijo (`pacientes/`) y dejaban afuera las fotos y los PDFs.
 */
async function listarLocal() {
  const objetos = [];
  let token;
  do {
    const respuesta = await local.cliente.send(
      new ListObjectsV2Command({
        Bucket: local.bucket,
        ContinuationToken: token,
      }),
    );
    for (const o of respuesta.Contents ?? []) {
      if (o.Key && (o.Size ?? 0) > 0) {
        objetos.push({ clave: o.Key, tamano: o.Size });
      }
    }
    token = respuesta.IsTruncated ? respuesta.NextContinuationToken : undefined;
  } while (token);
  return objetos;
}

/**
 * Muestras repartidas por tamaño (de la foto chica al PDF grande), no las
 * primeras que devuelve el listado, que salen ordenadas por clave y serían
 * casi todas del mismo contexto.
 */
function elegirMuestras(objetos, cantidad) {
  const ordenados = [...objetos].sort((a, b) => a.tamano - b.tamano);
  if (ordenados.length <= cantidad) return ordenados;
  const elegidos = [];
  for (let i = 0; i < cantidad; i++) {
    const indice = Math.round((i * (ordenados.length - 1)) / (cantidad - 1));
    elegidos.push(ordenados[indice]);
  }
  return [...new Set(elegidos)];
}

async function existeEnLaNube(clave) {
  try {
    await nube.cliente.send(
      new HeadObjectCommand({ Bucket: nube.bucket, Key: nube.prefijo + clave }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Una descarga completa: ms hasta las cabeceras y ms hasta el último byte. */
async function medir(lado, clave) {
  const inicio = performance.now();
  const respuesta = await lado.cliente.send(
    new GetObjectCommand({ Bucket: lado.bucket, Key: lado.prefijo + clave }),
  );
  const primerByte = performance.now() - inicio;
  let bytes = 0;
  for await (const trozo of respuesta.Body) bytes += trozo.length;
  return { primerByte, total: performance.now() - inicio, bytes };
}

function percentil(valores, p) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(
    ordenados.length - 1,
    Math.ceil((p / 100) * ordenados.length) - 1,
  );
  return ordenados[Math.max(0, indice)];
}

const ms = (n) => `${n.toFixed(0)} ms`.padStart(8);
const kb = (n) => `${(n / 1024).toFixed(0)} KB`.padStart(9);

async function principal() {
  console.log(`[latencia] listando el MinIO local (${local.bucket})...`);
  const todosLocales = await listarLocal();
  console.log(`[latencia] ${todosLocales.length} objetos en el MinIO.`);

  // Primero se filtra lo que está en la copia y DESPUÉS se reparte por tamaño.
  // Al revés —repartir y quedarse con los primeros que estuvieran— la lista ya
  // venía ordenada de menor a mayor y la muestra salía con los más chicos.
  const existentes = [];
  for (const objeto of elegirMuestras(todosLocales, MUESTRAS * 4)) {
    if (await existeEnLaNube(objeto.clave)) existentes.push(objeto);
  }
  const muestras = elegirMuestras(existentes, MUESTRAS);
  if (muestras.length === 0) {
    console.error(
      `[latencia] ninguno de los objetos está en ${nube.bucket}/${nube.prefijo}. ` +
        "¿Corrió el respaldo del bucket?",
    );
    process.exit(1);
  }
  console.log(
    `[latencia] ${muestras.length} objetos, ${REPETICIONES} descargas por lado.\n`,
  );

  // Conexión fría: el primer pedido de cada cliente, medido aparte.
  const frio = {
    local: await medir(local, muestras[0].clave),
    nube: await medir(nube, muestras[0].clave),
  };

  const todos = { local: [], nube: [] };
  console.log(
    "objeto".padEnd(48) +
      "tamaño".padStart(9) +
      "   local TTFB/total".padEnd(22) +
      "   OVH TTFB/total",
  );
  for (const { clave, tamano } of muestras) {
    const fila = { local: [], nube: [] };
    // Alternados para que un pico de red no castigue a un solo lado.
    for (let i = 0; i < REPETICIONES; i++) {
      fila.local.push(await medir(local, clave));
      fila.nube.push(await medir(nube, clave));
    }
    todos.local.push(...fila.local);
    todos.nube.push(...fila.nube);
    const mediana = (lista, campo) =>
      percentil(
        lista.map((m) => m[campo]),
        50,
      );
    console.log(
      clave.slice(-48).padEnd(48) +
        kb(tamano) +
        "  " +
        ms(mediana(fila.local, "primerByte")) +
        ms(mediana(fila.local, "total")) +
        "   " +
        ms(mediana(fila.nube, "primerByte")) +
        ms(mediana(fila.nube, "total")),
    );
  }

  const resumen = (lista, campo) =>
    `mediana ${ms(
      percentil(
        lista.map((m) => m[campo]),
        50,
      ),
    )}   p95 ${ms(
      percentil(
        lista.map((m) => m[campo]),
        95,
      ),
    )}`;
  console.log("\nResumen (conexión ya abierta)");
  console.log(`  primer byte  local: ${resumen(todos.local, "primerByte")}`);
  console.log(`               OVH:   ${resumen(todos.nube, "primerByte")}`);
  console.log(`  total        local: ${resumen(todos.local, "total")}`);
  console.log(`               OVH:   ${resumen(todos.nube, "total")}`);
  // Velocidad de transferencia: solo con archivos de 500 KB o más. En los
  // chicos el total es casi todo latencia y el número no dice nada.
  const velocidad = (lista) => {
    const grandes = lista.filter((m) => m.bytes >= 500 * 1024);
    if (grandes.length === 0) return "sin archivos de 500 KB o más";
    const mbps = grandes.map((m) => m.bytes / 1024 / 1024 / (m.total / 1000));
    return `mediana ${percentil(mbps, 50).toFixed(1)} MB/s`;
  };
  console.log(`  velocidad    local: ${velocidad(todos.local)}`);
  console.log(`               OVH:   ${velocidad(todos.nube)}`);
  console.log("\nConexión fría (DNS + TLS + primer pedido)");
  console.log(`  local: ${ms(frio.local.total)}   OVH: ${ms(frio.nube.total)}`);
}

principal().catch((error) => {
  console.error("[latencia] falló:", error);
  process.exit(1);
});
