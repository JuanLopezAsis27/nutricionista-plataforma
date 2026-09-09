# Auditoría de Seguridad — nutricionista-app

**Fecha:** 2026-08-29
**Rama auditada:** `audit/security` (`63fad48`)
**Alcance:** revisión de código y configuración del repositorio completo —
`src/` (dominio, aplicación, infraestructura, presentación), `prisma/`,
`scripts/`, `respaldos/`, `android/`, `docker-compose*`, `Dockerfile`,
`.github/workflows/`, `docs/nginx.conf.ejemplo`, archivos de entorno e
historial de commits.
**Metodología:** OWASP Top 10 (2021) + ASVS L2 aplicado al stack detectado.
Análisis estático y de configuración; **no** se ejecutó tráfico contra ninguna
instancia (ver §6, "Qué requiere un pentest formal").

---

## 0. Resumen ejecutivo

El stack es **Next.js 16.2.9 (App Router) + tRPC v11 + Prisma 6 + PostgreSQL +
Auth.js v5 (beta) + MinIO/S3**, con arquitectura hexagonal y multi-inquilino.

**La postura de seguridad del código propio es notablemente buena.** El
aislamiento entre consultorios es _fail-closed_ por diseño (extensión de Prisma
que exige alcance de inquilino, `PrismaClienteSingleton.ts:98-131`), la
autorización está centralizada y testeada (`politicaAcceso.ts`, los cuatro
niveles de procedimiento en `trpc.ts:99-142`), los tokens de recuperación se
guardan hasheados, los tokens OAuth se cifran con AES-256-GCM, el webhook de
WhatsApp valida HMAC con `timingSafeEqual`, el flujo OAuth de Google tiene
`state` anti-CSRF en cookie `httpOnly`, y no hay una sola consulta SQL cruda
construida con concatenación. Nada de esto es habitual y conviene no romperlo.

**El riesgo real está concentrado en tres lugares que no son el código de
negocio:** (1) el árbol de dependencias, que hoy arrastra CVEs críticos en la
capa de autenticación misma; (2) la configuración de despliegue —cabeceras,
imagen Docker, credenciales de MinIO, respaldos, app móvil—; y (3) el ciclo de
vida de la sesión, que hoy no se puede revocar.

| Severidad  | Cantidad |
| ---------- | -------- |
| 🔴 Crítica | 2        |
| 🟠 Alta    | 6        |
| 🟡 Media   | 8        |
| 🟢 Baja    | 7        |

**Buena noticia sobre secretos:** el historial completo de Git está limpio.
`git log --all --diff-filter=A` no muestra ningún `.env` real, `.pem` ni `.key`
commiteado, y el barrido de patrones (`GOCSPX-`, `AKIA…`, `sk-ant-…`, bloques
`PRIVATE KEY`) sobre todos los diffs devuelve **0 coincidencias**. El
`.gitignore` cubre correctamente `.env`, `.env.produccion` y `.env.staging`.
Ver §1.C sobre el `.env` local no versionado.

---

## 1. Tabla de vulnerabilidades

> Ordenadas por explotabilidad × impacto. "Ubicación" es ruta:línea sobre el
> commit auditado.

### 🔴 Críticas

| #      | Hallazgo                                                                                                                                                                                                                                                                                                    | Severidad  | Ubicación                                                                                                                                                                                        | Cómo se explota (conceptual)                                                                                                                                                                                                                                                                                                                             | Cómo se remedia                                                                                                                                                                                                                        |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | **Auth.js con CVE de _fail open_.** `next-auth@5.0.0-beta.31` / `@auth/core` tienen avisos críticos, entre ellos _"Configuration errors can cause existence-based auth checks to fail open (auth object populated with an error)"_. **Toda** la app decide el acceso con chequeos exactamente de esa forma. | 🔴 Crítica | `package.json:47`; `src/proxy.ts:12-14`; `src/lib/autenticacion/auth.config.ts:52-64` (`!!auth?.user`); `src/servidor/alcanceRequest.ts:20`; los 6 route handlers que hacen `if (!sesion?.user)` | Si el atacante consigue que la resolución de sesión entre en el camino de error (petición malformada, cabecera `Authorization` inválida, error de configuración transitorio), el objeto `auth` viene poblado pero sin usuario válido y el chequeo de existencia puede dar por bueno el acceso. El resultado es lectura de historias clínicas sin sesión. | Actualizar `next-auth`/`@auth/core` a la versión parcheada **de inmediato**. Además, salir de `beta` en cuanto haya estable. Endurecer los chequeos para que validen forma (`sesion.user.id && sesion.user.rol`) y no mera existencia. |
| **C2** | **Next.js 16.2.9 con bypass de middleware/proxy en App Router**, más DoS en Server Actions, SSRF en rewrites y _"Unauthenticated disclosure of internal Server Function endpoints"_. `src/proxy.ts` es la **única** barrera que protege `/dashboard/*`, `/admin/*`, `/mi-*` y `/mis-*`.                     | 🔴 Crítica | `package.json:44`; `src/proxy.ts:16-19`                                                                                                                                                          | Una petición construida para evadir el matcher del proxy alcanza páginas del dashboard sin sesión. El daño está acotado porque los **datos** viajan por tRPC (que re-verifica en `trpc.ts:103-116`), pero se filtra estructura, y las variantes de SSRF/divulgación de endpoints internos son directas.                                                  | Actualizar Next.js a la última 16.x parcheada. Como defensa en profundidad, no depender del proxy como único control: los layouts de `/dashboard` y `/admin` deberían verificar rol en servidor.                                       |

### 🟠 Altas

| #      | Hallazgo                                                                                                                                                                                                                                                                                                                     | Severidad | Ubicación                                                                                                                                                                                                                                                     | Cómo se explota (conceptual)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Cómo se remedia                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | **Las sesiones no se pueden revocar.** Estrategia JWT sin `session.maxAge` (default de Auth.js: **30 días**) y el callback `jwt` solo lee de la base en el login. Desactivar una cuenta o cambiarle el rol **no expulsa** las sesiones vivas.                                                                                | 🟠 Alta   | `src/lib/autenticacion/auth.config.ts:17-19` (sin `maxAge`), `:25-38` (el callback nunca re-consulta); `src/dominio/casos-de-uso/superadmin/CambiarEstadoNutricionista.ts:12-18`; `src/lib/autenticacion/auth.ts:68` (solo valida `activo` al iniciar sesión) | Un nutricionista dado de baja (contrato terminado, cuenta comprometida, empleado despedido) conserva acceso completo a todas las historias clínicas de su consultorio hasta **30 días**. El SUPERADMIN cree que lo cortó y no lo cortó. No hay ningún mecanismo de "cerrar todas las sesiones".                                                                                                                                                                                                 | Fijar `session.maxAge` a 8–12 h con `updateAge` corto. En el callback `jwt`, re-validar contra la base cada N minutos (`activo`, `rol`, `nutricionistaId`) y devolver `null` si el usuario dejó de estar activo. Alternativa robusta: `strategy: "database"` con el `PrismaAdapter` que ya está instalado. Sumar una columna `sesionesInvalidasAntesDe` y compararla contra el `iat` del token. |
| **A2** | **App Android configurada contra un servidor de desarrollo, en texto plano.** `server.url` apunta a una IP LAN por HTTP y `cleartext: true` habilita tráfico no cifrado.                                                                                                                                                     | 🟠 Alta   | `capacitor.config.json:5-9`                                                                                                                                                                                                                                   | Cualquier build generado desde este archivo habla HTTP: la cookie de sesión, las credenciales del login y los datos clínicos viajan sin TLS y son legibles/modificables por cualquiera en la misma red (café, hospital, hotel). Si el APK se distribuye así, además apunta a una IP privada que en otra red pertenece a un tercero.                                                                                                                                                             | Quitar `server.url` y `cleartext` del archivo versionado; dejarlos solo en un override local de desarrollo. En release, servir siempre `https://` con el dominio real, y añadir un `network_security_config.xml` que prohíba cleartext. Evaluar _certificate pinning_ dado que son datos de salud.                                                                                              |
| **A3** | **Sin cabeceras de seguridad en la aplicación. CSP inexistente en todo el proyecto.** `next.config.ts` no define `headers()`. Las únicas cabeceras (`HSTS`, `nosniff`, `X-Frame-Options`) están en un archivo de nginx que es un **ejemplo opcional** y que igual no incluye CSP, `Referrer-Policy` ni `Permissions-Policy`. | 🟠 Alta   | `next.config.ts` (completo — no hay `headers()`); `docs/nginx.conf.ejemplo:41-44`                                                                                                                                                                             | Cualquier XSS que aparezca (ver A5, B3) se ejecuta sin ninguna contención. Un despliegue que no use ese nginx —Docker directo, el WebView de Android, staging— corre **sin ninguna cabecera de seguridad**. Sin `Referrer-Policy`, el token del enlace de recuperación (`/restablecer?token=…`) se filtra en el `Referer` hacia cualquier recurso externo que cargue esa página.                                                                                                                | Definir `async headers()` en `next.config.ts` (viaja con la app, no depende del proxy): CSP estricta con nonces, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy` restrictiva, HSTS. Mantener las de nginx como segunda capa.                                                                               |
| **A4** | **Credenciales por defecto en el seed, e impresas en el log.** SUPERADMIN `admin@demo.com` / `cambiar123` y NUTRICIONISTA `nutricionista@demo.com` / `cambiar123` si no se definen las variables. La contraseña se escribe en stdout.                                                                                        | 🟠 Alta   | `prisma/seed.ts:29-30`, `:59`, `:63-64`, `:97`                                                                                                                                                                                                                | `npm run db:seed` corrido en el VPS sin `SUPERADMIN_PASSWORD` crea la cuenta de mayor privilegio del sistema —la que gestiona **todos** los consultorios— con una contraseña pública y adivinable, sin ningún aviso. Además queda registrada en claro en los logs de Docker, que se rotan y respaldan.                                                                                                                                                                                          | Que el seed **falle** si las variables no están definidas en `NODE_ENV=production`, en vez de usar un default. Nunca imprimir la contraseña (imprimir solo el email). Verificar en la instancia actual si existe `admin@demo.com` y rotar/eliminar.                                                                                                                                             |
| **A5** | **El MIME se toma del cliente y nunca se verifica contra el contenido; el archivo se devuelve _inline_ en el mismo origen.** La lista blanca valida el string declarado, no los bytes.                                                                                                                                       | 🟠 Alta   | `src/app/api/archivos/route.ts:38` (`mimeType: archivo.type`); `src/dominio/entidades/Archivo.ts:119` (valida el declarado); `src/app/api/archivos/[id]/ver/route.ts:58-68` (sirve con ese MIME, `inline`, mismo origen, **sin `nosniff` propio**)            | El paciente sube contenido arbitrario declarándolo `image/png` (la lista blanca lo acepta) y luego lo abre en `/api/archivos/[id]/ver`, que lo sirve _inline_ desde el origen de la app. Si el despliegue no tiene `nosniff` —Docker sin el nginx de ejemplo, o el WebView de Android—, el navegador esnifa el contenido y ejecuta HTML/JS con la sesión del visor. La víctima natural es el nutricionista abriendo el adjunto del paciente: XSS almacenado que compromete todo el consultorio. | Verificar los _magic bytes_ del contenido en el servidor y rechazar si no coinciden con el MIME declarado. Servir **siempre** desde el handler `X-Content-Type-Options: nosniff` y `Content-Security-Policy: sandbox`. Considerar re-codificar las imágenes al recibirlas. Servir los adjuntos de usuario desde un subdominio aislado.                                                          |
| **A6** | **Los respaldos de la base clínica salen del perímetro sin cifrar.** `pg_dump` en claro subido a un bucket de un tercero (OVH), junto con un espejo completo del bucket de archivos.                                                                                                                                         | 🟠 Alta   | `respaldos/respaldo.sh:14`, `:22`, `:27`; `docker-compose.prod.yml:188-215`                                                                                                                                                                                   | El volcado contiene historias clínicas, laboratorios, antropometrías, mensajes y datos de contacto de todos los pacientes de todos los consultorios, en texto plano. Quien acceda al bucket OVH —credencial filtrada, error de política, incidente del proveedor— obtiene la base entera sin tocar la aplicación. Es también el punto débil frente a normativa de datos de salud.                                                                                                               | Cifrar el volcado **antes** de subirlo (`gpg --encrypt` con clave pública, o `age`), guardando la clave privada fuera del VPS. Habilitar cifrado en reposo y versionado con bloqueo en el bucket destino. Usar credenciales OVH con permiso de solo escritura (sin borrado ni lectura) para el contenedor de respaldo. Probar la restauración periódicamente.                                   |

### 🟡 Medias

| #      | Hallazgo                                                                                                                                                                                                   | Severidad | Ubicación                                                                                                                                                                                                                                                                                                                                                   | Cómo se explota (conceptual)                                                                                                                                                                                                                                                                                                                                                                                                                                                | Cómo se remedia                                                                                                                                                                                                                                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **M1** | **El límite de intentos por IP se evade con una cabecera.** `ipDeSolicitud` toma el **primer** elemento de `X-Forwarded-For`, que es la parte que pone el cliente.                                         | 🟡 Media  | `src/lib/autenticacion/auth.ts:12-16`, `:51`, `:57-62`; `docs/nginx.conf.ejemplo:63`, `:77` (`$proxy_add_x_forwarded_for` **añade** al valor recibido)                                                                                                                                                                                                      | El atacante manda `X-Forwarded-For: <aleatorio>` en cada intento: nginx lo antepone y la app lo lee como IP de origen, así que cada intento cae en un contador distinto. El bloqueo por IP nunca se dispara. Queda el límite por email, que no frena el _password spraying_ (una contraseña común contra muchas cuentas).                                                                                                                                                   | Con nginx delante, usar `$remote_addr` como fuente de verdad: `proxy_set_header X-Real-IP $remote_addr` ya está — leerlo **primero** (no como fallback) o, mejor, tomar el **último** elemento de `X-Forwarded-For`. Sumar un límite global de fallos por ventana, independiente de la clave.                                       |
| **M2** | **IDOR de escritura en la subida de archivos.** El campo `pacienteId` del formulario se usa como dueño sin verificar que el que sube tenga relación con ese paciente.                                      | 🟡 Media  | `src/app/api/archivos/route.ts:42`, `:51-56` (solo valida el _contexto_ para no-nutricionistas), `:67`; `src/infraestructura/repositorios/PrismaRepositorioArchivo.ts:19`; `prisma/schema.prisma:713` (la FK apunta a `pacientes(id)`, **no** a la única compuesta `(nutricionistaId, id)` que sí existe en `27_integridad_modelo_datos/migration.sql:573`) | Un paciente sube una "foto-comida" enviando el `pacienteId` de **otro** paciente: el archivo queda colgado de la ficha ajena y aparece en la vista que el nutricionista tiene de esa persona. Sirve para inyectar contenido en una historia clínica que no es la propia (falseo de registro, señuelo para el ataque de A5). Como la FK no es compuesta, el `pacienteId` puede incluso ser de otro consultorio, aunque el filtro de inquilino impide leerlo de vuelta.       | Cuando el rol no es `NUTRICIONISTA`, ignorar el `pacienteId` del formulario y usar `sesion.user.pacienteId`. Cuando sí lo es, verificar que el paciente pertenezca a su inquilino. Migrar la FK de `archivos.pacienteId` a la compuesta `(nutricionistaId, pacienteId)`, igual que ya se hizo con otras tablas en la migración 27.  |
| **M3** | **Recuperación de contraseña sin límite de tasa.** Procedimiento público que dispara un email por invocación.                                                                                              | 🟡 Media  | `src/servidor/routers/autenticacion.ts:18-24`; `src/dominio/casos-de-uso/autenticacion/SolicitarRecuperacionPassword.ts:38-68` (`limitadorLogin` no se usa acá)                                                                                                                                                                                             | Miles de peticiones con el email de la víctima la inundan de correos (acoso, o tapadera para esconder un email legítimo). En paralelo agota la cuota SMTP y puede hacer que el dominio caiga en listas negras, rompiendo _todos_ los emails de la app. La lógica de "no revelar la cuenta" es correcta, pero la diferencia de tiempo entre el camino con usuario (2 escrituras + envío SMTP) y sin usuario (retorno inmediato) permite enumerar cuentas por temporización.  | Aplicar `LimitadorIntentos` por email y por IP también en este endpoint. Encolar el envío en pg-boss (ya está disponible) para que el tiempo de respuesta sea constante independientemente de si el usuario existe.                                                                                                                 |
| **M4** | **`/api/monitoreo` acepta ingesta anónima sin límite.** Endpoint público, sin sesión ni límite de tasa, que reenvía a un webhook externo.                                                                  | 🟡 Media  | `src/app/api/monitoreo/route.ts:14-38`; `src/infraestructura/monitoreo/MonitorErroresWebhook.ts:44-50`                                                                                                                                                                                                                                                      | Cualquiera en internet inyecta errores falsos: ahoga el canal de Slack/Discord del profesional (las alertas reales se pierden entre el ruido), agota la cuota del webhook, y el texto controlado por el atacante se renderiza en ese canal. El límite de 8 KB acota el tamaño de cada mensaje, no el volumen.                                                                                                                                                               | Limitar por IP (p. ej. 10/min). Descartar payloads sin sesión o firmarlos desde el cliente. Filtrar el texto antes de mandarlo al webhook (Slack/Discord interpretan markdown y menciones).                                                                                                                                         |
| **M5** | **`.dockerignore` no excluye `.env.produccion` ni `.env.staging`.** El patrón `.env` de Docker coincide solo con el archivo exacto; el stage `build` hace `COPY . .`.                                      | 🟡 Media  | `.dockerignore:9-11`; `Dockerfile:28`; `docker-compose.prod.yml:12-13` (documenta que esos archivos viven en el directorio del proyecto, que **es** el contexto de build)                                                                                                                                                                                   | En el VPS, `docker compose --env-file .env.produccion … up --build` hornea el archivo con `AUTH_SECRET`, `TOKENS_SECRET`, `DATABASE_URL`, `GOOGLE_CLIENT_SECRET` y las claves S3 dentro de una capa de la imagen intermedia. Cualquiera con acceso al daemon Docker, o al registry si alguna vez se publica, extrae la capa y lee todos los secretos de producción.                                                                                                         | Agregar `.env*` a `.dockerignore` con `!*.example` explícito. Verificar las imágenes ya construidas (`docker history` / `dive`) y reconstruir. Si aparecieron, rotar todos los secretos afectados.                                                                                                                                  |
| **M6** | **La aplicación usa las credenciales _root_ de MinIO.** `S3_ACCESS_KEY`/`S3_SECRET_KEY` son a la vez `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`.                                                              | 🟡 Media  | `docker-compose.prod.yml:29-34`, `:80-81`, `:96-97`, `:198-199`; `src/infraestructura/almacenamiento/AlmacenamientoMinIO.ts:29-33`, `:103-110` (el código llega a crear buckets)                                                                                                                                                                            | Un RCE o una SSRF en la app no se queda en "leer los archivos del consultorio": entrega administración total del almacenamiento —crear, borrar y reconfigurar buckets, incluido el que espeja los respaldos. No hay separación de privilegios entre la app, el creador de buckets y el proceso de respaldo, que hoy comparten la misma credencial omnipotente.                                                                                                              | Crear una service account de MinIO por consumidor, con política mínima (`s3:GetObject`/`PutObject`/`DeleteObject` sobre el prefijo del bucket) y dejar la root solo para administración manual. Quitar `asegurarBucket()` del camino de producción (el servicio `crear_bucket` ya lo hace).                                         |
| **M7** | **Endpoints de IA sin cuota, y superficie de _prompt injection_.** Cualquier paciente autenticado invoca al LLM sin límite; el asistente analítico del nutricionista consume datos escritos por pacientes. | 🟡 Media  | `src/servidor/routers/ia.ts:11-27` (paciente, sin límite), `:45-49` (`analizar`, con herramientas sobre la base); `src/infraestructura/ia/herramientas.ts:6-19`                                                                                                                                                                                             | Coste: un paciente en bucle dispara facturación ilimitada contra `ANTHROPIC_API_KEY`, que es del profesional. Inyección: el paciente escribe instrucciones en el texto libre de su diario o en una descripción de comida; cuando el nutricionista usa el asistente analítico —que tiene herramientas de consulta sobre la base—, el modelo lee ese texto como si fuera instrucción y puede ser dirigido a consultar y resumir datos de **otros** pacientes en la respuesta. | Cuota por paciente y por consultorio (diaria y mensual), con corte duro. En el asistente analítico, delimitar explícitamente los datos del paciente como contenido no confiable en el prompt, y que las herramientas apliquen ellas mismas el filtro de paciente/inquilino en vez de confiar en los argumentos que elige el modelo. |
| **M8** | **Limitador de intentos solo en memoria del proceso.** Se pierde al reiniciar y no se comparte entre instancias.                                                                                           | 🟡 Media  | `src/infraestructura/seguridad/LimitadorIntentos.ts:20-28`, `:85` (comentario que asume un único proceso Node)                                                                                                                                                                                                                                              | Un reinicio —despliegue, healthcheck fallido, OOM— borra todos los contadores; forzar reinicios es una forma de resetear el bloqueo. Y en cuanto se escale a más de una réplica (o se agregue el worker al camino HTTP), cada proceso cuenta por separado y el límite efectivo se multiplica. Ya identificado como R9 en la auditoría de arquitectura.                                                                                                                      | Mover el estado a PostgreSQL (ya es dependencia dura) o a Redis. Como mínimo, sumar `limit_req` en nginx para `/api/auth/*` y `/api/trpc/*`, que sobrevive a los reinicios de la app.                                                                                                                                               |

### 🟢 Bajas

| #      | Hallazgo                                                                                                                                            | Severidad | Ubicación                                                                                                                                                                                                          | Cómo se explota (conceptual)                                                                                                                                                                                                                                                                                | Cómo se remedia                                                                                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B1** | Política de contraseñas débil: mínimo **6** caracteres al restablecer y **8** al crear cuenta; sin complejidad ni verificación contra filtraciones. | 🟢 Baja   | `src/aplicacion/dtos/autenticacion.dto.ts:19`; `src/aplicacion/dtos/superadmin.dto.ts:7`                                                                                                                           | Un usuario elige `123456`; combinado con M1 (límite por IP evadible) el ataque por diccionario contra cuentas conocidas es viable. Además el mínimo del reset es _más laxo_ que el del alta, así que el reset degrada la política.                                                                          | Unificar en 12 caracteres mínimo, medir entropía (zxcvbn) y contrastar contra la lista de contraseñas filtradas (k-anonymity de HIBP). Considerar 2FA para el rol SUPERADMIN.                                                              |
| **B2** | `bcryptjs` (implementación en JS puro) con **10** rondas.                                                                                           | 🟢 Baja   | `src/infraestructura/seguridad/BcryptHasheador.ts:9`; `prisma/seed.ts:39`                                                                                                                                          | 10 rondas está por debajo de la recomendación actual (12+) frente a GPU. Y `bcryptjs` es varias veces más lento que el binding nativo, lo que agrava el consumo de CPU por verificación como vector de DoS — hoy mitigado por el limitador, que a su vez tiene M1 y M8.                                     | Subir a 12 rondas con re-hash transparente en el próximo login exitoso. Evaluar `argon2id`, o `bcrypt` nativo si se mantiene bcrypt.                                                                                                       |
| **B3** | `dangerouslySetInnerHTML` sobre plantillas, e interpolación de variables sin escapar en el HTML de los emails.                                      | 🟢 Baja   | `src/componentes/recordatorios/PlantillaEmailRecordatorio.tsx:74`; `src/componentes/secretaria/FormularioPlantilla.tsx:203-206`; `src/dominio/plantillas/renderizar.ts:14-19`; `src/lib/plantillaPreview.ts:17-25` | El HTML lo escribe el propio profesional, así que es self-XSS en el caso base. Lo que sí cruza confianza es la sustitución: `{{paciente}}` inserta el nombre del paciente en el HTML **sin escapar**, y ese HTML se envía por email a terceros. Con CSP ausente (A3), un XSS acá se ejecuta sin contención. | Sanitizar el HTML de la plantilla antes de renderizarlo (DOMPurify) y escapar las entidades HTML en los valores sustituidos por `renderizarPlantilla`.                                                                                     |
| **B4** | `X-Powered-By: Next.js` expuesto (`poweredByHeader` no está en `false`).                                                                            | 🟢 Baja   | `next.config.ts` (no lo declara)                                                                                                                                                                                   | Le confirma al atacante el framework y facilita elegir exploits — relevante justo por C2.                                                                                                                                                                                                                   | `poweredByHeader: false` en `next.config.ts`.                                                                                                                                                                                              |
| **B5** | Acciones de GitHub referenciadas por tag mutable, no por SHA.                                                                                       | 🟢 Baja   | `.github/workflows/ci.yml:44`, `:46`, `:79`; `.github/workflows/deploy.yml:26` (`appleboy/ssh-action@v1`)                                                                                                          | Si la cuenta de un mantenedor se compromete y re-etiqueta `v1`, el siguiente despliegue ejecuta código arbitrario **con la clave SSH del VPS de producción** (`secrets.VPS_SSH_KEY`). El workflow de deploy es el objetivo de mayor valor del repositorio.                                                  | Fijar cada acción a su SHA completo (`uses: appleboy/ssh-action@<sha>`). Activar Dependabot para actualizarlos. Limitar `permissions:` a lo mínimo en ambos workflows.                                                                     |
| **B6** | La CI no audita dependencias, no escanea secretos y no corre SAST.                                                                                  | 🟢 Baja   | `.github/workflows/ci.yml:43-88` (typecheck, tests y build únicamente)                                                                                                                                             | Es la razón por la que C1 y C2 llegaron a la rama sin que nadie se enterara: hay 20 avisos abiertos, 4 críticos, y ningún control automático los ve.                                                                                                                                                        | Ver §3, "Recomendaciones de proceso".                                                                                                                                                                                                      |
| **B7** | Sin registro de auditoría de accesos a datos clínicos.                                                                                              | 🟢 Baja   | (ausencia) — no existe modelo de auditoría en `prisma/schema.prisma`                                                                                                                                               | Ante un acceso indebido (A1: cuenta desactivada que sigue viva; secretaria curiosa; credencial robada) no hay forma de reconstruir **quién** leyó **qué** historia clínica **cuándo**. Es un requisito habitual de la normativa de datos de salud y un impedimento para responder a incidentes.             | Tabla de auditoría append-only con `usuarioId`, `nutricionistaId`, acción, entidad, id y timestamp, escrita desde un middleware de tRPC (el punto único ya existe en `trpc.ts:60`). Retención definida y separada de los datos operativos. |

### C. Nota sobre secretos (sin exponer valores)

- **Historial de Git: limpio.** Sin `.env` reales, `.pem`, `.key` ni credenciales
  en ningún commit alcanzable. El `.gitignore` es correcto.
- **`.env` local (no versionado, presente en el árbol de trabajo):** contiene
  valores que **aparentan ser reales, no placeholders**, por longitud y formato,
  en al menos: `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, `AUTH_SECRET`,
  `TOKENS_SECRET`, `S3_SECRET_KEY`, `POSTGRES_PASSWORD` y `DATABASE_URL`
  (`.env`, líneas aproximadas 5–35). No se transcribe ningún valor.
  **Acción recomendada:** confirmar que ese archivo nunca se compartió por chat,
  captura ni copia de proyecto; si hay la menor duda, **rotar el client secret de
  Google, las claves S3 y la contraseña de Postgres**, y regenerar `AUTH_SECRET`
  y `TOKENS_SECRET`. Advertencia sobre el costo: rotar `TOKENS_SECRET` invalida
  los tokens OAuth ya cifrados en base (hay que reconectar Google) y rotar
  `AUTH_SECRET` cierra todas las sesiones — que, dado A1, es deseable igual.
- **`SEED_PASSWORD` está definido en el `.env` local con un valor corto** — ver
  A4: si ese `.env` se usó alguna vez contra la base de producción, verificar la
  cuenta correspondiente.

### D. Dependencias vulnerables (`npm audit`, al 2026-08-29)

**20 avisos: 4 críticos · 9 altos · 7 moderados.**

| Paquete                                              | Sev.        | Resumen del riesgo en este proyecto                                                                                                                                                                           |
| ---------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next-auth` / `@auth/core`                           | 🔴 crítica  | Fail-open en chequeos de existencia (**C1**); bypass por homoglifo en normalización de email; excepción no capturada con `Authorization` malformado; cookies de `state`/`nonce`/PKCE no ligadas al proveedor. |
| `vitest` / `@vitest/mocker`                          | 🔴 crítica  | Lectura y ejecución de archivos arbitrarios con la UI de Vitest escuchando. Solo desarrollo/CI, pero afecta a la máquina del desarrollador.                                                                   |
| `next`                                               | 🟠 alta     | Bypass de middleware/proxy (**C2**), SSRF en rewrites y en Server Actions, DoS, divulgación de Server Functions internas, confusión de caché.                                                                 |
| `nodemailer`                                         | 🟠 alta     | Inyección de comandos SMTP y CRLF en cabeceras; validación TLS incorrecta al pedir tokens OAuth2; lectura de archivos arbitrarios vía `raw`. Se usa para todos los emails del sistema.                        |
| `postcss`                                            | 🟠 alta     | XSS por `</style>` sin escapar; lectura de archivos vía `sourceMappingURL`. Cadena de build.                                                                                                                  |
| `vite`, `esbuild`                                    | 🟠 alta     | Path traversal y servidor de desarrollo abierto a cualquier sitio web. Solo desarrollo.                                                                                                                       |
| `sharp` (libvips)                                    | 🟠 alta     | CVE-2026-33327/33328/35590/35591 al procesar imágenes — relevante porque la app recibe imágenes subidas por pacientes.                                                                                        |
| `nanoid`, `deepmerge-ts`, `@prisma/config`, `prisma` | 🟠 alta     | DoS por bucle infinito / agotamiento de pila.                                                                                                                                                                 |
| `uuid`, `exceljs`, `xcode`, `@capacitor/cli`         | 🟡 moderada | Falta de control de límites en buffer; transitivas.                                                                                                                                                           |

> `exceljs` merece atención específica: procesa planillas subidas por el
> profesional en `/api/alimentos/importar` y `/api/metricas/importar`.

---

## 2. Checklist de hardening aplicable de inmediato

### Hoy (bloqueantes antes del próximo despliegue)

- [ ] `npm update next next-auth @auth/core nodemailer` y verificar con
      `npm audit` que C1, C2 y los avisos de `nodemailer` quedan cerrados.
      Correr la suite completa después (452 casos en verde es el criterio).
- [ ] Quitar `server.url` y `cleartext` de `capacitor.config.json`; regenerar
      cualquier APK ya distribuido. **(A2)**
- [ ] Añadir `.env*` con `!*.example` a `.dockerignore`; reconstruir las
      imágenes de producción. **(M5)**
- [ ] Verificar si existe la cuenta `admin@demo.com` en producción. Si existe,
      rotar su contraseña o eliminarla. **(A4)**
- [ ] Confirmar el destino del `.env` local; rotar lo que corresponda (§1.C).

### Esta semana

- [ ] `session: { strategy: "jwt", maxAge: 8*60*60, updateAge: 15*60 }` y
      re-validación del usuario en el callback `jwt`. **(A1)**
- [ ] `async headers()` en `next.config.ts` con CSP, `Referrer-Policy`,
      `nosniff`, `X-Frame-Options: DENY`, `Permissions-Policy`, HSTS.
      `poweredByHeader: false`. **(A3, B4)**
- [ ] Que el seed falle sin variables de entorno en producción, y dejar de
      imprimir contraseñas. **(A4)**
- [ ] Ignorar el `pacienteId` del formulario cuando el rol no es nutricionista
      en `/api/archivos`. **(M2)**
- [ ] Leer la IP de `X-Real-IP` (o el último elemento de `X-Forwarded-For`) en
      `ipDeSolicitud`. **(M1)**
- [ ] `LimitadorIntentos` en `solicitarRecuperacion` y en `/api/monitoreo`.
      **(M3, M4)**
- [ ] `limit_req` en nginx para `/api/auth/*`, `/api/trpc/*` y `/api/monitoreo`.
      **(M8)**
- [ ] Fijar las acciones de GitHub por SHA y acotar `permissions:`. **(B5)**

### Este mes

- [ ] Verificación de _magic bytes_ en la subida + `nosniff` y CSP `sandbox` en
      el handler `/ver`. **(A5)**
- [ ] Cifrar los respaldos antes de subirlos; credencial OVH de solo escritura;
      probar una restauración completa. **(A6)**
- [ ] Service accounts de MinIO con política mínima, root solo administrativa.
      **(M6)**
- [ ] Cuotas de IA por paciente y por consultorio; delimitar el contenido no
      confiable en el prompt del asistente analítico. **(M7)**
- [ ] Estado del limitador en PostgreSQL. **(M8)**
- [ ] Política de contraseñas a 12 caracteres con contraste contra filtraciones;
      bcrypt a 12 rondas con re-hash transparente. **(B1, B2)**
- [ ] Sanitizar el HTML de plantillas y escapar las variables sustituidas.
      **(B3)**
- [ ] FK compuesta `(nutricionistaId, pacienteId)` en `archivos`, siguiendo el
      patrón de la migración 27. **(M2)**
- [ ] Tabla de auditoría de accesos a datos clínicos. **(B7)**
- [ ] 2FA (TOTP) para SUPERADMIN, y luego para NUTRICIONISTA. **(B1)**

---

## 3. Recomendaciones de proceso

### Rotación de secretos

1. **Inventario.** Un solo lugar que liste cada secreto, dónde vive, quién lo
   usa y cuándo se rotó por última vez. Hoy están repartidos entre `.env`
   locales, el `.env.produccion` del VPS y los secrets de GitHub Actions, sin
   registro de rotaciones.
2. **Calendario.** `AUTH_SECRET` y `TOKENS_SECRET` cada 6–12 meses; claves S3 y
   credenciales OVH cada 6 meses; `VPS_SSH_KEY` cada 6 meses; secretos de
   Google y Anthropic al ritmo del proveedor. **Rotación inmediata** ante
   cualquier sospecha o salida de una persona del proyecto.
3. **Documentar el costo de cada rotación** —rotar `TOKENS_SECRET` obliga a
   reconectar Google; rotar `AUTH_SECRET` cierra todas las sesiones— para que la
   rotación no se postergue por miedo a romper algo.
4. **Sacar los secretos del sistema de archivos del VPS** a mediano plazo
   (Docker secrets, o un gestor tipo Infisical/Vault). Hoy `.env.produccion` en
   texto plano en el disco es el punto único de compromiso total.

### Revisión de dependencias

1. **Dependabot** (o Renovate) con agrupado de parches y PRs automáticas para
   avisos de seguridad. El estado actual —4 críticos abiertos, uno de ellos en
   la biblioteca de autenticación— es exactamente lo que esto evita.
2. **`npm audit --audit-level=high` como paso obligatorio de la CI**, que rompa
   el build. Con una lista de excepciones **fechada y justificada** para lo que
   se decida aceptar (típicamente avisos que solo afectan a desarrollo, como
   `vitest`/`vite`).
3. **Salir de `next-auth@beta`** en cuanto haya estable: una beta en el control
   de acceso de una app de datos de salud es riesgo estructural, no coyuntural.
4. **Revisión trimestral del árbol transitivo** con `npm ls --all`, buscando
   paquetes sin mantenimiento (`xcode`, `exceljs`).

### Escaneo automatizado en CI

Sumar al workflow `ci.yml`, todos como pasos que **rompen el build**:

| Control      | Herramienta sugerida                                       | Qué atrapa                                       |
| ------------ | ---------------------------------------------------------- | ------------------------------------------------ |
| Dependencias | `npm audit --audit-level=high`                             | C1, C2, `nodemailer`                             |
| Secretos     | `gitleaks` (con `--log-opts` sobre todo el historial)      | Evita que se repita lo que hoy está bien         |
| SAST         | CodeQL (`javascript-typescript`, pack `security-extended`) | Inyección, XSS, path traversal, sinks peligrosos |
| Contenedores | `trivy image` sobre los stages `runner` y `worker`         | CVEs de la base `node:22-bookworm-slim`          |
| Cabeceras    | `zaproxy/action-baseline` contra el entorno de staging     | A3, cabeceras faltantes en el despliegue real    |

Además: activar **secret scanning** y **push protection** en GitHub, y proteger
`main` exigiendo CI en verde y revisión.

### Higiene continua

- **Tests de autorización como regresión.** `politicaAcceso.test.ts` y
  `trpc.test.ts` son el modelo correcto. Falta cubrir con la misma disciplina
  los **route handlers** de `/api/*`, que hoy concentran M2 y A5 y no tienen un
  solo test de autorización.
- **Regla de revisión:** todo procedimiento `protegidoProcedimiento` nuevo que
  reciba un `pacienteId` en el input debe pasar por `pacienteConsultable` o
  `pacienteDeSesion`. Es candidato a test de arquitectura, junto a los que ya
  existen en `src/arquitectura.test.ts`.
- **Registrar en `MODELOS_INQUILINO` cada tabla nueva con `nutricionistaId`**
  (ya señalado como R3 en la auditoría de arquitectura): un olvido ahí es una
  fuga entre consultorios.

---

## 4. Lo que está bien y conviene no romper

Vale dejarlo escrito, porque un refactor futuro puede deshacerlo sin querer:

- **Aislamiento multi-inquilino _fail-closed_.** `PrismaClienteSingleton.ts:98-131`
  lanza si no hay alcance, en vez de devolver todo. `inquilino.ts:17-29` hace lo
  mismo en escrituras. Es la decisión de diseño más valiosa del repositorio.
- **Autorización centralizada y testeada.** Cuatro niveles de procedimiento en
  `trpc.ts:99-142` y `politicaAcceso.ts` como regla de dominio verificable.
  Los procedimientos del portal toman el `pacienteId` **de la sesión, nunca del
  input** (`diario.ts:18-27`, `mensajeria.ts:60-69`, `metricas.ts:18-38`).
- **Saneamiento de errores.** `trpc.ts:60-93` reemplaza cualquier error
  inesperado por un mensaje genérico, evitando filtrar host y puerto de la base.
  `errores-http.ts:16-20` hace lo propio en los route handlers.
- **Recuperación de contraseña bien construida:** token de 256 bits, se persiste
  solo el SHA-256, un solo uso, vence en 1 hora, invalida los anteriores y no
  revela si la cuenta existe.
- **Criptografía correcta donde la hay:** AES-256-GCM con IV por mensaje para los
  tokens OAuth (`CifradorTokens.ts`), HMAC del cuerpo crudo con `timingSafeEqual`
  para el webhook de WhatsApp (`firmaWebhook.ts:13-24`), `state` anti-CSRF en
  cookie `httpOnly` para OAuth de Google.
- **Sin SQL crudo con concatenación** en toda la aplicación. Los únicos
  `$queryRawUnsafe` están en un script de verificación puntual, con SQL
  literal, fuera del camino de la app.
- **Docker sensato:** usuario sin privilegios en el `runner`, salida
  `standalone`, y Postgres y MinIO sin puertos publicados al exterior; la app
  solo escucha en `127.0.0.1`.

---

## 5. Priorización sugerida

```
Explotabilidad ▲
               │  C1 ●            C2 ●
          alta │        A4 ●   A2 ●
               │  M1 ●  M3 ●        A3 ●
               │  M4 ●     M2 ●         A5 ●
         media │  B1 ●  M7 ●     M5 ●      A6 ●
               │     B5 ●   M6 ●   M8 ●
          baja │  B4 ●  B2 ●  B3 ●   B6 ●  B7 ●
               └────────────────────────────────────►
                  bajo         medio         alto      Impacto
```

**Orden de trabajo:** C1 → C2 → A4 → A2 → M5 → A1 → A3 → M1/M2/M3/M4 → A5 → A6
→ M6/M7/M8 → bajas.

---

## 6. Qué requiere un pentest formal (y no revisión de código)

Los siguientes puntos **no se pueden cerrar leyendo el repositorio**. Se
recomienda una prueba de intrusión sobre el entorno de staging, con alcance
acordado por escrito y ventana definida:

1. **C1 y C2 — verificación de explotabilidad real.** Que exista el CVE no dice
   si esta configuración concreta es alcanzable. Confirmarlo (o descartarlo)
   requiere tráfico contra una instancia desplegada.
2. **Bypass del proxy de Next.js.** Las variantes de evasión del matcher
   (`src/proxy.ts:18`) dependen de la versión exacta, del runtime y de la
   normalización de rutas de nginx. Es una prueba empírica.
3. **A5 — comportamiento real de esnifado.** Si el navegador ejecuta el
   contenido depende del despliegue concreto, del `Content-Type` efectivo y —de
   forma distinta— del WebView de Android. Hay que probarlo en los tres.
4. **Aislamiento entre inquilinos bajo carga y concurrencia.** El
   `AsyncLocalStorage` propaga correctamente en la lectura del código; lo que no
   se puede verificar estáticamente es si bajo concurrencia alta, streams SSE de
   larga vida (`tiempoReal.ts:10-15`) o el pool de conexiones de Prisma, algún
   camino pierde el alcance y cruza datos entre consultorios. Es **el riesgo con
   mayor impacto del sistema** y merece una prueba dedicada.
5. **Superficie de la app Android.** Requiere análisis del APK: almacenamiento
   local de la sesión, exportación de componentes, WebView, _deep links_.
6. **Infraestructura del VPS.** Fuera del alcance del repositorio: superficie
   SSH, reglas de firewall, permisos del socket de Docker, TLS efectivo,
   endurecimiento de PostgreSQL y de MinIO en la instancia real.
7. **Prueba de restauración de respaldos.** Que el script corra no prueba que el
   volcado sea restaurable. Es un simulacro, no una revisión.

**Cumplimiento normativo:** esta auditoría es técnica. La app maneja datos de
salud identificables (historias clínicas, laboratorios, antropometría,
mensajería paciente-profesional), así que el tratamiento —bases de licitud,
consentimiento, plazos de retención, derechos de acceso y supresión, registro de
actividades, notificación de brechas— debería revisarse con asesoramiento legal
específico bajo la Ley 25.326 y su normativa vigente. **B7** (registro de
auditoría) y **A6** (respaldos sin cifrar) son los dos hallazgos con implicancia
normativa más directa.

---

_Documento generado por revisión estática. Ningún secreto fue transcrito: los
hallazgos de credenciales indican archivo, línea aproximada y tipo. No se
desarrolló ni ejecutó código de explotación._
