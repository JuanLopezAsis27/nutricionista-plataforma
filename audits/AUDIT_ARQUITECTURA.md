# Auditoría de Arquitectura — nutricionista-app

**Fecha:** 2026-08-27
**Rama auditada:** `Audit/Architecture` (commit `2116e78`)
**Alcance:** estructura completa del repositorio — `src/` (797 archivos TS/TSX, ~54.500 líneas), configuración de build y despliegue (`Dockerfile`, `docker-compose*.yml`, `next.config.ts`, `tsconfig.json`), procesos fuera de Next (`src/trabajos/`).
**Método:** lectura de código, no inferencia por nombres de carpeta. Cada afirmación sobre acoplamiento está respaldada por un análisis de imports cruzados (`grep` sobre los path aliases) y por la lectura de los módulos que concentran dependencias.
**Restricción cumplida:** no se modificó código. Este archivo es la única salida.

---

## 0. Resumen ejecutivo

El sistema es un **monolito modular con arquitectura hexagonal (Clean Architecture) correctamente implementada**, desplegado como un pequeño conjunto de procesos cooperantes (app Next.js + worker + PostgreSQL + MinIO) sobre un único VPS.

La conclusión principal es poco habitual en auditorías de este tipo: **la arquitectura declarada en `CLAUDE.md` y la arquitectura real del código coinciden casi por completo**. La regla de dependencias hacia adentro se respeta con cero violaciones en las tres capas internas:

| Verificación                                                               | Resultado                                                 |
| -------------------------------------------------------------------------- | --------------------------------------------------------- |
| `src/dominio` importa de infraestructura / servidor / app / Prisma / Next  | **0 archivos**                                            |
| `src/aplicacion` importa de infraestructura / servidor / app / componentes | **0 archivos**                                            |
| `src/infraestructura` importa de servidor / app / componentes / lib        | **0 archivos**                                            |
| Prisma (`@prisma/client`, `PrismaClient`) fuera de `src/infraestructura`   | **0 archivos**                                            |
| `any` explícito en el código                                               | **1 ocurrencia** (justificada, en la extensión de Prisma) |

Esto es una base sólida. Los problemas que encontré **no son de diseño de capas**, sino de tres frentes distintos:

1. **Un god-module**: `contenedor.ts` (548 líneas, ~90 imports concretos, 33 singletons exportados, instanciación _eager_ a nivel de módulo) es el único punto de acoplamiento alto del sistema y el SPOF de proceso más importante.
2. **Resiliencia de las conexiones de larga vida**: el bus de eventos y la cola cachean clientes `pg` **sin lógica de reconexión**. Una caída transitoria de PostgreSQL deja el tiempo real muerto en silencio hasta reiniciar el proceso.
3. **Duplicación de un _cross-cutting concern_**: hay **tres** implementaciones del mismo mapeo error-de-dominio → código de transporte, y **158 bloques `try/catch`** en los routers que replican lo que un middleware de tRPC ya hace automáticamente.

**Recomendación: mantener la arquitectura actual y evolucionarla.** No migrar a microservicios. La justificación detallada está en la sección 5.

---

## 1. Mapa de componentes reales

### 1.1 Topología de procesos (lo que realmente corre)

```
                        ┌──────────────────────────────┐
   Navegador / App      │   nginx (en el HOST del VPS) │   ← SPOF, fuera del compose
   Capacitor (Android)  └──────────────┬───────────────┘
          │                            │ 127.0.0.1:${APP_PORT}
          └────────────────────────────┤
                                       ▼
              ┌──────────────────────────────────────────┐
              │  app  — Next.js 16 standalone (1 réplica)│
              │  · proxy.ts (Auth.js edge) protege rutas  │
              │  · /api/trpc/[trpc]  → 27 routers         │
              │  · 10 route handlers (multipart, PDF,     │
              │    OAuth, webhook, ingesta de errores)    │
              │  · SSE: subscription tRPC de tiempo real  │
              └───────┬──────────────┬──────────────┬─────┘
                      │              │              │
        pg-boss send  │   LISTEN/    │   S3 API     │  HTTP saliente (todos
                      │   NOTIFY     │              │  con timeout + fallback)
                      ▼              ▼              ▼          │
              ┌───────────────────────────┐   ┌──────────┐    ├─→ Claude (Anthropic)
              │  PostgreSQL 18            │   │  MinIO   │    ├─→ servicio ML (opcional)
              │  · datos (45+ tablas)     │   │ (disco   │    ├─→ servicio nutrición (opc.)
              │  · cola pg-boss           │   │ secund.) │    ├─→ FatSecret / OpenFoodFacts
              │  · bus pg_notify          │   └──────────┘    ├─→ Google (Calendar/Gmail)
              └───────────▲───────────────┘                   └─→ WhatsApp Cloud API
                          │
              ┌───────────┴───────────────┐
              │  worker — proceso aparte  │  ← misma imagen, distinto CMD
              │  3 crons (pg-boss)        │
              └───────────────────────────┘

  One-shot al arranque:  migrate (prisma migrate deploy)  ·  crear_bucket (mc mb)
  Perfil opcional:       respaldo → OVH Object Storage (offsite, retención N días)
```

**Observación arquitectónica clave:** PostgreSQL cumple **tres roles simultáneos** — base de datos, _message broker_ (pg-boss) y _event bus_ (LISTEN/NOTIFY). Es una decisión deliberada y correcta para esta escala (evita Redis/RabbitMQ), pero concentra el riesgo: ver §2, R1.

### 1.2 Componentes de código y nivel de acoplamiento

| #   | Componente                                 | Ubicación                                                                                                               | Tamaño                                              | Depende de                                | Acoplamiento             | Evidencia                                                                                                                |
| --- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Dominio**                                | `src/dominio`                                                                                                           | 391 arch. / 18.857 ln                               | Nada externo                              | **BAJO** ✅              | 0 imports hacia afuera. 36 entidades, 34 interfaces de repositorio, 17 puertos de servicio, 25 módulos de casos de uso   |
| 2   | **Aplicación**                             | `src/aplicacion`                                                                                                        | 54 arch. / 3.647 ln                                 | Solo dominio                              | **BAJO** ✅              | 27 servicios (máx. 152 ln), 27 DTOs Zod. 0 imports de capas externas                                                     |
| 3   | **Infraestructura — repositorios**         | `src/infraestructura/repositorios`                                                                                      | 36 impl.                                            | Dominio + Prisma                          | **BAJO** ✅              | Implementan las 34 interfaces. Única frontera con Prisma                                                                 |
| 4   | **Infraestructura — adaptadores externos** | `ia/`, `ml/`, `nutricion/`, `integraciones/`, `whatsapp/`, `email/`, `almacenamiento/`, `pdf/`, `cola/`, `tiempo-real/` | ~60 arch.                                           | Puertos del dominio                       | **BAJO** ✅              | Todos implementan una interfaz `I*` del dominio. Patrón _decorator_ con degradación (ver §4.2)                           |
| 5   | **Contenedor de DI**                       | `src/infraestructura/contenedor/contenedor.ts`                                                                          | **548 ln**                                          | **~90 módulos concretos**                 | 🔴 **ALTO**              | Ver §1.3                                                                                                                 |
| 6   | **Contexto tRPC**                          | `src/servidor/contexto.ts`                                                                                              | 108 ln                                              | 28 símbolos del contenedor                | 🟡 **MEDIO**             | Importa los 27 servicios + `busEventos` en un solo `import`                                                              |
| 7   | **Routers tRPC**                           | `src/servidor/routers/`                                                                                                 | 27 arch. / ~2.100 ln                                | Aplicación (vía ctx) + errores de dominio | 🟡 **MEDIO**             | Acceden a servicios por `ctx`, no por import → buen desacoplamiento. Pero 158 `try/catch` y autorización propia (R5, R7) |
| 8   | **Multi-tenancy (ALS)**                    | `src/infraestructura/multitenancy/`                                                                                     | 2 arch.                                             | `node:async_hooks`                        | 🟡 **MEDIO** (implícito) | Contrato transversal no verificable por el compilador (R6)                                                               |
| 9   | **Presentación — páginas**                 | `src/app`                                                                                                               | 48 arch. / 4.370 ln (31 páginas, 26 `"use client"`) | Componentes + hooks tRPC                  | **BAJO**                 | 2 archivos importan de `@/dominio`                                                                                       |
| 10  | **Presentación — componentes**             | `src/componentes`                                                                                                       | 93 arch. / **13.239 ln**                            | UI + hooks                                | **BAJO-MEDIO**           | 12 archivos importan tipos/constantes de `@/dominio` (§3). Componentes grandes (R10)                                     |
| 11  | **Hooks de datos**                         | `src/lib/hooks`                                                                                                         | 29 hooks                                            | Cliente tRPC                              | **BAJO** ✅              | Un hook por dominio funcional; mapea 1:1 con los routers                                                                 |
| 12  | **Worker**                                 | `src/trabajos`                                                                                                          | 5 arch. / 168 ln                                    | Contenedor + pg-boss                      | 🟡 **MEDIO**             | Importa el contenedor completo para usar 2 servicios (R4)                                                                |

### 1.3 El punto caliente: `contenedor.ts`

Es el único componente con acoplamiento alto, y lo es por diseño — un contenedor de DI _debe_ conocer las implementaciones concretas. Pero su forma actual amplifica el riesgo:

```
contenedor.ts (548 líneas)
├── ~90 imports de clases concretas (36 repositorios Prisma, 20+ adaptadores externos)
├── 26 módulos de ensamblado (contenedor/modulos/*.ts, 814 líneas en total)  ← buena separación
├── Instanciación EAGER a nivel de módulo (no lazy, no factory)
│     const prisma = PrismaClienteSingleton.obtenerInstancia()
│     const repositorioPaciente = new PrismaRepositorioPaciente(prisma)   ×36
│     ...construcción condicional de 6 cadenas de decoradores (IA, ML, nutrición, Google)
└── 33 símbolos exportados (27 servicios + busEventos + 5 auxiliares) + objeto `contenedor`
```

**Consumidores (13 archivos):** 8 route handlers, `contexto.ts`, `lib/autenticacion/auth.ts`, 3 manejadores del worker.

**Lo que está bien:** el ensamblado por módulo (`modulos/*.ts`) evita que las 548 líneas sean 1.400. El comentario del encabezado documenta correctamente la restricción de no importar Next (lo consume el worker). La construcción condicional con degradación elegante (si no hay `ML_SERVICE_URL` → stub; si no hay clave de Claude → stub) es un patrón excelente.

**Lo que preocupa:** al ser un módulo con efectos secundarios en la carga, **importar cualquier símbolo instancia los 36 repositorios, los 27 servicios y los 20+ adaptadores**. El `Dockerfile` ya documenta el síntoma:

```dockerfile
# Variables dummy: el build de Next instancia módulos (Prisma/Auth) al
# recolectar páginas. No se hornean en la imagen final (stage aparte).
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
```

El build necesita credenciales falsas porque el grafo de módulos se ejecuta en tiempo de compilación. Es una fuga de la estrategia de instanciación hacia el pipeline de build.

---

## 2. Riesgos arquitectónicos priorizados

Ordenados por **impacto combinado en disponibilidad y mantenibilidad**. La severidad considera que este es un producto de consultorio (no 24/7 crítico) pero con datos clínicos y multi-inquilino.

---

### 🔴 R1 — PostgreSQL es un SPOF triple, sin réplica ni healthcheck de aplicación

**Impacto: disponibilidad — CRÍTICO**

PostgreSQL sostiene simultáneamente los datos, la cola de trabajos (pg-boss) y el bus de eventos (`pg_notify`). No hay réplica, ni _connection pooler_ (PgBouncer), ni failover. Una caída detiene **todo**: la app, el worker, los recordatorios, el tiempo real.

Agravantes verificados en `docker-compose.prod.yml`:

- `postgres` y `minio` **sí** tienen `healthcheck`; **`app` y `worker` no tienen ninguno**. Docker solo reinicia si el proceso muere — un proceso vivo pero colgado (pool de conexiones agotado, event loop bloqueado) queda en ese estado indefinidamente.
- No existe endpoint de salud. `/api/monitoreo` es _ingesta_ de errores del cliente (solo `POST`), no un _health check_.
- 1 sola réplica de `app` (`output: standalone`, sin `deploy.replicas`).
- `nginx` corre **en el host**, fuera del compose: no está versionado como código (solo `docs/nginx.conf.ejemplo`) ni supervisado por Docker.

**Mitigación existente y correcta:** el servicio `respaldo` (perfil `respaldos`) hace dump diario + copia offsite a OVH con retención configurable. El RPO es de ~24 h.

---

### 🔴 R2 — Los clientes `pg` de larga vida no reconectan: el tiempo real muere en silencio

**Impacto: disponibilidad — ALTO · mantenibilidad — MEDIO**

En `src/infraestructura/tiempo-real/BusEventosPostgres.ts` hay dos conexiones `pg.Client` cacheadas de por vida, y **ninguna tiene lógica de reconexión**:

```ts
private asegurarEscucha(): Promise<void> {
  this.promesaEscucha ??= this.iniciarEscucha();   // se memoiza para siempre
  return this.promesaEscucha;
}

private async iniciarEscucha(): Promise<void> {
  const cliente = new Client({ connectionString: this.urlBase() });
  cliente.on("error", (e) => console.error("[bus] error de escucha:", e));  // solo loguea
  await cliente.connect();
  await cliente.query(`LISTEN ${CANAL}`);
}
```

**Escenario de falla concreto:** PostgreSQL se reinicia (una migración, un `docker compose up -d`, un corte breve de red). La conexión `LISTEN` se cierra. El handler `on("error")` escribe una línea en el log y nada más. `this.promesaEscucha` sigue _resolved_, así que `asegurarEscucha()` nunca vuelve a intentar. **Cada nueva suscripción SSE se conecta a un `EventEmitter` que ya no recibe nada.** La UI no muestra error: simplemente deja de actualizarse. Solo se recupera reiniciando el contenedor `app`.

El mismo patrón afecta a:

- `clientePublicar` en el mismo archivo — tras la caída, todo `publicar()` lanza.
- `PgBossColaTrabajos.boss` en `src/infraestructura/cola/PgBossColaTrabajos.ts` — instancia cacheada, `on("error")` que solo loguea.

Es el riesgo con peor relación _probabilidad × silencio_: alta probabilidad (cualquier reinicio de la base), y falla sin señal visible.

---

### 🟠 R3 — `MODELOS_INQUILINO` es una lista manual que debe seguir al schema a mano

**Impacto: seguridad/aislamiento — ALTO · mantenibilidad — ALTO**

El aislamiento multi-inquilino se apoya en un `Set<string>` codificado a mano en `PrismaClienteSingleton.ts` (45 modelos). La extensión de Prisma solo filtra por `nutricionistaId` los modelos que están en ese conjunto.

El propio código documenta que este riesgo **ya se materializó**:

```ts
// Hijas del agregado (migración 27). Antes quedaban fuera del filtro: se
// llegaba a ellas por id directo sin ningún control de inquilino. Los casos
// más visibles eran `Archivo` (el endpoint de descarga da acceso total al
// rol NUTRICIONISTA) y `Mensaje` (contarNoLeidos sumaba sobre toda la tabla).
```

Es decir: **hubo fuga de datos entre consultorios** hasta la migración 27. El defecto de diseño persiste: agregar un modelo con `nutricionistaId` en `schema.prisma` y olvidar la línea en el `Set` reintroduce exactamente el mismo bug, **sin que falle ningún test ni el compilador**. El fallo es silencioso y hacia el lado inseguro (devuelve datos de más, no de menos).

_Nota: el modelo de datos en sí se cubre en `audits/AUDIT_MODELO_DATOS.md`. Acá lo trato solo como riesgo del mecanismo arquitectónico._

---

### 🟠 R4 — `contenedor.ts`: god-module con instanciación eager

**Impacto: disponibilidad — MEDIO · mantenibilidad — ALTO**

Detallado en §1.3. Consecuencias concretas:

- **Disponibilidad:** un error en la construcción de cualquiera de los ~90 componentes (una variable de entorno mal formada que haga lanzar a un `obtenerConfig*`) tumba el proceso entero al cargar el módulo, no en la request que usaba esa función. El fallo de un adaptador opcional (Google, ML) se convierte en fallo total.
- **Mantenibilidad:** toda feature nueva toca este archivo. Es un punto de conflicto de merge garantizado y el archivo con mayor razón de cambio del repositorio.
- **Contaminación del build:** obliga a las credenciales dummy del `Dockerfile`.
- **Worker sobredimensionado:** `enviarRecordatoriosTurnos.ts` necesita 2 símbolos (`servicioSecretaria`, `repositorioUsuarioCompartido`) y arrastra los 27 servicios, los 36 repositorios, el cliente S3 y los adaptadores de IA.

---

### 🟡 R5 — Duplicación triple del mapeo de errores + 158 `try/catch` redundantes

**Impacto: mantenibilidad — ALTO**

`src/servidor/trpc.ts` define un middleware que **ya traduce automáticamente** todo `ErrorDominio` a `TRPCError` y reporta los inesperados al monitor:

```ts
const traducirErroresDominio = t.middleware(async ({ next, path, ctx }) => {
  try { return await next(); }
  catch (error) {
    if (error instanceof ErrorDominio) { throw new TRPCError({ code: MAPA_CODIGOS[error.codigo], ... }); }
    if (!(error instanceof TRPCError)) { monitorErrores.capturar(error, { origen: "trpc", ruta: path, ... }); }
    throw error;
  }
});
export const publicoProcedimiento = t.procedure.use(traducirErroresDominio);  // ← todos heredan
```

Y sin embargo, **26 de los 27 routers** envuelven cada resolver en `try { … } catch (error) { throw aTRPCError(error) }`. Conteo exacto de `aTRPCError(error)`:

| Router      | #   | Router     | #   | Router                                                                                            | #       |
| ----------- | --- | ---------- | --- | ------------------------------------------------------------------------------------------------- | ------- |
| evaluacion  | 14  | secretaria | 8   | superadmin                                                                                        | 3       |
| planes      | 12  | deportivo  | 8   | nutricion                                                                                         | 3       |
| seguimiento | 11  | turnos     | 7   | tracking / integraciones / estadisticas / credenciales / configuracion / autenticacion / archivos | 2 c/u   |
| recetas     | 11  | pacientes  | 7   | notificaciones                                                                                    | 1       |
| objetivos   | 10  | ia         | 7   | tiempoReal                                                                                        | 0       |
| biblioteca  | 10  | whatsapp   | 5   |                                                                                                   |         |
| mensajeria  | 9   | axiomas    | 5   |                                                                                                   |         |
| diario      | 9   | metricas   | 4   | **TOTAL**                                                                                         | **158** |

El `MAPA_CODIGOS` está **triplicado**: en `trpc.ts` (middleware), en `errores-trpc.ts` (`aTRPCError`, usado por los routers) y en `errores-http.ts` (`aRespuestaError`, usado por 4 route handlers). Tres copias del mismo diccionario semántico que deben mantenerse sincronizadas al agregar un `CodigoErrorDominio`.

**Efecto secundario no obvio:** al capturar el error en el resolver y relanzar un `TRPCError` ya construido, el middleware lo ve como `instanceof TRPCError` y **no lo reporta al monitor**. Los errores inesperados (bugs reales, no de dominio) que `aTRPCError` convierte en `INTERNAL_SERVER_ERROR` **nunca llegan al monitoreo**. El `try/catch` redundante no solo es ruido: está desactivando la observabilidad que el middleware fue diseñado para dar.

---

### 🟡 R6 — El aislamiento de inquilino depende de un contrato implícito por entry point

**Impacto: disponibilidad — MEDIO · seguridad — MEDIO**

`conAlcanceDeSesion()` debe envolver **todo** entry point HTTP que toque tablas de inquilino. Está bien documentado en `alcanceRequest.ts` y **hoy se cumple en los 8 route handlers que lo necesitan** (verificado uno por uno) más el handler de tRPC.

El diseño es **fail-closed** — sin alcance, la extensión de Prisma lanza — lo cual es la decisión correcta. Pero:

- Nada en el sistema de tipos ni en los tests obliga a un endpoint nuevo a cumplirlo. El olvido se manifiesta como error 500 en producción, no como fallo de compilación.
- El `matcher` de `proxy.ts` excluye `/api`, así que los route handlers no reciben ninguna protección del middleware de Next: cada uno hace su propio `auth()`.
- La subscription SSE de tiempo real corre dentro de un `AsyncLocalStorage.run` que debe permanecer vivo mientras dure la conexión (potencialmente horas). Funciona, pero es un uso poco convencional de ALS que conviene documentar como restricción.

---

### 🟡 R7 — Lógica de autorización distribuida en la capa de presentación

**Impacto: mantenibilidad — MEDIO · seguridad — MEDIO**

`CLAUDE.md` dice explícitamente: _"Nunca poner lógica de negocio en los routers tRPC"_. La regla se incumple para la autorización a nivel de fila. Ejemplo real en `src/servidor/routers/turnos.ts:33-46`:

```ts
const objetivo =
  ctx.usuario.rol === "NUTRICIONISTA"
    ? input.pacienteId
    : ctx.usuario.pacienteId;
if (!objetivo) {
  throw new ErrorAccesoDenegado("No se indicó un paciente válido.");
}
if (
  ctx.usuario.rol !== "NUTRICIONISTA" &&
  input.pacienteId &&
  input.pacienteId !== objetivo
) {
  throw new ErrorAccesoDenegado("Solo podés ver tus propios turnos.");
}
```

El patrón `if (!ctx.usuario.pacienteId) throw ErrorAccesoDenegado` se repite en **11 routers** (`biblioteca`, `deportivo`, `ia`, `mensajeria`, `metricas`, `objetivos`, `planes`, `recetas`, `seguimiento`, `tracking`, `turnos`). Es la regla de negocio _"un paciente solo accede a sus propios datos"_ — invariante del dominio — viviendo en la capa más externa, **sin cobertura de tests** (los 133 tests están en dominio/infraestructura, ninguno en `src/servidor`).

Hay una mitigación parcial: algunos routers (`ia`, `mensajeria`) ya extrajeron un helper `pacienteDeSesion()`. Es la dirección correcta, aplicada de forma inconsistente.

---

### 🟢 R8 — Barrido del worker: O(n) secuencial sobre inquilinos

**Impacto: disponibilidad — BAJO (hoy) · escalabilidad — MEDIO**

`enviarRecordatoriosTurnos.ts` recorre todos los nutricionistas **en serie**, un `await` por inquilino:

```ts
for (const nutri of nutris) {
  const r = await ejecutarEnNutricionista(nutri.id, () =>
    servicioSecretaria.enviarRecordatorios(),
  );
}
```

Con pocos inquilinos es irrelevante. El problema es de forma, no de tamaño: un inquilino cuyo envío SMTP se cuelgue **bloquea los recordatorios de todos los que vienen después**, y un fallo no capturado a mitad del bucle deja el barrido incompleto sin reintento por inquilino. La unidad de trabajo correcta es _(inquilino, día)_, no _(barrido global)_.

---

### 🟢 R9 — Limitador de intentos en memoria

**Impacto: seguridad — BAJO · escalabilidad — MEDIO**

`LimitadorIntentos` usa un `Map` en memoria. **Está correctamente documentado como decisión consciente** ("la app corre como un único proceso Node en el VPS, así que un contador en memoria es suficiente y pragmático"). No es un defecto hoy. Sí es un **bloqueante silencioso para escalar horizontalmente**: al pasar a 2 réplicas, el límite de 5 intentos se convierte de facto en 10 y se reinicia en cada deploy. Lo registro para que la decisión se revise _cuando_ se toque el número de réplicas, no antes.

---

### 🟢 R10 — Archivos con exceso de responsabilidad en presentación

**Impacto: mantenibilidad — BAJO-MEDIO**

`src/componentes` concentra 13.239 líneas en 93 archivos — la carpeta más pesada del repo. Los mayores: `FormularioReceta.tsx` (707), `SeccionDeportiva.tsx` (673), `FormularioPlan.tsx` (566), `HojaDia.tsx` (438). Contrasta con la disciplina del dominio (391 archivos, ~48 líneas de promedio). También `_ayudas-test.ts` con 1.090 líneas es un módulo de utilidades de test que ya pide división por dominio.

No es deuda arquitectónica estricta (no viola capas), pero es donde el costo de cambio crece más rápido.

---

## 3. Coherencia entre arquitectura declarada y código real

| Regla declarada en `CLAUDE.md`                        | Estado                             | Evidencia                                                                                                                                                                                                                  |
| ----------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependencias siempre hacia adentro                    | ✅ **Cumple**                      | 0 violaciones en dominio, aplicación e infraestructura                                                                                                                                                                     |
| Nunca importar Prisma fuera de `/src/infraestructura` | ✅ **Cumple**                      | 0 archivos fuera de la capa                                                                                                                                                                                                |
| Interfaces con prefijo `I`, una por entidad (ISP)     | ✅ **Cumple**                      | 34 interfaces de repositorio + 17 puertos de servicio                                                                                                                                                                      |
| DIP: casos de uso reciben interfaces por constructor  | ✅ **Cumple**                      | Verificado en el ensamblado de `contenedor/modulos/*`                                                                                                                                                                      |
| DI manual centralizada en `contenedor.ts`             | ✅ **Cumple** (con la deuda de R4) | Único lugar con `new Prisma*`                                                                                                                                                                                              |
| Nunca usar `any`                                      | ✅ **Cumple**                      | 1 `eslint-disable` justificado en la extensión de Prisma                                                                                                                                                                   |
| Tres niveles de procedimiento tRPC                    | ✅ **Superado**                    | Hay **cuatro**: se agregó `superadminProcedimiento` (evolución no documentada en `CLAUDE.md`)                                                                                                                              |
| Errores de dominio tipados → `TRPCError`              | ✅ **Cumple**, pero triplicado     | R5                                                                                                                                                                                                                         |
| Tests de casos de uso con repositorios mock           | ✅ **Cumple**                      | 133 archivos de test, concentrados en dominio                                                                                                                                                                              |
| Nunca lógica de negocio en routers tRPC               | ⚠️ **Incumple parcialmente**       | Autorización a nivel de fila en 11 routers (R7)                                                                                                                                                                            |
| Presentación nunca importa del dominio directamente   | ⚠️ **Incumple**                    | 14 archivos (2 en `app/`, 12 en `componentes/`)                                                                                                                                                                            |
| PostgreSQL 16 en contenedor                           | ℹ️ **Desactualizado en el doc**    | El código usa **PostgreSQL 18** en ambos compose                                                                                                                                                                           |
| Modelos del dominio: Paciente, Turno, Dieta, Usuario  | ℹ️ **Muy desactualizado**          | El sistema real tiene 36 entidades y 25 módulos de casos de uso. "Dieta" se renombró a "Plan Nutricional" (hay redirects permanentes en `next.config.ts`). `CLAUDE.md` describe la Fase 1 de un producto que va por la F17 |

**Sobre las 14 importaciones de presentación → dominio:** son **tipos y constantes**, no lógica (`type EstadoTurno`, `PLACEHOLDERS_PLANTILLA`, `PRIORIDADES_OBJETIVO`, `construirEnlaceWhatsapp`). Técnicamente violan la regla escrita, pero el acoplamiento real es a _vocabulario compartido_, y `import type` se borra en compilación. La alternativa —duplicar los enums en la capa de presentación— sería peor. **Mi recomendación es corregir la regla, no el código**: permitir explícitamente `import type` y constantes puras desde el dominio hacia la presentación. Las dos excepciones que sí conviene mover son `construirEnlaceWhatsapp` y `variablesEjemplo` (funciones, no tipos), que deberían exponerse vía un servicio de aplicación.

---

## 4. Análisis por dimensión

### 4.1 Separación de responsabilidades

Excelente en las capas internas. El flujo canónico se cumple sin desvíos:

```
página/componente → hook (lib/hooks) → cliente tRPC → router → ctx.servicios.X
    → ServicioX (aplicación) → CasoDeUso (dominio) → IRepositorio (interfaz)
    → PrismaRepositorioX (infraestructura) → PrismaClient + extensión de inquilino
```

Las dos filtraciones son hacia afuera y de bajo riesgo: autorización en routers (R7) y tipos de dominio en componentes (§3).

### 4.2 Comunicación entre componentes

**Síncrona (interna):** tRPC sobre HTTP con `superjson`. Type-safety de extremo a extremo vía `RouterApp`. 27 routers, uno por dominio funcional, mapeando 1:1 con los 29 hooks. Coherencia notable.

**Síncrona (externa):** 6 integraciones salientes. **Todas** con timeout explícito y **todas** con degradación elegante mediante composición de decoradores:

```ts
// Claude → si no hay clave (del profesional o del entorno), cae al stub
new AsistenteNutricionalClaude(resolvedorIA, new AsistenteNutricionalStub())

// Nutrición → 3 niveles: microservicio HTTP → FatSecret → OpenFoodFacts → nulo
configNutricionServicio ? new ProveedorNutricionHTTP(cfg, proveedorLocal) : proveedorLocal

// Calendario → si no hay credenciales de Google, sincronizador nulo
configGoogle ? new SincronizadorCalendarioGoogle(...) : new SincronizadorNulo()
```

**Esto es lo mejor del diseño.** Cada dependencia externa es opcional y su ausencia degrada la funcionalidad sin romper el sistema. Timeouts verificados: ML 8000 ms, servicio de nutrición 8000 ms, FatSecret y OpenFoodFacts con `AbortSignal.timeout`. Es un patrón de _bulkhead_ implementado con composición pura, sin librería.

**Asíncrona:** pg-boss para 3 trabajos programados (recordatorios 09:00, alertas de seguimiento, limpieza de huérfanos) y `pg_notify` para el bus de eventos. La elección de `pg_notify` sobre un `EventEmitter` local es correcta y deliberada: permite que el worker publique eventos que la app entrega por SSE, y sobreviviría a múltiples réplicas de `app` (todas reciben el `NOTIFY`).

**Lo que falta:** ni la cola ni el bus reconectan (R2); no hay _dead letter queue_ configurada ni política de reintentos explícita en `boss.work()`.

### 4.3 Manejo de errores y observabilidad

Bien diseñado en el núcleo: `ErrorDominio` con `codigo` semántico, monitor de errores compuesto (consola estructurada + webhook opcional), instrumentación de Next enganchada a `onRequestError`, `unhandledRejection` y `uncaughtException`. El monitor vive fuera del contenedor precisamente para no arrastrar Prisma al runtime Edge — decisión fina y bien comentada.

El defecto está en el consumo: los 158 `try/catch` **anulan el reporte al monitor** de los errores inesperados de los resolvers (R5).

### 4.4 Gestión de dependencias

`package.json` sano: 44 dependencias de producción, sin duplicados funcionales, sin librería de DI (coherente con la decisión de DI manual). Los alias de `tsconfig.json` reflejan exactamente las capas, lo que hace que las violaciones sean detectables con un `grep` — propiedad valiosa que conviene automatizar (§5.2, paso 0).

### 4.5 Testing como soporte de la arquitectura

133 archivos de test, correctamente ubicados junto al código que prueban, concentrados donde debe estar el valor: casos de uso del dominio (evaluación 14, recetas 10, planes 10, seguimiento 9…). Los adaptadores externos críticos tienen test de degradación (`ProveedorNutricionHTTP.test.ts` incluye _"cae al respaldo si fetch lanza (red caída / timeout)"_).

**Hueco de cobertura relevante para esta auditoría:** `src/servidor` tiene **0 tests**. Es exactamente donde vive la autorización a nivel de fila (R7) y donde un error tiene consecuencias de seguridad. Tampoco hay test que verifique el aislamiento multi-inquilino de punta a punta.

---

## 5. Recomendación: **mantener y evolucionar** — no migrar

### 5.1 Justificación

**Mantener el monolito modular.** No hay ningún argumento a favor de microservicios en este contexto, y varios en contra:

| Criterio                        | Situación real                                                                           | Veredicto                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Escala de carga                 | Consultorios de nutrición; decenas de usuarios concurrentes por inquilino                | Postgres + 1 proceso Node cubre 2-3 órdenes de magnitud más                                  |
| Tamaño del equipo               | Desarrollo freelance individual                                                          | Microservicios exigirían operar N pipelines y N runtimes sin nadie que los atienda           |
| Acoplamiento del dominio        | Alto y legítimo: paciente ↔ turno ↔ plan ↔ seguimiento ↔ objetivos comparten invariantes | Partirlo obligaría a transacciones distribuidas y consistencia eventual sobre datos clínicos |
| Necesidad de escalar por partes | Solo IA/ML son intensivos en cómputo                                                     | **Ya están extraídos** como servicios HTTP opcionales tras un puerto del dominio             |
| Madurez de la arquitectura      | Hexagonal con puertos y adaptadores, 0 violaciones de capa                               | Ya tiene las costuras para extraer cuando haga falta                                         |

El sistema **ya hizo la extracción correcta**: los componentes que justifican otro runtime (ML, servicio de nutrición) viven detrás de `IAnalisisPredictivo` e `IProveedorDatosNutricionales`, con implementación HTTP y fallback local. Ese es el patrón a repetir si aparece otra necesidad — no una migración.

**Lo que sí hay que hacer es endurecer lo que existe.** El sistema está bien diseñado y frágil en la operación: la mayor parte del riesgo real (R1, R2) es de resiliencia y observabilidad, no de estructura.

### 5.2 Refactor incremental

Cada paso es independiente, cabe en una sesión de trabajo y deja el sistema funcionando. Sin reescrituras.

---

#### **Paso 0 — Congelar lo que ya está bien (test de arquitectura)** · esfuerzo: 2 h · riesgo: nulo

Antes de tocar nada, blindar las 0 violaciones actuales para que no se degraden.

- **Crear** `src/arquitectura.test.ts`: recorre los archivos por capa y falla si aparece un import prohibido (dominio→afuera, aplicación→infra, Prisma fuera de infraestructura). Es el mismo `grep` de esta auditoría, ejecutable en CI.
- **Crear** `src/infraestructura/repositorios/modelosInquilino.test.ts`: lee `prisma/schema.prisma`, extrae los modelos con campo `nutricionistaId` y compara contra `MODELOS_INQUILINO`. **Mitiga R3 por completo** — convierte un fallo silencioso de seguridad en un test rojo.

_Archivos afectados: 2 nuevos. Ninguno modificado._

---

#### **Paso 1 — Reconexión de los clientes de larga vida** · esfuerzo: 4 h · riesgo: bajo · **atiende R2**

- **`src/infraestructura/tiempo-real/BusEventosPostgres.ts`**: en `on("error")` y `on("end")`, poner `this.promesaEscucha = null` / `this.clientePublicar = null` para que la siguiente llamada reconstruya la conexión; agregar reintento con backoff exponencial y tope. Emitir un evento de reconexión para que la UI pueda re-sincronizar.
- **`src/infraestructura/cola/PgBossColaTrabajos.ts`**: mismo tratamiento sobre `this.boss`.
- **Test**: simular el `error`/`end` del cliente y verificar que la siguiente publicación reconecta.

_Archivos afectados: 2 modificados, 2 tests nuevos._

---

#### **Paso 2 — Healthcheck y endpoint de salud** · esfuerzo: 3 h · riesgo: nulo · **atiende R1**

- **Crear** `src/app/api/salud/route.ts`: `GET` público y liviano que verifique conectividad a Postgres (`SELECT 1`) y devuelva `200`/`503`. Sin datos sensibles.
- **`docker-compose.prod.yml`**: agregar `healthcheck` a `app` (curl al endpoint) y a `worker` (verificar que el proceso pg-boss responde); agregar `depends_on: app: condition: service_healthy` donde corresponda.
- **`docs/nginx.conf.ejemplo`**: documentar el uso del endpoint como _upstream check_.

_Archivos afectados: 1 nuevo, 2 modificados._

---

#### **Paso 3 — Eliminar los 158 `try/catch` y unificar el mapeo de errores** · esfuerzo: 6 h · riesgo: bajo · **atiende R5**

El middleware de `trpc.ts` ya hace el trabajo. El orden importa:

1. **`src/servidor/errores-trpc.ts`**: dejar de exportar `MAPA_CODIGOS` duplicado; que `errores-trpc.ts` y `trpc.ts` importen un único mapa desde un nuevo `src/servidor/mapaCodigos.ts`, que también consumirá `errores-http.ts`. Una sola fuente de verdad para los 3 transportes.
2. **Los 26 routers**: quitar el `try { … } catch { throw aTRPCError(error) }` de cada resolver. El cuerpo pasa a ser `return await ctx.servicios.X.metodo(input)`. **Recupera el reporte al monitor** de los errores inesperados, que hoy se pierde.
3. **Verificar** con los tests de dominio que los códigos HTTP resultantes no cambian.

Reduce ~450 líneas de ruido y elimina la desactivación silenciosa de la observabilidad. Es el cambio con mejor relación beneficio/riesgo del plan.

_Archivos afectados: 26 routers, 3 archivos de errores, 1 nuevo._

---

#### **Paso 4 — Bajar la autorización de fila al dominio** · esfuerzo: 8 h · riesgo: medio · **atiende R7**

1. **Crear** `src/dominio/servicios/politicaAcceso.ts` (TypeScript puro, sin dependencias): funciones como `pacienteAccesible(usuario, pacienteIdSolicitado): string` que devuelvan el id autorizado o lancen `ErrorAccesoDenegado`.
2. **Migrar** los 11 routers que hoy repiten `if (!ctx.usuario.pacienteId) throw …` a esa política. Generalizar el helper `pacienteDeSesion()` que `ia.ts` y `mensajeria.ts` ya tienen.
3. **Crear** `src/dominio/servicios/politicaAcceso.test.ts` — cubre por fin la regla _"un paciente solo ve lo suyo"_, hoy sin ningún test.
4. Empezar por `turnos.ts` (el caso más complejo, con la rama nutricionista/paciente) para validar la abstracción antes de propagarla.

_Archivos afectados: 11 routers, 2 nuevos._

---

#### **Paso 5 — Convertir `contenedor.ts` en construcción perezosa** · esfuerzo: 10 h · riesgo: medio · **atiende R4**

El paso de mayor beneficio estructural. Incremental, sin big-bang:

1. **Extraer** los adaptadores compartidos (prisma, reloj, hasheador, almacenamiento, cifrador) a `contenedor/nucleo.ts`.
2. **Envolver** cada servicio exportado en un _getter_ memoizado en lugar de una constante evaluada al cargar el módulo:
   ```ts
   let _servicioPaciente: ServicioPaciente | undefined
   export const servicioPaciente = () => (_servicioPaciente ??= crearServicioPaciente({...}))
   ```
   Migrar **un módulo por commit**, empezando por los que solo usa el worker (`secretaria`, `seguimiento`) — así se valida el enfoque con el consumidor más aislado.
3. **`src/servidor/contexto.ts`**: pasar a invocar los getters. Como el contexto se crea por request y los getters memoizan, el costo es idéntico tras la primera llamada.
4. **`Dockerfile`**: una vez que ningún módulo se instancie al cargar, **eliminar las variables dummy** `DATABASE_URL`/`AUTH_SECRET` del stage `build`. Su desaparición es la señal objetiva de que el refactor está completo.

_Archivos afectados: `contenedor.ts`, 26 módulos de ensamblado (gradual), `contexto.ts`, 13 consumidores, `Dockerfile`._

---

#### **Paso 6 — Un trabajo por inquilino en el worker** · esfuerzo: 4 h · riesgo: bajo · **atiende R8**

- **`src/trabajos/manejadores/enviarRecordatoriosTurnos.ts`**: el cron pasa a ser un _dispatcher_ que encola un job `recordatorios-turnos-inquilino` por nutricionista; un segundo handler procesa cada uno. Habilita reintentos, aislamiento de fallos y concurrencia controlada por pg-boss (`teamSize`).
- Aplicar el mismo patrón a `generarAlertasSeguimiento.ts`.
- Configurar `retryLimit`/`retryBackoff` y una cola de fallidos en `registrarTrabajos.ts`.

_Archivos afectados: 3 modificados._

---

#### **Paso 7 — Actualizar `CLAUDE.md` a la realidad** · esfuerzo: 2 h · riesgo: nulo · **atiende §3**

La documentación describe la Fase 1 de un sistema que va por la F17. Un contrato de arquitectura desactualizado deja de ser una guía y pasa a ser ruido que se aprende a ignorar.

- Reemplazar la sección "Modelos del dominio" (4 modelos) por el inventario real (36 entidades, 25 módulos de casos de uso).
- Documentar `superadminProcedimiento` (cuarto nivel de procedimiento).
- Documentar la **arquitectura multi-inquilino** (ALS + extensión de Prisma + `conAlcanceDeSesion`) — hoy no aparece en `CLAUDE.md` pese a ser la decisión más transversal del sistema.
- Corregir PostgreSQL 16 → 18.
- **Precisar la regla de presentación**: permitir explícitamente `import type` y constantes puras desde `@/dominio`, prohibiendo funciones. Alinea la regla con la práctica sensata que el código ya sigue.

---

### 5.3 Orden sugerido y criterio

```
Paso 0  (blindaje)      ──┐
Paso 1  (reconexión)      ├─→ Semana 1 · riesgo casi nulo, cierra R2 y R3
Paso 2  (salud)         ──┘
Paso 3  (errores)       ────→ Semana 2 · limpieza grande, recupera observabilidad
Paso 4  (autorización)  ──┐
Paso 6  (worker)          ├─→ Semana 3 · independientes entre sí
Paso 7  (docs)          ──┘
Paso 5  (contenedor)    ────→ Semana 4+ · gradual, un módulo por commit
```

Los pasos 0-3 son los de mejor retorno: eliminan los dos riesgos de disponibilidad más probables (R2, R1), cierran el agujero de seguridad latente (R3) y recuperan el monitoreo (R5) — todo con riesgo de regresión mínimo. El paso 5 es el de mayor valor estructural, pero conviene abordarlo con la red de seguridad del paso 0 ya puesta.

---

## 6. Conclusión

Esta es una arquitectura **por encima del promedio para un proyecto de este tamaño y equipo**. La disciplina de capas es real, no declarativa: cero violaciones en dominio, aplicación e infraestructura, con Prisma perfectamente contenido y 133 tests apoyados en interfaces. El patrón de degradación elegante en las integraciones externas —cada dependencia opcional, cada fallo con un fallback— es un trabajo de diseño maduro.

La deuda está concentrada y es tratable:

- **Un god-module** (`contenedor.ts`), consecuencia natural de la DI manual, resoluble con construcción perezosa sin cambiar la estrategia.
- **Tres duplicaciones** del mismo mapeo de errores y 158 `try/catch` que, además de ruido, apagan el monitoreo.
- **Dos mecanismos frágiles en la operación**: clientes `pg` sin reconexión (R2) y una lista de modelos de inquilino mantenida a mano (R3) que ya causó fuga de datos entre consultorios una vez.

Ninguno de estos problemas requiere reescribir nada. **El veredicto es mantener la arquitectura y evolucionarla**: el monolito modular es la elección correcta para la carga, el dominio y el tamaño del equipo, y las costuras hexagonales ya permitieron extraer los dos componentes que lo justificaban (ML y nutrición) sin tocar el núcleo. Ese es el mecanismo a usar si aparece una tercera necesidad — no una migración.

---

_Auditoría generada sin modificar código. Documento complementario: `audits/AUDIT_MODELO_DATOS.md`._
