#!/usr/bin/env node
/**
 * Genera los íconos de la PWA a partir del logo del consultorio.
 *
 * La fuente es `assets/marca/logo-original.jpg`: el logo tal cual lo entregó el
 * profesional, versionado para que esto sea reproducible. Es un JPEG de 256×256
 * —chico y con ruido de compresión— así que el script no lo usa directamente,
 * lo LIMPIA primero (ver `limpiarLogo`) y recién después lo encuadra en cada
 * formato.
 *
 * Se corre a mano cuando cambia la marca; los PNG resultantes SÍ se commitean,
 * porque el build no puede depender de `sharp` (viene de arrastre con Next, no
 * es una dependencia declarada del proyecto).
 *
 *   node scripts/generar-iconos-pwa.mjs
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGEN = path.join(RAIZ, "assets/marca/logo-original.jpg");

/**
 * Fondo blanco y no el coral de la marca (`--primary`): el logo es negro sobre
 * claro, y sobre coral el contraste se cae —además «NUTRICIÓN Y DEPORTE», que
 * va calado en blanco dentro de la barra, se teñiría de coral y quedaría
 * ilegible—. El coral sigue siendo el `theme_color` del manifiesto.
 */
const FONDO = "#FFFFFF";

/**
 * Recorte del arte dentro del JPEG original, en píxeles.
 *
 * Son las coordenadas de la caja que ocupan los píxeles oscuros: el original
 * trae el logo sobre un círculo gris claro con bastante aire alrededor, y ese
 * aire hay que tirarlo para poder darle al ícono SU propio margen.
 */
const RECORTE = { left: 14, top: 47, width: 227, height: 165 };

/**
 * Niveles para separar el arte del fondo: todo lo que esté por debajo de
 * NEGRO pasa a negro puro y todo lo que esté por encima de BLANCO, a blanco.
 *
 * Esto es lo que arregla las tres cosas que se veían mal: el negro deslavado
 * (en el original el trazo ronda el 20% de gris), el ruido de JPEG alrededor
 * de las letras, y el círculo gris del fondo, que al quedar por encima del
 * punto blanco desaparece solo en vez de tener que recortarlo a mano.
 */
const NIVEL_NEGRO = 60;
const NIVEL_BLANCO = 200;

/** Factor de trabajo interno: se agranda, se corrigen niveles y se vuelve a bajar. */
const SOBREMUESTREO = 8;

/**
 * Devuelve el logo limpio: negro puro sobre fondo transparente.
 *
 * El orden importa. Se agranda ANTES de corregir los niveles porque el
 * reescalado interpola con los píxeles originales —bordes suaves— y recién
 * ahí la curva endurece el contraste sin generar escalones; al revés (umbral
 * primero, agrandar después) el resultado sale dentado.
 */
async function limpiarLogo() {
  const escala = 255 / (NIVEL_BLANCO - NIVEL_NEGRO);
  const ancho = RECORTE.width * 4;
  const alto = RECORTE.height * 4;

  const gris = await sharp(ORIGEN)
    .extract(RECORTE)
    .greyscale()
    .resize(RECORTE.width * SOBREMUESTREO, RECORTE.height * SOBREMUESTREO, {
      kernel: "lanczos3",
    })
    .linear(escala, -NIVEL_NEGRO * escala)
    .resize(ancho, alto, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  // La luminancia invertida ES la máscara de opacidad: donde había trazo negro
  // el ícono es opaco, y donde había fondo blanco queda transparente. Así el
  // calado blanco de la barra deja ver el fondo del ícono en lugar de ser un
  // parche blanco que solo funciona sobre blanco.
  const mascara = await sharp(gris)
    .negate()
    .toColourspace("b-w")
    .raw()
    .toBuffer();

  const arte = await sharp({
    create: { width: ancho, height: alto, channels: 3, background: "#000000" },
  })
    .joinChannel(mascara, { raw: { width: ancho, height: alto, channels: 1 } })
    .png()
    .toBuffer();

  return { arte, ancho, alto };
}

/**
 * Encuadra el logo limpio en un lienzo cuadrado.
 *
 * @param {object} opciones
 * @param {number} opciones.lado      Lado del lienzo, en px.
 * @param {number} opciones.radio     Radio de las esquinas (0 = cuadrado a sangre).
 * @param {number} opciones.ocupacion Fracción del ANCHO del lienzo que ocupa el logo.
 */
async function componer(logo, { lado, radio, ocupacion }) {
  const anchoLogo = Math.round(lado * ocupacion);
  const altoLogo = Math.round((anchoLogo * logo.alto) / logo.ancho);

  const escalado = await sharp(logo.arte)
    .resize(anchoLogo, altoLogo, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  const lienzo = sharp({
    create: {
      width: lado,
      height: lado,
      channels: 4,
      background: radio > 0 ? { r: 0, g: 0, b: 0, alpha: 0 } : FONDO,
    },
  });

  const capas = [];
  if (radio > 0) {
    // Las esquinas redondeadas se hacen con un SVG de una sola forma: es la
    // única manera de tener antialiasing en el borde. Recortar con `extract`
    // daría un escalón.
    capas.push({
      input: Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}">` +
          `<rect width="${lado}" height="${lado}" rx="${radio}" ry="${radio}" fill="${FONDO}"/></svg>`,
      ),
    });
  }
  capas.push({
    input: escalado,
    top: Math.round((lado - altoLogo) / 2),
    left: Math.round((lado - anchoLogo) / 2),
  });

  return lienzo.composite(capas).png({ compressionLevel: 9 }).toBuffer();
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
 * La `ocupacion` se mide sobre el ANCHO porque el logo es apaisado (1,38:1):
 * lo que lo limita en un lienzo cuadrado es siempre el ancho, y el aire de
 * arriba y abajo sale solo.
 *
 *   - `any`      → esquinas redondeadas propias, porque el sistema lo muestra
 *     tal cual. Puede ir generoso: no hay recorte que temer.
 *   - `maskable` → Android lo recorta con la forma del launcher (círculo, gota,
 *     squircle) y solo garantiza el 80% CENTRAL. Un rectángulo de 1,38:1 dentro
 *     de un círculo de diámetro 0,8·lado no puede pasar del 64% del ancho; con
 *     el 84% del `any`, las pesas de los extremos quedaban cortadas.
 *   - apple-icon → a sangre y sin transparencia: iOS aplica su propia máscara y
 *     lo que sea transparente le queda negro.
 *   - `icon`     → la pestaña del navegador.
 */
const SALIDAS = [
  {
    archivo: "public/iconos/icono-192.png",
    lado: 192,
    radio: 43,
    ocupacion: 0.84,
  },
  {
    archivo: "public/iconos/icono-512.png",
    lado: 512,
    radio: 114,
    ocupacion: 0.84,
  },
  {
    archivo: "public/iconos/icono-maskable-192.png",
    lado: 192,
    radio: 0,
    ocupacion: 0.64,
  },
  {
    archivo: "public/iconos/icono-maskable-512.png",
    lado: 512,
    radio: 0,
    ocupacion: 0.64,
  },
  { archivo: "src/app/apple-icon.png", lado: 180, radio: 0, ocupacion: 0.8 },
  { archivo: "src/app/icon.png", lado: 192, radio: 43, ocupacion: 0.84 },
];

async function principal() {
  await mkdir(path.join(RAIZ, "public/iconos"), { recursive: true });
  const logo = await limpiarLogo();

  for (const salida of SALIDAS) {
    const png = await componer(logo, salida);
    await writeFile(path.join(RAIZ, salida.archivo), png);
    console.log(`✓ ${salida.archivo} (${salida.lado}×${salida.lado})`);
  }

  // El .ico es para Windows: es el que termina en el acceso directo del
  // escritorio y en la barra de tareas cuando se instala la app desde Chrome.
  const png = await componer(logo, { lado: 64, radio: 14, ocupacion: 0.9 });
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
