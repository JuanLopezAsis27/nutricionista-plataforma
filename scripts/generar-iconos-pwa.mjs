#!/usr/bin/env node
/**
 * Genera los íconos de la PWA a partir de la marca de NutriOffice.
 *
 * La fuente es `assets/marca/marca.svg`: el isotipo —anillo, manzana y pesa—
 * en vector y versionado para que esto sea reproducible. Es el MISMO archivo
 * que usa el sitio de presentación (`pagina-presentacion/public/recursos/`); si
 * cambia allá, hay que copiarlo acá y volver a correr este script.
 *
 * Antes la fuente era `assets/marca/logo-original.jpg`, el logo del consultorio,
 * y medio script eran correcciones de niveles para rescatar un JPEG de 256×256
 * con ruido de compresión. Con un SVG eso desaparece entero: se rasteriza al
 * tamaño exacto de cada salida y siempre sale nítido. El JPEG original queda
 * versionado porque sigue siendo el logo del profesional, pero ya no es la
 * fuente de los íconos.
 *
 * Se corre a mano cuando cambia la marca; los PNG resultantes SÍ se commitean,
 * porque el build no puede depender de `sharp` (viene de arrastre con Next, no
 * es una dependencia declarada del proyecto).
 *
 *   node scripts/generar-iconos-pwa.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * El fondo de los íconos.
 *
 * La marca tiene dos tintas: el coral del anillo y la manzana, y una tinta que
 * se adapta al fondo (el anillo fino y la pesa). El SVG de `assets/marca` trae
 * esa segunda tinta en BLANCO, así que el ícono va sobre fondo oscuro: es la
 * versión oscura de la marca, la misma que entregó el diseño.
 *
 * Sobre un cuadrado coral no funcionaría: el anillo y la manzana, que también
 * son coral, desaparecerían contra el fondo.
 */
const FONDO = "#161618";

/**
 * Dos versiones del mismo dibujo:
 *
 *   - `marca.svg`        → el isotipo completo: anillo, manzana y pesa.
 *   - `marca-simple.svg` → solo el anillo y la manzana, con trazo más grueso.
 *
 * Abajo de unos 32 píxeles la pesa se empasta contra el anillo y el conjunto
 * se vuelve una mancha, así que la pestaña del navegador y el .ico de Windows
 * usan la simplificada. No es otro logo: es el mismo con menos piezas, que es
 * lo que hace una marca bien resuelta a tamaño chico.
 */
const FUENTES = {
  completa: path.join(RAIZ, "assets/marca/marca.svg"),
  simple: path.join(RAIZ, "assets/marca/marca-simple.svg"),
};

/** La marca rasterizada al lado pedido, con sus colores. */
async function marca(fuente, lado) {
  const svg = await readFile(FUENTES[fuente], "utf8");
  return sharp(Buffer.from(svg), { density: 600 })
    .resize(lado, lado)
    .png()
    .toBuffer();
}

/**
 * Encuadra la marca en un lienzo cuadrado oscuro.
 *
 * @param {object} opciones
 * @param {string} opciones.fuente    Cuál de las dos versiones del dibujo.
 * @param {number} opciones.lado      Lado del lienzo, en px.
 * @param {number} opciones.radio     Radio de las esquinas (0 = cuadrado a sangre).
 * @param {number} opciones.ocupacion Fracción del lienzo que ocupa la marca.
 */
async function componer({ fuente, lado, radio, ocupacion }) {
  const ladoMarca = Math.round(lado * ocupacion);
  const dibujo = await marca(fuente, ladoMarca);
  const borde = Math.round((lado - ladoMarca) / 2);

  const capas = [];

  if (radio > 0) {
    // Las esquinas redondeadas se dibujan con un SVG de una sola forma: es la
    // única manera de tener antialiasing en el borde. Recortar con `extract`
    // daría un escalón.
    capas.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">` +
          `<rect width="${lado}" height="${lado}" rx="${radio}" ry="${radio}" fill="${FONDO}"/></svg>`,
      ),
    });
  }

  capas.push({ input: dibujo, top: borde, left: borde });

  return sharp({
    create: {
      width: lado,
      height: lado,
      channels: 4,
      background: radio > 0 ? { r: 0, g: 0, b: 0, alpha: 0 } : FONDO,
    },
  })
    .composite(capas)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Empaqueta un PNG dentro de un contenedor .ico.
 *
 * Windows acepta PNG crudo dentro del ICO desde Vista, así que alcanza con
 * anteponer la cabecera de 6 bytes y la entrada de directorio de 16. Se hace a
 * mano porque `sharp` no escribe .ico y no vale la pena sumar una dependencia
 * por 22 bytes.
 */
function empaquetarIco(png, lado) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0); // reservado
  cabecera.writeUInt16LE(1, 2); // tipo: 1 = ícono
  cabecera.writeUInt16LE(1, 4); // cantidad de imágenes

  const entrada = Buffer.alloc(16);
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 0); // ancho (0 significa 256)
  entrada.writeUInt8(lado >= 256 ? 0 : lado, 1); // alto
  entrada.writeUInt8(0, 2); // colores de la paleta (0 = sin paleta)
  entrada.writeUInt8(0, 3); // reservado
  entrada.writeUInt16LE(1, 4); // planos
  entrada.writeUInt16LE(32, 6); // bits por píxel
  entrada.writeUInt32LE(png.length, 8);
  entrada.writeUInt32LE(cabecera.length + entrada.length, 12); // offset

  return Buffer.concat([cabecera, entrada, png]);
}

/**
 * Los formatos que pide una PWA, y por qué cada uno se encuadra distinto.
 *
 *   - `any`      → esquinas redondeadas propias, porque el sistema lo muestra
 *     tal cual. Puede ir generoso: no hay recorte que temer.
 *   - `maskable` → Android lo recorta con la forma del launcher (círculo, gota,
 *     squircle) y solo garantiza el 80% CENTRAL. La marca va al 62% del lienzo
 *     para entrar entera en el círculo inscripto de ese 80%; el dibujo es más
 *     ancho que alto, así que lo que hay que medir es su ancho.
 *   - apple-icon → a sangre y sin transparencia: iOS aplica su propia máscara y
 *     lo que sea transparente le queda negro.
 *   - `icon`     → la pestaña del navegador: versión simplificada, porque se ve
 *     a 16 píxeles.
 */
const SALIDAS = [
  {
    archivo: "public/iconos/icono-192.png",
    fuente: "completa",
    lado: 192,
    radio: 43,
    ocupacion: 0.76,
  },
  {
    archivo: "public/iconos/icono-512.png",
    fuente: "completa",
    lado: 512,
    radio: 114,
    ocupacion: 0.76,
  },
  {
    archivo: "public/iconos/icono-maskable-192.png",
    fuente: "completa",
    lado: 192,
    radio: 0,
    ocupacion: 0.62,
  },
  {
    archivo: "public/iconos/icono-maskable-512.png",
    fuente: "completa",
    lado: 512,
    radio: 0,
    ocupacion: 0.62,
  },
  {
    archivo: "src/app/apple-icon.png",
    fuente: "completa",
    lado: 180,
    radio: 0,
    ocupacion: 0.74,
  },
  {
    archivo: "src/app/icon.png",
    fuente: "simple",
    lado: 192,
    radio: 43,
    ocupacion: 0.7,
  },
];

async function principal() {
  await mkdir(path.join(RAIZ, "public/iconos"), { recursive: true });

  for (const salida of SALIDAS) {
    const png = await componer(salida);
    await writeFile(path.join(RAIZ, salida.archivo), png);
    console.log(`✓ ${salida.archivo} (${salida.lado}×${salida.lado})`);
  }

  // El .ico es para Windows: es el que termina en el acceso directo del
  // escritorio y en la barra de tareas cuando se instala la app desde Chrome.
  const png = await componer({
    fuente: "simple",
    lado: 64,
    radio: 14,
    ocupacion: 0.74,
  });
  await writeFile(
    path.join(RAIZ, "src/app/favicon.ico"),
    empaquetarIco(png, 64),
  );
  console.log("✓ src/app/favicon.ico");
}

principal().catch((error) => {
  console.error(error);
  process.exit(1);
});
