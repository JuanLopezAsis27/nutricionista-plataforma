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
