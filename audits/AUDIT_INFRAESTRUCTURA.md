# Auditoría de Infraestructura, CI/CD y Observabilidad — nutricionista-app

**Fecha:** 2026-09-07
**Rama auditada:** `development` (commit `54dcf96`)
**Alcance:** `.github/workflows/` (ci.yml, deploy.yml), `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`, `scripts/desplegar.sh`, `respaldos/` (Dockerfile, respaldo.sh, programador.sh, restaurar-db.sh), `docs/DESPLIEGUE.md`, `docs/nginx.conf.ejemplo`, `.env.produccion.example`, `src/infraestructura/monitoreo/`, `src/instrumentation.ts`, `src/app/api/salud/route.ts`, `src/trabajos/worker.ts`, `ml-servicio/`.
**Método:** lectura de los archivos, no inferencia por nombres. Los estados de rama, archivos no versionados y ausencias se verificaron con `git ls-files`, `git status`, `git rev-list` y `grep` sobre el repositorio (ver Anexo).
**Restricción cumplida:** no se modificó ningún archivo de configuración. Este documento es la única salida.

---

## 0. Resumen ejecutivo

La infraestructura tiene **buenas piezas mal conectadas**. El pipeline de CI es notablemente completo para un proyecto de este tamaño (typecheck estricto, tests, lint, `npm audit` con gate, CodeQL con `security-extended`, gitleaks, acciones fijadas por SHA); los respaldos están cifrados con GPG y salen offsite; las sondas de salud verifican el camino real a Postgres y no sólo que el proceso conteste; el aislamiento de red del compose de producción es correcto (nada publica puertos salvo la app, y sólo en `127.0.0.1`).

El problema no es lo que falta construir. Es que **casi nada de eso está activo sobre el trabajo real**:

| Hallazgo                                                                                                       | Consecuencia                                                                           |
| -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| El CI dispara sólo en `main`; el desarrollo vive en `development`, que está **67 commits adelante y 0 atrás**   | Ningún commit de los últimos 67 pasó por typecheck, tests, CodeQL ni gitleaks           |
| El deploy hace `git pull` en el VPS de la rama que esté ahí                                                    | No hay ninguna relación entre el commit que validó el CI y el que corre en producción   |
| Las imágenes no tienen tag ni registry, y el deploy hace `docker image prune -f`                               | **No existe rollback.** Volver atrás es reconstruir desde cero en el VPS ya degradado   |
| No hay límites de memoria ni de logs en ningún contenedor                                                      | Un leak o un log ruidoso llena el disco / dispara el OOM killer y **se lleva Postgres** |
| No hay métricas ni alertas; `MONITOR_WEBHOOK_URL` no está cableada en producción                               | Todo incidente se detecta porque un nutricionista avisa por teléfono                    |
| El respaldo falla con `\|\| echo "ERROR"` a un log que nadie lee                                                | Un respaldo roto se descubre el día del restore                                         |

El caso testigo está en el propio repositorio: **el servicio de ML lleva tiempo roto y nadie se enteró**. `ml-servicio/features.py:48` consulta una columna que la migración 27 eliminó; el `except Exception` de `ml-servicio/main.py:115` traga el error y devuelve "No se pudo leer la base de datos en este momento". Sin métricas ni alertas, ese texto es indistinguible de un Postgres caído, y lleva ahí desde que se aplicó la migración. No es un bug de Python: es la demostración de que el sistema no tiene forma de saber que está fallando.

**Riesgo operativo dominante, en orden:**

1. **Pérdida de datos por disco lleno u OOM** (G-14) — es la única falla del listado que no se recupera reiniciando.
2. **Imposibilidad de revertir un mal despliegue** (G-09, G-10) — el peor momento para descubrirlo es durante un incidente.
3. **Incidentes invisibles** (G-21, G-22, G-23) — determina cuánto duran todos los demás.
4. **CI decorativo** (G-01) — es la causa raíz de que la calidad dependa de la disciplina individual.

**Lo bueno:** ninguna de las cinco correcciones más importantes requiere cambiar de stack. Todas se hacen con Docker Compose, GitHub Actions y nginx, que ya están. La sección 5 separa explícitamente lo que se arregla en el stack actual de lo que exigiría migrar.

---

## 1. Tabla de gaps

Riesgo: **🔴 Crítico** (pérdida de datos o caída prolongada plausible) · **🟠 Alto** (incidente no detectado o recuperación manual larga) · **🟡 Medio** (fricción operativa, deuda) · **⚪ Bajo** (mejora oportunista).

### 1.1 CI/CD

| #    | Área                         | Estado actual (referencia)                                                                                                                                                                                                       | Riesgo | Mejora sugerida                                                                                                                                                                          |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-01 | Cobertura del CI             | `.github/workflows/ci.yml:4-7` dispara en `push`/`pull_request` a **`main`**. El trabajo real ocurre en `development` (`git rev-list --left-right --count main...development` → **0 / 67**). Los PR #9, #10 y #11 se mergearon sin ejecutar CI. | 🔴     | Agregar `development` a **ambos** disparadores (`push` y `pull_request`). No hace falta listar `feature/**`: `pull_request` filtra por rama **base**, así que un PR desde cualquier rama hacia `development` ya dispara. Sin esto, el resto del pipeline es decorativo. |
| G-02 | Job huérfano                 | `ci.yml:170-190` define el job `go` con `working-directory: nutricion-servicio`, directorio **eliminado** en el commit `73a66e7`. Sigue existiendo en `main` (`git ls-tree main` → `nutricion-servicio/go.mod`).                    | 🟠     | Eliminar el job. Tal como está, el primer merge de `development` a `main` con el CI habilitado falla por un directorio inexistente, y el fallo se leerá como "el CI está roto".            |
| G-03 | El CI no construye la imagen | `ci.yml:110` corre `npx next build`, que **no es** `docker build`. Los stages `migrator`, `worker` y `runner` del `Dockerfile` (copia de `.next/standalone`, engine de Prisma, usuario `nextjs`) nunca se ejercitan.                | 🟠     | Agregar un job `docker build --target runner` (y `worker`). Hoy un `Dockerfile` roto se descubre **en el VPS, con el contenedor viejo ya detenido**.                                       |
| G-04 | Trazabilidad del despliegue  | `deploy.yml:46-52`: SSH al VPS + `git pull --ff-only` de la rama que esté checkouteada allí. No se pasa un SHA, no se verifica que ese commit haya pasado CI, no hay `environment:` con aprobación.                                 | 🔴     | Pasar el SHA explícito (`git fetch && git checkout <sha>`), exigir que el CI de ese SHA esté verde, y declarar `environment: produccion` para tener aprobación y registro de despliegues.  |
| G-05 | Gates de calidad             | `vitest.config.ts` no define `coverage` ni umbrales. 216 archivos de test para 1191 archivos TS/TSX. `ci.yml:104` corre `npm run lint` sin `--max-warnings` (36 avisos conocidos, documentado en el propio workflow).               | 🟡     | Fijar `--max-warnings=36` hoy (congela la deuda; bajarlo con cada limpieza) y activar `coverage` con umbral en `src/dominio` y `src/aplicacion`, que es donde el riesgo es real.          |
| G-31 | Lock incompatible con el build | **Descubierto al implementar G-03** (2026-09-07). `package-lock.json` fue generado con **npm 11** (Node 24, el del entorno local) pero tanto el `Dockerfile` (`node:22-bookworm-slim`) como el CI (`node-version: 22`) usan **npm 10**, y ambos escriben distinto el bloque `overrides` de `package.json`. `npm ci` abortaba con `Missing: nodemailer@8.0.11 from lock file`. | 🔴     | Regenerar el lock con la misma versión de npm que construye, y fijar la versión de Node en un único lugar (`.nvmrc`) que consuman el CI y el Dockerfile. **La imagen de producción no se podía construir y el `npm ci` del CI habría fallado igual**; nadie lo detectó porque el CI no corría sobre `development` (G-01). Es la demostración más concreta del costo de ese gap. |
| G-33 | `nodemailer` vulnerable en producción | **Detectado por el primer CI que llegó a correr** (PR #12, 2026-09-08). `npm audit --audit-level=high --omit=dev` fallaba con 4 avisos altos: GHSA-p6gq-j5cr-w38f (lectura arbitraria de archivos y SSRF) sobre una copia ANIDADA `@auth/prisma-adapter/node_modules/nodemailer@8.0.11`. El override de `package.json` sólo cubría `nodemailer` bajo `next-auth`, no bajo `@auth/prisma-adapter`. | 🔴     | Override de primer nivel `"nodemailer": "$nodemailer"`, que fuerza la versión de la raíz (9.x) en todo el árbol. La copia anidada desaparece: queda un solo `nodemailer` 9.1.1. Es superficie de ataque que además **no se usaba** — la app sólo configura el proveedor `Credentials`, y `@auth/core` declara `nodemailer` como peer *opcional*. |
| G-06 | Actualización de deps        | `ci.yml:75` detecta con `npm audit --audit-level=high`, pero no hay `.github/dependabot.yml` ni Renovate (`find .github -type f` → sólo los dos workflows).                                                                        | 🟡     | Dependabot semanal para npm, Docker y GitHub Actions. El gate de `npm audit` sólo dice que hay un problema; alguien tiene que abrir el PR que lo arregla.                                  |
| G-07 | Verificación post-deploy     | `scripts/desplegar.sh:44` imprime "Listo ✅" cuando `docker compose` retorna, no cuando el contenedor está `healthy`. Ni el script ni `deploy.yml` hacen un smoke test.                                                             | 🟠     | Esperar `healthy` (`docker compose ps --format json` en bucle con timeout) + `curl -f /api/salud`, y salir con error si no pasa. Un deploy que falla en silencio es peor que uno que aborta. |

### 1.2 Estrategia de despliegue y downtime

| #    | Área                        | Estado actual (referencia)                                                                                                                                                                                                              | Riesgo | Mejora sugerida                                                                                                                                                                                                                                    |
| ---- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-08 | Build en producción         | `scripts/desplegar.sh:37`: `docker compose ... up -d --build` **en el host de producción**. `npm ci` + `next build` compiten por CPU y RAM con Postgres, la app viva, el worker y MinIO.                                                    | 🔴     | Construir en el CI y publicar a un registry (GHCR viene incluido). El VPS pasa a hacer `pull` + `up -d`: segundos en vez de minutos, y sin riesgo de que el build mate a Postgres por OOM.                                                           |
| G-09 | Rollback                    | Imágenes sin tag (`image: nutricionista-app`, `docker-compose.prod.yml:141` → `latest`), sin registry, sin tags de git (`git tag` → vacío), y `desplegar.sh:40` hace `docker image prune -f`, que borra la imagen anterior sin referencia.  | 🔴     | Tags inmutables por commit (`nutricionista-app:<sha>`) y un `ROLLBACK.md` de un comando. Hoy revertir es `git checkout <sha>` + rebuild completo en un VPS ya degradado: **decenas de minutos con el sitio caído**, en el peor momento posible.       |
| G-10 | Migraciones y reversión     | Prisma no genera *down migrations* (`prisma/migrations/47_*/` contiene sólo `migration.sql`). La migración 27 ya ejecutó `ALTER TABLE "pacientes" DROP COLUMN "activo"` (`27_integridad_modelo_datos/migration.sql:346`).                    | 🔴     | Adoptar **expand/contract**: una release agrega lo nuevo y escribe en ambos lados; la siguiente, ya estable, elimina lo viejo. Un `DROP COLUMN` desplegado junto al código que lo necesita convierte cualquier rollback en un restore desde respaldo. |
| G-11 | Ventana de indisponibilidad | Un único contenedor `app` publicado en `127.0.0.1:${APP_PORT}` (`docker-compose.prod.yml:150-152`); `up -d --build` lo recrea (para el viejo → arranca el nuevo). El `start_period` del healthcheck es de 40 s.                             | 🟠     | Con imágenes pre-construidas la ventana baja a ~40 s. Para llegar a cero: segunda réplica en otro puerto + `upstream` de nginx con `backup`, alternando en cada deploy (blue-green pobre, sin herramientas nuevas). Ver §2.3.                        |
| G-12 | Orden de arranque           | `migrate` es `restart: "no"` y la app depende de `service_completed_successfully` (`docker-compose.prod.yml:143-149`). Si la migración falla, **la app nueva no arranca y la vieja ya fue detenida**.                                       | 🟠     | Correr las migraciones como paso explícito y verificable *antes* de tocar los contenedores de servicio, abortando si fallan. Que un error de esquema no deje al sistema sin ninguna versión corriendo.                                               |
| G-13 | Permisos del deploy         | `deploy.yml:24` es `workflow_dispatch` sin `environment:`. Cualquiera con permiso de escritura puede dispararlo desde cualquier rama, y el job lleva la clave SSH de producción.                                                            | 🟡     | `environment: produccion` con revisor requerido. El workflow ya limita `permissions: contents: read` correctamente; lo que falta es el control humano.                                                                                              |

### 1.3 Configuración e infraestructura como código

| #    | Área                                   | Estado actual (referencia)                                                                                                                                                                                                                          | Riesgo | Mejora sugerida                                                                                                                                                                                                                          |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-14 | Límites de recursos y logs             | **Ninguno.** `grep -E "logging\|mem_limit\|deploy:\|resources" docker-compose.prod.yml` → sin coincidencias. Los 6 servicios usan el driver `json-file` por defecto, **sin `max-size` ni `max-file`**.                                                  | 🔴     | `logging: {driver: json-file, options: {max-size: 10m, max-file: 3}}` en todos los servicios y `mem_limit` en app, worker y MinIO. Es el gap con mayor riesgo de **pérdida de datos**: un disco lleno deja a Postgres sin poder escribir el WAL, y sin `mem_limit` el OOM killer elige por RSS, que suele ser Postgres. Dos líneas por servicio. |
| G-15 | El servicio de ML no existe en el repo | `git status --porcelain ml-servicio` → `?? ml-servicio/`. **No está versionado**: no aparece en `git ls-files`, no está en ningún compose, no tiene job de CI ni `Dockerfile`. Existe únicamente en el disco de la máquina de desarrollo.               | 🟠     | Versionarlo (con `__pycache__/` ignorado), pinear `requirements.txt` con `==` en vez de `>=` y darle un `Dockerfile`. Hoy un disco roto se lleva el servicio entero, sin forma de reconstruirlo.                                            |
| G-16 | Fijación de imágenes base              | `minio/minio` y `minio/mc` **sin tag** (`docker-compose.prod.yml:99, 118`) → resuelven a `latest`. `postgres:18` fija sólo la mayor. `respaldos/Dockerfile` descarga `mc` desde `dl.min.io` sin verificar checksum.                                     | 🟡     | Pinear por versión (idealmente por digest) las tres imágenes. Un `latest` de MinIO con un cambio incompatible rompe el bucket en el siguiente `up -d --build`, y el diagnóstico ("no cambié nada") es el peor posible.                       |
| G-17 | IaC del servidor                       | No hay ninguna. El VPS se arma a mano siguiendo `docs/DESPLIEGUE.md` §2-§5: instalar Docker, nginx y certbot, formatear y montar el disco secundario, editar `/etc/fstab`, importar el llavero GPG, crear la *service account* de MinIO.                | 🟡     | La guía es buena, pero es un procedimiento manual de ~25 pasos que nunca se ejecutó dos veces. Un `preparar-vps.sh` idempotente (bash puro, sin Ansible ni Terraform) convierte la documentación en algo verificable. Ver §5.                |
| G-18 | Validación de configuración            | No existe validación de variables de entorno al arranque (`grep` sobre `src` no encuentra ningún esquema). El propio `docker-compose.prod.yml:44-50` documenta que `S3_APP_ACCESS_KEY` vacía **degrada silenciosamente a la credencial root de MinIO**. | 🟠     | Un módulo que valide el entorno con Zod al arrancar y aborte con un mensaje claro. Los defaults `:-` del compose son cómodos y peligrosos: convierten un error de configuración en una degradación de seguridad invisible.                  |
| G-19 | Aislamiento prod/staging               | Mismo VPS, mismo CPU, mismo disco, mismo `docker-compose.prod.yml` (`docs/DESPLIEGUE.md` §7). Un `--build` de staging compite con producción. **Decisión tomada (2026-09-07): staging se muda a un VPS propio**, lo que resuelve este gap.                | 🟡     | Al mudarlo, el riesgo se transforma en **drift entre servidores**: dos máquinas armadas a mano divergen (versiones de Docker, parches de OS, `nginx.conf`, variables agregadas en prod y no en staging) y staging deja de predecir a producción. La respuesta es G-17. Actualizar `docs/DESPLIEGUE.md` §7, que describe el modelo compartido. |
| G-30 | SMTP de staging apunta a la nada       | `.env.staging.example:39` define `SMTP_HOST=mailpit`, pero `docker-compose.prod.yml` **no tiene servicio `mailpit`** (sólo `postgres`, `minio`, `crear_bucket`, `migrate`, `app`, `worker`, `respaldo`); mailpit existe únicamente en `docker-compose.yml`, el compose de desarrollo. | 🟠     | **Agregar `mailpit` a `docker-compose.prod.yml` bajo `profiles: ["correo-prueba"]`**, activado sólo por `desplegar.sh staging` (igual que `respaldo` sólo se activa en prod). No es sólo arreglar un host que no resuelve: mailpit es el **interlock de seguridad** de staging. El worker de pruebas corre los mismos crons de recordatorios (`docs/DESPLIEGUE.md` §5) y, cuando se restaure un dump de producción para el simulacro de G-24, ese entorno va a contener emails de pacientes reales. **Descartado Mailtrap u otro sink externo:** con datos clínicos restaurados, mandaría nombres y direcciones de pacientes a un tercero; mailpit no saca nada de la máquina. Ilustra G-18: sin validación de entorno, un hostname inexistente se descubre cuando alguien no recibe el recordatorio. |
| G-20 | Secretos                               | Correcto. `.env.produccion`/`.env.staging` en `.gitignore`, `.dockerignore` con `.env*` y sus excepciones bien razonadas, `git ls-files` confirma que sólo hay `*.example` versionados, gitleaks en CI, acciones fijadas por SHA.                       | ⚪     | Sin acción. Es la parte mejor resuelta de la infraestructura. Único pendiente: procedimiento documentado de rotación de `AUTH_SECRET`, `TOKENS_SECRET` y claves S3.                                                                        |

### 1.4 Observabilidad

| #    | Área                    | Estado actual (referencia)                                                                                                                                                                                                                            | Riesgo | Mejora sugerida                                                                                                                                                                                                                    |
| ---- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G-21 | Métricas                | **No existen.** No hay CPU, RAM, disco, latencia p95, tasa de errores, profundidad de la cola de pg-boss ni estado del pool de Prisma. El único dato operativo es `/api/salud`, que es binario: llega a Postgres o no (`src/app/api/salud/route.ts:32`). | 🔴     | Empezar por lo que evita el incidente de G-14: alerta de **disco > 80 %** y **RAM > 85 %**. Después, un endpoint `/api/metricas` protegido, con contadores de la cola y del pool. Para lo primero no hace falta Prometheus.           |
| G-22 | Alertas                 | `MONITOR_WEBHOOK_URL` existe en el código (`src/infraestructura/monitoreo/configMonitoreo.ts:19`) pero **no se pasa al contenedor** en `docker-compose.prod.yml` ni figura en `.env.produccion.example`. Sólo aparece comentada en `.env.example:208`.    | 🔴     | Agregarla al bloque `x-app-env` y al `.env.produccion.example`. **La pieza está construida y desconectada**: en producción el monitor queda sólo con `MonitorErroresConsola`, escribiendo a un log que nadie lee.                     |
| G-23 | Respaldos silenciosos   | `respaldos/programador.sh:10` y `:21` hacen `\|\| echo "[programador] ERROR ..."` y siguen el bucle. El texto va a stdout del contenedor. No hay dead-man's switch ni notificación de éxito.                                                             | 🟠     | Un ping a Healthchecks.io (gratis) al final de `respaldo.sh`, que alerta por **ausencia** de señal. Es la única forma de detectar el respaldo que no corrió; hoy tres semanas de fallos se descubren el día del restore.               |
| G-24 | Restauración no probada | `docs/DESPLIEGUE.md` §6 dice "probá una restauración de vez en cuando", sin procedimiento fechado, checklist ni evidencia. `restaurar-db.sh` existe y está bien escrito, pero no hay registro de que se haya ejecutado nunca.                            | 🔴     | Simulacro trimestral: restaurar el último dump en el stack de **staging** y verificar. Documentar fecha y resultado en el repo. Un respaldo sin restore probado no es un respaldo — lo dice el propio documento, y no se hizo.         |
| G-25 | RTO / RPO sin declarar  | No están escritos en ningún archivo. Los valores **reales** deducidos de la configuración: **RPO ≈ 24 h** (respaldo diario, `HORA_RESPALDO=03:00`) y **RTO indeterminado** (reconstrucción manual del VPS + restore, nunca cronometrada).                | 🟠     | Declararlos explícitamente. Si 24 h de pérdida de historias clínicas es inaceptable, la respuesta es WAL archiving continuo a OVH (`archive_command`), no más frecuencia de `pg_dump`. Es una decisión de negocio, no técnica.        |
| G-26 | Logs de aplicación      | `MonitorErroresConsola` emite una línea JSON por error, bien pensada (`MonitorErroresConsola.ts:38-47`). Todo lo demás (worker, trabajos, arranque) es `console.log` libre. Sin agregación, sin retención, sin correlación app↔worker.                   | 🟡     | Unificar en el mismo formato JSON y, cuando haya presupuesto, mandarlos a un colector. Con G-14 aplicado (`max-size: 10m`) la retención efectiva pasa a ser de horas: **rotar sin destino externo pierde evidencia**. Van juntos.      |
| G-27 | El worker no reporta    | `src/trabajos/worker.ts:25-27` hace `console.error` directo en `boss.on("error")`, sin pasar por `monitorErrores`. Los trabajos fallidos (recordatorios que no salieron, alertas no generadas) no producen ninguna señal externa.                        | 🟠     | Enrutar los errores del worker por `IMonitorErrores` con `origen: "worker"`. El puerto ya existe, y el worker es el único componente cuyos fallos **nadie ve nunca**: no hay usuario mirando una pantalla que se rompa.               |
| G-28 | Monitoreo externo       | `docs/nginx.conf.ejemplo:98-112` ya prepara `/api/salud` para UptimeRobot/Healthchecks (sin `access_log`, sin caché), pero configurarlo no figura como paso obligatorio en `docs/DESPLIEGUE.md` §4 ni en el checklist de §9.                             | 🟠     | 10 minutos de trabajo, gratis, y es la diferencia entre enterarse en 5 minutos o cuando llama un paciente. **La mejor relación esfuerzo/riesgo de toda esta auditoría.**                                                              |
| G-29 | Trazas distribuidas     | No hay. Cuatro procesos (app, worker, Postgres, MinIO) sin correlación de peticiones.                                                                                                                                                                   | ⚪     | **No priorizar.** A esta escala y con este número de saltos, las trazas cuestan más de lo que rinden. Se anota para no volver a discutirlo.                                                                                          |

### 1.5 Servicio de ML

| #     | Área                         | Estado actual (referencia)                                                                                                                                                                                                                          | Riesgo | Mejora sugerida                                                                                                                                                                                                                     |
| ----- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ML-01 | Roto y fallando en silencio  | `ml-servicio/features.py:48` filtra `AND activo = true`; la columna se eliminó en `prisma/migrations/27_integridad_modelo_datos/migration.sql:346` (reemplazada por `archivadoEn`). El `except Exception` de `main.py:115` traga el `UndefinedColumn`. | 🔴     | `AND "archivadoEn" IS NULL`, **y loguear antes de tragar**. La degradación elegante sin log convierte cada drift de esquema en invisible: el mensaje que ve el nutricionista es idéntico al de "Postgres caído". Caso testigo de G-21/G-22. |
| ML-02 | Topología documentada        | `docs/DESPLIEGUE.md` §1 declara "ML corre en otro entorno (nube on-demand)". Para leer datos necesita `DATABASE_URL_RO` alcanzable, pero `docker-compose.prod.yml` no publica el puerto de Postgres (correcto).                                        | 🟠     | Contenedor `ml` en la red `interna`, sin `ports:`, con rol `ml_lector` de Postgres (`default_transaction_read_only = on` + `statement_timeout = '15s'` **del lado del servidor**, no del cliente como hace `db.py:33`). Ver §4.        |
| ML-03 | Cómputo en el camino crítico | `main.py:95-140`: cada request a `/insights` escanea todos los pacientes del inquilino y sus registros, turnos y pesos, en horario de uso.                                                                                                            | 🟠     | Puntuación batch nocturna en el worker (que ya corre crons) escribiendo a `insight_paciente` / `prediccion_ml`. El endpoint pasa a ser un `SELECT`. Efecto operativo: **el ML deja de ser componente crítico** y el pico sale del horario de consulta. |
| ML-04 | Empaquetado                  | Sin `Dockerfile`, sin job de CI, `requirements.txt` con `>=` en todas las líneas.                                                                                                                                                                    | 🟡     | Pinear con `==`, agregar `Dockerfile` y un job mínimo de CI (import + lint). Con `>=`, dos builds de la misma imagen pueden traer versiones distintas de numpy.                                                                       |

---

## 2. Pipeline: actual vs. ideal

### 2.1 El pipeline actual

```
  Developer                GitHub                        VPS (producción)
  ─────────                ──────                        ────────────────
  commit                                                 (nginx + Docker,
    │                                                     todo en un host)
    ├─► push a development ─────────►  ✗ ningún workflow dispara
    │                                    (ci.yml sólo escucha `main`)
    │
    ├─► PR → development ───────────►  ✗ ningún workflow dispara
    │        merge sin gate
    │
    └─► [manual] Run workflow ──────►  deploy.yml
                                          │  ssh (clave de producción)
                                          ▼
                                       git pull --ff-only  ← la rama que esté
                                       ./scripts/desplegar.sh prod
                                          │
                                          ├─ docker compose up -d --build
                                          │    ├─ npm ci + next build  ← EN PRODUCCIÓN,
                                          │    │                         compitiendo con
                                          │    │                         Postgres y la app viva
                                          │    ├─ migrate (one-shot, sin reversa)
                                          │    └─ recrea app y worker  ← ventana de caída
                                          │
                                          ├─ docker image prune -f   ← borra el único
                                          │                            camino de vuelta
                                          └─ echo "Listo ✅"          ← sin verificar salud
```

Cinco propiedades de este flujo, en orden de gravedad:

1. **El commit desplegado nunca fue validado.** No es que el CI sea débil: no corre.
2. **Se compila en el servidor que atiende a los pacientes.** Un `next build` es lo más pesado que hace este sistema, y se ejecuta con Postgres al lado y sin `mem_limit`.
3. **No hay vuelta atrás.** `prune -f` elimina la imagen anterior; no hay tag, ni registry, ni tag de git.
4. **La migración es irreversible y va acoplada al código.** Si la app nueva no arranca, la vieja ya fue detenida y el esquema ya cambió.
5. **El pipeline no sabe si funcionó.** El paso final es un `echo`.

### 2.2 El pipeline objetivo (mismo stack, sin herramientas nuevas)

```
  Developer                GitHub Actions                     VPS
  ─────────                ──────────────                     ───
  push / PR ─────────────► CI  (push a main y development;
   desde cualquier         │      PR con base main o development)
   rama                    ├─ npm ci
                           ├─ npm audit --audit-level=high --omit=dev
                           ├─ prisma generate + migrate deploy
                           ├─ tsc --noEmit
                           ├─ eslint --max-warnings=36
                           ├─ prettier --check
                           ├─ vitest run --coverage (umbral en dominio/aplicación)
                           ├─ next build
                           ├─ docker build --target runner   ← G-03
                           ├─ docker build --target worker
                           ├─ CodeQL + gitleaks
                           └─ [ml] pip install + import + ruff   ← ML-04
                                     │
                             ✓ verde │  (rama protegida: no se mergea sin esto)
                                     ▼
                        docker build & push
                          ghcr.io/…/app:<sha>     ← inmutable, se construye UNA vez
                          ghcr.io/…/worker:<sha>
                                     │
              ┌──────────────────────┴──────────────────────┐
       merge a development                            merge a main
              ▼                                             ▼
   Deploy · environment: staging              Deploy · environment: produccion
   automático, sin aprobación                 con aprobación manual
   → VPS DE PRUEBAS                           → VPS DE PRODUCCIÓN
              └──────────────────┬──────────────────────────┘
                                 │  mismos pasos; cada environment aporta sus propios
                                 │  VPS_HOST / VPS_USER / VPS_SSH_KEY / VPS_DEPLOY_PATH
                                 ├─ ssh: checkout <sha>  ← el MISMO commit que validó el CI
                                 ├─ docker compose pull  ← segundos, sin build
                                 ├─ migrate (expand-only) ─┐ falla ⇒ aborta
                                 │                          │ SIN tocar los contenedores
                                 ├─ up -d --no-build      ◄─┘
                                 ├─ esperar healthy (timeout 120 s)
                                 ├─ smoke: curl -f /api/salud
                                 └─ si falla ⇒ IMAGE_TAG=<sha anterior> && up -d
                                                           ← rollback en ~40 s
```

**Dos carriles, un solo artefacto.** La imagen se construye una vez por commit y se despliega primero a staging y después —el mismo `<sha>`, sin recompilar— a producción. Es lo que hace que "andaba en pruebas" signifique algo: se promueve el binario exacto que se validó, no una recompilación de las mismas fuentes.

Los secrets se resuelven con **GitHub Environments**: mismos nombres, valores propios de cada entorno. Eso elimina toda lógica condicional del script de despliegue y, de paso, permite **una clave SSH distinta por servidor** — que la de staging se filtre no da acceso a producción.

Diferencias que importan, y por qué:

| Cambio                                  | Riesgo que elimina                                                                          |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| CI en todas las ramas + rama protegida  | Código sin validar en producción (G-01)                                                      |
| Build en el CI, `pull` en el VPS        | El build compitiendo por RAM con Postgres; ventana de caída de minutos → ~40 s (G-08, G-11)  |
| Tags inmutables por SHA + registry      | Rollback pasa de "imposible" a "un `up -d` con la variable anterior" (G-09)                   |
| Migración como paso separado que aborta | Quedarse sin ninguna versión corriendo por un error de esquema (G-12)                        |
| Espera de `healthy` + smoke test        | Despliegues rotos que se reportan como exitosos (G-07)                                       |
| `environment:` con aprobación           | Cualquiera con push disparando producción con la clave SSH (G-13)                            |

Nada de esto requiere Kubernetes, Terraform ni ArgoCD. Es GitHub Actions y Docker Compose, que ya están en el repositorio.

### 2.3 Downtime: qué es alcanzable

| Etapa                                       | Ventana de caída por deploy   | Costo de implementación |
| ------------------------------------------- | ----------------------------- | ----------------------- |
| Hoy (build en el VPS)                       | build + arranque: **minutos** | —                       |
| Con imágenes pre-construidas (G-08)         | arranque: **~40 s**           | Bajo                    |
| \+ blue-green pobre con `upstream` de nginx | **~0 s**                      | Medio                   |
| \+ orquestador con rolling updates          | 0 s                           | Alto (requiere migrar)  |

El **blue-green pobre** merece explicación porque es el techo razonable de este stack: se corre una segunda instancia de `app` en otro puerto de localhost, nginx define `upstream nutri { server 127.0.0.1:3000; server 127.0.0.1:3010 backup; }`, y cada despliegue levanta la inactiva, espera `healthy`, intercambia los roles en el `upstream` y hace `nginx -s reload` (que no corta las conexiones en curso). Cuesta ~250 MB extra de RAM y un script; da despliegues sin caída **y rollback instantáneo** —la instancia anterior sigue viva y caliente—, que en la práctica es el beneficio mayor.

**Recomendación:** no hacerlo todavía. Primero G-08 y G-09, que bajan la ventana a ~40 s y habilitan revertir; sólo si 40 s por despliegue resulta inaceptable, avanzar a blue-green. Para un consultorio con horario de atención, un despliegue de 40 s a las 22:00 no es un problema que justifique complejidad adicional.

---

## 3. Checklist de observabilidad mínima recomendada

Ordenado por lo que **reduce riesgo operativo real**, no por completitud. Los dos primeros niveles son la diferencia entre enterarse de un incidente en minutos o en días.

### Nivel 0 — Antes que cualquier métrica (bloquea pérdida de datos)

- [ ] **Rotación de logs en los 6 servicios** — `logging: {driver: json-file, options: {max-size: 10m, max-file: 3}}`. Sin esto el disco se llena y Postgres deja de escribir. *(G-14)*
- [ ] **`mem_limit` en `app`, `worker` y `minio`** — que un leak en la app no haga que el OOM killer elija a Postgres. *(G-14)*
- [ ] **Alerta de disco > 80 %** y **RAM > 85 %** en el host. Es la alerta que hoy falta y que anticipa la caída total.
- [ ] **`MONITOR_WEBHOOK_URL` cableada** en `x-app-env` y en `.env.produccion.example` — la pieza ya está escrita y desconectada. *(G-22)*

### Nivel 1 — Detección de caídas (10 minutos, gratis)

- [ ] **Monitoreo externo de `/api/salud`** cada 60 s (UptimeRobot / Healthchecks.io) con aviso por email o Telegram. nginx ya está configurado para esto. *(G-28)*
- [ ] **Dead-man's switch del respaldo**: ping a Healthchecks.io al final de `respaldo.sh`; alerta si **no** llega en 26 h. Detecta el respaldo que no corrió, que es el modo de falla hoy invisible. *(G-23)*
- [ ] **Alerta de expiración del certificado TLS** (30 días antes). certbot renueva solo, hasta el día que no.
- [ ] **Errores del worker enrutados por `IMonitorErrores`** con `origen: "worker"` — es el proceso cuyos fallos nadie ve. *(G-27)*

### Nivel 2 — Salud del sistema (métricas que sí se van a mirar)

- [ ] **Profundidad y antigüedad de la cola de pg-boss** — `count(*)` de trabajos en estado `created` y edad del más viejo. Un worker vivo pero atascado hoy es indetectable: el healthcheck sólo comprueba que llegue a Postgres.
- [ ] **Trabajos fallidos en las últimas 24 h**, por nombre de trabajo. Un recordatorio de turno que no salió es un paciente que no vino.
- [ ] **Tasa de 5xx** y **latencia p95**, derivadas del `access_log` de nginx (`goaccess` sobre el log ya existente alcanza; no hace falta un stack de métricas).
- [ ] **Conexiones activas y saturación del pool de Prisma** — el escenario que motivó `/api/salud` (pool agotado) hoy sólo se ve cuando ya falló.
- [ ] **Tamaño de la base y crecimiento semanal** — para anticipar el disco lleno con semanas de aviso, no con horas.
- [ ] **Tiempo y tamaño del último respaldo exitoso** — un dump que de pronto pesa la mitad es una señal de corrupción antes de que se note en la app.

### Nivel 3 — Calidad del servicio (cuando lo anterior esté cubierto)

- [ ] **Endpoint `/api/metricas`** protegido por token, formato Prometheus, con los contadores del Nivel 2. Permite enchufar un colector el día que haga falta, sin volver a instrumentar.
- [ ] **Logs estructurados unificados** (mismo JSON que `MonitorErroresConsola`) para app y worker, con `requestId` correlacionable. Coordinar con la rotación del Nivel 0: rotar sin destino externo pierde evidencia. *(G-26)*
- [ ] **Tasa de degradación de integraciones** — cuántas veces por día la app cayó al stub de ML, de Claude o de Open Food Facts. **Es exactamente la métrica que habría delatado ML-01 el día que se aplicó la migración 27.**
- [ ] **Simulacro de restauración trimestral** documentado con fecha y resultado. No es observabilidad en sentido estricto, pero es lo único que valida que el plan de recuperación existe de verdad. *(G-24)*

### Explícitamente fuera de alcance

Trazas distribuidas (OpenTelemetry/Jaeger), APM comercial y service mesh. A esta escala cuestan más operación de la que ahorran. *(G-29)*

> **Actualización (2026-09-07) — Prometheus + Grafana pasa a estar EN alcance.** El veredicto original ("fuera de alcance") se calculaba sobre un único VPS, donde el stack de monitoreo compite por la misma RAM que debe vigilar y cae junto con lo que monitorea. Con el VPS de staging separado (G-19) esa objeción desaparece. Ver §3.1.

### 3.1 Stack de métricas (decisión: 2026-09-07, revisada)

**Vive en un repositorio y un VPS propios**, no dentro de este proyecto.

> **Revisión.** La primera versión de esta sección lo ubicaba en el VPS de staging de este proyecto. Eso deja de servir en cuanto se monitorea más de un proyecto: el monitoreo no puede vivir dentro de uno de los sistemas que vigila —cae con él y le crea una dependencia rara al resto—, y las reglas genéricas (disco, RAM, host caído) no son de este proyecto sino de cualquiera. Se extrajo al repositorio `monitoreo`, hermano de éste, siguiendo la misma convención que ya se usó con `nutricion-servicio`.
>
> Efecto secundario útil: **staging vuelve a necesitar sólo ~2 GB**, porque ya no lleva el stack de métricas encima.

**Dónde corre: en un VPS propio, pequeño (2 GB alcanzan).** Es la decisión que define si el monitoreo sirve o es decorativo. Si Prometheus corre en el host que vigila y ese host se queda sin RAM —el riesgo #1 de esta auditoría—, el monitoreo cae justo cuando hace falta.

| Componente          | Qué aporta                                        | Dónde         |
| ------------------- | ------------------------------------------------- | ------------- |
| `node_exporter`     | CPU, **RAM, disco**, red del host                 | En cada VPS   |
| `postgres_exporter` | conexiones, tamaño de base, queries lentas        | En cada VPS   |
| Prometheus          | scrapea, almacena, evalúa reglas                  | Staging       |
| Grafana             | dashboards + alertas (*unified alerting*)         | Staging       |

Con el alerting integrado de Grafana se evita Alertmanager: cuatro piezas en lugar de cinco.

**Red:** producción debe exponer sus métricas a staging sin publicarlas a internet (`node_exporter` filtra bastante detalle del host). Regla de firewall restringida a la IP de staging en 9100/9187, o —preferible— un túnel WireGuard entre ambos VPS, que además deja una red privada reutilizable.

**Dimensionamiento — decidir al contratar el VPS de staging:** el stack pide ~500-800 MB (Prometheus ~300-500, Grafana ~150-250, exporters ~40) **por encima** del stack de staging (Postgres + Next + MinIO + worker ≈ 1,5-2 GB). **Staging necesita 4 GB.** Con 2 GB no entra, y ampliarlo después es una migración.

**Las cinco reglas de alerta iniciales.** El modo de falla del monitoreo autoalojado a esta escala es: entusiasmo → alertas ruidosas → todos las silencian → decoración. La defensa es arrancar con pocas reglas que justifiquen despertarse:

1. Disco > 80 % en cualquiera de los dos hosts
2. RAM > 85 % sostenida 5 minutos
3. Postgres caído
4. Target `down` (el VPS no responde al scrape)
5. Último respaldo exitoso hace más de 26 h

La regla 5 **reemplaza la dependencia externa de Healthchecks.io propuesta en G-23**: `respaldo.sh` escribe un timestamp con el *textfile collector* de `node_exporter` y Prometheus alerta por antigüedad. Una dependencia externa menos.

**Dos cosas que este stack NO reemplaza:**

- **No reemplaza G-14.** Grafana *avisa* que el disco se llena; `max-size: 10m` hace que **no se llene**. Prevenir gana a detectar, y el orden importa: primero rotación y `mem_limit`, después el monitoreo que confirma que funcionan.
- **No reemplaza el chequeo externo (G-28).** Si ambos VPS están en el mismo datacenter y el proveedor tiene un incidente, el monitoreo cae con ellos. Un UptimeRobot gratuito contra `/api/salud` es la capa independiente.

**Alternativa: Grafana Cloud (free tier).** 10k series, 14 días, 3 usuarios: de sobra para dos VPS. Ahorra los ~600 MB de RAM, el parcheo y el riesgo de exponer un Grafana autoalojado con credenciales por defecto en un sistema con datos de salud. Nota sobre el criterio de terceros aplicado en G-30 (donde se descartó Mailtrap): no es el mismo caso — **Mailtrap habría recibido nombres, emails y teléfonos de pacientes; Grafana Cloud recibe porcentajes de CPU y uso de disco.** Con `postgres_exporter` se suman nombres de tablas y conteos de filas: forma del esquema, no contenido clínico.

---

## 4. El servicio de ML: postura de infraestructura

La topología documentada (`docs/DESPLIEGUE.md` §1: "ML corre en otro entorno, nube on-demand") es defendible en el papel pero **paga un costo de infraestructura que no está presupuestado**. Para leer datos, el servicio necesita `DATABASE_URL_RO` alcanzable, y hoy Postgres vive en la red interna de Docker sin puertos publicados —que es la decisión correcta. Cumplir esa postura exige una de tres cosas: abrir el 5432 al mundo (con datos de salud, no), montar una réplica de streaming en otro host (otro servidor, otro respaldo, otro punto de falla), o un túnel/VPN (viable, pero es infraestructura nueva que mantener).

A cambio de ese costo no se gana capacidad: la carga real es un puñado de nutricionistas abriendo una pantalla, y la inferencia sobre 40 features tarda microsegundos.

**Recomendación operativa** — contenedor en el mismo compose, red `interna`, sin `ports:`, con `mem_limit: 512m` y `ML_SERVICE_URL=http://ml:8000` en el entorno de la app. El "solo lectura" se garantiza con un rol de Postgres y no con una réplica física:

```sql
CREATE ROLE ml_lector LOGIN PASSWORD '…';
GRANT CONNECT ON DATABASE nutricionista TO ml_lector;
GRANT USAGE ON SCHEMA public TO ml_lector;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO ml_lector;
ALTER ROLE ml_lector SET default_transaction_read_only = on;
ALTER ROLE ml_lector SET statement_timeout = '15s';
```

Esto da lo mismo que busca `ml-servicio/db.py:33` con su `SET default_transaction_read_only`, pero **garantizado del lado del servidor**, no por cortesía del cliente. El `statement_timeout` es la parte que hoy no existe en ninguna forma: sin él, una consulta pesada del ML puede ahogar a la app.

**Condición previa (verificar antes de implementar):** FastAPI + numpy + scikit-learn residentes son ~250-400 MB. Con Postgres + Next.js + MinIO + worker en el mismo host, en un VPS de 4 GB entra ajustado y **exige** los `mem_limit` de G-14; en uno de 2 GB no se debe agregar hasta ampliar. Esta verificación es el primer paso, no un detalle.

**El cambio que hace irrelevante la discusión** (ML-03): mover la puntuación a un job nocturno del worker, que ya corre crons, escribiendo a una tabla de insights. Consecuencias operativas, en orden de valor: la pantalla carga instantánea siempre; si el servicio de ML está caído, los insights de ayer siguen ahí, **de modo que deja de ser un componente crítico**; el pico de carga pasa a las 04:00 en lugar de coincidir con el horario de consulta; y queda registro histórico de predicciones, que es exactamente lo que se necesita para entrenar y para detectar deriva más adelante.

**Gatillos para separarlo a su propio host** (definidos ahora para no discutirlos durante un incidente): el batch nocturno supera ~15 min o el VPS se queda sin RAM; hace falta GPU; se necesitan ciclos de release independientes de la app; o un cliente exige aislamiento de cómputo por compliance. Ninguno aplica hoy, y como el contrato ya es HTTP, mudarlo el día que aplique es cambiar una URL.

---

## 5. Qué se arregla sin cambiar de stack, y qué no

### Sin cambiar nada del stack (Docker Compose + GitHub Actions + nginx, todo ya presente)

| Acción                                                  | Gaps que cierra        | Esfuerzo |
| ------------------------------------------------------- | ---------------------- | -------- |
| Agregar `development` a `push` y `pull_request` en el CI | G-01                  | 5 min    |
| Eliminar el job `go` huérfano                           | G-02                   | 2 min    |
| `logging` + `mem_limit` en los 6 servicios              | G-14                   | 20 min   |
| Cablear `MONITOR_WEBHOOK_URL` en compose y `.example`   | G-22                   | 10 min   |
| Monitoreo externo de `/api/salud`                       | G-28                   | 10 min   |
| Dead-man's switch en `respaldo.sh`                      | G-23                   | 15 min   |
| Corregir `activo` → `archivadoEn` y loguear el `except` | ML-01                  | 15 min   |
| Job de `docker build` en el CI                          | G-03                   | 30 min   |
| Pinear `minio/minio`, `minio/mc` y `requirements.txt`   | G-16, ML-04            | 30 min   |
| Versionar `ml-servicio/` con `Dockerfile`               | G-15                   | 1 h      |
| Build en CI + push a GHCR + tags por SHA                | G-04, G-08, G-09, G-11 | 3-4 h    |
| Espera de `healthy` + smoke test + rollback en el script | G-07, G-12            | 2-3 h    |
| `environment: produccion` con aprobación                | G-13                   | 15 min   |
| Errores del worker por `IMonitorErrores`                | G-27                   | 1 h      |
| Validación de entorno con Zod al arranque               | G-18                   | 2-3 h    |
| Script idempotente `preparar-vps.sh`                    | G-17                   | 3-4 h    |
| Simulacro de restauración documentado                   | G-24, G-25             | 2 h      |
| Contenedor `ml` en la red interna + rol `ml_lector`     | ML-02                  | 2 h      |
| Batch nocturno de insights en el worker                 | ML-03                  | 1-2 días |
| Blue-green pobre con `upstream` de nginx                | G-11 (a cero)          | 1 día    |

**Prácticamente toda la reducción de riesgo de esta auditoría está en esta tabla.** Las cuatro primeras filas suman menos de una hora y cubren los dos escenarios que hoy pueden causar pérdida de datos.

### Requeriría migración de stack (y por qué **no** se recomienda hoy)

| Capacidad                                         | Qué exigiría                                     | Veredicto                                                                                                                                                                              |
| ------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rolling updates y auto-healing reales             | Kubernetes / Nomad / Swarm                       | **No.** Con un host y un puñado de usuarios, el blue-green de nginx da el mismo resultado observable a una fracción del costo operativo.                                                  |
| Alta disponibilidad real (sin SPOF)               | Segundo VPS + Postgres replicado + balanceador   | **No todavía.** Duplica el costo mensual. El SPOF de un host es aceptable mientras un RTO de horas lo sea; revisar cuando exista un SLA contractual.                                       |
| RPO < 24 h                                        | WAL archiving continuo a OVH (`archive_command`) | **Evaluar.** No es cambio de stack (es configuración de Postgres) pero sí de complejidad operativa. La pregunta previa es de negocio: ¿cuánto duele perder un día de historias clínicas?  |
| Métricas y dashboards históricos                  | Prometheus + Grafana (autoalojado o Cloud)       | **Adoptado** (decisión 2026-09-07, ver §3.1). No es cambio de stack: corre en el VPS de staging, sin tocar producción. Única condición de orden: las alertas del Nivel 0 y los `mem_limit` de G-14 van **antes**, porque previenen lo que el monitoreo sólo detecta. |
| Escalado horizontal de la app                     | Sesiones y SSE fuera del proceso                 | **No aplica.** La carga no lo justifica; y el limitador de tasa en memoria (ya señalado en `nginx.conf.ejemplo`) tendría que salir del proceso primero.                                   |
| Entrenamiento de modelos en infraestructura propia | Pipeline de MLOps                               | **No.** Con ~2.400 filas × 40 features, entrenar es un script y un `.joblib` en un portátil. El artefacto viaja dentro de la imagen; el rollback del modelo es redesplegar la anterior.   |

---

## 5 bis. Estado de implementación (2026-09-07)

Implementado en la rama `infra/endurecimiento-operativo`. Cada punto quedó
verificado ejecutándolo, no sólo escribiéndolo.

| Gap | Estado | Verificación |
| --- | ------ | ------------ |
| G-01 Triggers del CI | ✅ | `push`/`pull_request` sobre `main` y `development` |
| G-02 Job `go` huérfano | ✅ | eliminado; se agregó el job `ml` |
| G-03 El CI no construye la imagen | ✅ | job `imagenes` con matriz de 5 componentes |
| G-04 Trazabilidad del despliegue | ✅ | `checkout --detach <sha>` + Environments |
| G-07 Verificación post-deploy | ✅ | espera de `healthy`, probada contra contenedor sano y enfermo |
| G-08 Build en producción | ✅ | se construye en el CI y se publica a GHCR |
| G-09 Rollback | ✅ | etiquetas por SHA + `scripts/revertir.sh` |
| G-13 Permisos del deploy | ✅ | `environment:` por carril |
| G-14 Límites de recursos y logs | ✅ | rotación en los 9 servicios; Postgres sin `mem_limit` a propósito |
| G-15 `ml-servicio` sin versionar | ✅ | versionado, con `Dockerfile`; imagen construida y ejercitada |
| G-16 Imágenes sin fijar | ✅ | MinIO y `mc` fijados; Postgres en `:18` por decisión |
| G-19 Aislamiento prod/staging | ✅ | documentado el modelo de dos VPS |
| G-22 Alertas | ✅ | `MONITOR_WEBHOOK_URL` cableada |
| G-23 Respaldos silenciosos | ✅ | métricas para node_exporter; 4 casos probados |
| G-27 El worker no reporta | ✅ | `boss.on("error")`, fallo por inquilino y cola de fallidos |
| G-30 SMTP de staging | ✅ | Mailpit bajo perfil `correo-prueba` |
| G-31 Lock incompatible | ✅ | lock regenerado con npm 10 + `.nvmrc` + guard en el CI |
| G-33 `nodemailer` vulnerable | ✅ | override de primer nivel; gate de `npm audit` en verde |
| ML-01 Servicio roto | ✅ | corregido; log verificado con base inexistente |
| ML-02 Topología del ML | ✅ | servicio `ml` interno bajo perfil + `scripts/crear-rol-ml.sql` |
| ML-04 Empaquetado del ML | ✅ | `requirements.txt` fijado con `==` |
| G-17 IaC del servidor | 🟡 | `scripts/preparar-vps.sh` escrito; **su primera corrida real es el ensayo** |
| G-21 Métricas | 🟡 | **movido al repositorio `monitoreo`** (hermano de éste, como `nutricion-servicio`). Probado: reglas validadas con `promtool`, stack levantado, descubrimiento por archivo verificado en caliente. Falta instalarlo en un VPS. |
| G-32 Contrato de métricas | ✅ | `respaldos/metricas-publicadas.yml` + check en el CI, probado en los dos sentidos |
| G-05 Gates de calidad | ⬜ | sin `--max-warnings` ni umbral de cobertura |
| G-06 Dependabot | ⬜ | |
| G-11 Ventana de caída | ⬜ | bajó a ~40 s; blue-green pendiente y no urgente |
| G-18 Validación de entorno | ⬜ | |
| G-24/G-25 Simulacro y RTO/RPO | ⬜ | requiere el VPS de staging |
| G-28 Monitoreo externo | ⬜ | **no se puede hacer desde el repo**: 10 min en UptimeRobot |
| ML-03 Batch nocturno | ⬜ | |

**Decisión registrada — Node 22.** No se sube a 24 pese a que el entorno local
lo use: Node 22 es lo desplegado y probado, tiene soporte hasta abril de 2027, y
perseguir la versión local no arregla la causa (con Node 26 el desajuste
volvería). La causa la arregla fijar la versión en `.nvmrc` y **verificarlo
automáticamente**, que es lo que ahora hace el CI.

---

## 6. Orden de ejecución recomendado

Ordenado por riesgo evitado por hora invertida, no por dificultad.

**Esta semana (≈ 2 h en total; cubre los dos escenarios de pérdida de datos):**

1. `logging` con `max-size` y `mem_limit` en `docker-compose.prod.yml` *(G-14)*
2. Monitoreo externo de `/api/salud` *(G-28)*
3. `MONITOR_WEBHOOK_URL` cableada en el compose y en `.env.produccion.example` *(G-22)*
4. Dead-man's switch del respaldo *(G-23)*
5. Corregir `ml-servicio/features.py:48` y loguear en el `except` de `main.py:115` *(ML-01)*

**Al montar el VPS de staging — hacerlo *en ese momento*, no después:**

6. **`preparar-vps.sh` idempotente, escrito mientras se arma la máquina** *(G-17)*. Es la única oportunidad barata de ensayar la reconstrucción: sale el servidor **y** un procedimiento de recuperación probado. Hecho a mano, sale sólo el servidor.
7. Agregar el servicio `mailpit` al compose bajo perfil, antes del primer arranque *(G-30)*
8. `APP_PORT=3000` en `.env.staging` y actualizar `docs/DESPLIEGUE.md` §7, que describe el modelo de VPS compartido *(G-19)*
9. **Contratarlo con 4 GB**, no 2: el stack de métricas de §3.1 va montado ahí y no entra en 2 GB *(G-21)*
10. `node_exporter` en ambos VPS + Prometheus y Grafana en staging, con las cinco reglas de alerta de §3.1 *(G-21, G-22, y reemplaza el sink externo de G-23)*

**Este mes:**

11. CI disparando en `development` + eliminar el job `go` + rama protegida *(G-01, G-02)*
12. Dos carriles de deploy con GitHub Environments, y sacar el `git pull --ff-only` de `desplegar.sh:31` *(G-04, G-13)*
13. Build en el CI, push a GHCR, tags por SHA, deploy con `pull` *(G-08, G-09)*
14. Smoke test, espera de `healthy` y rollback de un comando *(G-07, G-12)*
15. Versionar `ml-servicio/` y pinear las imágenes base *(G-15, G-16, ML-04)*
16. Errores del worker por el monitor *(G-27)*

**Este trimestre:**

17. Simulacro de restauración **sobre el VPS de staging** + RTO/RPO declarados *(G-24, G-25)*. Antes de correrlo, verificar que **ningún** canal de envío pueda alcanzar pacientes reales: mailpit cubre el email (G-30), pero si la configuración de WhatsApp vive por inquilino en la base, viaja dentro del dump restaurado y no pasa por SMTP. Confirmar ese punto antes del primer simulacro.
18. Validación de entorno al arranque *(G-18)*
19. Contenedor `ml` interno + batch nocturno de insights *(ML-02, ML-03)*
20. Métricas del Nivel 2 sobre el stack de §3.1 (cola de pg-boss, pool de Prisma, 5xx y p95) y decisión sobre WAL archiving *(G-21, G-25)*

---

## Anexo — Verificaciones ejecutadas

| Afirmación                                        | Comando                                                                         | Resultado                                      |
| ------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------- |
| `main` vs `development`                           | `git rev-list --left-right --count main...development`                          | `0  67`                                        |
| `ml-servicio/` no está versionado                 | `git status --porcelain ml-servicio` / `git ls-files ml-servicio`               | `?? ml-servicio/` / vacío                      |
| `nutricion-servicio/` eliminado pero vivo en main | `git ls-tree -r main --name-only \| grep nutricion`                             | `nutricion-servicio/go.mod`                    |
| Sin límites de recursos ni de logs                | `grep -E "logging\|mem_limit\|deploy:\|resources" docker-compose.prod.yml`      | sin coincidencias                              |
| `MONITOR_WEBHOOK_URL` no llega a producción       | `grep -rn "MONITOR_WEBHOOK_URL" .env.produccion.example docker-compose.prod.yml` | sin coincidencias                             |
| Sin tags de release                               | `git tag`                                                                       | vacío                                          |
| Sin Dependabot ni otros workflows                 | `find .github -type f`                                                          | sólo `ci.yml` y `deploy.yml`                   |
| Secretos no versionados                           | `git ls-files \| grep "^\.env"`                                                 | sólo los tres `*.example`                      |
| Columna `activo` eliminada                        | `grep -rn 'DROP COLUMN "activo"' prisma/migrations/`                            | `27_integridad_modelo_datos/migration.sql:346` |
| Relación tests / archivos fuente                  | `git ls-files "src/**/*.test.ts*"` vs `git ls-files "src/**/*.ts*"`             | 216 / 1191                                     |
