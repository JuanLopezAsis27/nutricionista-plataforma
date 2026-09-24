# Despliegue en producción (VPS OVH)

Guía completa para poner la app en producción en un VPS, con **staging en el
mismo servidor**, **HTTPS automático** y **backups offsite a OVH Object
Storage**. Al final explico cómo funciona el **worker**, los **backups** y el
flujo de **actualización**.

---

## 1. Arquitectura

La app y sus servicios corren en Docker en un solo VPS. **nginx** (en el HOST,
no en Docker) es el reverse proxy: termina TLS y proxea al puerto de la app,
que se publica **solo en localhost** (`127.0.0.1:3000`).

```
                Internet (443)
                     │
              ┌──────▼──────┐
              │    nginx    │   TLS con Let's Encrypt (certbot)
              │  (en host)  │   proxy_pass → 127.0.0.1:3000
              └──────┬──────┘
                     │  127.0.0.1:${APP_PORT}
              ┌──────▼──────┐
              │     app     │   Next.js (standalone), puerto solo en localhost
              └──────┬──────┘
   ┌─────────────────┼─────────────────────────────────────┐   (red interna del proyecto Docker)
   │  ┌────────┐ ┌────────┐ ┌────────┐ ┌──────────────┐     │
   │  │postgres│ │ worker │ │respaldo│ │ ml (perfil,  │ …   │
   │  └────────┘ └────────┘ └───┬────┘ │  opcional)   │     │
   │  ┌────────┐                 │     └──────────────┘     │
   │  │ minio  │◄── disco 2      │ offsite                  │
   │  └────────┘                 ▼                          │
   └────────────────────► OVH Object Storage (S3)
```

### nginx: seguridad y dos ajustes obligatorios

nginx (en el host) es **seguro y apropiado** para esta app (es de los proxies más
usados del mundo). Con TLS de Let's Encrypt el nivel de seguridad es el estándar.
Sólo hay **dos ajustes que NO podés omitir** (ya están en
[`nginx.conf.ejemplo`](nginx.conf.ejemplo)):

1. **SSE / tiempo real.** La app empuja notificaciones y mensajes en vivo por
   **SSE** (tRPC subscriptions sobre `/api/trpc`). nginx **bufea** las respuestas
   por defecto, lo que rompe el stream. Hay que poner `proxy_buffering off;` y un
   `proxy_read_timeout` largo en `location /api/trpc`.
2. **Tamaño de subida.** El default de nginx corta en **1 MB**; las subidas
   (recetas, labs, Excel de alimentos, PDF de plan, audio de consulta) necesitan
   `client_max_body_size 26m;` — por encima del tope más alto del módulo
   Archivos (25 MB), para que el rechazo lo dé la app y no un 413 de nginx.

**Discos** (según tu VPS):

- **Disco principal** → app + **PostgreSQL** (volúmenes Docker en `/var/lib/docker`).
- **Disco secundario** → **bucket MinIO** (fotos de recetas/labs, PDFs), montado
  con bind-mount en `RUTA_BUCKET`.

**ML** es un servicio **opcional del mismo stack** (perfil `ml`, no arranca
solo). Corre en la red interna del proyecto Docker, sin publicar puertos: la
app lo alcanza por `http://ml:8000`. Se conecta a Postgres con un rol de
**solo lectura** (`ml_lector`), separado del usuario de la app. Antes de
habilitarlo con `--profile ml`:

1. Verificá RAM libre en el VPS (`free -m`): el servicio pide ~300-500 MB.
2. Creá el rol de solo lectura: `scripts/crear-rol-ml.sql`.
3. Completá `DATABASE_URL_RO` y `ML_SERVICE_TOKEN` en el `.env`.
4. Agregá `--profile ml` a los perfiles del entorno en `desplegar.sh` y seteá
   `ML_SERVICE_URL=http://ml:8000`.

Si `ML_SERVICE_URL` queda vacía, la app usa los stubs de demostración y
funciona igual — no es un requisito para desplegar.

> Se descartó el plan anterior de correrlo en la nube (on-demand): exigía
> exponer la base fuera del VPS —abrir el 5432, montar una réplica en otro
> host o mantener un túnel— para un cómputo de microsegundos.

---

## 2. Requisitos del VPS

- Docker Engine + Docker Compose v2 (`docker compose version`).
- **nginx** en el host + **certbot** (`sudo apt install nginx certbot python3-certbot-nginx`).
- Puertos **80** y **443** abiertos (firewall/OVH).
- Un **dominio** con un registro DNS **A** → IP del VPS (y otro para `staging.`).
- El **disco secundario** montado (ver paso 3).
- Una cuenta de **OVH Object Storage** con un contenedor S3 y una clave S3
  (para los backups offsite).

Instalar Docker (Debian/Ubuntu):

```bash
curl -fsSL https://get.docker.com | sh
```

---

## 3. Preparar el disco secundario (bucket)

Averiguá el disco extra y montalo (ejemplo con `/dev/sdb`):

```bash
lsblk                                  # ver los discos
sudo mkfs.ext4 /dev/sdb                # SOLO si el disco está vacío
sudo mkdir -p /mnt/bucket
sudo mount /dev/sdb /mnt/bucket
# Montaje permanente (sobrevive reinicios):
echo "/dev/sdb  /mnt/bucket  ext4  defaults,nofail  0  2" | sudo tee -a /etc/fstab
sudo mkdir -p /mnt/bucket/minio
```

Después, en `.env.produccion` poné `RUTA_BUCKET=/mnt/bucket/minio`.

> Para mover el bucket a otro disco en el futuro: parás el stack, copiás
> `RUTA_BUCKET` al disco nuevo (`rsync -a`), cambiás `RUTA_BUCKET` y volvés a
> levantar. Los datos son archivos planos; no hay migración.

---

## 4. Primer despliegue (paso a paso)

```bash
# 1. Clonar el repo en el VPS
git clone <repo> nutricionista-app && cd nutricionista-app

# 2. Configurar entornos (copiar los .example y completar)
cp .env.produccion.example   .env.produccion     # todo lo de prod (¡secretos!)
cp .env.staging.example      .env.staging        # staging (opcional)

# 3. Desplegar producción (build + migraciones + arranque + respaldos)
#    La app queda escuchando SOLO en 127.0.0.1:${APP_PORT} (default 3000).
./scripts/desplegar.sh prod

# 4. Sembrar el SUPERADMIN y el primer profesional (SOLO la primera vez)
docker compose -p nutri_prod --env-file .env.produccion \
  -f docker-compose.prod.yml run --rm migrate npm run db:seed

# 5. Configurar nginx (en el host) + certificado TLS
sudo cp docs/nginx.conf.ejemplo /etc/nginx/sites-available/nutricionista
sudo sed -i 's/tudominio.com/TU_DOMINIO_REAL/g' /etc/nginx/sites-available/nutricionista
sudo ln -s /etc/nginx/sites-available/nutricionista /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d TU_DOMINIO_REAL          # emite y renueva el certificado
```

Verificá:

```bash
docker compose -p nutri_prod --env-file .env.produccion -f docker-compose.prod.yml ps     # todo "Up"/"healthy"
curl -I http://127.0.0.1:3000                                                             # la app responde en localhost
```

Entrá a `https://tudominio.com` (nginx + certbot ya resolvieron el certificado).

> **Staging con nginx:** publicá la app de staging en otro puerto de localhost
> (ej. `APP_PORT=3001` en `.env.staging`) y agregá un segundo `server {}` en
> nginx para `staging.tudominio.com` que proxee a `127.0.0.1:3001` (con el mismo
> bloque `/api/trpc` sin buffering).

**Secretos imprescindibles** en `.env.produccion`: `AUTH_SECRET`,
`POSTGRES_PASSWORD`, `S3_SECRET_KEY`, `TOKENS_SECRET`, credenciales SMTP y las
`OVH_S3_*`. Generá los secretos con `openssl rand -base64 32`.

---

## 5. Cómo funciona el worker

El **worker** es un proceso aparte de la app (mismo código, distinto rol; su
target en el `Dockerfile` es `worker`). Usa **pg-boss**, que guarda la cola de
trabajos **en la misma base PostgreSQL** (no hace falta Redis).

- La app **encola** trabajos (o hay **crons** que disparan solos).
- El worker los **ejecuta** llamando a los servicios de aplicación, igual que un
  router. Es multi-inquilino: itera cada nutricionista activo en su propio
  alcance.
- Trabajos que corre hoy:
  - **Recordatorios de turnos** (cron diario): email al paciente del turno del
    día siguiente, sin duplicar (idempotente).
  - **Alertas de seguimiento** (cron diario): detecta pacientes sin registro de
    peso, planes vencidos, etc., y avisa al profesional.
  - **Limpieza de archivos huérfanos** (semanal): borra del bucket lo que quedó
    sin dueño.
- **`TZ=America/Argentina/Buenos_Aires`** hace que los crons disparen en hora
  local del profesional (definido en el `.env`).

Ver los logs del worker:

```bash
docker compose -p nutri_prod --env-file .env.produccion -f docker-compose.prod.yml logs -f worker
```

Si el worker se cae, `restart: unless-stopped` lo reinicia; los trabajos quedan
persistidos en la base y se retoman.

---

## 6. Cómo funcionan los backups

El servicio **`respaldo`** (perfil `respaldos`, solo en prod) corre un
programador que hace **un respaldo diario** a la hora `HORA_RESPALDO` (local):

1. **`pg_dump`** de la base en formato _custom_ (comprimido, restaurable) →
   guarda en el volumen local `/respaldos/db` y lo **sube a OVH** (`db/`).
2. **Espeja el bucket** de archivos (MinIO → OVH, carpeta `bucket/`). Nunca
   borra del destino: una eliminación accidental en la app no destruye la copia.
3. **Retención**: borra los dumps más viejos que `RETENCION_DIAS` (local y en OVH).

**Un solo respaldo por día, no uno por deploy.** Al arrancar, el programador hace
un respaldo inicial (valida la configuración y cubre un contenedor nuevo), pero
solo si el último exitoso tiene más de `RESPALDO_INICIAL_MIN_HORAS` horas (20 por
defecto). El contenedor `respaldo` se recrea en **cada deploy a producción** —su
imagen lleva el SHA del commit— y con cada reinicio del VPS; sin ese chequeo cada
uno sumaba un respaldo completo más. "Exitoso" se mide con la marca
`/respaldos/.ultimo_exito` que `respaldo.sh` escribe recién al terminar (dump
subido a OVH), no con el dump del disco. En el primer arranque no hay marca y el
respaldo corre.

Así, si el VPS o el disco mueren, **la base y los archivos están fuera del
servidor** (en OVH). Además OVH ofrece _snapshots_ de disco como red extra.

**Correr un respaldo manual ahora:**

```bash
docker compose -p nutri_prod --env-file .env.produccion \
  -f docker-compose.prod.yml exec respaldo respaldo.sh
```

**Restaurar la base** (desde un dump):

```bash
# Si el dump está en OVH, bajalo primero al contenedor:
docker compose -p nutri_prod --env-file .env.produccion -f docker-compose.prod.yml exec respaldo sh -c \
  'mc alias set ovh "$OVH_S3_ENDPOINT" "$OVH_S3_ACCESS_KEY" "$OVH_S3_SECRET_KEY" && \
   mc cp ovh/$OVH_S3_BUCKET/db/nutricionista-AAAAMMDD-HHMMSS.dump /respaldos/db/'
# Restaurar:
docker compose -p nutri_prod --env-file .env.produccion -f docker-compose.prod.yml exec respaldo \
  restaurar-db.sh /respaldos/db/nutricionista-AAAAMMDD-HHMMSS.dump
```

Para restaurar el **bucket**, es un `mc mirror` de OVH → MinIO (inverso al del
respaldo). **Probá una restauración de vez en cuando**: un backup sin restore
probado no es un backup. Hacelo en el **VPS de staging** (§7), donde no arriesga
nada — pero leé antes la advertencia sobre los emails.

### El respaldo que no corre

El modo de falla que importa no es "el respaldo dio error", es "**el respaldo no
corrió**": un proceso muerto no reporta errores, así que vigilar fallos no lo
detecta nunca. Por eso `respaldo.sh` deja dos archivos de métricas en el
directorio del *textfile collector* de node_exporter (`RUTA_METRICAS` en el
`.env`, por defecto `/var/lib/node_exporter/textfile_collector`):

| Archivo                   | Cuándo se escribe                   | Para qué                                |
| ------------------------- | ----------------------------------- | --------------------------------------- |
| `respaldo_exito.prom`     | **sólo** al terminar bien           | Alertar por antigüedad del último éxito |
| `respaldo_resultado.prom` | en cada corrida (1 = ok, 0 = falló) | Ver si la última intentó y falló        |

`respaldo_exito.prom` **no se toca cuando el respaldo falla**, a propósito: así
conserva la fecha del último respaldo real, que es justo el dato que hace falta
para saber cuánto hace que no hay copia. La regla de alerta es:

```
time() - nutricionista_respaldo_ultimo_exito_timestamp > 26 * 3600
```

Si todavía no instalaste node_exporter, el respaldo funciona igual: si el
directorio no está montado, no se escribe nada y no falla nada.

### De dónde sale `mc`

La imagen de respaldos copia `mc` de **`quay.io/minio/mc`**, fijada al mismo
tag que usa `crear_bucket` (`respaldos/Dockerfile`). Antes lo descargaba de
`dl.min.io/client/mc/release/...`, una URL sin versión que MinIO retiró
(responde **410 Gone**): es el mismo retiro que ya había obligado a pasar
`minio/minio` de Docker Hub a quay.io.

No se rompió el día del retiro. Se rompió cuando cambió el digest de
`postgres:18` y el CI ya no tenía esa capa en caché: el job «Imágenes
(respaldo)» falló sin que nadie hubiera tocado `respaldos/`. **Al subir el tag
de `mc`, subilo en los dos lugares** —el Dockerfile y `crear_bucket` en
`docker-compose.prod.yml`—: los dos tienen que hablar la misma versión del
cliente.

---

## 7. Staging (VPS propio)

Staging corre en un **servidor separado** del de producción. Es el mismo
`docker-compose.prod.yml` con `.env.staging`, pero en su propia máquina: su
propia base, su propio bucket, su propio nginx.

> **Antes compartía VPS con producción.** Se separó porque un `--build` de
> staging competía por CPU y RAM con el Postgres de producción, y porque el
> stack de métricas necesita vivir fuera del host que vigila (si Prometheus
> corre en producción, se cae junto con lo que tiene que monitorear).

**Tamaño**: **4 GB de RAM**. El stack de la app pide ~1,5-2 GB y encima va el
monitoreo (Prometheus ~300-500 MB, Grafana ~150-250 MB). Con 2 GB no entra, y
ampliarlo después es migrar la máquina.

Como no comparte host, `APP_PORT` vuelve a ser `3000`. El nginx de staging es el
mismo `nginx.conf.ejemplo` con `server_name staging.tudominio.com`.

```bash
./scripts/desplegar.sh staging
```

El script agrega `--profile correo-prueba` (levanta Mailpit) y **no** agrega
`--profile respaldos`: staging no necesita copias de seguridad.

### ⚠️ Los emails de staging: por qué Mailpit no es opcional

El worker de staging corre **los mismos crons que producción**, incluido el
recordatorio diario de turnos por email. Y el plan es restaurar acá un dump de
producción para probar la recuperación (§6), lo que significa que este entorno
va a tener **direcciones de pacientes reales**. Con un SMTP que entregue de
verdad, el cron de la mañana siguiente les escribe desde el servidor de pruebas.

Mailpit acepta todo y no entrega nada: es el control que hace que ese simulacro
sea seguro de correr. `.env.staging` ya apunta a él (`SMTP_HOST=mailpit`) y el
servicio se levanta con el perfil `correo-prueba`.

**No lo reemplaces por un sink externo** (Mailtrap y similares): con datos
clínicos restaurados, mandaría nombres, emails y teléfonos de pacientes a un
tercero. Mailpit no saca nada de la máquina.

Para ver los correos capturados (la UI se publica sólo en localhost):

```bash
ssh -L 8025:localhost:8025 staging     # y abrí http://localhost:8025
```

> **Pendiente de verificar antes del primer simulacro con datos reales:** si la
> configuración de WhatsApp vive por inquilino en la base, viaja dentro del dump
> restaurado y **no pasa por SMTP**, así que Mailpit no la intercepta.

Para apagar solo el worker en staging:

```bash
docker compose -p nutri_staging --env-file .env.staging -f docker-compose.prod.yml stop worker
```

---

## 7 bis. Imágenes y rollback

### Ya no se compila en el servidor

`app`, `worker`, `migrate`, `respaldo` y `ml` se compilan **en el CI** y se
publican en GHCR con dos etiquetas: el **SHA del commit** (inmutable) y el
**nombre de la rama** (alias móvil). El servidor sólo descarga.

```
   push a development/main
            │
            ▼
   CI: tests + docker build ──► ghcr.io/juanlopezasis27/nutricionista-plataforma/app:<sha>
                                                                              /worker:<sha>
            │                                                                 /migrate:<sha>
            │                                                                 /respaldo:<sha>
            ▼                                                                 /ml:<sha>
   Deploy: ssh → docker compose pull → up -d --no-build → espera healthy
```

Antes se compilaba en el VPS durante el despliegue, lo que traía dos problemas:
`npm ci` + `next build` competían por CPU y RAM con el Postgres que atiende a
los pacientes, y **no había forma de volver atrás** — la imagen anterior quedaba
sin etiqueta y `docker image prune` la borraba.

### Revertir

```bash
./scripts/revertir.sh prod              # lista las versiones disponibles
./scripts/revertir.sh prod a1b2c3d      # vuelve a esa versión
```

Tarda lo mismo que un despliegue normal (~40 s) porque no compila nada: sólo
descarga otra etiqueta. `desplegar.sh` conserva 14 días de imágenes justamente
para esto (`RETENCION_IMAGENES` lo ajusta).

> ### ⚠️ Revertir la imagen NO revierte la base de datos
>
> Prisma no genera migraciones inversas. Si la versión que dejás atrás aplicó un
> cambio destructivo —un `DROP COLUMN`, por ejemplo—, el esquema ya cambió y el
> código viejo puede no funcionar contra él. En ese caso lo que corresponde es
> **restaurar un respaldo** (§6), no revertir la imagen.
>
> Para que revertir siga siendo posible, conviene el patrón **expand/contract**:
> una versión agrega lo nuevo y escribe en ambos lados; la siguiente, ya
> desplegada y estable, elimina lo viejo. Así siempre hay una versión atrás a la
> que se puede volver.

### Operar a mano desde el VPS

El despliegue automático usa una credencial efímera que vale sólo mientras dura
el job, así que no queda una contraseña de larga vida en el servidor. Para
descargar imágenes a mano hace falta iniciar sesión con un token propio
(*classic PAT* con permiso `read:packages`):

```bash
echo "$TOKEN" | docker login ghcr.io -u TU_USUARIO --password-stdin
```

Si GHCR no responde o estás levantando un servidor nuevo desde cero, existe la
salida de emergencia — compila en el servidor, como se hacía antes:

```bash
CONSTRUIR_LOCAL=1 ./scripts/desplegar.sh prod
```

---

## 8. Actualizar a una versión nueva

**Normalmente no hacés nada**: el despliegue es automático.

| Acción | Qué pasa |
| ------ | -------- |
| Merge de un PR a `development` | CI completo → build de imágenes → **deploy a staging** |
| Merge de `development` a `main` | CI completo → build de imágenes → **deploy a producción** (pide aprobación) |

En ambos casos el despliegue corre `scripts/desplegar.sh`, que descarga las
imágenes del commit, **aplica las migraciones** (servicio `migrate`, one-shot),
reinicia app y worker, y **espera a que la app quede `healthy`** antes de darse
por exitoso. Si no llega a sana en 180 s, el workflow falla y muestra el log —
antes terminaba en verde aunque la app estuviera reiniciándose en bucle.

La base y el bucket persisten (volúmenes / bind-mount).

### Desplegar a mano

Para redesplegar sin un commit nuevo (por ejemplo, tras cambiar el `.env` del
servidor), o si el CI está caído por algo ajeno al código:

- Desde GitHub: workflow **"Deploy (manual)"** → elegís entorno y, opcionalmente,
  el commit.
- Desde el VPS: `./scripts/desplegar.sh prod` (requiere `docker login ghcr.io`,
  ver §7 bis).

### Si algo sale mal

```bash
./scripts/revertir.sh prod              # ver versiones disponibles
./scripts/revertir.sh prod <sha>        # volver a una
```

Leé la advertencia de §7 bis sobre migraciones antes de revertir.

### Sobre la versión de Node — decisión

**Se queda en Node 22**, y `.nvmrc` es la única fuente de verdad.

`.nvmrc`, el `Dockerfile` y el CI tienen que decir la **misma** versión. No es
cosmético: `npm ci` exige que el lock haya sido generado por una versión
compatible de npm, y Node 22 (npm 10) y Node 24 (npm 11) escriben distinto el
bloque `overrides` de este proyecto. Cuando se desalinean, el build falla con
`Missing: <paquete> from lock file` y **la imagen no se puede construir** — que
es exactamente lo que estaba pasando.

**Por qué 22 y no 24**, aunque el entorno de desarrollo local sea 24:

- Node 22 es lo que está desplegado y probado. Cambiar el runtime de una app de
  salud sin una ganancia funcional concreta es riesgo sin contrapartida.
- Node 22 LTS tiene soporte hasta abril de 2027: no hay urgencia.
- **Perseguir la versión local no resuelve nada**: si mañana instalás Node 26,
  el desajuste vuelve. Lo que lo resuelve es fijar la versión en un lugar y
  verificar automáticamente que los demás coincidan — que es lo que hace ahora
  el paso "Verificar que .nvmrc y el Dockerfile coincidan" del CI.

Con `nvm`, `nvm use` toma la versión de `.nvmrc` sola. Subir a Node 24 sigue
siendo razonable, pero como proyecto deliberado: cambiar los tres lugares,
regenerar el lock con npm 11, correr el CI completo y dejarlo reposar en staging
antes de tocar producción.

---

## 8 bis. Cambiar el dominio

**No se toca código.** El dominio no está escrito en ningún lado del repo: la
URL pública se resuelve en un solo lugar (`urlPublica()`, en
`src/infraestructura/configuracion/urlPublica.ts`) leyendo `APP_URL` con
`AUTH_URL` como alternativa. La CSP de `next.config.ts` es toda `'self'`, el
manifiesto de la PWA usa `start_url: "/"` y el service worker compara contra
`self.location.origin`, así que todos siguen al origen que se les sirva. Lo que
cambia es el `.env` del servidor, nginx, el DNS y **tres consolas ajenas**.

### Qué depende de `APP_URL` en ejecución

| Qué | Dónde |
| --- | ----- |
| El `redirect_uri` que se le manda a Google | `infraestructura/integraciones/configGoogle.ts` |
| La vuelta del callback de Google y del renovar de sesión | `urlApp()` en los route handlers de `/api` |
| El enlace de recuperación de contraseña | `SolicitarRecuperacionPassword` |
| El enlace firmado de confirmar turno | `FirmaConfirmacionTurno` |

Los enlaces **ya enviados** por email apuntan al dominio viejo. El token de
confirmar turno se firma con `AUTH_SECRET` y no con el host, así que si el
dominio viejo sigue redirigiendo esos enlaces siguen validando; si se apaga,
mueren. Conviene hacer el corte en una franja sin turnos por confirmar y sin
recuperaciones de contraseña en vuelo.

### Orden

El orden importa: cada paso deja listo lo que el siguiente necesita.

```bash
# 1. DNS: A/AAAA del dominio nuevo → IP del VPS. Esperar a que resuelva.
dig +short NUEVO_DOMINIO

# 2. Cambiar SOLO el server_name. Un sed sobre todo el archivo reescribe también
#    las rutas de ssl_certificate que puso certbot, y ahí nginx deja de cargar
#    (ver "Si nginx no carga por el certificado", abajo).
sudo sed -i 's/server_name VIEJO_DOMINIO;/server_name NUEVO_DOMINIO;/g' /etc/nginx/sites-available/nutricionista
sudo nginx -t && sudo systemctl reload nginx

# 3. Certificado del dominio nuevo. certbot reescribe él mismo las dos líneas de
#    ssl_certificate y deja el redirect 80→443 y el timer de renovación.
sudo certbot --nginx -d NUEVO_DOMINIO
```

En el paso 2 nginx queda sirviendo el dominio nuevo con el certificado **viejo**
—nombre que no coincide, aviso del navegador— hasta que corre el paso 3. Es
correcto y dura minutos: el desafío HTTP-01 de certbot viaja por el puerto 80,
que no mira el certificado. Lo que no se puede es dejar apuntadas rutas de un
certificado que todavía no existe.

#### Si nginx no carga por el certificado

```
[emerg] cannot load certificate "/etc/letsencrypt/live/NUEVO_DOMINIO/fullchain.pem":
        BIO_new_file() failed (... No such file or directory ...)
nginx: configuration file /etc/nginx/nginx.conf test failed
```

Es el huevo y la gallina: nginx no arranca sin el certificado y certbot no puede
emitirlo sin nginx sirviendo el dominio nuevo en el puerto 80. **No cunde el
pánico: un `reload` que falla no baja el nginx que ya está corriendo**, que
sigue atendiendo con la configuración vieja que tiene en memoria. El sitio no se
cayó; lo único que pasa es que el cambio no entró.

La salida es apuntar las dos líneas al certificado viejo —que sí existe— el
tiempo justo para que nginx cargue:

```bash
sudo certbot certificates    # confirmar el nombre del certificado viejo

sudo sed -i 's|/etc/letsencrypt/live/NUEVO_DOMINIO/|/etc/letsencrypt/live/VIEJO_DOMINIO/|g' \
  /etc/nginx/sites-available/nutricionista
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d NUEVO_DOMINIO     # emite y reescribe las dos líneas
grep -n ssl_certificate /etc/nginx/sites-available/nutricionista   # verificar
```

Si el certificado viejo ya no está, comentar el bloque `server { listen 443 ... }`
entero y el `return 301` del bloque `:80`, recargar, correr `certbot --nginx` y
descomentar después: con las rutas ya válidas, nginx carga.

**4. Las consolas externas, ANTES de tocar el `.env`.** Agregar la URL nueva sin
borrar la vieja: durante la transición conviven y nada se corta.

- **Google Cloud Console** → *Credenciales* → el cliente OAuth → URI de
  redirección autorizado `https://NUEVO_DOMINIO/api/integraciones/google/callback`.
  Sin esto, conectar Google Calendar falla con `redirect_uri_mismatch`.
- **Meta for Developers** → WhatsApp → *Configuración* → webhook
  `https://NUEVO_DOMINIO/api/whatsapp/webhook`, con el **mismo** verify token
  que ya está guardado en Integraciones. Mientras apunte al viejo dejan de
  entrar los estados de entrega (los mensajes salen igual, pero se quedan en
  ENVIADO para siempre).
- **Monitoreo externo** (UptimeRobot / Healthchecks) → `https://NUEVO_DOMINIO/api/salud`.
  `MONITOR_WEBHOOK_URL` no se toca: es de salida.

**5. `.env.produccion`** — los dos, no uno:

```ini
AUTH_URL=https://NUEVO_DOMINIO
APP_URL=https://NUEVO_DOMINIO
EMAIL_FROM=Lic. Apellido <turnos@NUEVO_DOMINIO_DE_MAIL>
```

Poner solo uno *funciona* —`urlPublica()` cae al otro— y por eso es una trampa:
quedan dos orígenes distintos conviviendo, uno para Auth.js y otro para los
enlaces. `SUPERADMIN_EMAIL` y `SEED_EMAIL` son cosméticos a esta altura: la
semilla ya corrió y cambiarlos no renombra ninguna cuenta.

**6. Redesplegar app y worker.** El worker también lee el `.env` — los
recordatorios de turno salen de ahí con sus enlaces.

```bash
./scripts/desplegar.sh prod
```

### El correo

Si es el mismo proveedor SMTP con un dominio nuevo, lo único que cambia en el
`.env` es `EMAIL_FROM`; el trabajo real está en el DNS del dominio nuevo:

- Verificar el dominio en el panel del proveedor y cargar los **DKIM** que
  entregue.
- **SPF** autorizando a ese proveedor.
- **DMARC**, aunque sea `p=none` al principio.

El `From:` de `EMAIL_FROM` tiene que estar en el dominio que firma DKIM. Si el
dominio de mail no es el de la app, es acá donde se rompe el alineamiento de
DMARC y todo se va a spam sin ningún error en el log — la app reporta el envío
como exitoso porque para ella lo fue.

Probar contra una casilla de Gmail y mirar *Mostrar original*: tienen que decir
`PASS` las tres.

### Contenido cargado que puede tener el dominio viejo escrito a mano

Las plantillas y la biblioteca las escribe el profesional, así que pueden
traerlo en duro. Revisar antes de apagar el viejo:

```sql
SELECT id, nombre FROM plantillas_email              WHERE "cuerpoHtml" LIKE '%VIEJO_DOMINIO%';
SELECT id, nombre FROM plantillas_email_recordatorio WHERE "cuerpoHtml" LIKE '%VIEJO_DOMINIO%';
SELECT id, nombre FROM plantillas_whatsapp           WHERE cuerpo       LIKE '%VIEJO_DOMINIO%';
SELECT id, titulo FROM materiales_biblioteca         WHERE url          LIKE '%VIEJO_DOMINIO%';
```

Las plantillas de WhatsApp que estén aprobadas en Meta con una URL adentro hay
que volver a mandarlas a aprobación: el texto aprobado es el de Meta, no el de
la base.

### Lo que se pierde en el camino, y por qué no hay nada que migrar

- **Las sesiones.** Las cookies son *host-only* (no fijan `domain`), así que
  ninguna viaja al dominio nuevo. Los tokens de refresco siguen vivos en
  `tokens_refresco`, pero la cookie que los presenta no llega. Todos vuelven a
  loguearse una vez. No se puede evitar y no hay nada que trasladar.
- **La PWA instalada.** Hay que reinstalarla, y el dominio viejo no se puede
  apagar de golpe sin dejar a la gente con un diagnóstico equivocado. Tiene su
  propia sección: **Retirar el dominio viejo sin romper la PWA**, abajo.
- **El descarte del cartel de instalar** (`localStorage`) es por origen, así que
  en el dominio nuevo la app vuelve a ofrecer instalarse a todo el mundo. Es lo
  que se quiere: hay que reinstalar.

### Retirar el dominio viejo sin romper la PWA

**Una instalación está atada a su origen y no hay forma de moverla.** No existe
nada en el estándar —ni un truco— que traslade una PWA instalada de un dominio a
otro: el atajo, el service worker, el Cache Storage, el `localStorage` y las
cookies son todos del origen viejo. Todos van a reinstalar. El objetivo no es
evitar eso, es que nadie se quede mirando una ventana rota sin saber qué pasó.

**Por qué apagar el dominio viejo es peor que un error 404.** El `sw.js`
resuelve las navegaciones con `fetch(pedido).catch(() => caches.match("/sin-conexion"))`.
Si el origen viejo deja de resolver, el `fetch` falla y el worker —que sigue
instalado en el dispositivo— sirve **la pantalla «Sin conexión» desde su
caché**. La persona no ve un error de dominio caído: ve que la app dice que no
hay internet, en una ventana `standalone` **sin barra de direcciones** desde la
que no puede navegar a ningún lado. Va a revisar su WiFi, no a buscar el
dominio nuevo. Es un diagnóstico equivocado y perfectamente convincente.

**Y un `301` a secas tampoco alcanza para este caso.** Redirigir a otro origen
saca a la navegación del `scope` del manifiesto, así que Chrome expulsa a la
persona del modo app: la abre en el navegador o en una Custom Tab. Sirve para
que los enlaces viejos de los emails no mueran, pero deja a alguien en el
navegador sin entender por qué, con el ícono viejo todavía en su pantalla
apuntando a lo que ya no es la app.

La salida es que el dominio viejo **siga vivo y diga qué pasó**:

| Ruta | Qué sirve el dominio viejo | Por qué |
| ---- | -------------------------- | ------- |
| `/` (el `start_url` de la PWA) | Una página estática «nos mudamos» con un enlace al dominio nuevo | Es lo que se abre al tocar el ícono instalado. Tiene que explicar, no redirigir |
| `/sw.js` | Un worker de retiro (abajo) | Saca del dispositivo el worker viejo y sus cachés |
| Todo lo demás | `301` al dominio nuevo | Los enlaces de recuperación y de confirmar turno ya enviados siguen funcionando |

El worker de retiro, servido en `/sw.js` del dominio viejo. `next.config.ts` le
pone `max-age=0, must-revalidate` a esa ruta, así que el navegador lo toma en el
primer arranque después del corte:

```js
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nombres) => Promise.all(nombres.map((n) => caches.delete(n))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim()),
  );
});
```

Sin esto el worker viejo queda registrado con su `/sin-conexion` precacheado y
sigue respondiendo por su cuenta aunque el dominio ya sirva otra cosa.

**El aviso previo es lo único que de verdad baja el soporte.** Una o dos semanas
antes del corte, un cartel dentro de la app en el dominio viejo diciendo la
fecha y que va a haber que reinstalar. Después del corte nadie lee nada: la app
ya no abre.

**Cuándo apagarlo del todo.** El `301` y la página de aviso cuestan un
`server {}` y un certificado que se renueva solo. No hay apuro: conviene
dejarlos hasta que el log de accesos del dominio viejo esté en cero por varios
días seguidos.

**Cuándo NO hace falta nada de esto.** Todo lo de arriba resuelve con
infraestructura un problema de comunicación: sirve cuando no se puede contactar
a los usuarios uno por uno. Con un consultorio y un centenar de pacientes a los
que el profesional les escribe por WhatsApp, el **corte anunciado** es
legítimo y más simple: avisar, cortar, y dar de baja el dominio viejo.

Es lo decidido para la mudanza de `app.licnicolopezasis.com.ar` a
`app.nutrioffice.com.ar` (decisión de septiembre de 2026; el corte queda
pendiente de fecha). Lo que hay que incluir sí o sí en
el aviso es **que borren el ícono viejo**: si no lo hacen les queda una PWA
fantasma que, al tocarla, muestra «Sin conexión» por lo explicado arriba — y el
reporte llega meses después, sin que nadie conecte una cosa con la otra.

Conviene además migrar **primero al profesional** y confirmar con él que entró y
reinstaló antes de bajar el dominio viejo: es el que usa la app todos los días,
así que cualquier cosa mal configurada aparece por ahí en minutos.

### Verificación

- [ ] `curl -I https://NUEVO_DOMINIO` → 200, y el certificado es del dominio nuevo.
- [ ] `https://NUEVO_DOMINIO/api/salud` → 200.
- [ ] Login con una cuenta real (la sesión vieja ya no vale: es el comportamiento esperado).
- [ ] Recuperación de contraseña: pedirla y **mirar el enlace del email**, que es
      donde aparece `APP_URL` mal puesta.
- [ ] Conectar Google Calendar de punta a punta: es lo que falla si la consola
      quedó sin la URI nueva.
- [ ] Mandar un WhatsApp de prueba y verificar que pase a ENTREGADO — eso
      confirma que el webhook nuevo está entrando.
- [ ] Un email a Gmail: SPF, DKIM y DMARC en `PASS`.
- [ ] Reinstalar la PWA desde el dominio nuevo.

---

## 9. Checklist de seguridad

- [ ] Secretos fuertes y **distintos** (`AUTH_SECRET`, `TOKENS_SECRET`, claves DB/MinIO).
- [ ] `.env.produccion`, `.env.staging` **fuera de git** (ya en `.gitignore`).
- [ ] Firewall: solo 22 (SSH), 80 y 443 abiertos. La app publica su puerto
      **solo en `127.0.0.1`** (lo alcanza nginx del host, no desde afuera); la DB,
      MinIO, el worker y el servicio de ML (si está habilitado) **no publican
      puertos**.
- [ ] nginx: `proxy_buffering off` en `/api/trpc` (SSE) y `client_max_body_size 26m`.
- [ ] Certificado TLS emitido con certbot y **renovación automática** activa
      (`systemctl list-timers | grep certbot`).
- [ ] DNS de `tudominio.com` → VPS de producción y `staging.tudominio.com` → VPS
      de staging (son máquinas distintas, ver §7).
- [ ] OVH Object Storage configurado y **restauración probada** al menos una vez.
- [ ] Consola de MinIO (9001) no expuesta: si la necesitás, entrá por túnel SSH
      (`ssh -L 9001:localhost:9001 vps`) y publicá el puerto solo temporalmente.
- [ ] Mailpit corriendo en staging (`--profile correo-prueba`) **antes** de
      restaurar cualquier dump de producción ahí (§7).

## 10. Checklist de operación

Lo que evita que un problema se convierta en una caída, o una caída en una
pérdida de datos.

- [ ] **`MONITOR_WEBHOOK_URL` completada** en `.env.produccion`. Sin esto, el
      único destino de los errores es `docker logs`, que nadie lee.
- [ ] **Monitoreo externo** de `https://tudominio.com/api/salud` cada 60 s
      (UptimeRobot, Healthchecks.io — gratis). nginx ya tiene el `location`
      preparado. Es la capa que sigue avisando aunque se caiga el VPS entero,
      así que **no la reemplaza Prometheus**: si ambos servidores están en el
      mismo datacenter, un incidente del proveedor se lleva los dos.
- [ ] **Rotación de logs activa**: verificá con
      `docker inspect <contenedor> --format '{{.HostConfig.LogConfig}}'` que
      diga `max-size:10m`. Es lo que impide que el disco se llene y Postgres se
      quede sin poder escribir.
- [ ] **`docker stats`** una vez tras el primer despliegue, para confirmar que
      los `mem_limit` del compose son holgados para tu carga real.
- [ ] **node_exporter instalado** con
      `--collector.textfile.directory=$RUTA_METRICAS`, y alerta de antigüedad
      del último respaldo (§6).
- [ ] **Alertas de disco > 80 % y RAM > 85 %** en ambos servidores.
