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

## Arquitectura — Clean Architecture

Las dependencias siempre apuntan hacia adentro. Nunca una capa interna importa de una capa externa.

```
Presentación (Next.js, tRPC routers)
    ↓
Aplicación (servicios, DTOs)
    ↓
Dominio (entidades, interfaces de repositorios, casos de uso)
    ↑
Infraestructura (implementaciones Prisma) → implementa interfaces del dominio
```

### Capa de Dominio — /src/dominio

La más interna. Cero dependencias externas. Solo TypeScript puro.

- /entidades → clases con validaciones y reglas de negocio
- /repositorios → interfaces (contratos), nunca implementaciones
- /casos-de-uso → un archivo por caso de uso (SRP estricto)
- /errores → errores de dominio tipados que extienden Error

### Capa de Aplicación — /src/aplicacion

Orquesta casos de uso. Solo depende del dominio.

- /dtos → esquemas Zod de entrada y salida
- /servicios → agrupan casos de uso relacionados

### Capa de Infraestructura — /src/infraestructura

Implementaciones concretas. Implementa interfaces del dominio.

- /repositorios → implementaciones con Prisma
- /contenedor → inyección de dependencias manual (contenedor.ts)

### Capa de Presentación — /src/app + /src/servidor + /src/componentes

Lo más externo. Accede a la lógica SIEMPRE a través de los servicios de
aplicación, nunca de Prisma ni de los casos de uso.

- /src/app → páginas Next.js (App Router) y route handlers
- /src/servidor → routers tRPC, contexto, procedimientos
- /src/componentes → componentes de UI (solo hablan por los hooks de tRPC)

Del dominio puede importar **tipos y constantes** (`import type EstadoTurno`,
`PRIORIDADES_OBJETIVO`, `TIPO_RECONEXION`): son vocabulario compartido y se
borran en compilación. Lo que no puede es importar funciones ni casos de uso —
eso pasa por un servicio de aplicación.

La regla está verificada por `src/arquitectura.test.ts`, que falla si alguna
capa mira hacia afuera.

## Principios SOLID

- SRP: cada caso de uso en su propio archivo con una sola responsabilidad
- OCP: repositorios como interfaces, se extiende sin modificar el dominio
- LSP: implementaciones de Prisma son intercambiables sin romper los casos de uso
- ISP: una interfaz por entidad, nunca una interfaz genérica gigante
- DIP: los casos de uso reciben interfaces por constructor, nunca instancian Prisma

## Inyección de dependencias

Manual, sin librerías externas. Vive en /src/infraestructura/contenedor/:

- `nucleo.ts` → adaptadores y repositorios (el cableado con el exterior)
- `contenedor.ts` → armado de los servicios de aplicación
- `perezoso.ts` → memoización

Los casos de uso reciben sus dependencias por constructor.
Los servicios de aplicación reciben sus casos de uso por constructor.
Los routers tRPC reciben los servicios desde el contexto de tRPC.

**Todo se expone como getter perezoso**: se escribe `servicioPaciente()`, no
`servicioPaciente`. Nada se construye al importar el módulo, solo la primera
vez que se lo pide. Es lo que permite que el worker no arrastre los 27
servicios para usar dos, y que el build de Next no necesite credenciales.

Al sumar un servicio, envolvelo igual:

```typescript
export const servicioX = perezoso(() => crearServicioX({ ... }));
```

Patrón esperado:

```typescript
// Correcto — depende de la interfaz
class CrearPaciente {
  constructor(private repositorio: IPacienteRepositorio) {}
}

// Incorrecto — nunca así
class CrearPaciente {
  private repositorio = new PrismaRepositorioPaciente();
}
```

## Multi-inquilino (multi-tenancy)

Es la decisión más transversal del sistema. Cada nutricionista es un inquilino;
45+ tablas llevan `nutricionistaId` con FK real.

El aislamiento NO se escribe en cada consulta: lo aplica una extensión de
Prisma (`PrismaClienteSingleton`) que filtra y asigna `nutricionistaId` según
el alcance de la operación en curso, guardado en un `AsyncLocalStorage`
(`infraestructura/multitenancy/contextoTenant`).

Es **fail-closed**: sin alcance fijado, tocar una tabla de inquilino LANZA. Es
deliberado — antes de fallar, nunca devuelve datos de más.

Reglas que hay que respetar al sumar código:

1. **Todo entry point HTTP que consulte tablas de inquilino debe envolverse en
   `conAlcanceDeSesion()`** (`src/servidor/alcanceRequest.ts`). Ya lo hacen el
   handler de tRPC y los 8 route handlers. Si se olvida, el endpoint falla con
   error 500, no con una fuga.
2. **Si agregás un modelo con `nutricionistaId` al schema, sumalo a
   `MODELOS_INQUILINO`.** Olvidarlo hace que sus consultas por id crucen datos
   entre consultorios. Ya pasó una vez (migración 27). Hay un test que compara
   el schema contra esa lista: `modelosInquilino.test.ts`.
3. **Alcance global (`ejecutarGlobal`) es para LEER** (login, webhook, worker
   que recorre inquilinos). Para escribir hay que decir en qué inquilino con
   `ejecutarEnNutricionista(id, ...)`.

## Trabajos en segundo plano

El worker (`src/trabajos/worker.ts`) es un proceso aparte de Next, con pg-boss
sobre la misma base. Es un adaptador de entrada más: ejecuta servicios de
aplicación tomados del contenedor.

Los barridos que dependen del inquilino se arman con
`registrarTrabajoPorInquilino` (`src/trabajos/porInquilino.ts`): el cron
despacha **un trabajo por consultorio**, cada uno con sus propios reintentos
(backoff exponencial) y su cola de fallidos. No hacer un `for` sobre los
inquilinos dentro de un solo trabajo: un consultorio lento o fallido bloquearía
a todos los demás.

## Modelos del dominio

El dominio tiene **31 entidades**, **157 casos de uso** repartidos en 25
módulos, **34 interfaces de repositorio** y **17 puertos de servicio**. La
fuente de verdad es el código (`/src/dominio`) y `prisma/schema.prisma`; acá
solo van los modelos centrales y sus reglas.

### Paciente

Pertenece a un inquilino. Email y teléfono son únicos POR CONSULTORIO, no
globalmente: la misma persona puede ser paciente de dos nutricionistas.
Baja lógica con `archivadoEn` (no se borra).

### Turno

Estados: PENDIENTE | CONFIRMADO | CANCELADO | COMPLETADO
Regla: no pueden existir dos turnos solapados en el mismo horario.

### Plan Nutricional

Antes se llamaba "Dieta"; se renombró en la Fase 3 y hay redirects permanentes
en `next.config.ts`. Un plan agrupa comidas, opciones, equivalencias y
recomendaciones, y se asigna a pacientes vía AsignacionPlan.

### Usuario

Roles: SUPERADMIN | NUTRICIONISTA | PACIENTE
Reglas: si el rol es PACIENTE debe tener `pacienteId`; el `nutricionistaId`
indica a qué consultorio pertenece (null solo para SUPERADMIN).

## Errores de dominio

Siempre lanzar errores tipados del dominio, nunca strings genéricos.

Los routers **NO** capturan errores. Un único middleware en `src/servidor/trpc.ts`
traduce todo:

- `ErrorDominio` → TRPCError con el código semántico correcto
- `TRPCError` → pasa tal cual (flujo esperado: 401/403, validación Zod)
- cualquier otro → se reporta al monitor y se reemplaza por un
  INTERNAL_SERVER_ERROR **sin mensaje**, para no filtrar detalles internos

La traducción a cada transporte (tRPC y HTTP) vive una sola vez en
`src/servidor/mapaCodigos.ts`. Agregar un `CodigoErrorDominio` rompe la
compilación hasta traducirlo en ambos mapas.

Hay ~26 errores en `/src/dominio/errores`, todos extienden `ErrorDominio` y
llevan un `codigo` semántico: VALIDACION, NO_ENCONTRADO, CONFLICTO,
ACCESO_DENEGADO, NO_AUTENTICADO.

## Autenticación y autorización

- Auth.js v5 con CredentialsProvider
- bcrypt para hashear passwords (nunca guardar password en texto plano)
- `src/proxy.ts` (middleware de Next) protege /dashboard/_, /mis-_ y /mi-*.
  NO cubre /api: cada route handler hace su propio `auth()`.
- El contexto tRPC expone: sesion, usuario, rol, servicios y busEventos
- Procedimientos tRPC, cuatro niveles:
  - publicoProcedimiento → sin autenticación
  - protegidoProcedimiento → cualquier usuario autenticado
  - nutricionistaProcedimiento → solo rol NUTRICIONISTA
  - superadminProcedimiento → solo rol SUPERADMIN

La autorización **a nivel de fila** ("un paciente solo ve lo suyo") NO se
escribe a mano en los routers: vive en `@/dominio/servicios/politicaAcceso`
(`pacienteDeSesion`, `pacienteConsultable`) y está cubierta por tests.

## Convenciones de código

- Clases en PascalCase: CrearPaciente, PrismaRepositorioPaciente
- Interfaces con prefijo I: IPacienteRepositorio, ITurnoRepositorio
- Archivos que exportan una clase, en PascalCase, igual que la clase:
  CrearPaciente.ts, PrismaRepositorioPaciente.ts, ErrorTurnoConflicto.ts
- Los demás módulos en camelCase: contextoTenant.ts, mapaCodigos.ts
- Carpetas en kebab-case: casos-de-uso/, casos-de-uso/pacientes/
- DTOs con sufijo Dto: CrearPacienteDto, ActualizarTurnoDto
- Enums en SCREAMING_SNAKE_CASE: PENDIENTE, NUTRICIONISTA
- Siempre tipar explícitamente los retornos de funciones públicas
- Nunca usar `any`, usar `unknown` si el tipo es incierto

## Path aliases (tsconfig)

- @/dominio → /src/dominio
- @/aplicacion → /src/aplicacion
- @/infraestructura → /src/infraestructura
- @/servidor → /src/servidor
- @/componentes → /src/componentes
- @/lib → /src/lib

## Testing

- Vitest para unit tests
- Los casos de uso se testean con repositorios mock
- Nunca testear implementaciones de Prisma directamente
- Archivo de test junto al archivo que testea: CrearPaciente.test.ts
- Dos tests protegen invariantes estructurales y conviene no borrarlos:
  `src/arquitectura.test.ts` (reglas de capas) y
  `modelosInquilino.test.ts` (schema vs MODELOS_INQUILINO)

Patrón de test esperado:

```typescript
// El mock implementa la interfaz, no depende de Prisma
const repositorioMock: IPacienteRepositorio = {
  crear: vi.fn(),
  obtenerPorId: vi.fn(),
  // ...
};
```

## Docker

- Desarrollo (`docker-compose.yml`): PostgreSQL 18, MinIO y Mailpit
- Producción (`docker-compose.prod.yml`): postgres, minio, app, worker, los
  one-shot `migrate` y `crear_bucket`, y `respaldo` (perfil `respaldos`).
  El reverse proxy es nginx EN EL HOST, no en el compose.
- `app` y `worker` tienen healthcheck: la app por `GET /api/salud` (que
  verifica el camino real a Postgres) y el worker por `scripts/salud-worker.mjs`
- Variables de entorno en .env (nunca commitear, usar .env.example como referencia)

## Lo que NO hacer

- Nunca importar Prisma fuera de /src/infraestructura
- Nunca importar desde capas externas hacia capas internas
- Nunca poner lógica de negocio en los routers tRPC o en las páginas — incluida
  la autorización a nivel de fila, que va en `politicaAcceso`
- Nunca envolver un resolver de tRPC en `try/catch` para traducir errores: de
  eso se encarga el middleware, y hacerlo a mano apaga el monitoreo
- Nunca consultar una tabla de inquilino sin alcance fijado
- Nunca importar el contenedor desde un componente de UI (arrastra Prisma al
  bundle del navegador)
- Nunca usar `any`
- Nunca guardar passwords en texto plano
- Nunca poner secretos en el código, siempre variables de entorno
