# Cambios aplicados tras la auditoría de seguridad

**Fecha:** 2026-08-29
**Rama:** `audit/security` (partiendo de `63fad48`)
**Documento de origen:** [`AUDIT_SEGURIDAD.md`](./AUDIT_SEGURIDAD.md)
**Alcance:** remediación de los hallazgos de la auditoría, sin cambiar el
comportamiento funcional de la aplicación.

Este archivo es el registro de qué se tocó y por qué. La auditoría dice qué
estaba mal; esto dice qué se hizo, qué cambia de comportamiento observable y qué
quedó pendiente a propósito.

---

## Resumen

|                              |                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| Archivos modificados         | **42**                                                                             |
| Archivos nuevos              | 10 (5 de código, 5 de tests)                                                       |
| Archivos eliminados          | 1 (`capacitor.config.json` → `.ts`)                                                |
| Tests                        | 160 archivos / 679 casos → **165 archivos / 722 casos**                            |
| Vulnerabilidades `npm audit` | 20 (4 críticas, 9 altas) → **9 (todas solo de desarrollo)**                        |
| Hallazgos cerrados           | C1, C2, A1, A2, A3, A4, A5, A6, M1, M2, M3, M4, M5, M6, M7, B1, B2, B3, B4, B5, B6 |
| Hallazgos mitigados          | M8 (parcial)                                                                       |
| Hallazgos sin atender        | B7 (a propósito — ver §5)                                                          |

**Verificación del estado final:**

| Comprobación                                      | Resultado                                  |
| ------------------------------------------------- | ------------------------------------------ |
| `npx tsc --noEmit`                                | limpio                                     |
| `npx vitest run`                                  | **722/722 en verde**                       |
| `npx next build`                                  | correcto (`✓ Compiled successfully`)       |
| `npm audit --audit-level=high --omit=dev`         | **exit 0** (la nueva compuerta de CI pasa) |
| Cabeceras de seguridad sobre el servidor real     | las 6 presentes, `X-Powered-By` ausente    |
| Páginas `/login` y `/recuperar` bajo la CSP nueva | 200, formulario y scripts cargan           |
| Rutas protegidas sin sesión                       | 401                                        |
| Límite de tasa de `/api/monitoreo`                | 20 × `204`, luego `429`                    |

> Las tres últimas se comprobaron levantando el build de producción con
> `next start` y consultándolo con `curl`, no solo leyendo el código: una
> cabecera mal puesta o una CSP demasiado estricta se ven en la respuesta, no en
> el diff.

---

## 1. Dependencias (C1, C2)

Era el hallazgo más grave y el más simple de arreglar: la biblioteca que decide
quién entra tenía un aviso crítico de _fail open_.

| Paquete        | Antes         | Después                       | Cierra                                                                                               |
| -------------- | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `next`         | 16.2.9        | **16.3.3**                    | Bypass de middleware/proxy, SSRF en rewrites, DoS en Server Actions, divulgación de Server Functions |
| `next-auth`    | 5.0.0-beta.31 | **5.0.0-beta.32**             | Fail-open en chequeos de existencia, bypass por homoglifo, excepción con `Authorization` malformado  |
| `@auth/core`   | ≤0.41.2       | **^0.41.3** (vía `overrides`) | Lo mismo, en la dependencia transitiva                                                               |
| `nodemailer`   | ^7.0.13       | **^9.0.6**                    | Inyección de comandos SMTP y CRLF en cabeceras, validación TLS incorrecta                            |
| `deepmerge-ts` | 7.1.5         | **^8.0.0** (vía `overrides`)  | Agotamiento de pila                                                                                  |

**Resultado:** de 20 avisos (4 críticos, 9 altos) a **9, todos alcanzables solo
desde desarrollo** — el runner de tests (`vitest`, `vite`, `esbuild`), la CLI
móvil (`@capacitor/cli`, `xcode`) y `exceljs`/`uuid` en moderado.

### Dos decisiones que conviene dejar explicadas

**`overrides` en `package.json`.** `next-auth@beta.32` declara un
`peerOptional` de `nodemailer@^7 || ^8`, y las versiones seguras de nodemailer
son 9.x. Ese peer es para el proveedor Email de Auth.js, que **esta app no usa**
(entra por Credentials y manda sus correos con su propio
`NodemailerServicioEmail`). En vez de quedarse en una versión vulnerable para
contentar a un peer que nunca se ejecuta, se declaró el override. Lo mismo con
`deepmerge-ts`, que llega por la CLI de Prisma: se verificó después que
`prisma validate` y `prisma -v` siguen funcionando.

**Lo que NO se actualizó, y por qué.**

| Paquete          | Por qué se deja                                                                                                                         | Riesgo real                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `vitest` 2.x     | El arreglo es subir a 4.x, un salto mayor del runner de tests                                                                           | La vulnerabilidad requiere tener la **UI de Vitest escuchando**; el proyecto corre `vitest run`, que no la levanta. No toca producción. |
| `prisma` 6.x     | El arreglo sería subir a 7.x: rehacer el cliente generado y la API de `$extends`, de la que depende TODO el aislamiento multi-inquilino | Con el override de `deepmerge-ts` el aviso queda cerrado igual, sin tocar la capa de datos                                              |
| `exceljs`        | El "arreglo" que propone npm es **bajar** a 3.4.0, que es un cambio mayor hacia atrás — no es un parche                                 | El aviso es de `uuid` v3/v5/v6 cuando se le pasa `buf`; exceljs no lo hace. Moderado, y por debajo de la compuerta de CI                |
| `@capacitor/cli` | Herramienta de build móvil, no se despliega                                                                                             | No forma parte de la superficie de producción                                                                                           |

Las cuatro son **excepciones justificadas, no olvidos**, y la compuerta nueva de
CI (`--omit=dev`) está calibrada para reflejar exactamente eso.

---

## 2. Cambios de código

### 2.1 Las sesiones ahora se pueden revocar (A1)

**El problema.** Con estrategia JWT el token vale por sí mismo hasta que vence,
y el callback `jwt` solo consultaba la base en el login. Dar de baja a un
nutricionista no lo echaba: seguía leyendo historias clínicas con el token que
ya tenía, hasta **30 días** (el `maxAge` por defecto de Auth.js).

**Qué se hizo.** Dos mitades, porque ninguna alcanza sola:

1. `src/lib/autenticacion/auth.config.ts` — `maxAge: 12 h` con `updateAge: 1 h`.
   La sesión activa se renueva sola mientras se trabaja y caduca de verdad tras
   12 h de inactividad. Cubre una jornada completa sin cortar en el medio de una
   consulta.
2. `src/lib/autenticacion/sesion.ts` (**nuevo**) — revalidación contra la base
   en cada request, con caché de 60 s. Detecta la cuenta desactivada **y** el
   token rancio: si el rol o el inquilino del JWT dejaron de coincidir con la
   base, la sesión se corta (antes, degradar a alguien de NUTRICIONISTA a
   PACIENTE no le sacaba los permisos viejos).

**Por qué no va en `auth.config.ts`:** ese archivo lo importa `proxy.ts`, que
corre en el Edge Runtime, donde no hay Prisma. La revalidación se hace en el
runtime Node, en los puntos de entrada que sí tocan datos.

**Efecto en el rendimiento.** El caché de 60 s convierte "una consulta por
request" en "una consulta por usuario por minuto". El compromiso es explícito:
una baja tarda a lo sumo un minuto en hacerse efectiva, en lugar de 30 días.
De paso se **quitó** el campo `sesion` del contexto de tRPC —no lo leía ningún
router— lo que ahorra una resolución de sesión completa por request: el cambio
neto en el camino caliente es favorable.

**Ante un fallo de la base, no corta la sesión.** Es deliberado y está comentado
en el archivo: cortar sonaría más seguro pero desloguearía a todo el mundo ante
un hipo de Postgres, y no compra nada — si la base no responde, la request no va
a poder leer un solo dato igual (la extensión de inquilino falla cerrado).

**Puntos de entrada migrados** de `auth()` a `usuarioDeSesion()`: el contexto de
tRPC y los 8 route handlers de `/api/*`.

### 2.2 Los archivos subidos ya no pueden mentir sobre qué son (A5)

**El problema.** El MIME salía de `File.type` —la cabecera que pone quien sube—
y la lista blanca validaba ese string, no los bytes. `/api/archivos/[id]/ver`
después devolvía el archivo con ese MIME, **en línea y desde el mismo origen**.
Contenido HTML declarado como `image/png` pasaba el filtro; si el navegador
llegaba a esnifarlo, ejecutaba scripts con la sesión de quien lo abriera — y
quien abre los adjuntos de un paciente es el nutricionista.

**Qué se hizo.** Las dos mitades del problema:

- `src/dominio/servicios/firmaArchivo.ts` (**nuevo**) — verificación de firma
  binaria (_magic bytes_) para los 7 tipos que la app acepta. Se aplica en
  `SubirArchivo` **antes** de tocar el bucket, así un archivo que miente no deja
  basura. Un MIME sin firma registrada pasa: la lista blanca de `Archivo.crear`
  sigue siendo la que decide qué se acepta, y sumar un tipo nuevo no rompe las
  subidas por olvidarse de esta tabla.
- `src/app/api/archivos/[id]/ver/route.ts` — `X-Content-Type-Options: nosniff` y
  una CSP restrictiva en la respuesta, explícitas aunque `next.config.ts` ya las
  ponga globalmente: es la respuesta que más las necesita y no debe depender de
  que nadie afloje la configuración general.

**Una decisión que se tomó a conciencia:** _no_ se usó la directiva CSP
`sandbox`, que sería lo más estricto. El visor de PDF integrado del navegador
deja de dibujar bajo sandbox, y mostrar el PDF adentro de la app es exactamente
para lo que existe esa ruta. `nosniff` + verificación de firma ya cortan el
ataque de raíz; la CSP sin `sandbox` es el cinturón sobre los tirantes.

### 2.3 Un paciente ya no puede colgar archivos de la ficha de otro (M2)

`src/app/api/archivos/route.ts` — el `pacienteId` del formulario se usaba tal
cual. Ahora:

- **si el rol no es NUTRICIONISTA**, el `pacienteId` del formulario se ignora y
  el dueño sale de la sesión. Un paciente no elige dueño: el dueño es él;
- **si es NUTRICIONISTA**, se verifica que el paciente sea de su consultorio
  antes de escribir. Sin esto la fila se escribía igual, porque la clave foránea
  de `archivos.pacienteId` apunta al id pelado y no al par
  `(nutricionistaId, id)`.

### 2.4 El límite de intentos ya no se evade con una cabecera (M1)

`src/lib/autenticacion/auth.ts` — se invirtió el orden de resolución de la IP.
`X-Forwarded-For` es una lista que cada proxy **anexa**, así que el primer
elemento lo pone el cliente: leerlo primero hacía que mandar un
`X-Forwarded-For: <aleatorio>` distinto en cada intento pusiera cada intento en
un contador nuevo, y el bloqueo por IP no se disparara nunca.

Ahora se lee `X-Real-IP` primero (nuestro nginx lo escribe con `$remote_addr`,
pisando lo que venga de afuera) y, como respaldo, el **último** elemento de
`X-Forwarded-For`. El mismo criterio se replicó en el contexto de tRPC y en
`/api/monitoreo`.

### 2.5 Límites de tasa donde faltaban (M3, M4, M7)

`src/infraestructura/seguridad/LimitadorTasa.ts` (**nuevo**) — ventana
deslizante, hermano de `LimitadorIntentos` y distinto a propósito: aquel cuenta
**fallos** (el éxito limpia el contador, que es lo correcto para el login), este
cuenta **operaciones**. Es lo que hace falta cuando el abuso no está en
equivocarse muchas veces sino en acertar muchas veces.

| Dónde                                 | Límite                                        | Qué frena                                                                                                                                                                                            |
| ------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `autenticacion.solicitarRecuperacion` | 3/h por email **y** por IP                    | Bombardeo de correo a una víctima; de paso, que se queme la cuota SMTP y el dominio caiga en listas negras (lo que rompería _todos_ los emails de la app)                                            |
| `autenticacion.restablecer`           | 10/h por IP                                   | Prueba de tokens a máxima velocidad. Más holgado a propósito: acá no se manda ningún correo y quien está eligiendo contraseña puede reintentar                                                       |
| `/api/monitoreo`                      | 20/min por IP                                 | Inundar el webhook de avisos del profesional hasta enterrar los errores reales                                                                                                                       |
| `ia.preguntar` / `ia.analizarFoto`    | 30/h por paciente **y** 300/h por consultorio | Facturación sin techo contra la `ANTHROPIC_API_KEY` del profesional. Dos techos porque uno solo no alcanza: el de paciente frena una cuenta, el de consultorio frena el abuso repartido entre varias |

Detalle de implementación que importa: **un intento rechazado no se
contabiliza**. Si se sumara, quien insiste durante el bloqueo se auto-prorrogaría
el castigo y la ventana no terminaría de vaciarse nunca. Hay un test para eso.

Para poder limitar por origen, `crearContexto` ahora recibe la `Request` y
expone `ctx.ip`.

### 2.6 Contraseñas: una sola política (B1) y hashes más caros (B2)

`src/aplicacion/dtos/password.ts` (**nuevo**) — la política estaba escrita dos
veces y con dos criterios: 8 caracteres al crear la cuenta y **6** al
restablecerla. Es decir que "olvidé mi contraseña" servía para **rebajar la
política por la puerta de atrás**. Ahora hay un solo esquema, usado en los tres
flujos (alta de nutricionista, alta de paciente, restablecimiento):

- mínimo **12** caracteres, máximo 72 (bcrypt trunca ahí; aceptar más sería
  mentir sobre la fuerza);
- **sin** requisitos de composición, siguiendo NIST SP 800-63B: exigir mayúscula
  y símbolo produce `Password1!`, que cualquier diccionario conoce, mientras que
  la longitud sí agrega trabajo real;
- se rechazan las obvias (un carácter repetido, `cambiar123456`, el nombre del
  sistema).

`src/infraestructura/seguridad/BcryptHasheador.ts` — costo de bcrypt de 10 a
**12**, configurable con `BCRYPT_ROUNDS` (rango 10–15) por si el VPS resulta
más lento de lo previsto.

**Sobre el rendimiento:** bcrypt corre **solo al iniciar sesión y al cambiar la
contraseña**, nunca por request. Con la sesión durando 12 h, una persona paga
~300–500 ms una vez por jornada; ninguna pantalla se vuelve más lenta. Además se
agregó **re-hasheo transparente**: al iniciar sesión, si el hash guardado tiene
un costo menor al actual, se regraba con el nuevo. Los usuarios existentes
migran solos sin que se les pida nada. Va en `try/catch` y no puede negar un
login que ya fue correcto.

### 2.7 Las variables ya no se inyectan sin escapar en el HTML de los correos (B3)

`src/dominio/plantillas/renderizar.ts` — se separó en dos funciones, porque las
dos mitades de una plantilla tienen distinta confianza:

- `renderizarPlantilla` (sin escapar) para destinos de **texto plano**:
  WhatsApp y la parte `text` del email;
- `renderizarPlantillaHtml` (escapando los **valores**) para el cuerpo HTML. La
  plantilla la escribe el profesional y se respeta tal cual, con sus etiquetas;
  los valores sustituidos son **datos** —el nombre del paciente, sobre todo— y
  un nombre no tiene ninguna razón para traer etiquetas.

Sin esto, un nombre con `<script>` o con un atributo `onerror` se inyectaba tal
cual en el correo que sale hacia terceros. Se replicó en la vista previa del
cliente (`renderizarHtmlCliente`), a propósito con el mismo criterio: si la
vista previa escapara distinto que el envío real, mostraría algo que no es lo
que le va a llegar al paciente, y la vista previa existe justamente para eso.

### 2.8 Cabeceras de seguridad en la app, no en un nginx opcional (A3, B4)

`next.config.ts` — se agregó `headers()` con CSP, `Referrer-Policy`,
`X-Content-Type-Options`, `X-Frame-Options`, `Permissions-Policy` y HSTS (solo
en producción), más `poweredByHeader: false`.

**Por qué en la app y no en el proxy:** el nginx de `docs/nginx.conf.ejemplo` es
_opcional_. Un despliegue que no lo use —Docker a secas, staging, el WebView de
Android— se quedaba sin ninguna cabecera. Puestas en la app, viajan con ella.
Las de nginx se dejaron como segunda capa, con una nota sobre la duplicación.

`Referrer-Policy` es la que no se podía omitir en esta app: el enlace de
recuperación es `/restablecer?token=…`, y con la política por defecto ese token
viaja en el `Referer` hacia cualquier recurso externo que cargue la página.

**Dos concesiones que están documentadas en el código, no escondidas:**
`script-src` y `style-src` llevan `'unsafe-inline'`. Next inyecta el script de
arranque de la hidratación en línea, y Tailwind/Radix escriben estilos en línea;
quitarlos exige emitir un nonce por request desde el proxy y propagarlo al
documento, que es un cambio de arquitectura, no de configuración. Aun así la
política corta lo que importa: `default-src 'self'` impide que un XSS cargue
nada de afuera, y `object-src 'none'` + `base-uri 'self'` + `form-action 'self'`
cierran las vías clásicas de exfiltración.

**Se verificó que no rompe la interfaz** (§Resumen): `/login` y `/recuperar`
responden 200 con su formulario y sus scripts. `frame-ancestors` quedó en
`'self'` y `X-Frame-Options` en `SAMEORIGIN`, y **no** en `DENY`/`'none'`: la
respuesta de `/api/archivos/[id]/ver` tiene que poder ser embebida por la propia
app o el visor de PDF queda en blanco.

### 2.9 El importador de planillas ya no filtra internos

`src/app/api/alimentos/importar/route.ts` devolvía `error.message` tal cual. Eso
está bien para el mensaje que escribimos nosotros ("falta la columna Nombre")
pero también reenviaba lo que tirara el lector de Excel ante un archivo
corrupto: rutas internas, nombres de módulo, detalles del parser. Ahora el
mensaje intencional se lanza como `ErrorValidacion` (error de dominio) y el
handler usa `aRespuestaError`, que deja pasar los de dominio y reemplaza el
resto por un genérico, registrando el original en el servidor.

> Este no estaba en la auditoría: apareció al revisar los dos route handlers
> (`/api/alimentos/importar`, `/api/metricas/importar`) que no se habían mirado
> en la primera pasada. La autorización de ambos estaba correcta.

---

## 3. Cambios de configuración y despliegue

### 3.1 Los secretos ya no se hornean en la imagen Docker (M5)

`.dockerignore` — el patrón pasó de una lista de nombres a `.env*` con
excepciones para los `*.example`.

Docker hace coincidir `.env` **solo** con el archivo llamado exactamente así, de
modo que la lista anterior dejaba afuera justo los dos que importan:
`.env.produccion` y `.env.staging`, que son los nombres que usa
`docker-compose.prod.yml` y que viven en el directorio del proyecto — es decir,
**dentro del contexto de build**. Como el stage `build` hace `COPY . .`, esos
archivos con `AUTH_SECRET`, `TOKENS_SECRET`, `DATABASE_URL` y las claves S3
quedaban en una capa de la imagen intermedia.

> **Acción manual pendiente:** revisar las imágenes ya construidas en el VPS
> (`docker history` / `dive`). Si los secretos aparecen, hay que rotarlos.

### 3.2 La app móvil ya no puede salir hablando HTTP (A2)

`capacitor.config.json` → **`capacitor.config.ts`**. El archivo versionado traía
clavado `"url": "http://192.168.100.182:3000"` con `"cleartext": true`, así que
cualquier build hecho desde una copia limpia del repo —incluido un release—
salía hablando HTTP contra una IP de red local. Dos problemas, y el segundo es
peor: sin TLS la sesión y los datos clínicos viajan en claro, y esa IP privada
en la red del usuario le pertenece a **otro equipo**, así que la app termina
mandándole las credenciales a un tercero cualquiera.

Un JSON no puede depender del entorno, así que la única forma de que el valor de
desarrollo no viaje al build de producción es que **no esté en ningún archivo**.
Ahora se lee de `CAP_SERVER_URL`:

```bash
CAP_SERVER_URL=http://192.168.1.50:3000 npm run cap:sync   # desarrollo
npm run cap:sync                                            # producción (HTTPS)
```

`cleartext` se habilita **solo** si la URL empieza con `http://`, y la
configuración **aborta** si eso ocurre con `NODE_ENV=production`.
`docs/MOBILE.md` quedó actualizado.

### 3.3 Los respaldos salen cifrados (A6)

`respaldos/respaldo.sh` — si está definida `RESPALDO_GPG_RECIPIENT`, el volcado
se cifra con esa clave pública **antes** de subirse, y el dump en claro se borra
del disco del VPS en cuanto existe la versión cifrada. La clave **privada** no
vive en el servidor: sin ella el archivo del bucket externo no sirve de nada, ni
siquiera para quien controle el VPS.

Se agregó `gnupg` a `respaldos/Dockerfile` y las variables al compose
(`RESPALDO_GPG_RECIPIENT`, `GNUPGHOME`, montaje de solo lectura del llavero).

**Si la variable no está, el respaldo sigue funcionando sin cifrar pero avisa
fuerte en cada corrida.** Se eligió avisar y no abortar para que esta mejora no
deje a nadie sin respaldos de un día para el otro.

### 3.4 La app deja de usar las credenciales root de MinIO (M6)

`docker-compose.prod.yml` — la app ahora toma `S3_APP_ACCESS_KEY` /
`S3_APP_SECRET_KEY`, con caída a las de administración si no están definidas
(compatible hacia atrás). El comando que crea la service account acotada está
documentado en el propio compose y en `.env.example`.

Además, `AlmacenamientoMinIO.asegurarBucket()` ya no propaga el fallo al crear
el bucket: crear buckets es una operación de administración que la credencial
acotada **no tiene**, así que con menos privilegios ese fallo es el resultado
esperado, no un error. El bucket lo crea el servicio `crear_bucket` al arrancar.

### 3.5 Límites de tasa en nginx (M8, parcial)

`docs/nginx.conf.ejemplo` — dos zonas `limit_req` y `limit_req_status 429`, con
límite estricto en `/api/auth` y `/api/monitoreo`, y general en `/` y
`/api/trpc`. Usan `$binary_remote_addr` (la dirección real de la conexión, que
el cliente no puede falsear) y no `$http_x_forwarded_for`.

Esto está **por delante** de los limitadores en memoria de la app y sobrevive a
sus reinicios. Se marca como _parcial_ porque el hallazgo M8 pide mover el
estado a PostgreSQL o Redis; eso queda pendiente (§5).

### 3.6 CI y despliegue (B5, B6)

`.github/workflows/ci.yml`:

- **acciones fijadas por SHA** en vez de tags. Un tag como `v4` es mutable:
  quien controle el repositorio de la acción puede reapuntarlo cuando quiera, y
  el workflow de deploy corre **con la clave SSH del VPS de producción**. Cada
  SHA lleva al lado un comentario con la versión, para que siga siendo legible;
- `permissions: contents: read` por defecto, con `security-events: write` solo
  en el job que lo necesita;
- **`npm audit --audit-level=high --omit=dev` que rompe el build.** Es la red
  que faltaba: cuando se hizo la auditoría había 4 avisos críticos abiertos —uno
  en la propia biblioteca de autenticación— y nada en el CI los veía. `--omit=dev`
  es deliberado: acota la exigencia a lo que se despliega, para que un fallo en
  el runner de tests no frene el trabajo de nadie. Lo de desarrollo se revisa en
  un paso informativo aparte;
- **CodeQL** (`security-extended`) y **gitleaks** sobre el historial completo.
  El historial hoy está limpio; gitleaks existe para que siga estándolo, porque
  es mucho más barato frenar un secreto en el PR que rotarlo después.

`.github/workflows/deploy.yml`: mismo tratamiento (`permissions` mínimos, SHA).

---

## 4. Tests agregados

De 679 a **722 casos**. Los nuevos cubren exactamente lo que se arregló, para
que una regresión falle en el CI y no en producción:

| Archivo                                              | Qué congela                                                                                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dominio/servicios/firmaArchivo.test.ts`             | Que HTML disfrazado de PNG/JPEG/PDF se rechace; que los formatos legítimos (incluido el contenedor RIFF de WEBP, con sus bytes variables) se acepten |
| `dominio/casos-de-uso/archivos/SubirArchivo.test.ts` | Que un archivo que miente sobre su tipo **no escriba nada** en el bucket ni en la base                                                               |
| `dominio/plantillas/renderizar.test.ts`              | Que el HTML de la plantilla se respete y los **valores** se escapen; que `<script>` y `onerror` inyectados por un nombre queden neutralizados        |
| `aplicacion/dtos/password.test.ts`                   | Que la política sea la misma en el alta y en el restablecimiento — la regresión concreta que había                                                   |
| `infraestructura/seguridad/LimitadorTasa.test.ts`    | La ventana deslizante, la independencia entre claves y que un intento rechazado no extienda el bloqueo                                               |
| `infraestructura/seguridad/BcryptHasheador.test.ts`  | La detección de hashes con costo viejo, y que un formato desconocido no se toque                                                                     |

Los fixtures de `SubirArchivo.test.ts` se actualizaron a firmas binarias reales:
antes alcanzaba con `[1,2,3,4]` porque el caso de uso confiaba en el MIME
declarado, y ahora los tests tienen que ser honestos sobre qué son.

---

## 5. Lo que quedó pendiente, y por qué

**B7 — Registro de auditoría de accesos a datos clínicos.** No se implementó.
No es un olvido: pide un modelo de Prisma nuevo, una migración, un middleware
que escriba en cada request y —lo más importante— decisiones que no son
técnicas: qué se registra exactamente, cuánto tiempo se retiene, dónde se guarda
y quién lo puede leer. Meterlo apurado dentro de una tanda de remediación
produciría una tabla que crece sin control y que nadie mira. Merece su propio
cambio, con esas decisiones tomadas antes de escribir código. Es además el
hallazgo con implicancia normativa más directa junto con A6 (ya cerrado).

**M8 — Estado del limitador fuera del proceso.** Mitigado con `limit_req` de
nginx, que sobrevive a los reinicios de la app y está por delante. Falta mover
el estado en memoria a PostgreSQL (ya es dependencia dura) para que el límite
sea correcto si algún día hay más de una réplica.

**Acciones manuales que no puede hacer el código.** Están en el checklist de
`AUDIT_SEGURIDAD.md` §2 y no se pueden cerrar desde el repositorio:

1. verificar si existe `admin@demo.com` en producción y rotarlo o eliminarlo;
2. revisar las imágenes Docker ya construidas por si tienen secretos horneados
   (§3.1) y rotar lo que aparezca;
3. confirmar el destino del `.env` local, que tiene valores que aparentan ser
   reales (§1.C de la auditoría);
4. crear la service account de MinIO y completar `S3_APP_*`;
5. generar el par GPG y definir `RESPALDO_GPG_RECIPIENT`;
6. mover las directivas `limit_req_zone` al bloque `http` de `nginx.conf` al
   copiar el ejemplo (está avisado en el archivo: si quedan dentro de `server`,
   nginx no arranca);
7. probar una restauración real desde un respaldo cifrado.

**El pentest formal sigue siendo necesario.** Nada de esto reemplaza lo que
`AUDIT_SEGURIDAD.md` §6 marca como verificable solo con tráfico real —sobre todo
el aislamiento entre inquilinos bajo concurrencia y streams SSE de larga vida,
que es el riesgo de mayor impacto del sistema y no se puede confirmar leyendo
código.

---

## 6. Cambios de comportamiento observables

Casi todo es transparente. Estas son las excepciones, para que no sorprendan:

| Cambio                                                  | A quién afecta              | Qué se ve                                                                                           |
| ------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------- |
| Sesión de 12 h en vez de 30 días                        | Todos                       | Hay que volver a iniciar sesión tras 12 h **de inactividad**; trabajando, la sesión se renueva sola |
| Desactivar una cuenta ahora corta el acceso             | SUPERADMIN                  | Efecto en ≤60 s, en lugar de nunca                                                                  |
| Contraseña mínima de 12 caracteres                      | Quien crea o restablece una | Las existentes siguen funcionando; el mínimo aplica al elegir una nueva                             |
| Login levemente más lento la primera vez tras el cambio | Usuarios con hash viejo     | ~300–500 ms una vez por jornada, y una sola vez el re-hasheo                                        |
| Archivos que no coinciden con su tipo declarado         | Quien suba uno              | Error claro en vez de una subida silenciosa. Ningún archivo legítimo se ve afectado                 |
| Un paciente ya no puede adjuntar a otra ficha           | Pacientes                   | Ninguno en el uso normal: la interfaz nunca ofreció esa opción                                      |
| Límite de 3 pedidos/h de recuperación                   | Quien olvide la contraseña  | Ninguno en el uso normal (se pide una o dos veces)                                                  |
| Build móvil sin `CAP_SERVER_URL`                        | Quien compile la app        | Apunta a producción por HTTPS. Para desarrollo hay que pasar la variable                            |
| `ctx.sesion` ya no existe en el contexto de tRPC        | Código futuro               | Ningún router lo usaba. Usar `ctx.usuario`                                                          |

---

_Remediación verificada con typecheck, 722 tests, build de producción y
comprobaciones en vivo contra el servidor levantado. Ningún secreto fue
transcrito en este documento ni en la auditoría de origen._
