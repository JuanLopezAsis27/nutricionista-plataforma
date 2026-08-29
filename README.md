# nutricionista-app

Plataforma de gestión integral para un consultorio de nutrición deportiva
(Lic. Nicolás López Asis). Permite administrar **pacientes, turnos, evaluaciones
clínicas, planes nutricionales, recetario, diario del paciente, objetivos,
seguimiento, mensajería y estadísticas**, con un **portal para el paciente** y
andamiaje de **IA/ML** ya integrado. Es **multi-inquilino** (varios
profesionales, cada uno aislado) y **mobile-ready** (shell Capacitor).

> Todo el código, comentarios y nombres están en **español** (salvo palabras
> reservadas del lenguaje y librerías externas). Es una decisión de proyecto.

---

## Índice

- [Estado actual](#estado-actual)
- [Tecnologías](#tecnologías)
- [Arquitectura](#arquitectura-clean-architecture)
- [La carpeta `lib` y el límite frontend/backend](#la-carpeta-lib-y-el-límite-frontendbackend)
- [Cómo funciona](#cómo-funciona)
- [Integraciones externas](#integraciones-externas)
- [Puesta en marcha](#puesta-en-marcha-desarrollo)
- [Scripts](#scripts)
- [Testing](#testing)
- [Qué sigue / dónde estamos parados](#qué-sigue--dónde-estamos-parados)

---

## Estado actual

El plan maestro **F0–F19** está completo. La app cubre de punta a punta el
flujo del consultorio y el portal del paciente. Lo último incorporado:

- **Paginación server-side** (10 por página, trae solo la página) en pacientes,
  recetas, biblioteca y planes.
- **Recuperación de contraseña** por email (token de un solo uso, hasheado).
- **Rate-limiting** en el login (anti fuerza bruta).
- **Monitoreo de errores** (puerto agnóstico + consola/webhook, costura para Sentry).
- **Adjuntos en recetas** (enlaces + documentos PDF/Word).
- **Módulo deportistas** (perfil deportivo + calendario de competencias, integrado al asistente IA).

Verificación de referencia: `tsc` estricto limpio, **362 tests** (Vitest),
`next build` OK, **25 migraciones** Prisma aplicadas sin drift.

---

## Tecnologías

| Área                    | Stack                                                                           |
| ----------------------- | ------------------------------------------------------------------------------- |
| **Framework**           | Next.js 16 (App Router) · React 19 · TypeScript estricto                        |
| **API**                 | tRPC v11 (type-safe de extremo a extremo) · React Query v5                      |
| **Validación**          | Zod (en el borde de cada capa)                                                  |
| **Base de datos**       | PostgreSQL + Prisma ORM 6                                                       |
| **Autenticación**       | Auth.js v5 (Credentials + bcrypt), sesión JWT                                   |
| **UI**                  | Tailwind CSS · shadcn/ui (Radix) · lucide-react · next-themes (claro/oscuro)    |
| **Gráficos**            | Recharts (paleta accesible validada)                                            |
| **Tiempo real**         | SSE vía tRPC subscriptions + Postgres `LISTEN/NOTIFY` (sin WebSocket)           |
| **Jobs en background**  | pg-boss (usa el mismo Postgres) en un proceso _worker_ aparte                   |
| **Almacenamiento**      | MinIO (API S3-compatible; intercambiable por S3/R2)                             |
| **Email**               | Nodemailer/SMTP (Mailpit en desarrollo)                                         |
| **PDF**                 | @react-pdf/renderer (planes nutricionales con membrete)                         |
| **IA**                  | Anthropic SDK (Claude: chat + visión) detrás de puertos, con degradación a stub |
| **ML**                  | Microservicio Python (FastAPI) detrás de puertos HTTP, con fallback             |
| **Datos nutricionales** | FatSecret / Open Food Facts / Excel propio del nutri (exceljs)                  |
| **Mobile**              | Capacitor (Android/iOS) + HealthKit/Health Connect (wearables)                  |
| **Testing**             | Vitest (casos de uso con repos mock)                                            |
| **Infra dev**           | Docker Compose (Postgres + MinIO + Mailpit)                                     |
| **Deploy**              | Docker (imagen `standalone`) detrás de nginx en un VPS                          |

---

## Arquitectura (Clean Architecture)

Las dependencias **siempre apuntan hacia adentro**: una capa interna nunca
importa de una externa. La infraestructura implementa las interfaces del dominio
(inversión de dependencias).

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTACIÓN                                                 │
│  src/app (páginas Next.js, route handlers)                   │
│  src/servidor (routers tRPC, contexto, middlewares)          │
│  src/componentes · src/lib (glue de framework, ver abajo)    │
└───────────────┬─────────────────────────────────────────────┘
                │ depende de ↓ (a través de servicios)
┌───────────────▼─────────────────────────────────────────────┐
│  APLICACIÓN — src/aplicacion                                 │
│  /servicios  (orquestan casos de uso)                        │
│  /dtos       (esquemas Zod de entrada/salida)                │
└───────────────┬─────────────────────────────────────────────┘
                │ depende de ↓
┌───────────────▼─────────────────────────────────────────────┐
│  DOMINIO — src/dominio  (núcleo, cero dependencias externas) │
│  /entidades      (reglas de negocio, validaciones)           │
│  /casos-de-uso   (un archivo por caso de uso, SRP)           │
│  /repositorios   (interfaces = contratos, nunca Prisma)      │
│  /servicios      (puertos de salida: email, bucket, IA…)     │
│  /errores        (errores de dominio tipados)                │
└───────────────▲─────────────────────────────────────────────┘
                │ implementa las interfaces ↑ (DIP)
┌───────────────┴─────────────────────────────────────────────┐
│  INFRAESTRUCTURA — src/infraestructura                       │
│  /repositorios  (implementaciones Prisma)                    │
│  /contenedor    (inyección de dependencias manual)           │
│  almacenamiento · email · ia · ml · pdf · tiempo-real · …    │
└──────────────────────────────────────────────────────────────┘
```

### Patrón por módulo (idéntico en toda la app)

```
entidad → interfaz IXRepositorio → casos de uso (clase con ejecutar())
        → DTO Zod → ServicioX → PrismaRepositorioX
        → contenedor/modulos/* → router tRPC → hook → página/componente
```

- **Inyección de dependencias manual**, sin librerías: todo se ensambla en
  [`src/infraestructura/contenedor/contenedor.ts`](src/infraestructura/contenedor/contenedor.ts)
  (armado por módulo en `contenedor/modulos/*`). Los casos de uso reciben
  interfaces por constructor; nunca instancian Prisma.
- **Decimal nunca sale de infraestructura**: los repos convierten `Decimal ↔ number`.
- **Errores de dominio tipados** → el middleware tRPC los traduce a `TRPCError`.

### Multi-inquilino (aislamiento por `nutricionistaId`)

El _tenant_ es el **nutricionista**. Una **extensión de Prisma + `AsyncLocalStorage`**
([`PrismaClienteSingleton`](src/infraestructura/repositorios/PrismaClienteSingleton.ts) +
[`contextoTenant`](src/infraestructura/multitenancy/contextoTenant.ts)) filtra y
asigna `nutricionistaId` en todas las tablas de inquilino de forma automática y
**fail-closed** (si no hay alcance fijado, la consulta lanza; nunca hay fuga de
datos entre profesionales). Cada entry point HTTP envuelve su trabajo en
`conAlcanceDeSesion(...)`. Rol `SUPERADMIN` = alcance global (gestiona cuentas).

---

## La carpeta `lib` y el límite frontend/backend

**`src/lib` no es una capa de Clean Architecture.** Es el _pegamento de
framework_ de la capa de **presentación**: no contiene lógica de negocio (esa
vive en dominio/aplicación). Se divide en dos naturalezas:

| Archivo(s) en `lib`                                                     | Naturaleza                    | Rol                                                                               |
| ----------------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------------- |
| `lib/trpc.ts`                                                           | **Frontend** (`"use client"`) | Cliente tRPC tipado desde `RouterApp`                                             |
| `lib/hooks/*` (useRecetas, usePlanes, useDeportivo…)                    | **Frontend**                  | Hooks React Query que envuelven las llamadas tRPC                                 |
| `lib/formato.ts`, `lib/utilidades.ts` (`cn`), `lib/plantillaPreview.ts` | **Frontend** (helpers de UI)  | Formato de fechas/moneda, clases Tailwind, preview de plantillas                  |
| `lib/autenticacion/auth.ts`                                             | **Backend** (servidor)        | Configuración de Auth.js: valida credenciales con bcrypt contra el **contenedor** |
| `lib/autenticacion/auth.config.ts`                                      | **Backend** (Edge)            | Config base que usa el middleware (`proxy.ts`) para proteger rutas                |
| `lib/autenticacion/tipos.ts`                                            | Compartido (tipos)            | Augment de tipos de sesión/JWT                                                    |

Es decir: `lib` es **mayormente frontend** (cliente tRPC + hooks + formato), con
una excepción **backend** que es `lib/autenticacion` (la integración de Auth.js
con el servidor). El resto de la app llega al dominio **siempre a través de los
servicios de aplicación**, nunca importando dominio/Prisma desde el navegador.

### Cómo interactúa `lib` con la aplicación

```
Componente React ──usa──▶ lib/hooks/useX ──usa──▶ lib/trpc (cliente)
        │                                              │  HTTP /api/trpc (SSE para subscriptions)
        ▼                                              ▼
   render UI                            src/servidor/routers/*  (tRPC)  ← BACKEND
                                                       │
                                                       ▼
                                   ctx.servicios.*  (aplicación) → dominio → infra
```

### Delimitación frontend / backend

**Frontend** (corre en el navegador — componentes `"use client"`):

- `src/componentes/**` (UI, formularios, tablas, gráficos)
- páginas cliente de `src/app/**/page.tsx`
- `src/lib/trpc.ts`, `src/lib/hooks/**`, `src/lib/formato.ts`,
  `src/lib/utilidades.ts`, `src/lib/plantillaPreview.ts`

**Backend** (corre en Node/servidor):

- `src/dominio/**`, `src/aplicacion/**`, `src/infraestructura/**`
- `src/servidor/**` (routers tRPC, contexto, `trpc.ts`)
- `src/app/api/**` (route handlers: `/api/trpc`, `/api/archivos`, `/api/planes/[id]/pdf`, `/api/monitoreo`)
- `src/lib/autenticacion/**` (Auth.js server + edge config)
- `src/trabajos/**` (worker de pg-boss), `src/instrumentation.ts`, `src/proxy.ts` (middleware)

> **La frontera real** frontend↔backend es la llamada tRPC a `/api/trpc`.
> Next.js difumina el límite (una página puede ser Server Component renderizado
> en el servidor), pero el contrato de datos siempre pasa por tRPC + Zod.

---

## Cómo funciona

### Roles

| Rol               | Entra a      | Puede                                                                      |
| ----------------- | ------------ | -------------------------------------------------------------------------- |
| **SUPERADMIN**    | `/admin`     | Alta/baja de cuentas de nutricionista (global)                             |
| **NUTRICIONISTA** | `/dashboard` | Todo su consultorio (pacientes, turnos, planes, recetas, IA…)              |
| **PACIENTE**      | `/mi-inicio` | Su portal: plan, recetas, diario, progreso, objetivos, mensajes, asistente |

Auth por credenciales (email + password con bcrypt), sesión JWT. El middleware
([`src/proxy.ts`](src/proxy.ts)) protege `/dashboard`, `/admin`, `/mi-*` y `/mis-*`.

### Superficies principales

- **Dashboard del nutri** (`src/app/dashboard`): pacientes (con ficha por
  pestañas: Evaluación, Progreso, Informes, Objetivos, Diario, Turnos, Plan,
  Suplementos, **Deporte**, Mensajes), planes, recetas, biblioteca, turnos,
  estadísticas, plantillas de email, integraciones, análisis IA, configuración.
- **Portal del paciente** (`src/app/(paciente)`): inicio "hoy", mi-plan,
  mis-recetas, mi-diario, mi-progreso, mis-objetivos, mensajes, asistente IA.
- **Auth** (`src/app/(auth)`): login, recuperar y restablecer contraseña.

### Flujos destacados

- **Subida de archivos**: nunca por tRPC. Route handler `POST /api/archivos`
  (multipart) sube al bucket; tRPC solo transporta el `archivoId`. La lectura es
  `GET /api/archivos/[id]` → 302 a una URL firmada temporal.
- **PDF del plan**: `GET /api/planes/[id]/pdf` renderiza con @react-pdf/renderer
  (membrete configurable, recetas completas y adjuntos).
- **Tiempo real**: mensajes y alertas se empujan por SSE (Postgres
  `LISTEN/NOTIFY`), así el worker puede notificar a la app entre procesos.
- **Jobs**: el worker (`npm run worker`) corre crons (recordatorios de turnos,
  generación de alertas de seguimiento, limpieza de archivos huérfanos).

---

## Integraciones externas

| Integración                              | Para qué                                                | Degradación si no está configurada |
| ---------------------------------------- | ------------------------------------------------------- | ---------------------------------- |
| **MinIO / S3**                           | Fotos, laboratorios, documentos de recetas              | Requerida para archivos            |
| **SMTP (Mailpit/real)**                  | Bienvenida, recordatorios, recuperación de contraseña   | Sin envío de mails                 |
| **Claude (Anthropic)**                   | Asistente del paciente + análisis de foto de comida     | Cae al **stub** de demostración    |
| **Microservicio ML (Python)**            | Insights predictivos (abandono, adherencia, peso)       | Cae al **stub**                    |
| **FatSecret**                            | Datos nutricionales de ingredientes                     | Cae a **Open Food Facts**          |
| **`nutricion-servicio` (Go)**            | Traduce/filtra FatSecret ES↔EN                          | Cae al proveedor local             |
| **Excel de alimentos**                   | El nutri sube su propia base de macros                  | Usa FatSecret/OFF                  |
| **Google Calendar + Gmail**              | Sync de turnos y envío desde la casilla del profesional | SMTP + sin sync                    |
| **Webhook de monitoreo**                 | Avisos de error (Slack/Discord)                         | Solo logs de consola               |
| **Capacitor + HealthKit/Health Connect** | Métricas de wearables (opt-in por día)                  | App web normal                     |

Las claves de Claude/FatSecret se cargan **por profesional** desde la app
(cifradas por inquilino) y se resuelven por request. Config general por
variables de entorno (ver `.env.example`).

---

## Puesta en marcha (desarrollo)

**Requisitos:** Node 20+, Docker Desktop.

```bash
# 1. Dependencias
npm install

# 2. Servicios locales (Postgres + MinIO + Mailpit)
docker compose up -d

# 3. Variables de entorno
cp .env.example .env      # completar las que falten

# 4. Base de datos
npx prisma migrate deploy   # aplica las migraciones
npm run db:seed             # SUPERADMIN + nutri demo + semillas

# 5. App + worker (en dos terminales)
npm run dev                 # http://localhost:3000
npm run worker              # crons y jobs en background
```

Consolas útiles en dev: MinIO `:9001`, Mailpit `:8025`.

---

## Scripts

| Script                                  | Qué hace                                                      |
| --------------------------------------- | ------------------------------------------------------------- |
| `npm run dev`                           | App Next.js en desarrollo                                     |
| `npm run worker`                        | Worker de pg-boss (crons/jobs), recarga en caliente           |
| `npm run build` / `npm start`           | Build de producción (`standalone`) y arranque                 |
| `npm test`                              | Suite Vitest (casos de uso con mocks)                         |
| `npm run db:seed`                       | Siembra inicial (superadmin, nutri demo, plantillas, axiomas) |
| `npm run prisma:studio`                 | Explorador de la base                                         |
| `npm run cap:sync` / `cap:open:android` | Shell mobile (Capacitor)                                      |

Documentación adicional en [`docs/`](docs/): `DESPLIEGUE.md`, `MOBILE.md`,
`WEARABLES.md`, `WHATSAPP.md`, `RECORDATORIOS.md`, `AGENDA.md`, `PLANES.md`,
`nginx.conf.ejemplo`.

---

## Qué sigue / dónde estamos parados

El núcleo funcional está **completo y verificado**. Lo pendiente es sobre todo
puesta en producción y profundizar la IA/ML:

- **Producción**: desplegar en el VPS (Docker + nginx como reverse proxy),
  backups y staging (ver `docs/DESPLIEGUE.md`). Postgres y app en el disco
  principal; MinIO en disco extra.
- **IA con profundidad**: los adaptadores Claude ya existen detrás de los
  puertos; falta afinarlos y cargar las claves del profesional en producción.
- **ML real**: desplegar el microservicio Python contra una réplica de solo
  lectura y entrenar los modelos con los datos ya acumulados (hoy: stub/HTTP con
  fallback). Sumar el loop de feedback del profesional.
- **Wearables**: terminar el shell Capacitor + HealthKit/Health Connect
  (andamiaje y modelo `MetricaDispositivo` ya integrados al tracking).
- **Auto-registro de comida por foto**: conectar `IAnalisisComidaIA` a la comida
  del diario (hoy guarda el análisis suelto).
- **Monitoreo**: si se quiere, enchufar un `MonitorErroresSentry` detrás del
  puerto `IMonitorErrores` (la costura ya está lista).
- **Deuda menor**: `next lint` está roto (Next 16 quitó `next lint`; migrar a
  ESLint flat config); `middleware.ts` renombrado a `proxy.ts` (deprecación de
  Next 16 ya contemplada).

---

## Estructura de carpetas (resumen)

```
src/
  dominio/           # entidades, casos de uso, interfaces de repos, puertos, errores
  aplicacion/        # servicios (orquestan casos de uso) + DTOs Zod
  infraestructura/   # Prisma, contenedor DI, almacenamiento, email, ia, ml, pdf, tiempo-real
  servidor/          # routers tRPC, contexto, trpc.ts (backend)
  app/               # páginas Next.js (App Router) + route handlers /api/*
  componentes/       # UI React (frontend)
  lib/               # cliente tRPC + hooks + formato (frontend) · autenticación (backend)
  trabajos/          # worker de pg-boss (crons/jobs)
prisma/              # schema + 39 migraciones + seed
docs/                # despliegue, mobile, wearables, whatsapp, recordatorios,
                     # agenda de turnos, planes nutricionales
ml-servicio/         # microservicio ML (Python/FastAPI) — repo poliglota aparte
nutricion-servicio/  # intermediario FatSecret (Go) — aparte
android/             # proyecto Capacitor
```
