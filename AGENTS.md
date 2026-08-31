# nutricionista-app

## Descripción

Plataforma de gestión para licenciados en nutrición: pacientes, turnos, planes
nutricionales, recetas, seguimiento, mensajería, WhatsApp e integraciones.

Es **multi-inquilino**: cada nutricionista es un consultorio aislado con sus
propios datos. Tres roles: SUPERADMIN, NUTRICIONISTA y PACIENTE.

## Stack tecnológico

- Next.js 16 (App Router)
- TypeScript estricto (strict: true)
- tRPC para API type-safe
- Prisma ORM + PostgreSQL 18
- Auth.js v5 con credenciales (email + password)
- Tailwind CSS + shadcn/ui
- Zod para validación en todas las capas
- Vitest para testing
- pg-boss (cola de trabajos) y LISTEN/NOTIFY (bus de eventos SSE), ambos sobre
  la misma PostgreSQL
- MinIO / S3 para archivos, Nodemailer para email
- Anthropic SDK (Claude) para IA, con degradación a stubs si no hay clave
- Capacitor para la app Android
- Docker Compose para todo el stack

## Idioma

Todo el código, comentarios, nombres de variables, funciones, clases, archivos y carpetas en español. Excepto: palabras reservadas del lenguaje, nombres de librerías externas y configuraciones técnicas que exigen inglés (tsconfig, package.json, etc).

## Documentación

Siempre registra lo realizado (features, fixes, refactors) con detalles técnicos
y conceptuales, para poder entender las decisiones tomadas y actuar a futuro en
base a ellas.

**Este archivo es solo el mapa general e indispensable.** El detalle de cada
módulo va en `/docs`, y desde acá se lo enlaza:

| Documento                    | Qué cubre                                            |
| ---------------------------- | ---------------------------------------------------- |
| `docs/AGENDA.md`             | Días y horarios de atención; dónde vive la regla      |
| `docs/CALENDARIO-TURNOS.md`  | La vista de calendario: grilla semanal y globos       |
| `docs/RECORDATORIOS.md`      | Los tres medios de aviso y su política única          |
| `docs/PLANES.md`             | Modalidades, archivos, carpetas e historial           |
| `docs/ANTROPOMETRIA.md`      | Ecuaciones de grasa, distribución y sitios de pliegue |
| `docs/ARCHIVOS.md`           | Cómo llega al navegador un archivo del bucket         |
| `docs/WHATSAPP.md`           | Cloud API, plantillas de Meta, webhook                |
| `docs/WEARABLES.md`          | Importación de métricas de dispositivos               |
| `docs/MOBILE.md`             | La app Android con Capacitor                          |
| `docs/DESPLIEGUE.md`         | Producción, respaldos y nginx                         |

## Arquitectura — Clean Architecture

Las dependencias siempre apuntan hacia adentro. Nunca una capa interna importa
de una capa externa.

```
Presentación (Next.js, tRPC routers)
    ↓
Aplicación (servicios, DTOs)
    ↓
Dominio (entidades, interfaces de repositorios, casos de uso)
    ↑
Infraestructura (implementaciones Prisma) → implementa interfaces del dominio
```

La regla está verificada por `src/arquitectura.test.ts`, que falla si alguna
capa mira hacia afuera.

### Dominio — /src/dominio

Entidades, servicios de dominio puros, interfaces de repositorio y errores
tipados. No depende de nadie.

### Aplicación — /src/aplicacion

Orquesta casos de uso. Solo depende del dominio.

- `/dtos` → esquemas Zod de entrada y salida
- `/servicios` → agrupan casos de uso relacionados

Los casos de uso **no** pueden importar DTOs ni servicios de aplicación: es lo
que los hace testeables sin levantar medio sistema, y hay un test que lo
verifica (la regla se perdía sola al moverlos de `dominio/` a `aplicacion/`).

### Infraestructura — /src/infraestructura

Implementaciones concretas de las interfaces del dominio.

- `/repositorios` → implementaciones con Prisma
- `/contenedor` → inyección de dependencias manual

### Presentación — /src/app + /src/servidor + /src/componentes

Accede a la lógica SIEMPRE a través de los servicios de aplicación, nunca de
Prisma ni de los casos de uso.

- `/src/app` → páginas Next.js (App Router) y route handlers
- `/src/servidor` → routers tRPC, contexto, procedimientos
- `/src/componentes` → componentes de UI (solo hablan por los hooks de tRPC)

Del dominio puede importar **tipos y constantes** (`import type EstadoTurno`,
`PRIORIDADES_OBJETIVO`): son vocabulario compartido y se borran en compilación.
Lo que no puede es importar funciones ni casos de uso.

**Dónde va cada pantalla de configuración**, que se movió más de una vez:
Integraciones son SERVICIOS EXTERNOS con credenciales (Google, WhatsApp Cloud
API, IA, FatSecret). Configuración es lo que describe al CONSULTORIO (horarios,
membrete, PDF, prefijo telefónico, plantillas de email que no son
recordatorios). Recordatorios es la tarea de avisar turnos, completa. La
pregunta que separa las tres: ¿esto es dar de alta algo de afuera, describir el
consultorio, o hacer una tarea?

**Invalidación de caché: las mutaciones invalidan TODO** (`useInvalidar`), no su
propio router. Los read models están armados para la pantalla, no para la tabla,
así que los datos de un router aparecen en varios otros. Mantener a mano "qué
routers toca cada mutación" se rompe solo, y olvidarse no da error: da datos
viejos en pantalla. React Query solo refetchea las queries ACTIVAS, así que el
costo lo acota la pantalla abierta.

**Ojo con las copias congeladas.** Invalidar refresca las QUERIES, no un objeto
que un componente haya guardado en `useState` (el típico `setRecetaEditar(receta)`
antes de abrir un diálogo). Un componente que muestra datos que él mismo modifica
tiene que LEERLOS de una query por id, no recibirlos por prop desde ese estado.

## Principios SOLID

- SRP: cada caso de uso en su propio archivo con una sola responsabilidad
- OCP: repositorios como interfaces, se extiende sin modificar el dominio
- LSP: las implementaciones Prisma son intercambiables sin romper los casos de uso
- ISP: una interfaz por entidad, nunca una genérica gigante
- DIP: los casos de uso reciben interfaces por constructor, nunca instancian Prisma

```typescript
// Correcto — depende de la interfaz
class CrearPaciente {
  constructor(private repositorio: IPacienteRepositorio) {}
}
```

## Inyección de dependencias

Manual, sin librerías externas, en `/src/infraestructura/contenedor/`:

- `nucleo.ts` → adaptadores y repositorios (el cableado con el exterior)
- `contenedor.ts` → armado de los servicios de aplicación
- `perezoso.ts` → memoización

**Todo se expone como getter perezoso**: se escribe `servicioPaciente()`, no
`servicioPaciente`. Nada se construye al importar el módulo, solo la primera vez
que se lo pide. Es lo que permite que el worker no arrastre los 27 servicios para
usar dos, y que el build de Next no necesite credenciales.

```typescript
export const servicioX = perezoso(() => crearServicioX({ ... }));
```

## Multi-inquilino (multi-tenancy)

Es la decisión más transversal del sistema. Cada nutricionista es un inquilino;
45+ tablas llevan `nutricionistaId` con FK real.

El aislamiento NO se escribe en cada consulta: lo aplica una extensión de Prisma
(`PrismaClienteSingleton`) que filtra y asigna `nutricionistaId` según el alcance
de la operación en curso, guardado en un `AsyncLocalStorage`
(`infraestructura/multitenancy/contextoTenant`).

Es **fail-closed**: sin alcance fijado, tocar una tabla de inquilino LANZA. Es
deliberado — antes de fallar, nunca devuelve datos de más.

1. **Todo entry point HTTP que consulte tablas de inquilino debe envolverse en
   `conAlcanceDeSesion()`** (`src/servidor/alcanceRequest.ts`). Ya lo hacen el
   handler de tRPC y los route handlers. Si se olvida, el endpoint falla con
   error 500, no con una fuga.
2. **Si agregás un modelo con `nutricionistaId` al schema, sumalo a
   `MODELOS_INQUILINO`.** Olvidarlo hace que sus consultas por id crucen datos
   entre consultorios. Ya pasó (migración 27). `modelosInquilino.test.ts` compara
   el schema contra esa lista.
3. **Alcance global (`ejecutarGlobal`) es para LEER** (login, webhook, worker que
   recorre inquilinos). Para escribir hay que decir en qué inquilino con
   `ejecutarEnNutricionista(id, ...)`.

## Trabajos en segundo plano

El worker (`src/trabajos/worker.ts`) es un proceso aparte de Next, con pg-boss
sobre la misma base. Es un adaptador de entrada más: ejecuta servicios de
aplicación tomados del contenedor.

Los barridos que dependen del inquilino se arman con
`registrarTrabajoPorInquilino` (`src/trabajos/porInquilino.ts`): el cron despacha
**un trabajo por consultorio**, cada uno con sus reintentos y su cola de
fallidos. No hacer un `for` sobre los inquilinos dentro de un solo trabajo: un
consultorio lento bloquearía a todos los demás.

## Modelos del dominio

**34 entidades**, **163 casos de uso** en 25 módulos, **36 interfaces de
repositorio** y **17 puertos de servicio**. La fuente de verdad es el código
(`/src/dominio`) y `prisma/schema.prisma`. Acá van solo los invariantes que
cruzan módulos; el detalle de cada uno, en `/docs`.

### Paciente

Email y teléfono son únicos POR CONSULTORIO, no globalmente: la misma persona
puede ser paciente de dos nutricionistas. Baja lógica con `archivadoEn`.

### Usuario

Roles: SUPERADMIN | NUTRICIONISTA | PACIENTE. Si el rol es PACIENTE debe tener
`pacienteId`; `nutricionistaId` indica a qué consultorio pertenece (null solo
para SUPERADMIN).

### Turno

Estados: PENDIENTE | CONFIRMADO | CANCELADO | COMPLETADO. No pueden existir dos
turnos solapados, y **un turno tiene que caer dentro de la agenda declarada del
consultorio**: la regla vive en `dominio/servicios/agendaConsultorio.ts` y la
comparten `AgendarTurno` y `ReprogramarTurno` (mientras estuvo solo en el alta,
reprogramar era la puerta de atrás para dejar un turno un domingo).

El horario se mira por el FIN del turno, no por el inicio. El día de la semana se
lee SIEMPRE en UTC (`getUTCDay()`): `Turno.fecha` es un `DATE` que llega como
medianoche UTC.

Cancelar es baja LÓGICA (que alguien no vino es información clínica y de
cobranza). `EliminarTurno` es borrado real y exige estado CANCELADO y sin cobro:
un turno con precio ya entró en las estadísticas de ingresos.

Ver `docs/AGENDA.md` y `docs/CALENDARIO-TURNOS.md`.

### Recordatorios de turno

Tres medios para el mismo aviso —WhatsApp, email y calendario— gobernados por UNA
política (`ConfiguracionRecordatorios`, una fila por inquilino), con **un solo
camino de disparo por medio**: un barrido automático y un envío manual, los dos
compartidos. Dos botones para el mismo aviso terminan mandándolo dos veces.

El antiduplicado es del motor, no del código: `UNIQUE (nutricionistaId, turnoId,
diasAntes)`. Ver `docs/RECORDATORIOS.md`.

### Archivos

Todo archivo del bucket se sirve **desde la app**, nunca por una URL firmada:
`/api/archivos/<id>/ver` lo muestra en línea y `/api/archivos/<id>` lo ofrece
para bajar, con la misma autorización. En producción el bucket vive en la red
interna de Docker y no existe para el navegador. Ver `docs/ARCHIVOS.md`.

Los archivos se suben ANTES de que exista su dueño (una receta nueva no tiene id
hasta guardarse) y se vinculan después: por eso el CHECK de `archivos` admite el
huérfano temporal (`<= 1` dueño, migración 34).

### Receta

Los adjuntos son `Archivo` con `recetaId`; imágenes y documentos se separan por
MIME al mapear. `fotoPrincipalId` es la portada elegida, y el fallback —si no hay
elegida, o si la elegida ya no está— lo resuelve el getter `Receta.fotoPrincipal`,
no cada pantalla: repetirlo en la UI hacía que la tarjeta y la vista mostraran
fotos distintas de la misma receta.

### Plan Nutricional

Antes se llamaba "Dieta" (hay redirects permanentes en `next.config.ts`). Hay
**DOS modalidades declaradas y no deducidas** (`ModalidadPlan`): `APP` se carga
franja por franja acá; `PDF` es el archivo armado afuera. La modalidad se elige
al dar de alta, no se cambia editando.

**`AsignacionPlan` es el HISTORIAL del paciente y sobrevive al borrado del plan**
(FK SET NULL + `nombrePlan` congelado). Nunca borrar una asignación para
"limpiar". Ver `docs/PLANES.md`.

### Antropometría y composición corporal

Una `Antropometria` es una consulta: el perfil ISAK completo más los sitios de
pliegue que ese perfil no tiene. Solo el peso es obligatorio.

**Nada derivado se persiste.** Las masas de Kerr, el somatotipo, los Score-Z
Phantom, los índices, el metabolismo, el porcentaje graso y la distribución los
calcula el dominio desde las medidas crudas en cada lectura. Si mañana cambia una
constante del modelo, los informes históricos se recalculan solos.

**Conviven DOS modelos y no se mezclan**: el fraccionamiento en 5 masas de Kerr
(anatómico, da grasa subcutánea, exige el ISAK completo) y las ecuaciones de
pliegues de 2 componentes (regresión contra densitometría, dan grasa total). Los
dos números son distintos por diseño y esa brecha no es un error. Regla dura:
**una serie histórica nunca cambia de modelo ni de ecuación** — por eso los
valores del enum `MetodoGrasa` solo se agregan, nunca se renombran ni reordenan.

El cálculo **degrada por bloques**: cada bloque se resuelve si están sus medidas
y devuelve `null` si falta alguna, informando en `faltantes` qué medir. Nunca
lanza. Las constantes numéricas (3,141 y 0,3141 en las correcciones de perímetro,
0,3333 como raíz cúbica) se copian tal cual de la planilla del profesional:
reemplazarlas por PI/10 o 1/3 desplazaría los resultados históricos.

El `sexo` biológico vive en el Paciente (no cambia entre consultas) y el nivel de
actividad en la medición (sí cambia).

`ObjetivoComposicion` es la meta cuantitativa, una sola vigente por paciente y
variable. Dos reglas que ya se rompieron una vez: **el progreso se mide desde que
la meta existe**, no desde la primera medición del paciente (el ESTADO, en
cambio, se lee siempre contra la última medición; el RITMO es una tercera cosa,
propiedad del paciente y no de la meta); y el valor proyectado se descarta cuando
la recta se sale del rango admisible de la variable.

En la ficha del nutricionista, **Antropometría** es la única pestaña que carga y
lee medidas corporales; **Progreso** es el seguimiento del día a día. En el portal
del paciente, **Mi composición** es la ÚNICA parte de la evaluación que se
expone: historia clínica, laboratorios y alertas siguen siendo del profesional.

Ver `docs/ANTROPOMETRIA.md`.

### Los dos tipos de objetivo

Conviven a propósito y son complementarios:

- `Objetivo` — el **plan**: qué se va a hacer y por qué, con estrategias de motivo
  obligatorio e historial auditable. Muchas cosas que importan en nutrición no son
  un número (ordenar las cenas, sostener la adherencia).
- `ObjetivoComposicion` — el **resultado** esperado, medible y proyectable contra
  las antropometrías.

`Objetivo.objetivoComposicionId` los vincula, opcional y único. El borrado es
`SET NULL`, nunca cascada: eliminar la meta numérica no puede llevarse puesto el
plan ni su historial.

## Errores de dominio

Siempre lanzar errores tipados del dominio, nunca strings genéricos. Hay ~26 en
`/src/dominio/errores`, todos extienden `ErrorDominio` con un `codigo` semántico:
VALIDACION, NO_ENCONTRADO, CONFLICTO, ACCESO_DENEGADO, NO_AUTENTICADO.

Los routers **NO** capturan errores. Un middleware en `src/servidor/trpc.ts`
traduce todo: `ErrorDominio` → TRPCError con su código; un `TRPCError` propio pasa
tal cual; cualquier otro se reporta al monitor y se reemplaza por un
INTERNAL_SERVER_ERROR con **mensaje genérico explícito**, para no filtrar detalles
internos.

**Trampa de tRPC v11 al tocar ese middleware:** `next()` NO lanza cuando el
resolver falla, devuelve `{ ok: false, error }`. Hay que mirar `resultado.ok`;
envolverlo en `try/catch` compila, se lee perfecto y no hace nada. Así estuvo un
tiempo: ningún error de dominio se traducía, el monitor no recibía nada y el
mensaje interno viajaba al navegador. `src/servidor/trpc.test.ts` cubre los tres
efectos.

La traducción a cada transporte vive una sola vez en `src/servidor/mapaCodigos.ts`.
Agregar un `CodigoErrorDominio` rompe la compilación hasta traducirlo en ambos
mapas.

## Autenticación y autorización

- Auth.js v5 con CredentialsProvider; bcrypt para las contraseñas
- `src/proxy.ts` (middleware de Next) protege `/dashboard/*`, `/mis-*` y `/mi-*`.
  NO cubre `/api`: cada route handler hace su propio `auth()`
- El contexto tRPC expone sesión, usuario, rol, servicios y bus de eventos
- Cuatro niveles de procedimiento: `publicoProcedimiento`,
  `protegidoProcedimiento`, `nutricionistaProcedimiento`, `superadminProcedimiento`

La autorización **a nivel de fila** ("un paciente solo ve lo suyo") NO se escribe
a mano en los routers: vive en `@/dominio/servicios/politicaAcceso`
(`pacienteDeSesion`, `pacienteConsultable`) y está cubierta por tests.

## Convenciones de código

- Clases en PascalCase: `CrearPaciente`, `PrismaRepositorioPaciente`
- Interfaces con prefijo I: `IPacienteRepositorio`
- Archivos que exportan una clase, en PascalCase, igual que la clase
- Los demás módulos en camelCase: `contextoTenant.ts`, `mapaCodigos.ts`
- Carpetas en kebab-case: `casos-de-uso/pacientes/`
- DTOs con sufijo Dto; enums en SCREAMING_SNAKE_CASE
- Siempre tipar explícitamente los retornos de funciones públicas
- Nunca usar `any`; usar `unknown` si el tipo es incierto

### Path aliases (tsconfig)

`@/dominio`, `@/aplicacion`, `@/infraestructura`, `@/servidor`, `@/componentes`,
`@/lib` → las carpetas homónimas bajo `/src`.

## Testing

- Vitest. El archivo de test va junto al que testea: `CrearPaciente.test.ts`
- Los casos de uso se testean con repositorios mock que implementan la interfaz
- Nunca testear implementaciones de Prisma directamente
- Cuatro tests protegen invariantes estructurales y conviene no borrarlos:
  `src/arquitectura.test.ts` (reglas de capas), `modelosInquilino.test.ts`
  (schema vs `MODELOS_INQUILINO`), `src/servidor/trpc.test.ts` (traducción de
  errores) y `mapeadores.evaluacion.test.ts` (cruce de campos vecinos en los
  mapeadores fila→entidad, que `tsc` no puede ver)

## Docker

- Desarrollo (`docker-compose.yml`): PostgreSQL 18, MinIO y Mailpit
- Producción (`docker-compose.prod.yml`): postgres, minio, app, worker, los
  one-shot `migrate` y `crear_bucket`, y `respaldo` (perfil `respaldos`). El
  reverse proxy es nginx EN EL HOST, no en el compose
- `app` y `worker` tienen healthcheck: la app por `GET /api/salud` (que verifica
  el camino real a Postgres) y el worker por `scripts/salud-worker.mjs`
- Variables de entorno en `.env` (nunca commitear; `.env.example` es la referencia)

## Lo que NO hacer

- Nunca importar Prisma fuera de `/src/infraestructura`
- Nunca importar desde capas externas hacia capas internas
- Nunca poner lógica de negocio en los routers tRPC o en las páginas — incluida
  la autorización a nivel de fila, que va en `politicaAcceso`
- Nunca envolver un resolver de tRPC en `try/catch` para traducir errores: de eso
  se encarga el middleware, y hacerlo a mano apaga el monitoreo
- Nunca consultar una tabla de inquilino sin alcance fijado
- Nunca llamar a `IProveedorWhatsapp.preparar()` desde una lectura: con la Cloud
  API conectada ese método ENVÍA el mensaje. Ya pasó una vez: el query de vista
  previa mandaba un recordatorio cada vez que el cliente lo refrescaba
- Nunca validar la agenda del consultorio en un solo caso de uso: agendar y
  reprogramar comparten `verificarDentroDeLaAgenda`
- Nunca leer el día de la semana de un turno con `getDay()`: va `getUTCDay()`
- Nunca agregar un campo al plan tocando solo el `update` del repositorio: hay que
  escribirlo también en el `create`. La modalidad se perdió así, y no falló nada:
  el default de la base le ganó a un valor que nunca se mandó
- Nunca sumar un filtro al listado de planes tocando solo el DTO y el repositorio:
  `ObtenerPlanesPaginado` enumera los campos a mano y lo que no esté ahí se
  descarta en silencio
- Nunca borrar una asignación de plan para "limpiar": son el historial clínico
- Nunca embeber un archivo del bucket por su URL firmada: es otro origen, no es
  alcanzable en producción y la CSP lo bloquea. Va `/api/archivos/<id>/ver`
- Nunca agregar un CHECK que exija "exactamente un dueño" sobre `archivos`: el
  invariante correcto es `<= 1` (migración 34; la 27 puso `= 1` y rompió todos
  los adjuntos hasta que alguien lo reportó)
- Nunca renombrar ni reordenar los valores del enum `MetodoGrasa`: una serie
  histórica de composición corporal no puede cambiar de ecuación
- Nunca importar el contenedor desde un componente de UI (arrastra Prisma al
  bundle del navegador)
- Nunca usar `any`
- Nunca guardar passwords en texto plano
- Nunca poner secretos en el código, siempre variables de entorno
