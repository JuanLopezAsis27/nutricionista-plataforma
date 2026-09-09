# Archivos del bucket

Cómo llega al navegador un archivo guardado en MinIO/S3, y por qué durante un
tiempo no llegaba.

## El bug: las imágenes cargadas no se veían

Las fotos de las recetas, los adjuntos de un laboratorio y los materiales de la
biblioteca se pedían por `GET /api/archivos/<id>`, que respondía **302 a una
URL firmada del bucket**. Eso fallaba de dos maneras distintas, y las dos
callaban:

### 1. En producción el bucket no existe para el navegador

MinIO vive en la red interna de Docker y `S3_ENDPOINT` es `http://minio:9000`
(ver `docker-compose.prod.yml`). La URL firmada apunta a un host que **solo
resuelve adentro del stack**: el navegador la pide y no llega a ninguna parte.
No es solo un problema de las imágenes —tampoco bajaba un PDF ni un adjunto—,
pero se notó primero en las imágenes porque una etiqueta `<img>` rota no
muestra ningún error.

Publicar el puerto de MinIO hacia afuera no era la salida: expone el bucket
entero a internet para resolver un problema de la app.

### 2. Aun con el bucket alcanzable, la CSP corta la imagen

La política de `next.config.ts` declara `img-src 'self' data: blob:`, y una
redirección **cuenta**: el navegador vuelve a evaluar el destino contra la
política. `http://localhost:9000` no es `'self'` —alcanza con que cambie el
puerto—, así que en desarrollo, con MinIO accesible, la imagen quedaba vacía
igual, con un aviso en la consola como única pista.

## La solución

Las dos rutas de lectura sirven **los bytes desde la app**, con la misma
autorización y las mismas cabeceras de seguridad. Lo único que las separa es el
`Content-Disposition`:

| Ruta                       | Disposición  | Para qué                                        |
| -------------------------- | ------------ | ----------------------------------------------- |
| `/api/archivos/<id>/ver`   | `inline`     | mostrar adentro: `<img>`, el visor de PDF, abrir en una pestaña |
| `/api/archivos/<id>`       | `attachment` | bajar el archivo                                |

El código común vive en `src/servidor/archivoHttp.ts` (`responderArchivo`).

Sirviéndolo desde la app, el archivo es del **mismo origen** que la página: no
depende de que el bucket esté publicado ni de las cabeceras que ese bucket
ponga, y la CSP lo acepta sin excepciones.

La contrapartida es que los bytes pasan por Node en vez de ir directo del
bucket al navegador. Es asumible: el techo de subida son 25 MB y lo que se
sirve son fotos de recetas y PDFs de plan, no video.

La URL firmada **sigue existiendo** en el dominio (`generarUrlLectura`) para lo
que sí necesita una URL alcanzable desde afuera —hoy, pasarle una foto al
analizador de comidas—. Lo que no vuelve es usarla para que el navegador cargue
un recurso de la app.

## La autorización es la misma en las dos rutas, a propósito

El nutricionista accede a todo; el paciente, a lo que subió él mismo y a lo que
le fue compartido (`PuedeVerArchivoPaciente`). Son dos formas de leer el mismo
archivo: si una fuera más permisiva, sería la puerta de atrás de la otra.

## Las cabeceras de seguridad no son decorativas

Servir contenido subido por usuarios **en línea y desde el mismo origen** es la
vía clásica del XSS almacenado. Van explícitas en la respuesta aunque
`next.config.ts` ya las ponga globalmente: esta es la respuesta que más las
necesita y no debe depender de que nadie afloje la configuración general.

- `X-Content-Type-Options: nosniff` corta el ataque de raíz: obliga al
  navegador a respetar el `Content-Type` declarado en vez de adivinar por el
  contenido. Junto con la verificación de firma binaria de la subida
  (`dominio/servicios/firmaArchivo.ts`), el contenido no puede pasar por un
  tipo que no es.
- La CSP de la respuesta es el cinturón sobre los tirantes: si aun así algo
  llegara a interpretarse como documento, no puede ejecutar nada ni salir a la
  red.
- **No** se usa la directiva `sandbox`: el visor de PDF integrado del navegador
  deja de dibujar bajo sandbox, y mostrar el PDF adentro de la app es
  justamente para lo que existe la ruta `/ver`.
- `Cache-Control: private`: es contenido clínico de un paciente y no puede
  quedar en una caché compartida.

## Al tocar esto

- Un `<img>`, un `<iframe>` o un «abrir en una pestaña» van siempre a
  `/api/archivos/<id>/ver`. `/api/archivos/<id>` es para bajar.
- Nunca apuntar un recurso de la app a una URL firmada del bucket: es otro
  origen y queda a merced de sus cabeceras, cuando llega.
- Si algún día hace falta que el bucket sirva directo (archivos grandes,
  ancho de banda), lo que falta no es la URL firmada sino un endpoint público
  del bucket + su origen en la CSP. Son dos decisiones, no una.
