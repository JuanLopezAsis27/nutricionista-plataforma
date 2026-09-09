# Cambios aplicados tras la auditoría de arquitectura

**Fecha:** 2026-08-27
**Rama:** `Audit/Architecture` (partiendo de `2116e78`)
**Documento de origen:** [`AUDIT_ARQUITECTURA.md`](./AUDIT_ARQUITECTURA.md)
**Alcance:** ejecución completa del plan de refactor incremental propuesto en la
sección 5.2 de la auditoría — los 8 pasos.

Este archivo es el registro de qué se tocó y por qué. La auditoría dice qué
estaba mal; esto dice qué se hizo al respecto, qué cambió de comportamiento y
qué quedó sin hacer.

---

## Resumen

|                      |                                                                   |
| -------------------- | ----------------------------------------------------------------- |
| Archivos modificados | **69** (`+3561` / `−1702`)                                        |
| Archivos nuevos      | 15 (+2 de configuración local, ver §"No forma parte del trabajo") |
| Archivos eliminados  | 1 (`src/servidor/errores-trpc.ts`)                                |
| Tests                | 133 archivos / ~431 casos → **139 archivos / 452 casos**          |
| Riesgos cerrados     | R2, R3, R4, R5, R7, R8                                            |
| Riesgos mitigados    | R1 (parcial)                                                      |
| Riesgos sin atender  | R6, R9, R10                                                       |

**Verificación del estado final:** `npx tsc --noEmit` limpio · `npx vitest run`
452/452 en verde · `npm run build` correcto · `docker build --target build`
real con exit 0.

Ningún cambio se commiteó: quedaron en el árbol de trabajo para revisión.

---

## Cambios por paso

### Paso 0 — Red de seguridad estructural

**Cierra R3** · 2 archivos nuevos, 9 tests

Antes de tocar nada se blindaron los invariantes que ya se cumplían, para que
el refactor no pudiera degradarlos sin que alguien se enterara.

| Archivo                                                     | Qué hace                                                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/arquitectura.test.ts`                                  | Recorre las capas y falla si alguna mira hacia afuera: dominio puro, aplicación solo sobre dominio, infraestructura sin conocer la presentación, componentes sin alcanzar infraestructura, Prisma contenido. |
| `src/infraestructura/repositorios/modelosInquilino.test.ts` | Lee `prisma/schema.prisma`, extrae los modelos con columna `nutricionistaId` y los compara contra `MODELOS_INQUILINO` **en ambas direcciones**.                                                              |

El segundo es el que importa para seguridad. Hasta ahora, agregar un modelo de
inquilino al schema y olvidar la línea en el `Set` reintroducía fuga de datos
entre consultorios **sin que fallara nada** — ya había pasado una vez (migración
27). Ahora es un test rojo. Al momento de escribirlo, schema y `Set` coinciden
en 46 modelos.

El test de inquilinos incluye una guarda contra su propio parser: si cambia el
formato del schema y deja de encontrar modelos, falla en vez de pasar en vacío.

> El scanner de arquitectura demostró que detecta de verdad: encontró un
> `import "vitest"` en `_ayudas-test.ts` (soporte de tests, no código
> productivo), que hubo que exceptuar explícitamente.

---

### Paso 1 — Reconexión de las conexiones de larga vida

**Cierra R2** · 4 archivos modificados, 1 nuevo, 4 tests

El bus de eventos cacheaba dos conexiones `pg` de por vida y **ninguna
reconectaba**. Un reinicio de Postgres (una migración, un `docker compose up -d`,
un corte de red) dejaba el tiempo real muerto en silencio hasta reiniciar el
proceso: la promesa de escucha quedaba memoizada resuelta y la UI simplemente
dejaba de actualizarse, sin error visible.

| Archivo                                                      | Cambio                                                                                                                                                                         |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/infraestructura/tiempo-real/BusEventosPostgres.ts`      | La escucha se reconecta sola con backoff exponencial (1 s → tope 30 s). La publicación descarta la conexión muerta y reintenta una vez. Al reconectar emite `bus.reconectado`. |
| `src/infraestructura/cola/PgBossColaTrabajos.ts`             | Mismo tratamiento. Se memoiza la **promesa**, no la instancia: dos encolados concurrentes durante el arranque ya no abren dos pools.                                           |
| `src/dominio/servicios/IBusEventos.ts`                       | Nueva constante `TIPO_RECONEXION`.                                                                                                                                             |
| `src/lib/hooks/useTiempoReal.ts`                             | Maneja `bus.reconectado` invalidando todas las queries.                                                                                                                        |
| `src/infraestructura/tiempo-real/BusEventosPostgres.test.ts` | **Nuevo.** Reproduce la caída real.                                                                                                                                            |

**Decisión de diseño:** `TIPO_RECONEXION` vive en el **puerto del dominio**, no
en el adaptador. El hook del navegador la necesita, y desde infraestructura
habría arrastrado el driver de `pg` al bundle del cliente.

**Por qué hace falta avisar:** LISTEN/NOTIFY no reintrega. Los eventos emitidos
mientras la escucha estaba caída se perdieron para siempre, así que el cliente
tiene que saber que hay un hueco y re-sincronizar.

---

### Paso 2 — Sonda de salud y healthchecks

**Mitiga R1** · 4 archivos modificados, 2 nuevos

`restart: unless-stopped` solo reacciona si el proceso **muere**. Una app viva
pero incapaz de hablar con la base (pool agotado, Postgres caído) se quedaba
así indefinidamente. No existía ningún endpoint de salud: `/api/monitoreo` es
ingesta de errores del cliente, solo `POST`.

| Archivo                      | Cambio                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/salud/route.ts` | **Nuevo.** `GET` público que verifica el camino real a Postgres (`SELECT 1`) y devuelve 200/503, sin exponer detalles del error. |
| `scripts/salud-worker.mjs`   | **Nuevo.** El worker no sirve HTTP; comprueba lo que necesita para trabajar: llegar a Postgres.                                  |
| `docker-compose.prod.yml`    | `healthcheck` para `app` y `worker`.                                                                                             |
| `Dockerfile`                 | `COPY scripts ./scripts` en el stage `migrator` (lo hereda `worker`).                                                            |
| `docs/nginx.conf.ejemplo`    | `location = /api/salud`, sin caché y sin logs de acceso.                                                                         |

**Detalles:** la sonda de la app usa `node -e fetch` y no `curl`/`wget` porque
la imagen `runner` es `bookworm-slim` y no los trae. El endpoint importa
`PrismaClienteSingleton` directo y **no** el contenedor, para no instanciar 27
servicios en cada sondeo.

---

### Paso 3 — Middleware único de errores

**Cierra R5** · 30 archivos modificados, 1 nuevo, 1 eliminado · **−701 líneas netas en routers**

`src/servidor/trpc.ts` ya tenía un middleware que traducía `ErrorDominio` a
`TRPCError` y reportaba los inesperados al monitor. Aun así, 26 de los 27
routers envolvían **cada resolver** en `try { … } catch { throw aTRPCError(error) }`:
158 bloques.

| Archivo                          | Cambio                                                                                                                                                                                   |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/servidor/mapaCodigos.ts`    | **Nuevo.** Traducción código-de-dominio → transporte, una sola vez. `Record<CodigoErrorDominio, …>` hace que agregar un código **rompa la compilación** hasta traducirlo en ambos mapas. |
| `src/servidor/trpc.ts`           | Middleware reforzado (ver abajo).                                                                                                                                                        |
| `src/servidor/errores-http.ts`   | Usa el mapa compartido.                                                                                                                                                                  |
| `src/servidor/errores-trpc.ts`   | **Eliminado**: quedó sin uso.                                                                                                                                                            |
| `src/servidor/routers/*.ts` (26) | 158 bloques `try/catch` eliminados.                                                                                                                                                      |

**El efecto no obvio que esto corrige:** al capturar el error en el resolver y
relanzar un `TRPCError` ya construido, el middleware lo veía como flujo
esperado y **no lo reportaba al monitor**. Los errores inesperados —los bugs de
verdad— nunca llegaban al monitoreo. El `try/catch` redundante no era solo
ruido: estaba apagando la observabilidad que el middleware existía para dar.

**Riesgo detectado y neutralizado antes de borrar nada:** `aTRPCError` saneaba
los errores desconocidos a `INTERNAL_SERVER_ERROR` **sin mensaje**. Quitarlo sin
más habría hecho que tRPC usara el mensaje del error original como mensaje de
la respuesta, **filtrando detalles internos al cliente**. Por eso el middleware
se reforzó _primero_: ahora reporta al monitor **y** sanea. Se gana la
observabilidad sin perder la contención.

> **Corrección a la auditoría.** El documento decía "tres copias del mismo
> diccionario". Exactas eran **dos** (`trpc.ts` y `errores-trpc.ts`); la de
> `errores-http.ts` mapeaba a status HTTP — misma semántica, otra
> representación. Igual quedaron centralizadas en un archivo.

---

### Paso 4 — Autorización de fila al dominio

**Cierra R7** · 11 archivos modificados, 2 nuevos, 10 tests

La regla _"un paciente solo accede a sus propios datos"_ es de negocio, pero
vivía escrita a mano en once routers —la capa más externa— y **sin un solo
test**: los 133 que había estaban en dominio e infraestructura, y `src/servidor`
no tenía ninguno.

| Archivo                                        | Cambio                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `src/dominio/servicios/politicaAcceso.ts`      | **Nuevo.** `pacienteDeSesion()` y `pacienteConsultable()`, TypeScript puro.                            |
| `src/dominio/servicios/politicaAcceso.test.ts` | **Nuevo.** Cubre por fin la regla, incluido _"NO deja que un paciente pida los datos de otro"_.        |
| 11 routers                                     | Migrados. Se eliminó el helper `pacienteDeSesion` duplicado literalmente en `ia.ts` y `mensajeria.ts`. |

**Diferencia de comportamiento (menor):** en `turnos.obtenerPorPaciente`, un
usuario SUPERADMIN antes recibía _"No se indicó un paciente válido"_ y ahora
puede recibir _"Tu usuario no tiene un paciente asociado"_. Ambos son
`ErrorAccesoDenegado` → 403. Solo cambia el texto, para un rol que no opera
sobre historias clínicas.

---

### Paso 5 — Contenedor de DI perezoso

**Cierra R4** · 13 archivos modificados, 3 nuevos, 5 tests

`contenedor.ts` instanciaba todo al cargar el módulo: importar un solo servicio
construía los 36 repositorios, el cliente S3 y los adaptadores de IA.

| Archivo                                        | Líneas        | Rol                                                         |
| ---------------------------------------------- | ------------- | ----------------------------------------------------------- |
| `src/infraestructura/contenedor/perezoso.ts`   | 34            | **Nuevo.** Memoización.                                     |
| `src/infraestructura/contenedor/nucleo.ts`     | 422           | **Nuevo.** Adaptadores, repositorios, proveedores externos. |
| `src/infraestructura/contenedor/contenedor.ts` | 339 (era 548) | Solo ensamblado de servicios.                               |

Todo se expone como getter: se escribe `servicioPaciente()`, no
`servicioPaciente`. Se actualizaron los 13 consumidores (`contexto.ts`, 8 route
handlers, `auth.ts`, 3 manejadores del worker).

**Método:** en vez de reescribir a mano, se convirtió el grafo a construcción
perezosa y se dejó que **TypeScript marcara cada call site**. `tsc` señaló los
55 puntos exactos, sin margen para olvidar ninguno.

**Detalle de implementación que importa:** el helper usa una **bandera**, no
`??=`. Con `??=`, los adaptadores de Google —cuyo valor legítimo es `null`
cuando no hay credenciales— se reconstruirían en cada acceso. Hay un test que
fija ese comportamiento, y otro que verifica que **un fallo no se memoiza**: en
un proceso de larga vida, cachear un error transitorio dejaría la pieza rota
para siempre.

**Peso muerto eliminado:** `relojCompartido`, el objeto `contenedor` (27
entradas) y su tipo `Contenedor` no los usaba nadie fuera del propio archivo.

**Problema encontrado durante la migración:** los dos route handlers de Google
hacían `if (!proveedorGoogle)` y usaban la constante _narrowed_. Con un getter,
TypeScript no puede arrastrar el narrowing entre dos invocaciones. Se resolvió
guardando el resultado en una constante local.

#### Verificación del criterio objetivo

El criterio definido en la auditoría era poder borrar las credenciales falsas
del `Dockerfile`. Se comprobó en dos niveles:

1. Se reprodujo la condición exacta del build de Docker en local: se apartó
   `.env` (tras confirmar en `.dockerignore` que no entra a la imagen, y con
   restauración garantizada por `trap`) y se compiló sin `DATABASE_URL` ni
   `AUTH_SECRET`. **Compiló y generó las 38 páginas.**
2. Se corrió el **`docker build` real** del stage `build` ya sin las variables.
   Exit 0.

Las variables dummy se eliminaron. En su lugar quedó un comentario: si alguna
vez vuelven a hacer falta, es la señal de que algo volvió a instanciarse al
importar un módulo.

#### Nota honesta sobre las métricas

El total del contenedor **creció**: 548 → 795 líneas entre los tres archivos.
Los envoltorios perezosos y la documentación cuestan líneas. Lo que se logró no
es un archivo más corto, sino que **ningún archivo concentre las ~90
dependencias concretas** y que nada se construya al importar. Si el objetivo
hubiera sido reducir líneas, este refactor no lo cumple.

---

### Paso 6 — Trabajos por inquilino

**Cierra R8** · 3 archivos modificados, 2 nuevos, 6 tests

Cada barrido diario era **un** trabajo que recorría todos los nutricionistas en
un `for` secuencial. El problema no era el tamaño sino la forma: un inquilino
con el SMTP colgado bloqueaba a todos los siguientes, y un fallo a mitad del
bucle hacía que pg-boss reintentara el barrido **entero**, repitiendo los
consultorios que ya habían terminado bien.

| Archivo                                                        | Cambio                                                                     |
| -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/trabajos/porInquilino.ts`                                 | **Nuevo.** Patrón compartido: el cron despacha un trabajo por consultorio. |
| `src/trabajos/porInquilino.test.ts`                            | **Nuevo.**                                                                 |
| `enviarRecordatoriosTurnos.ts`, `generarAlertasSeguimiento.ts` | Declaran solo su parte específica.                                         |
| `registrarTrabajos.ts`                                         | Documentación.                                                             |

- Reintentos con backoff exponencial (3 intentos, 60 s → tope 900 s).
- **Cola de fallidos** (`deadLetter`): sin ella, un inquilino que agota
  reintentos desaparecía sin que nadie supiera a quién revisarle el envío.
- `singletonKey` por inquilino, para que no se apilen corridas del mismo
  consultorio.

`limpiarArchivosHuerfanos` queda como estaba: la limpieza del bucket es
transversal, no por inquilino.

**Verificado contra la API real de pg-boss 12** (sus `.d.ts`, no de memoria): el
handler recibe un _array_ de trabajos, y `batchSize` ya vale 1 por defecto — el
aislamiento de fallos funciona sin configurarlo, así que se documentó en vez de
tocar la llamada.

---

### Paso 7 — Documentación

`AGENTS.md`

**`CLAUDE.md` ya no existe: fue renombrado a `AGENTS.md`** (mismo contenido).
La auditoría lo cita con el nombre viejo.

Antes de reescribir se verificaron los hechos contra el código. Varias
convenciones declaradas eran falsas:

| Decía                                        | Es                                      |
| -------------------------------------------- | --------------------------------------- |
| Archivos en kebab-case (`crear-paciente.ts`) | PascalCase (`CrearPaciente.ts`)         |
| 2 roles                                      | 3 (SUPERADMIN, NUTRICIONISTA, PACIENTE) |
| 6 errores de dominio                         | 26                                      |
| 4 modelos, incluida "Dieta"                  | 31 entidades, 157 casos de uso          |
| PostgreSQL 16                                | PostgreSQL 18                           |
| 3 niveles de procedimiento tRPC              | 4 (se agregó `superadminProcedimiento`) |

Se agregaron dos secciones que faltaban por completo: **multi-inquilino** (ALS +
extensión de Prisma + las tres reglas a respetar al sumar código) y **trabajos
en segundo plano**. Se actualizó "Lo que NO hacer" y la sección de inyección de
dependencias con la convención de getters perezosos.

**Sobre la regla "presentación nunca importa del dominio":** se precisó la regla
en vez de forzar el código, como proponía la auditoría. Ahora permite
`import type` y constantes puras, y prohíbe funciones. Duplicar los enums en la
UI habría sido peor que la supuesta violación.

---

## Cambios de comportamiento observables

Casi todo el trabajo es interno. Lo que un usuario o un operador podría notar:

1. **Tiempo real:** tras una caída de Postgres, la UI se re-sincroniza sola en
   vez de quedarse muda hasta el próximo reinicio del contenedor.
2. **Nuevo endpoint público** `GET /api/salud` (200/503, sin datos sensibles).
3. **Errores inesperados de tRPC** ahora llegan al monitor. La respuesta al
   cliente es idéntica a la de antes: `INTERNAL_SERVER_ERROR` sin mensaje.
4. **Recordatorios y alertas** se procesan por consultorio: en los logs aparece
   una línea por inquilino en vez de un resumen agregado.
5. **Mensaje de error distinto para SUPERADMIN** en `turnos.obtenerPorPaciente`
   (sigue siendo 403).

Ninguna migración de base de datos. Ningún cambio de esquema. Ningún cambio en
el contrato de la API que consume el cliente.

---

## Qué quedó sin hacer

De los riesgos de la auditoría:

| Riesgo                                              | Estado                   | Por qué                                                                                                                                                                                         |
| --------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** — Postgres SPOF triple                       | **Mitigado, no cerrado** | Se agregó la detección (healthchecks + sonda). Pero **Postgres sigue siendo un punto único de falla sin réplica**: eso es una decisión de infraestructura y costo, no de código.                |
| **R6** — Contrato implícito de `conAlcanceDeSesion` | Sin atender              | Hoy se cumple en los 9 entry points (verificado uno por uno), pero nada en el sistema de tipos obliga a un endpoint nuevo a hacerlo. Sería atacable con un test de integración por entry point. |
| **R9** — Limitador de intentos en memoria           | Sin atender              | Decisión consciente y documentada en el código. Solo hay que revisarla **si** se pasa a más de una réplica.                                                                                     |
| **R10** — Componentes de UI grandes                 | Sin atender              | No es deuda arquitectónica (no viola capas). `FormularioReceta.tsx` (707 ln), `SeccionDeportiva.tsx` (673 ln) siguen igual.                                                                     |

---

## No forma parte de este trabajo

Al empezar, el árbol ya tenía cambios previos que **no** son de este refactor:

- **`.gitignore` modificado**: alguien quitó `.claude` y `CLAUDE.md` de los
  ignorados. Eso es lo que hace que `.claude/` (configuración local de Claude
  Code, incluidos `settings.json` y comandos) aparezca como versionable.
  Conviene decidirlo aparte y revisar el contenido antes de subirlo.

---

## Cómo verificar

```bash
npx tsc --noEmit          # sin errores
npx vitest run            # 452 tests en 139 archivos
npm run build             # compila
```

Los dos warnings de `instrumentation.ts` en el build (`process.on` bajo runtime
Edge) son **previos** a este trabajo.

Para comprobar que el contenedor sigue siendo perezoso:

```bash
mv .env .env.bak && npx next build; mv .env.bak .env
```

Debe compilar sin credenciales. Si falla, algo volvió a instanciarse al
importar un módulo.
