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
- Capacitor para la app Android; además la web es una PWA instalable
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
| `docs/DASHBOARD.md`          | Qué muestra la pantalla de inicio y por qué           |
| `docs/PORTAL-PACIENTE.md`    | Las pantallas del paciente y por qué están así       |
| `docs/AGENDA.md`             | Días y horarios de atención; dónde vive la regla      |
| `docs/ESTABLECIMIENTOS.md`   | Varias sedes: qué es del lugar y qué del profesional  |
| `docs/CALENDARIO-TURNOS.md`  | La vista de calendario: grilla semanal y globos       |
| `docs/RECORDATORIOS.md`      | Los tres medios de aviso y su política única          |
| `docs/PLANES.md`             | Modalidades, archivos, carpetas e historial           |
| `docs/PLANES-SEMANALES.md`   | El menú de la semana, sus alternativas y la comparación |
| `docs/ANTROPOMETRIA.md`      | Ecuaciones de grasa, distribución y sitios de pliegue |
| `docs/BIOIMPEDANCIA.md`      | La balanza: mediciones, dashboard y metas; por qué no se mezcla con la antropometría |
| `docs/HISTORIA-CLINICA.md`   | Evoluciones, campos personalizados y el alta por documento |
| `docs/ASISTENTE-IA.md`       | El chat analítico: herramientas, contexto e historial |
| `docs/PROMPTS-IA.md`         | Los siete system prompts, sus marcadores y cómo se personalizan |
| `docs/IA-PLATAFORMA.md`      | Claves de IA de la plataforma, saldo y registro de uso |
| `docs/GRABACIONES.md`        | Grabar la consulta, transcribirla y resumirla con IA  |
| `docs/ARCHIVOS.md`           | Cómo llega al navegador un archivo del bucket         |
| `docs/MENSAJERIA.md`         | La bandeja, el hilo y las piezas que comparten los canales |
| `docs/NOTIFICACIONES.md`     | La campana: qué llega ahí y cómo se apaga cada cosa    |
| `docs/ERRORES.md`            | Qué mensaje de error ve el usuario, y por qué          |
| `docs/PERFIL.md`             | Mi perfil: foto de la cuenta, cambio de contraseña y su política |
| `docs/CUENTAS-PACIENTE.md`   | Una cuenta, varios consultorios: fichas, exclusividad y consultorio activo |
| `docs/SESIONES.md`           | Las dos credenciales: el JWT de 12 h y el refresco de 30 días |
| `docs/WHATSAPP.md`           | Cloud API, plantillas de Meta, webhook                |
| `docs/WEARABLES.md`          | Importación de métricas de dispositivos               |
| `docs/MOBILE.md`             | La app Android con Capacitor                          |
| `docs/PWA.md`                | Instalar la web como app; qué cachea el service worker |
| `docs/DESPLIEGUE.md`         | Producción, respaldos, nginx y el cambio de dominio    |

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
API) y, de la IA, lo que es del consultorio: los prompts. Las CLAVES de IA son
de la plataforma y se cargan en `/admin` (migración 71, `docs/IA-PLATAFORMA.md`). Configuración es lo que describe al CONSULTORIO (membrete, PDF,
prefijo telefónico, plantillas de email que no son recordatorios) y, en su
propia pestaña, los ESTABLECIMIENTOS, que son los lugares donde se atiende y
cada uno lleva su agenda (días, horario, duración y paso del turno). Recordatorios es la tarea de avisar turnos, completa. La
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

**37 entidades**, **179 casos de uso** en 27 módulos, **41 interfaces de
repositorio** y **20 puertos de servicio**. La fuente de verdad es el código
(`/src/dominio`) y `prisma/schema.prisma`. Acá van solo los invariantes que
cruzan módulos; el detalle de cada uno, en `/docs`.

### Paciente

El **email es de CONTACTO, opcional y repetible** (migración 79): hay
pacientes sin email (niños, personas mayores) y hermanos con el de la madre. Es
a dónde se le escribe, no con qué se entra. El **teléfono tampoco es único**
(migración 81): cuando varias fichas comparten un número, el WhatsApp que llega
queda asignado a una sola según `elegirFichaDelTelefono` (turno del botón,
última ficha a la que se le escribió, la más antigua), pero el hilo, la
ventana de 24 h y el «leído» son del NÚMERO, y en la bandeja es UN solo chat
que nombra a todas las fichas (el portal de cada una sigue aparte). Baja lógica con
`archivadoEn`. Solo nombre y apellido son obligatorios: el turno ofrece un
**alta rápida** (nombre, apellido, teléfono; sin email ni portal) para agendar
a alguien que viene por primera vez.

**Una persona, una cuenta, varios consultorios** (migración 78): son dos
fichas y UNA cuenta: `pacientes` es la relación persona ↔ consultorio y cada
ficha dice de qué cuenta es (`pacientes.usuarioId`, una por consultorio). El
acceso al portal es **opcional** y lo da `DarAccesoPortal` (en el alta o desde
la ficha), que **nunca asocia la ficha a una cuenta que ya existe**: si el
email es la cuenta de un paciente de otro consultorio, se emite un **código de
invitación** que la persona canjea desde su cuenta (migración 80). Ningún dato
que tipea el profesional alcanza para asociar una ficha a la cuenta de otro.
La regla que gobierna todo: **un consultorio solo fija la contraseña o cambia
el email de login de una cuenta EXCLUSIVA suya** (`esCuentaExclusiva`); si no,
podría entrar como el paciente y leer la ficha del otro. La sesión lleva el consultorio ACTIVO
(`ResolverConsultorioActivo`), el paciente elige en `/mis-consultorios` o desde
el selector del portal, y la elección se recuerda por dispositivo. Ver
`docs/CUENTAS-PACIENTE.md`.

El email de bienvenida se puede **reenviar**: el envío manual nunca pisa a quien
ya la recibió (sale como `YA_ENVIADA`, no como omitido) y la pantalla pregunta
aparte si reenviársela, que viaja con `forzar`.

La contraseña del alta no se puede volver a mandar: se guarda solo su hash
bcrypt. Por eso, si la plantilla lleva `{{contrasena}}`, **el envío manual
manda una NUEVA**, que el profesional elige en la pantalla
(`ContrasenaBienvenida`): GENERADA al azar, distinta por paciente
(`IGeneradorContrasenas`, la de por defecto), o MANUAL, escrita por él y la
misma para todo el lote (validada con `passwordNuevaDto` en el DTO). La manda y
RECIÉN DESPUÉS se la asigna a la cuenta y le cierra las sesiones persistentes:
si el email falla, la cuenta queda como estaba. Sin `{{contrasena}}` en la
plantilla, la pantalla no pregunta y la cuenta no se toca
(`pacientes.bienvenidaPideContrasena`). Un paciente sin cuenta del portal (o
desactivada) se omite. A una cuenta COMPARTIDA con otro consultorio no se le
toca la contraseña: le sale la plantilla `BIENVENIDA_CUENTA_EXISTENTE`. La
contraseña que asigna un profesional queda provisional. `{{usuario}}` (y
`{{email}}`, que dice lo mismo) es con qué entra la cuenta; el email sale al
de contacto de la ficha, y sin email las credenciales se dan en mano (el alta
las muestra una vez, con copiar e imprimir).

### Usuario

**Se entra con email o con nombre de usuario** (migración 80): la cuenta tiene
uno, el otro o los dos (CHECK), y solo la de un PACIENTE puede no tener email.
El usuario es único en la plataforma, en minúsculas y sin `@`, que es lo que
le deja al login saber qué le escribieron. Sin email no hay «olvidé mi
contraseña»: la restablece el profesional desde la ficha
(`RestablecerPasswordPaciente`, solo cuentas exclusivas). La persona cambia su
email y su usuario en «Mi perfil» (con su contraseña, aunque la cuenta sea
compartida); el profesional, solo el usuario de una cuenta exclusiva. Ver
`docs/CUENTAS-PACIENTE.md`.

Roles: SUPERADMIN | NUTRICIONISTA | PACIENTE. `nutricionistaId` es el
consultorio del NUTRICIONISTA (su propio id); el SUPERADMIN y el PACIENTE no
tienen (null, con CHECK en la base). La cuenta de un paciente no apunta a una
ficha: son sus fichas las que apuntan a ella (`pacientes.usuarioId`), y un
consultorio la ve solo si es dueña de alguna de SUS fichas
(`PrismaRepositorioUsuario.visibles`).

La **contraseña provisional** (`passwordProvisional`) marca la que eligió un
profesional —alta de una cuenta nueva, bienvenida manual—: el portal advierte
que conviene cambiarla, **sin obligar**, y cualquier cambio de la persona la
limpia.

**No tiene nombre**: guarda credenciales y rol. El nombre del paciente vive en
su ficha y el del profesional en `ConfiguracionConsultorio`, y "Mi perfil" los
muestra pero no los edita (`docs/PERFIL.md`).

**El nombre del profesional sale de UN solo lugar**: `nutricionistas.nombre`
(`NOT NULL`, migración 74), que se escribe en el mismo INSERT que crea al
inquilino. Lo carga el SUPERADMIN al crear la cuenta (obligatorio) y lo edita el
profesional en Configuración, que no deja vaciarlo. Recordatorios, emails, PDF y
chat lo leen de ahí (`nombreDelActual()` dentro de un inquilino, `nombreDe(id)`
con alcance global); ya no hay variable de entorno `NOMBRE_PROFESIONAL` ni
nombres escritos a mano en la UI. Ver `docs/PERFIL.md`.

La **foto de perfil** es `fotoPerfilId → Archivo` (migración 53), del lado de
`usuarios` como el logo del membrete y no en el arco de dueños de `archivos`:
una foto de perfil es algo que la cuenta TIENE, no un adjunto de la cuenta. Por
eso es un archivo huérfano, y eso es legítimo.

La **política de contraseñas** está en `aplicacion/dtos/password.ts`, una sola
vez para los cuatro flujos que eligen una (alta de cuenta, alta de paciente,
restablecimiento por email y cambio desde la sesión). Hoy son 8 caracteres
mínimo, sin requisitos de composición y con una lista de obvias.

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

### IA de la plataforma

Las claves de Anthropic, OpenRouter y OpenAI son **de la plataforma**, no de
cada consultorio (migración 71): las carga el SUPERADMIN y las usan todos. Lo
único de cada profesional son sus prompts. Viven en `configuracion_ia_global`
(una fila, sin inquilino, cifradas) y cada llamada queda en `registros_uso_ia`
—tabla de inquilino, con el consultorio que la hizo— por el decorador
`ProveedorLLMRegistrado`. El costo se guarda solo si el proveedor lo informa
(OpenRouter); nunca se estima. Ver `docs/IA-PLATAFORMA.md`.

### Grabaciones de consulta

El profesional graba el audio de la consulta desde el turno; el worker lo
transcribe y una IA arma **un resumen del TURNO**, no uno por grabación (lo que
se resume es la consulta; las grabaciones son los pedazos en que quedó partida).
Hay **muchas por turno** a propósito: una consulta se interrumpe.

Dos cosas que se rompen fácil si no se saben:

- **Transcribir y resumir son proveedores distintos.** Anthropic no transcribe
  audio, así que `ITranscriptorAudio` (OpenAI / OpenRouter) se configura aparte
  de la IA de la app, que es la que resume.
- **Los stubs de esta función LANZAN**, al revés que el resto de los stubs de
  IA. Una transcripción de demostración guardada en la ficha de un paciente es
  un registro clínico inventado. Sin clave, el audio queda guardado y la
  grabación FALLIDA, lista para reintentar.

Se graba **en segundo plano**: el panel se minimiza y la consulta sigue
grabándose mientras se navega por la app. Eso depende de dónde está montado el
grabador —`ProveedorGrabacionConsulta`, en el layout del dashboard, que es lo
único que no se vuelve a montar al cambiar de pantalla—, no del diálogo.

Es material del PROFESIONAL: no hay procedimiento de paciente en su router.
Ver `docs/GRABACIONES.md`.

### Recordatorios de turno

Tres medios para el mismo aviso —WhatsApp, email y calendario— gobernados por UNA
política (`ConfiguracionRecordatorios`, una fila por inquilino), con **un solo
camino de disparo por medio**: un barrido automático y un envío manual, los dos
compartidos. Dos botones para el mismo aviso terminan mandándolo dos veces.

El antiduplicado es del motor, no del código: `UNIQUE (nutricionistaId, turnoId,
diasAntes)`. Ver `docs/RECORDATORIOS.md`.

El recordatorio puede ofrecer **confirmar y cancelar** (migración 76). Cancelar
por la APP (`/cancelar-turno`, `CancelarTurnoPorPaciente`) cancela y registra
`canceladoEn` + `canceladoPor = PACIENTE`; por el CHAT de cancelaciones (el
número `whatsappCancelaciones` del consultorio, no el de la Cloud API) solo
abre WhatsApp con un mensaje y el turno lo cancela el profesional. Cada acción
del enlace firma con su propia clave (`FirmaEnlacesTurno`): con una sola, el
token de confirmar serviría para cancelar.

### Plantillas de WhatsApp

Se pueden **crear desde la app** en la cuenta de WhatsApp Business del
consultorio (migración 73): la app las manda a revisión, les sigue el estado
(webhook `message_template_status_update` o «Actualizar estado») y les pone
botones. Crear y editar llaman a Meta ANTES de guardar. Solo sale por la API
una APROBADA; una vinculada a mano, sin estado consultado, se sigue tratando
como aprobada. Los botones de respuesta rápida llevan `ACCION:turnoId` en el
payload, y confirmar el turno desde un botón pasa por `ConfirmarAsistenciaTurno`,
el mismo camino que el enlace del email. Todo lo que sale por la API queda
además en el hilo (`mensajes_whatsapp`), que es lo único que lee el chat. Ver
`docs/WHATSAPP.md`.

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

El recetario tiene **carpetas** (`GrupoReceta`, migración 41), las mismas que los
planes y con la misma mecánica: un nivel, borrar la carpeta deja las recetas
sueltas (FK SET NULL) y mover es un caso de uso aparte de editar. **No compiten
con las etiquetas**: una receta tiene MUCHAS etiquetas y está en UNA carpeta —la
etiqueta describe la receta, la carpeta dice dónde la guardó el profesional—.

El navegador de carpetas es UNO solo (`componentes/comunes/NavegadorCarpetas`),
compartido por planes y recetario: los dos módulos tienen que navegarse igual, y
con dos copias eso dura hasta el primer arreglo que se aplique en una sola.

La receta se abre en **su propia página** —`/dashboard/recetas/[id]` en el
consultorio, `/mis-recetas/[id]` en el portal—, como un plan, y no en un
diálogo: si tiene un documento cargado ese documento se MUESTRA —mismo
`VisorArchivo` que el plan subido—, y un visor de PDF adentro de un modal es un
recuadro con scroll propio arriba del scroll del diálogo. Tener URL propia es
además lo que permite llegar a la receta desde el plan que la usa, de los dos
lados.

### Plan Nutricional

Antes se llamaba "Dieta" (hay redirects permanentes en `next.config.ts`). Hay
**DOS modalidades declaradas y no deducidas** (`ModalidadPlan`): `APP` se carga
franja por franja acá; `PDF` son los archivos armados afuera —pueden ser
VARIOS, y cuáles de los archivos del plan son el plan lo dice
`archivos.esDocumentoDelPlan`, no una columna del plan (migración 66)—. La
modalidad se elige al dar de alta, no se cambia editando.

**Un paciente puede tener VARIOS planes asignados a la vez y ninguno reemplaza
a otro** (migración 69). `AsignacionPlan` es un vínculo puro —plan, paciente y
nada más—, como `AsignacionReceta`: sin fechas y sin estado. Se asigna y se
desasigna, y desasignar BORRA la fila. Por eso `DesasignarPlanDePaciente` nombra
el plan: "el plan del paciente" dejó de ser una cosa sola.

**El historial existe pero vive aparte**: `DesasignacionPlan` guarda una fila por
cada plan que se le sacó a un paciente —nombre congelado, `asignadoEn` y
`desasignadoEn`—. Es append-only, **ninguna pantalla lo lee** (el front solo
asocia, desasocia y muestra lo asignado hoy) y se escribe en UN solo lugar: la
transacción de `desasignarDePaciente`. Cualquier camino nuevo para sacarle un
plan a alguien tiene que pasar por ahí o el registro queda con huecos. Ver
`docs/PLANES.md`.

### Plan Semanal

El menú de la semana: siete días × las franjas del consultorio, con
alternativas por celda. **No es una modalidad de `PlanNutricional`**: aquel
describe un día tipo y este los siete días concretos, y un paciente puede tener
los dos.

Dos reglas que se rompen fácil: el total de un día suma la comida **principal**
(`orden = 0`) de cada franja y no las alternativas —sumarlas triplicaría un
lunes con tres almuerzos—, y **las metas contra las que se compara salen del
PLAN NUTRICIONAL asignado**, no del plan semanal, que no las tiene —y con
varios asignados, del primero que declare macros, diciendo en pantalla de cuál
salieron—. Su historial (`AsignacionPlanSemanal`) es aparte y sigue siendo un
historial: el menú se cambia sin tocar la pauta de macros.

Ver `docs/PLANES-SEMANALES.md`.

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

**Qué medidas pide el formulario lo decide el consultorio**, en Configuración →
Antropometría. Los **dos protocolos son las plantillas principales** y cada uno
lleva su lista configurable; las plantillas propias son juegos de campos
adicionales. Los pisos son distintos y por eso la regla está partida: una
plantilla propia solo tiene que resolver ALGO, pero un protocolo tiene que
seguir arrojando lo que promete —el fraccionamiento de Kerr en 5 componentes, al
menos una ecuación de grasa en 2—, porque si no deja de ser ese protocolo.

De ahí sale la otra mitad: **una plantilla propia solo se puede usar con los
protocolos que admite** (`protocolosQueAdmite`), con el MISMO piso. La de 6
pliegues sirve para 2 componentes y no para 5. Todo vive en
`dominio/entidades/protocolosMedicion.ts`, y la misma función la usan el editor
en vivo, la validación del guardado y el desplegable de la medición.

En la carga a mano el protocolo se DECLARA; en la importación de una planilla se
DEDUCE de lo que trajo cada columna (`protocoloSegunMedidas`), porque son años
de consultas y no hay a quién preguntarle una por una.

La serie histórica se puede **importar de la planilla del profesional** (un
Excel con una columna por consulta): la IA la lee y precarga una tabla de
revisión; nada se guarda hasta confirmar. La importación NO es todo-o-nada —una
fecha ya cargada o una medida fuera de rango se informan y el resto entra— y
los derivados de la planilla (Σ pliegues, kg bajados, % graso) se ignoran a
propósito: los recalcula el dominio.

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

### Bioimpedancia

Lo que informa la balanza —peso, kg y % de músculo, kg y % de grasa, y el
nivel de grasa visceral (un ENTERO de la escala del equipo, migración 75)—, una
medición por paciente y fecha, con dashboard y metas (migración 72). Es **otra
fuente y no se mezcla con la antropometría**: tablas propias y metas propias
(`ObjetivoBioimpedancia`, no variables de `ObjetivoComposicion`), porque el %
graso de la balanza y el de una ecuación son números de métodos distintos.
Al revés que la antropometría, **acá no hay nada derivado**: se guarda lo que
dijo el equipo, porcentajes incluidos. Lo que sí comparte es la proyección de
metas (`proyectarMeta`) y la tarjeta que la dibuja. Ver `docs/BIOIMPEDANCIA.md`.

### Evolución de control

El repaso cualitativo de UNA consulta (cumplimiento de la dieta, entrenamiento,
deposiciones, orina, descanso, si está indispuesta y cómo se percibe), más los
campos propios del consultorio.

Es la **contracara de `Antropometria`**: las dos son una por consulta, las dos
llevan `UNIQUE (pacienteId, fecha)` y las dos se ordenan por fecha, pero
aquella guarda lo que se MIDIÓ y esta lo que el paciente CONTÓ.

Los campos son **texto libre y no números**: en la consulta se anota «50%, 10
días no respetó por viaje», y el motivo es la mitad del dato. Lo cuantitativo
del seguimiento ya vive en la antropometría y en el diario.

Se cargan a mano o **salen del documento que se sube en la historia clínica**:
el interpretador devuelve la ficha y las evoluciones en UNA sola llamada
(suelen ser el mismo archivo), y lo leído se revisa antes de importarse. La
importación NO es todo-o-nada, y el unique por fecha es lo que hace que releer
el mismo documento no duplique el seguimiento.

Ver `docs/HISTORIA-CLINICA.md`.

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

Siempre lanzar errores tipados del dominio, nunca strings genéricos. Hay ~27 en
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

**Hay DOS bordes y tienen que decir lo mismo**: el middleware de tRPC y
`servidor/errores-http.ts`, que es por donde salen los route handlers de
`/api/*` —que no pasan por el middleware—. Lo que se agrega en uno va en el otro.

**Edición concurrente (lost update).** Los formularios que escriben un registro
ENTERO —paciente, receta y plan— mandan el `actualizadoEn` que leyeron, y la
condición viaja hasta el `where` del UPDATE
(`infraestructura/repositorios/base/edicionConcurrente.ts`). Si la fila ya no
está en esa versión no entra ninguna escritura y sale
`ErrorEdicionConcurrente`. Va en el WHERE y no en un `if` previo por el mismo
motivo que el EXCLUDE de los turnos: comparar antes de escribir deja una
ventana, y el motor es el único punto donde no la hay. El testigo es
**opcional** a propósito: las mutaciones de un solo campo que no salen de un
formulario (archivar, marcar la bienvenida) no tienen de dónde sacarlo ni por
qué frenarse.

Un choque contra una restricción de Postgres (email repetido, FK que ya no está)
NO es un `ErrorDominio`: sin traducir cae en el genérico «Ocurrió un error
inesperado», que para el usuario no dice nada. `traducirErrorPrisma`
(`infraestructura/persistencia/`) lo vuelve legible en los dos bordes, y **igual
lo reporta al monitor**: que llegue hasta la base significa que al caso de uso le
falta el chequeo explícito, que es el único que puede dar el mensaje bueno. Ver
`docs/ERRORES.md`.

## Autenticación y autorización

- Auth.js v5 con CredentialsProvider; bcrypt para las contraseñas
- `src/proxy.ts` (middleware de Next) protege `/dashboard/*`, `/mis-*` y `/mi-*`.
  NO cubre `/api`: cada route handler hace su propio `auth()`
- El contexto tRPC expone sesión, usuario, rol, servicios y bus de eventos
- Cuatro niveles de procedimiento: `publicoProcedimiento`,
  `protegidoProcedimiento`, `nutricionistaProcedimiento`, `superadminProcedimiento`

Conviven **DOS credenciales y no se mezclan**: el JWT de sesión dura 12 h y no
se puede revocar (por eso es corto), y el **token de refresco** dura 30 días,
vive en `tokens_refresco` y sí se revoca. El segundo solo sirve para emitir el
primero sin pedir la contraseña; alargar el JWT "ya que estamos" devuelve el
problema que el refresco vino a evitar. Rota en cada canje y, ante la
reutilización de un token ya consumido, cae la **familia** entera. Lo dispara el
callback `authorized` del middleware, que solo puede mirar si la cookie existe
—corre en Edge—; valida `/api/autenticacion/renovar`, en Node. Ver
`docs/SESIONES.md`.

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
- Nunca dejar que el choque contra una restricción de la base haga de chequeo:
  solo el caso de uso sabe con QUÉ chocó y puede decirlo («ya tenés un paciente
  con ese email: Juan Pérez»). Y nunca apagar el monitor al traducir ese error,
  que es la señal de que falta la validación
- Nunca dejar obligatorio en un esquema de formulario COMPARTIDO un campo que
  alguno de sus consumidores no dibuja: `handleSubmit` no llama al envío y, sin
  `<FormMessage>` donde mostrarlo, el botón queda mudo —sin error en consola ni
  pedido en la red—. Pasó con `establecimientoHabitualId` en el alta desde
  documento. Los formularios con campos condicionales llevan `onInvalid`
- Nunca hacer que el login distinga "contraseña incorrecta" de "ese email no
  existe": es un enumerador de cuentas. Sí se distinguen el bloqueo por intentos
  (no mira ninguna cuenta) y la cuenta desactivada (se informa DESPUÉS de
  verificar la contraseña)
- Nunca envolver un resolver de tRPC en `try/catch` para traducir errores: de eso
  se encarga el middleware, y hacerlo a mano apaga el monitoreo
- Nunca resolver el bloqueo optimista comparando `actualizadoEn` en el caso de
  uso antes de escribir: entre la comparación y el UPDATE hay una ventana, más
  chica que la del formulario pero igual de real. La condición va en el `where`
  del UPDATE (`enVersion`), como el EXCLUDE de los turnos
- Nunca hacer obligatorio el testigo de versión: archivar un paciente o marcar
  su bienvenida no salen de un formulario y no tienen de dónde sacarlo.
  Exigirlo las rompe a todas
- Nunca sacar de la transacción los `deleteMany` de los hijos del plan: corren
  ANTES del `update` que lleva la guardia de versión, así que un conflicto los
  encuentra hechos y lo único que los deshace es el rollback. Sueltos, un
  choque deja el plan sin franjas, sin equivalencias y sin recomendaciones
- Nunca consultar una tabla de inquilino sin alcance fijado
- Nunca llamar a `IProveedorWhatsapp.preparar()` desde una lectura: con la Cloud
  API conectada ese método ENVÍA el mensaje. Ya pasó una vez: el query de vista
  previa mandaba un recordatorio cada vez que el cliente lo refrescaba
- Nunca mandar un mensaje por la Cloud API sin dejarlo en `mensajes_whatsapp`:
  el chat lee solo esa tabla. El recordatorio escribía nada más en su log y la
  plantilla que le llegaba al paciente no aparecía en la conversación
- Nunca guardar una plantilla de Meta antes de que Meta la acepte, ni reordenar
  sus `botones`: Meta identifica cada botón por su posición al enviar, y una
  plantilla guardada que Meta rechazó muestra un texto que el paciente no recibe
- Nunca validar la agenda del consultorio en un solo caso de uso: agendar y
  reprogramar comparten `verificarDentroDeLaAgenda`
- Nunca leer el día de la semana de un turno con `getDay()`: va `getUTCDay()`
- Nunca agregar un campo al plan tocando solo el `update` del repositorio: hay que
  escribirlo también en el `create`. La modalidad se perdió así, y no falló nada:
  el default de la base le ganó a un valor que nunca se mandó
- Nunca sumar un filtro a un listado paginado tocando solo el DTO y el
  repositorio: `ObtenerPlanesPaginado` y `ObtenerRecetasPaginado` enumeran los
  campos a mano y lo que no esté ahí se descarta en silencio
- Nunca sacarle un plan a un paciente sin pasar por `desasignarDePaciente`: es
  el único camino que deja el registro en `DesasignacionPlan`, y un
  `deleteMany` sobre `asignaciones_plan` desde otro lado lo deja con huecos sin
  que nada falle —nadie lee esa tabla, así que nadie se entera—
- Nunca sumar TODAS las comidas de una celda del plan semanal al total del día:
  son alternativas entre sí y suma la principal (`orden = 0`). Y si tocás esa
  cuenta, tocá las dos —el dominio y el espejo de la grilla—: `totales.test.ts`
  compara las dos y es lo único que las mantiene diciendo lo mismo
- Nunca embeber un archivo del bucket por su URL firmada: es otro origen, no es
  alcanzable en producción y la CSP lo bloquea. Va `/api/archivos/<id>/ver`
- Nunca hacer que `TranscribirGrabacion` lance ante un fallo del proveedor: la
  política de reintentos vive en la entidad (`intentos`), y lanzar sumaría la de
  pg-boss en paralelo dejando al profesional sin ver el motivo
- Nunca guardar una transcripción o un resumen de demostración: los stubs de
  grabaciones lanzan a propósito
- Nunca montar `useGrabadorAudio` dentro del diálogo del turno ni de una
  pantalla: desmontarlo corta el `MediaRecorder`, y grabar tiene que sobrevivir
  a cerrar el panel y a navegar. Va en `ProveedorGrabacionConsulta`, en el
  layout. No rompe nada al bajarlo: simplemente deja de grabar al minimizar
- Nunca agregar un CHECK que exija "exactamente un dueño" sobre `archivos`: el
  invariante correcto es `<= 1` (migración 34; la 27 puso `= 1` y rompió todos
  los adjuntos hasta que alguien lo reportó)
- Nunca renombrar ni reordenar los valores del enum `MetodoGrasa`: una serie
  histórica de composición corporal no puede cambiar de ecuación
- Nunca dejar que el protocolo de 5 componentes se quede sin una medida de
  `REQUERIDOS_CINCO_MASAS`: sin el fraccionamiento de Kerr no es un protocolo
  más corto, es el de 2 componentes con otro nombre. El editor las deshabilita
  y la entidad las revalida, porque la pantalla no es una defensa
- Nunca ofrecer una plantilla propia bajo un protocolo que no admite: la de 6
  pliegues con 5 componentes se guarda perfecto y produce una medición sin
  fraccionamiento, que es justo lo que ese protocolo promete. Va
  `protocolosQueAdmite`, y al cambiar de protocolo la elegida que dejó de
  servir se suelta sola
- Nunca filtrar por la lista de campos de una plantilla algo que esa lista no
  nombra: el peso, los kg de grasa y la dinamometría no están en
  `CAMPOS_PLANTILLA` y se muestran siempre. Con el peso el efecto era mudo y
  total: es el único campo obligatorio, y al elegir una plantilla desaparecía
  de la pantalla dejando el formulario imposible de enviar
- Nunca importar de una planilla los valores DERIVADOS que trae calculados (Σ de
  pliegues, kg bajados, % graso): el dominio los recalcula en cada lectura, y
  los de una planilla vieja pueden venir de otra ecuación. Solo `kgGrasa`, que
  es un dato cargado a mano
- Nunca convertir un campo de evolución en número o enum: «50%» sin «10 días no
  respetó por viaje» es la mitad del dato, y «normales o constipada» no entra en
  ningún enum. Es texto libre a propósito
- Nunca hacer que la importación de una planilla sea todo-o-nada: son años de
  consultas, y una fecha repetida o un pliegue fuera de rango no pueden tirar
  abajo las otras diez columnas que estaban bien
- Nunca tocar la `clave` de un `CampoHistoriaClinica` ni de un `CampoEvolucion`
  al editarlo: es lo que ata
  el campo a los valores ya cargados, y moverla vacía ese campo en todas las
  fichas del consultorio. El repositorio la deja fuera del `update` a propósito
- Nunca guardar el valor de un campo personalizado sin su etiqueta: un campo
  cuya definición se borre después quedaría como un texto colgado de una clave
  que ya no resuelve contra nada
- Nunca programar un cron de pg-boss sin `tz`: sin eso lo interpreta en UTC, y
  `TZ` en el `.env` no lo arregla (afecta a `Date` en el proceso, no al
  planificador, que calcula la próxima corrida en la base). Va `ZONA_HORARIA`
- Nunca dar por rota la entrega de emails sin mirar `SMTP_HOST`: en desarrollo
  apunta a Mailpit (`localhost:1025`), que los captura y no los manda a
  Internet. Se envían, se registran y el log dice que salieron; solo que nadie
  los recibe. Se leen en http://localhost:8025
- Nunca firmar dos acciones del enlace del turno con la misma clave: la carga
  es idéntica, y el token de «confirmar» de un email cancelaría el turno
  pegado en `/cancelar-turno`. Y nunca cambiar el propósito de la clave de
  confirmar: invalida los enlaces que ya están en las bandejas
- Nunca hacer que una respuesta rápida de WhatsApp cancele el turno: se toca
  sin querer y no tiene segundo paso. `PEDIR_CANCELACION` avisa; cancela el
  enlace, que pasa por una página de confirmación
- Nunca volver a meter las alertas de seguimiento en la campana: son un
  estado que se trabaja en el panel del dashboard, y en la campana tapaban los
  avisos urgentes
- Nunca apagar el aviso de un mensaje solo desde la campana: se da por visto
  al abrir esa conversación por cualquier camino
  (`MarcarAvisosDeConversacionVistos`). Y los avisos de WhatsApp enlazan con
  `&canal=whatsapp`, o abren el chat del portal
- Nunca contar los «sin leer» de Mensajes solo del portal: la bandeja y el
  sidebar suman WhatsApp (`mensajes_whatsapp.leidoEn`, migración 77)
- Nunca mandar como texto común una plantilla con botones que Meta no aprobó
  (en revisión, rechazada, pausada): le llega al paciente sin los botones.
  Queda FALLIDA con el motivo y sale cuando Meta la aprueba
  (`noSeEnviaSinMeta`)
- Nunca comparar la hora del barrido de recordatorios por igualdad: es `>=`
  ("ya pasó la hora de hoy"). Con `==`, un worker que arrancó 10:30 dejaba al
  consultorio de las 10:00 sin recordatorios TODO el día y sin ningún error.
  Correr de más es seguro: los dos medios son idempotentes por escalón
- Nunca guardar una plantilla de plan en una carpeta: las carpetas son de los
  planes. Una plantilla es un molde transversal a todos los pacientes, y
  meterla en la carpeta de uno la vuelve inhallable desde los demás
- Nunca pedirle JSON a `ProveedorLLMOpenRouter` sin mandarle el esquema COMPLETO:
  ahí el formato se pide por prompt (no hay `response_format`), y con solo las
  claves de primer nivel el modelo inventa los nombres anidados y el
  normalizador los descarta en silencio
- Nunca resolver en la pantalla el nombre de algo que ya viene referenciado
  (el paciente de un turno) con un listado paginado: se queda con la primera
  página y deja afuera a los archivados. Así los turnos del paciente 101 salían
  como "Paciente" en producción. El nombre viaja en el DTO, resuelto por id en
  el servicio (`ServicioTurno`), como la sede del turno
- Nunca comparar la fecha de un `Turno` contra una medianoche LOCAL: es un DATE
  a medianoche UTC, y al oeste de Greenwich los turnos de hoy quedan "antes de
  hoy". Va `IRelojFecha.hoy()`
- Nunca filtrar una columna TIMESTAMP con `lte: hasta` en las estadísticas: el
  `hasta` que mandan las pantallas es un DÍA (medianoche UTC), así que todo lo
  que pasó HOY queda afuera. Con `Turno.fecha`, que es un DATE, `lte` está bien;
  con `Paciente.creadoEn` va `finDelDia()`. Así estuvo "Pacientes nuevos", que
  no contaba ninguna alta del día y al otro día aparecía sola — parecía un
  problema del alta y era del filtro
- Nunca decidir por formulario si un alta manda el email de bienvenida: la
  política es del consultorio (`bienvenidaAutomaticaActiva`) y vive una sola vez
  en `ServicioPaciente.darLaBienvenida`. El alta desde documento no la mandaba y
  esos pacientes quedaban sin sus datos de acceso, sin ningún aviso
- Nunca asumir que el modelo sabe qué día es: la fecha de hoy va en el prompt
- Nunca volver a guardar claves de IA por consultorio ni leerlas de
  `credenciales_proveedor`: son de la plataforma (`IConfiguracionIAGlobalRepositorio`).
  Y nunca armar un proveedor de LLM sin pasar por `ResolvedorConfigIA`: es el
  que lo envuelve en `ProveedorLLMRegistrado`, y uno suelto gasta sin dejar
  rastro en el panel
- Nunca leer el nombre del profesional de una variable de entorno ni
  escribirlo en el código: la app es de muchos consultorios, y así el
  recordatorio por email de todos salía firmado por el mismo. Va
  `nutricionistas.nombre`, por `INutricionistaRepositorio`. Y nunca volver a
  ponerlo en `ConfiguracionConsultorio`: ahí la base no puede garantizar que
  exista
- Nunca estimar el costo de una llamada con una tabla de precios propia: queda
  vieja sin avisar. `costoUsd` es solo el que informa el proveedor
- Nunca tragarse con un `catch` vacío el fallo de una llamada de IA y devolver
  el stub: el error llega a la pantalla disfrazado de respuesta
- Nunca hacer que un interpretador de IA persista lo que leyó de un documento:
  precarga el formulario y el profesional confirma. Y nunca degradarlo a un stub
  sin clave: un dato de demostración en una ficha es un registro clínico inventado
- Nunca importar el contenedor desde un componente de UI (arrastra Prisma al
  bundle del navegador)
- Nunca usar `any`
- Nunca escribir un `min()` propio para una contraseña: va `passwordNuevaDto`.
  El mínimo se lee de `LARGO_MINIMO_PASSWORD`, también en los tests y en los
  placeholders. Cablear el número hizo fallar dos tests al bajarlo de 12 a 8, y
  antes había dejado al formulario aceptando lo que el servidor rechazaba
- Nunca colgar la foto de perfil de un dueño del arco de `archivos`: la FK vive
  en `usuarios.fotoPerfilId`. Colgarla del paciente la hace aparecer en
  "Archivos y registros" de su ficha, como si fuera un documento clínico
- Nunca aceptar como foto de perfil un archivo de otro contexto: cambiar la foto
  BORRA la anterior, y una foto de comida aceptada acá se lleva puesto un
  registro del diario del paciente
- Nunca fijar la contraseña ni cambiar el email de login de una cuenta de
  paciente que no sea EXCLUSIVA del consultorio (`esCuentaExclusiva`): la
  cuenta abre las fichas de todos sus consultorios, y el que la fija podría
  entrar como el paciente a la del otro. Tampoco borrarla al eliminar una
  ficha sin contar sus fichas
- Nunca copiar al JWT lo que manda `update()` de la sesión: cualquier script
  de la página lo puede llamar. Es una preferencia de consultorio, y la
  identidad se vuelve a resolver con `ResolverConsultorioActivo`
- Nunca asociar una ficha a una cuenta que ya existe por un dato que cargó el
  profesional (email, usuario, DNI, teléfono): un error de tipeo le abre la
  ficha a otra persona. Solo el canje de un código de invitación, que hace la
  persona con su contraseña (`CanjearInvitacionPortal`). Una persona con dos
  cuentas es incómodo; dos personas en una cuenta es una filtración
- Nunca volver a hacer único el email de la FICHA: es de contacto, y dos
  hermanos pueden llevar el de la madre. El único es el de la cuenta. Y nunca
  aceptar un nombre de usuario con `@`: el login no podría distinguirlo
- Nunca contar como FALLIDO un recordatorio que no salió porque el paciente no
  tiene email: es un caso normal desde la migración 79, y se cuenta omitido
- Nunca darle `nutricionistaId` a la cuenta de un PACIENTE ni volver a colgarla
  de una ficha (`usuarios.pacienteId`): se llega a ella por
  `pacientes.usuarioId`, y en `usuarios` se busca
  con el filtro `visibles` del repositorio (el automático la esconde)
- Nunca guardar passwords en texto plano. Tampoco "para poder reenviarlas":
  la bienvenida manual genera una provisional y se la asigna a la cuenta
- Nunca asignar la contraseña provisional de la bienvenida ANTES de mandar el
  email: si el envío falla, el paciente queda afuera con una contraseña que
  nunca le llegó
- Nunca alargar `session.maxAge` para que la gente no vuelva a loguearse: ese
  es el JWT y NO se puede revocar. Para eso está el token de refresco, que vive
  en la base y se da de baja. Y nunca guardarlo en claro: va el SHA-256, como
  el de recuperación
- Nunca revocar solo el token de refresco reutilizado: cae la FAMILIA entera.
  Revocar el presentado deja al ladrón con el que ya rotó, que es justamente el
  que sirve. Y nunca renovar sin revalidar al usuario contra la base: una
  cuenta dada de baja no puede resucitar su sesión con un token viejo
- Nunca poner secretos en el código, siempre variables de entorno
- Nunca armar un redirect de un route handler con `new URL(ruta, request.url)`:
  `NextResponse.redirect` manda un `Location` ABSOLUTO y `request.url` se arma
  con la cabecera `Host` que le haya llegado al proceso, que detrás de un proxy
  puede ser cualquier cosa —`0.0.0.0:3000` en Docker—. Va `urlApp()`. Pasó en la
  vuelta del OAuth de Google: los tokens se guardaban bien y el navegador
  aterrizaba igual en una dirección inexistente
- Nunca hacer que el service worker cachee páginas ni respuestas de `/api/*`
  (`public/sw.js`): todas dependen de la sesión, y el Cache Storage NO se limpia
  al cerrar sesión — la ficha de un paciente quedaría en el disco del dispositivo
  para el que abra la app después. Solo se cachea `/_next/static/` y los íconos.
  Por lo mismo no se usa `next-pwa`/Workbox, que precachean el shell entero

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
