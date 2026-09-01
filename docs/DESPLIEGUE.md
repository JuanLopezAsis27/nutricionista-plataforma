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
   ┌─────────────────┼───────────────────────┐   (red interna del proyecto Docker)
   │  ┌────────┐ ┌────────┐ ┌────────┐        │
   │  │postgres│ │ worker │ │respaldo│  …      │
   │  └────────┘ └────────┘ └───┬────┘        │
   │  ┌────────┐                 │            │
   │  │ minio  │◄── disco 2      │ offsite    │
   │  └────────┘                 ▼            │
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

**ML** corre en **otro entorno** (nube on-demand). La app solo lo consume por
HTTP: cuando el servicio esté, se setea `ML_SERVICE_URL` y listo (si no está,
la app usa los stubs y funciona igual).

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
docker compose -p nutri_prod -f docker-compose.prod.yml ps     # todo "Up"/"healthy"
curl -I http://127.0.0.1:3000                                  # la app responde en localhost
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
docker compose -p nutri_prod -f docker-compose.prod.yml logs -f worker
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
docker compose -p nutri_prod -f docker-compose.prod.yml exec respaldo sh -c \
  'mc alias set ovh "$OVH_S3_ENDPOINT" "$OVH_S3_ACCESS_KEY" "$OVH_S3_SECRET_KEY" && \
   mc cp ovh/$OVH_S3_BUCKET/db/nutricionista-AAAAMMDD-HHMMSS.dump /respaldos/db/'
# Restaurar:
docker compose -p nutri_prod -f docker-compose.prod.yml exec respaldo \
  restaurar-db.sh /respaldos/db/nutricionista-AAAAMMDD-HHMMSS.dump
```

Para restaurar el **bucket**, es un `mc mirror` de OVH → MinIO (inverso al del
respaldo). **Probá una restauración de vez en cuando**: un backup sin restore
probado no es un backup.

---

## 7. Staging (mismo VPS)

Staging es el **mismo `docker-compose.prod.yml`** corrido como **otro proyecto**
(`-p nutri_staging`) con `.env.staging`. Queda **aislado**: su propia base, su
propio bucket, su propia red interna. Comparte el VPS y el nginx del host:
publicá staging en otro puerto (`APP_PORT=3001`) y agregá un `server {}` para
`staging.tudominio.com` que proxee a `127.0.0.1:3001` (con el mismo bloque
`/api/trpc` sin buffering).

```bash
./scripts/desplegar.sh staging
```

⚠️ **Cuidado con los emails**: el worker de staging manda recordatorios. Usá
**datos de prueba** y un **SMTP que no entregue** (Mailpit/Mailtrap; `.env.staging`
ya apunta a `mailpit`). Nunca cargues la base de pacientes reales en staging.

Para apagar solo el worker en staging (evitar emails):

```bash
docker compose -p nutri_staging -f docker-compose.prod.yml stop worker
```

---

## 8. Actualizar a una versión nueva

```bash
git pull            # o lo hace el script
./scripts/desplegar.sh prod
```

El script hace `git pull`, reconstruye la imagen, **aplica las migraciones**
(servicio `migrate`, one-shot) y reinicia app/worker. La base y el bucket
persisten (volúmenes/bind-mount). Recomendado: probá primero en `staging`.

---

## 9. Checklist de seguridad

- [ ] Secretos fuertes y **distintos** (`AUTH_SECRET`, `TOKENS_SECRET`, claves DB/MinIO).
- [ ] `.env.produccion`, `.env.staging` **fuera de git** (ya en `.gitignore`).
- [ ] Firewall: solo 22 (SSH), 80 y 443 abiertos. La app publica su puerto
      **solo en `127.0.0.1`** (lo alcanza nginx del host, no desde afuera); la DB,
      MinIO y el worker **no publican puertos**.
- [ ] nginx: `proxy_buffering off` en `/api/trpc` (SSE) y `client_max_body_size 26m`.
- [ ] Certificado TLS emitido con certbot y **renovación automática** activa
      (`systemctl list-timers | grep certbot`).
- [ ] DNS de `tudominio.com` y `staging.tudominio.com` apuntando al VPS.
- [ ] OVH Object Storage configurado y **restauración probada** al menos una vez.
- [ ] Consola de MinIO (9001) no expuesta: si la necesitás, entrá por túnel SSH
      (`ssh -L 9001:localhost:9001 vps`) y publicá el puerto solo temporalmente.
