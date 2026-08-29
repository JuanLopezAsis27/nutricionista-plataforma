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

## Documentacion

Siempre registra lo realizado (ya sean features, fixes, refactors, etc) en cada iteracion con detalles tecnicos y conceptuales, con el fin de poder entender las decisiones tomadas y actuar a futuro en base a ellas.
No modifiques y agregues informacion del AGENTS.md todo el tiempo, las features nuevas y documenacion aledaña va en /docs, en el AGENTS.md debe ir el detalle general e indispensable de la aplicacion

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

**Dónde va cada pantalla de configuración**, que se movió más de una vez:
Integraciones son SERVICIOS EXTERNOS con credenciales (Google, WhatsApp Cloud
API, IA, FatSecret), una pestaña por servicio. Configuración es lo que describe
al CONSULTORIO (horarios, membrete, PDF, prefijo telefónico, plantillas de
email que no son recordatorios). Recordatorios es la tarea de avisar turnos,
completa. La pregunta que separa las tres: ¿esto es dar de alta algo de afuera,
describir el consultorio, o hacer una tarea?

- /src/servidor → routers tRPC, contexto, procedimientos
- /src/componentes → componentes de UI (solo hablan por los hooks de tRPC)

**Invalidación de caché: las mutaciones invalidan TODO** (`useInvalidar`), no
su propio router. Los read models están armados para la pantalla, no para la
tabla, así que los datos de un router aparecen en varios otros: Recordatorios
lista turnos, la ficha del paciente muestra sus planes y recetas, el centro de
notificaciones compone tres fuentes. Mantener a mano "qué routers toca cada
mutación" se rompe solo, y olvidarse no da error: da datos viejos en pantalla.
Ya pasó —borrar un turno lo dejaba visible en Recordatorios hasta recargar—.
React Query solo refetchea las queries ACTIVAS, así que el costo lo acota la
pantalla que está abierta.

**Ojo con las copias congeladas.** Invalidar refresca las QUERIES, no un
objeto que un componente haya guardado en `useState` (el típico
`setRecetaEditar(receta)` antes de abrir un diálogo). Un componente que muestra
datos que él mismo modifica tiene que LEERLOS de una query por id, no recibirlos
por prop desde ese estado: si no, la mutación actualiza el servidor y la caché,
y la pantalla sigue mostrando la foto que se acaba de borrar.

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

El dominio tiene **34 entidades**, **163 casos de uso** repartidos en 25
módulos, **36 interfaces de repositorio** y **17 puertos de servicio**. La
fuente de verdad es el código (`/src/dominio`) y `prisma/schema.prisma`; acá
solo van los modelos centrales y sus reglas.

### Paciente

Pertenece a un inquilino. Email y teléfono son únicos POR CONSULTORIO, no
globalmente: la misma persona puede ser paciente de dos nutricionistas.
Baja lógica con `archivadoEn` (no se borra).

### Turno

Estados: PENDIENTE | CONFIRMADO | CANCELADO | COMPLETADO
Regla: no pueden existir dos turnos solapados en el mismo horario.

**Un turno también tiene que caer dentro de la agenda declarada del
consultorio** —días y horario de atención de Configuración—. La regla vive en
`dominio/servicios/agendaConsultorio.ts` y la comparten `AgendarTurno` y
`ReprogramarTurno`: mientras estuvo solo en el alta, reprogramar era la puerta
de atrás para dejar un turno un domingo. Antes de eso, `diasAtencion` no lo
leía nadie y la configuración era decorativa.

El horario se mira por el FIN del turno, no por el inicio: una consulta de 30
minutos que arranca a la hora de cierre es media hora después de cerrar. Y el
día de la semana se lee SIEMPRE en UTC (`getUTCDay()`), porque `Turno.fecha` es
un `DATE` que llega como medianoche UTC —con `getDay()` un lunes se leería como
domingo en nuestra zona—.

`src/lib/agenda.ts` es el espejo de esa regla en pantalla: apaga las franjas
ocupadas, pasadas o fuera de horario antes de que el profesional las elija. No
la reemplaza; el router tRPC es un entry point propio. Ver `docs/AGENDA.md`.

Cancelar es baja LÓGICA (queda en la grilla: que alguien no vino es
información clínica y de cobranza). `EliminarTurno` es la excepción —borrado
real— y exige dos condiciones: estado CANCELADO y sin cobro registrado. Lo
segundo no es capricho: un turno con precio ya entró en las estadísticas de
ingresos, y borrarlo descuadra la caja de un mes que quizá está cerrado.

### Recordatorios de turno

Tres medios para el mismo aviso —WhatsApp, email y calendario— gobernados por
UNA política (`ConfiguracionRecordatorios`, una fila por inquilino) que cada
medio lee donde le toca actuar: el envío por WhatsApp en
`casos-de-uso/recordatorios`, el del email en Secretaría y el del calendario en
`SincronizadorCalendarioGoogle`, que corre al agendar. La pantalla es
`/dashboard/recordatorios` (ver `docs/RECORDATORIOS.md`).

Cada medio tiene DOS interruptores y no son lo mismo: `*Activo` es si el medio
se usa, `*Automatico` es si además sale solo. Un medio activo pero no
automático es el profesional que elige a mano a quién le manda.

`*DiasAntes` es un ARRAY y no un número: la cantidad de avisos es su longitud.
`[3, 1]` son dos recordatorios, uno tres días antes y otro el día anterior.

**El antiduplicado es del motor, no del código:** `UNIQUE (nutricionistaId,
turnoId, diasAntes)`. Cada escalón de la programación entra una sola vez por
turno; un leer-y-después-escribir lo pasan dos procesos concurrentes. Los
envíos manuales llevan `diasAntes` NULL y en Postgres los NULL no colisionan,
así que insistir a mano sigue siendo posible: lo que se corta es el duplicado
por error.

**El log registra ENVÍOS, no intentos** (`filaAReusar` + `salio`). Un aviso que
no llegó a salir —PREPARADO sin confirmar, DESCARTADO o FALLIDO— no es historia:
es el mismo aviso pendiente, y el intento siguiente REUSA esa fila. Solo un
aviso que salió de verdad se preserva, y un reenvío manual sobre uno de esos sí
crea fila nueva (pisarlo borraría que se insistió).

Costó dos vueltas: el primer arreglo solo reusaba el PREPARADO, así que
preparar → descartar → preparar seguía insertando una fila por vuelta. La
prueba que lo agarra es `EnvioRepetido.test.ts`, y usa un repositorio EN
MEMORIA a propósito: con mocks de respuesta fija, apretar "Enviar" dos veces
seguidas no se puede simular, y por eso los tests anteriores lo dejaron pasar.

Los escalones programados reusan SIEMPRE, incluso una fila ya enviada: el
índice único no deja insertar otra para el mismo escalón.

**"Ya se le avisó" es TEMPORAL**, no definitivo: el envío manual omite a quien
recibió un aviso hace menos de `horasEntreAvisos` (configurable, 24 h por
defecto) y después lo deja pasar. Con el bloqueo definitivo, insistir obligaba
a tildar "reenviar", que apaga la protección de todo el lote. Los escalones
programados NO usan el margen: ahí la idempotencia dura es del índice único,
porque el worker reintenta.

Los borradores se resuelven en Recordatorios → Enviar → «Sin confirmar»
(`ListarRecordatoriosPendientes` + `ConfirmarRecordatorioWhatsapp`). NO hay
botón de recordatorio en la grilla de turnos: la confirmación no tenía dónde
ocurrir ahí y los avisos quedaban colgados en PREPARADO.

**Un solo camino por medio.** El email salía por su propio cron y por un botón
en Secretaría; ahora sale por el MISMO barrido que WhatsApp
(`EnviarRecordatoriosProgramados`, un trabajo `recordatorios-turnos` por hora) y
por el MISMO envío manual (`EnviarRecordatoriosMasivos`, que manda por todos los
medios activos). Dos botones para el mismo aviso terminan mandándolo dos veces;
si hace falta un tercer medio, se suma a esos dos caminos.

**Secretaría se disolvió en Recordatorios** (`/dashboard/plantillas` redirige).
Era media tarea en otra pantalla: el texto del recordatorio por email y un
segundo botón de disparo. Los emails que no son recordatorios (BIENVENIDA y las
propias) quedaron en Configuración → Plantillas de email; `ServicioSecretaria`
sobrevive como el CRUD de plantillas de email, sin envío de recordatorios.

El estado del recordatorio va del canal al paciente: PREPARADO → ENVIADO →
ENTREGADO → LEIDO → RESPONDIDO → CONFIRMADO, con FALLIDO y DESCARTADO como
salidas. Los cuatro primeros los informa el webhook de Meta; los dos últimos
salen de la respuesta del paciente (`RegistrarRespuestaDeRecordatorio`, que
corre en la ingesta). Ojo con el vocabulario: CONFIRMADO es que el PACIENTE
dijo que viene, no que el mensaje salió.

**Plantillas propias** (`PlantillaWhatsapp`): guardan el texto en castellano y,
opcionalmente, el nombre de la plantilla APROBADA en Meta con el ORDEN de sus
parámetros. Fuera de la ventana de 24 h la Cloud API rechaza el texto libre —y
un recordatorio casi siempre cae fuera—, así que sin clave de Meta el envío
automático no sale. Meta numera los parámetros (`{{1}}`, `{{2}}`…) en vez de
nombrarlos: el orden guardado ES el mapeo. Un texto editado a mano NUNCA sale
como plantilla de Meta, porque ya no coincide con el cuerpo aprobado.

Siempre hay una plantilla predeterminada y no se puede borrar: es la que usa el
barrido, y quedarse sin ella se descubre el día en que los avisos no salieron.

El barrido de WhatsApp corre CADA HORA y cada inquilino se apaga solo si no es
su hora (`correspondeALaHora`). Es más simple que un cron por consultorio y
sobrevive a un worker que arrancó tarde.

### Receta

Los adjuntos son `Archivo` con `recetaId`: las imágenes se leen como fotos y el
resto (PDF/Word) como documentos, separados por MIME al mapear. Se suben ANTES
de que la receta exista y se vinculan al guardarla — por eso el CHECK de
`archivos` admite el huérfano temporal (ver migración 34).

`fotoPrincipalId` es la portada elegida. Antes era `fotos[0]`, que sin ORDER BY
no está garantizado y hacía rotar la foto del recetario sola. El fallback —si
no hay elegida, o si la elegida ya no está— lo resuelve el getter
`Receta.fotoPrincipal`, no cada pantalla: si lo repitiera la UI, la tarjeta y
la vista podrían mostrar fotos distintas de la misma receta.

Borrar un adjunto (`EliminarArchivoDeReceta`) verifica que sea DE esa receta
antes de tocarlo. Sin eso el endpoint sería un borrado de archivos por id: la
extensión de inquilino impide que sea de otro consultorio, pero no que sea el
laboratorio de un paciente.

### Plan Nutricional

Antes se llamaba "Dieta"; se renombró en la Fase 3 y hay redirects permanentes
en `next.config.ts`. Un plan agrupa comidas, opciones, equivalencias y
recomendaciones, y se asigna a pacientes vía AsignacionPlan.

**Hay DOS modalidades de plan y no son dos variantes de la misma** (migración
37, `ModalidadPlan`):

- `APP` — se carga franja por franja acá. Necesita al menos una comida y no
  admite archivo principal.
- `PDF` — el plan ES el archivo, armado afuera (Word, Canva). Necesita el
  archivo y no admite comidas.

Las dos llevan ANEXOS: PDFs de apoyo —la lista de compras, un instructivo— que
van al FINAL de la vista y nunca reemplazan al plan.

Está declarado y no deducido de "¿tiene archivos?" por una razón concreta: la
migración 36 lo modeló como "un PDF opcional del plan" y el anexo de un plan
cargado se mostraba como si fuera el plan. La modalidad no se cambia editando
—pasar de PDF a APP deja un plan sin comidas y al revés tira las cargadas—: se
elige al dar de alta.

Los archivos son `Archivo` con `planId` (1 a N, dueños del arco exclusivo), no
columnas con rutas: así heredan clave de bucket, MIME, tamaño y borrado
compensado del módulo Archivos. Se suben ANTES de que el plan exista y se
vinculan al guardarlo, igual que los adjuntos de una receta. `archivoIds` es el
estado final: lo que no está en la lista se desvincula (y su fila se borra, para
que el barrido de huérfanos se lleve el objeto del bucket).

El fallback del archivo principal lo resuelve la ENTIDAD
(`PlanNutricional.archivoPrincipal`) y el DTO expone `archivoPrincipal` y
`adjuntos` ya resueltos: repetirlo en cada pantalla es lo que hacía rotar la
foto de la receta.

**El nombre del plan es único por consultorio** (migración 38), con planes y
plantillas como espacios SEPARADOS: la plantilla «Descenso» y el plan que sale
de ella conviven. El índice único es la garantía; el caso de uso pregunta antes
solo para dar un mensaje entendible. Clonar una plantilla NUMERA el nombre
(«(2)», «(3)»…) porque es un clic sin formulario; un nombre escrito a mano no se
toca.

**`GrupoPlan` es una carpeta**, no una categoría: agrupa por propósito —un
paciente, un objetivo, una población— y el criterio lo pone quien trabaja.
Borrarla NO borra los planes (SET NULL): quedan sueltos. Se NAVEGAN como
directorios (raíz = carpetas + planes sueltos; crear adentro guarda adentro),
un solo nivel. En el repositorio `undefined` no filtra y `null` pide los
sueltos: son dos preguntas distintas. Mover tiene su propio caso de uso
—ordenar no es editar—.

**`AsignacionPlan` es el HISTORIAL del paciente y sobrevive al borrado del
plan** (migración 38): la FK pasó a SET NULL y la fila guarda `nombrePlan`, una
foto del nombre al asignarlo. Qué siguió el paciente y entre qué fechas es
información suya, no un detalle del plan. `fechaFin` es el fin PLANIFICADO y
`finalizadaEn` el real: al reemplazar un plan, el anterior se cierra con la
fecha de INICIO del nuevo, no con "hoy".

El paciente lo ve embebido por `/api/archivos/[id]/ver`, que sirve el contenido
DESDE la app —mismo origen, `Content-Disposition: inline`—. La ruta hermana
`/api/archivos/[id]` redirige a una URL firmada del bucket y sirve para bajar,
no para embeber: un iframe a otro origen queda a merced de las cabeceras del
bucket y del WebView de Android. Las dos tienen la MISMA autorización a
propósito. Ver `docs/PLANES.md`.

### Antropometría y composición corporal

Una `Antropometria` es una consulta: el perfil ISAK completo (básicos, 6
diámetros, 11 perímetros, 8 pliegues). Solo el peso es obligatorio.

**Nada derivado se persiste.** Las 5 masas de Kerr, el somatotipo de Heath &
Carter, los Score-Z Phantom, los índices, el metabolismo y el porcentaje graso
los calcula el dominio a partir de las medidas crudas, en cada lectura. Si
mañana cambia una constante del modelo, los informes históricos se recalculan
solos; si se persistieran, quedarían mintiendo.

**Conviven DOS modelos, y no se mezclan.**

- `composicionCorporal.ts` — fraccionamiento en 5 masas (Kerr, 1988), modelo
  ANATÓMICO derivado de disección de cadáveres. Da masa adiposa (grasa
  subcutánea). Exige el perfil ISAK completo.
- `grasaPorPliegues.ts` — modelo de 2 COMPONENTES (grasa / masa magra), por
  regresión contra densitometría. Da grasa corporal total. Seis ecuaciones:
  Yuhasz-Carter y Faulkner (con sus variantes ×1,17 y ×1,14 de Kerr para
  sedentarios), Withers (atletas) y Durnin & Womersley (población general);
  las dos últimas pasan por densidad corporal y convierten con Siri.

Los dos números son distintos por diseño y esa brecha no es un error. Regla
dura: **una serie histórica nunca cambia de modelo ni de ecuación.** Por eso
un objetivo de `PORCENTAJE_GRASA` o `MASA_GRASA_KG` lleva su `metodoGrasa`
fijado, y la proyección lo respeta aunque la medición destaque otro.

El campo `protocolo` de la medición (CINCO_COMPONENTES / DOS_COMPONENTES) NO
restringe el cálculo: solo decide qué se muestra primero. En la práctica el
profesional carga los 6 pliegues y poco más, y con eso salen Yuhasz-Carter y
Faulkner; Withers pide además el bicipital y Durnin & Womersley el bicipital y
la cresta ilíaca (ojo: cresta ilíaca, NO supraespinal — son sitios distintos
del protocolo ISAK y no se sustituyen).

El cálculo **degrada por bloques**: cada bloque se resuelve si están sus
medidas y devuelve `null` si falta alguna, informando en `faltantes` qué hay
que medir (el modelo de 2 componentes lleva su propia lista, por ecuación).
Nunca lanza. Las constantes numéricas (3,141 y 0,3141 en las correcciones de
perímetro, 0,3333 como raíz cúbica) se copian tal cual de la planilla del
profesional: reemplazarlas por PI/10 o 1/3 desplazaría los resultados respecto
de sus informes históricos. `composicionCorporal.test.ts` compara contra la
planilla celda por celda.

El `sexo` biológico vive en el Paciente (no cambia entre consultas) y el nivel
de actividad en la medición (sí cambia). Sin sexo no hay fraccionamiento ni
metabolismo: son constantes distintas por sexo.

`ObjetivoComposicion` es la meta cuantitativa ("masa adiposa a 12 kg para el
30/11"), una sola vigente por paciente y variable. Su proyección —brecha,
ritmo semanal por regresión, fecha estimada de llegada— la calcula
`dominio/servicios/proyeccionComposicion.ts`.

Dos reglas que ya se rompieron una vez y conviene no volver a romper:

1. **El progreso se mide desde que la meta existe**, no desde la primera
   medición del paciente. El punto de partida es la medición vigente al
   crear el objetivo (`creadoEn`). Con historia previa la diferencia es
   enorme: un paciente que venía de 30 kg y estaba en 20 al acordar bajar a
   15 aparecía con 77 % del camino hecho antes de empezar. El ESTADO, en
   cambio, se lee siempre contra la última medición: es dónde está hoy.
   El RITMO es una tercera cosa: es una propiedad del paciente, no de la
   meta. Se estima con lo medido desde la partida y, cuando no hay dos
   mediciones posteriores —el caso habitual, porque la meta se plantea
   después de la consulta—, con las de los últimos 6 meses, marcándolo con
   `ritmoPrevioALaMeta` para que la UI lo aclare. Acotar por tiempo y no por
   cantidad es deliberado: "las últimas tres" puede incluir una de hace ocho
   meses, que aplana la pendiente igual que la historia entera.
2. El valor proyectado a la fecha meta se descarta cuando la recta se sale del
   rango admisible de la variable: extrapolar meses hacia adelante llega a un
   0 % de grasa, y una proyección imposible es peor que ninguna.

**Torta de masas con objetivos:** en la sección Objetivos, el reparto de las
5 masas de la última medición con las metas marcadas encima — cada gajo mide
lo mayor entre el valor de hoy y la meta, y la diferencia va rayada (sobra si
hay que bajar, falta si hay que subir). Es UNA figura para todos los objetivos
de masa, no una por tarjeta. Las metas que no apuntan a una de las cinco
(peso, IMC, cintura) no tienen gajo y se leen en su propia tarjeta.

**Pliegues proyectados:** las metas de ADIPOSIDAD (masa adiposa en kg y en %,
% graso, masa grasa y Σ6) muestran cómo quedaría cada pliegue al alcanzarlas.
El peso no depende solo de ellos y la masa muscular sube entrenando —no
adelgazando el pliegue—, así que ahí no se proyecta y la UI dice por qué:
callar deja al profesional esperando un gráfico que no va a aparecer.

Se resuelve por BISECCIÓN sobre el factor de escala de los pliegues,
recalculando la composición completa en cada paso
(`proyectarPlieguesParaMeta`), no despejando la ecuación. El motivo es que la
masa adiposa de Kerr se prorratea contra el peso bruto y ese ajuste depende de
las otras cuatro masas: no hay forma cerrada. De paso, el mismo camino sirve
para las metas de Kerr y para las de las ecuaciones de pliegues.

El reparto entre sitios es proporcional al de hoy. Eso es una SUPOSICIÓN (la
grasa no se moviliza igual en todos lados) y está dicho en la UI: ilustra la
meta, no promete un pliegue. La proyección avisa si exige dejar alguno por
debajo de 2 mm, que es lo más fino que se mide con plicómetro, y devuelve null
si la meta no es alcanzable moviendo pliegues en vez de clavarse en un extremo
y dibujar algo falso.

**Plantillas de carga** (`PlantillaAntropometrica`): el perfil ISAK son 25
medidas y en consulta se toman seis, así que el profesional arma las suyas
partiendo de las de fábrica (`plantillasBase.ts`) y destildando lo que no usa.
La regla dura es que una plantilla tenga que alcanzar para calcular ALGO; el
mínimo son los 4 pliegues de Faulkner. Qué exige cada resultado vive en
`REQUISITOS_RESULTADO`, una TABLA exportada: la valida el dominio y la lee la
UI para mostrar en vivo qué se gana y qué se pierde al podar. La plantilla
solo decide qué campos muestra el formulario — no limita qué se guarda.

En la ficha del nutricionista, **Antropometría** es la única pestaña que carga
y lee medidas corporales; **Progreso** es el seguimiento del día a día (peso
del diario, hábitos, adherencia, plan). La vieja pestaña «Informes»
desapareció: mostraba los mismos hábitos y la misma curva de peso que Progreso.

En el portal del paciente, **Mi composición** (`/mi-composicion`) muestra sus
mediciones y sus objetivos con cuánto le falta. Es la ÚNICA parte de la
evaluación que se expone al paciente: historia clínica, laboratorios y alertas
siguen siendo del profesional. El endpoint `miComposicion` resuelve el paciente
desde la sesión, nunca desde el input, y es de solo lectura. La vista recorta a
propósito el Phantom, la somatocarta y los índices técnicos: sin quien los
interprete confunden más de lo que informan.

### Usuario

Roles: SUPERADMIN | NUTRICIONISTA | PACIENTE
Reglas: si el rol es PACIENTE debe tener `pacienteId`; el `nutricionistaId`
indica a qué consultorio pertenece (null solo para SUPERADMIN).

## Errores de dominio

Siempre lanzar errores tipados del dominio, nunca strings genéricos.

Los routers **NO** capturan errores. Un único middleware en `src/servidor/trpc.ts`
traduce todo:

- `ErrorDominio` → TRPCError con el código semántico correcto
- `TRPCError` con código propio → pasa tal cual (flujo esperado: 401/403,
  validación Zod)
- cualquier otro → se reporta al monitor y se reemplaza por un
  INTERNAL_SERVER_ERROR con un **mensaje genérico explícito**, para no filtrar
  detalles internos

**Trampa de tRPC v11 al tocar ese middleware:** `next()` NO lanza cuando el
resolver falla, devuelve `{ ok: false, error }`. Hay que mirar `resultado.ok`;
envolverlo en `try/catch` compila, se lee perfecto y no hace absolutamente
nada. Así estuvo un tiempo, y el resultado era que ningún error de dominio se
traducía (todos salían 500), que el monitor no recibía un solo error de tRPC y
que el mensaje interno viajaba tal cual al navegador. Lo mismo vale para el
saneo: sin un `message` explícito, tRPC hereda el de la `cause` y la
filtración vuelve. `src/servidor/trpc.test.ts` cubre los tres efectos llamando
de verdad a un router de prueba, que es la única forma en que esto se ve.

La traducción a cada transporte (tRPC y HTTP) vive una sola vez en
`src/servidor/mapaCodigos.ts`. Agregar un `CodigoErrorDominio` rompe la
compilación hasta traducirlo en ambos mapas.

Hay ~26 errores en `/src/dominio/errores`, todos extienden `ErrorDominio` y
llevan un `codigo` semántico: VALIDACION, NO_ENCONTRADO, CONFLICTO,
ACCESO_DENEGADO, NO_AUTENTICADO.

### Los dos tipos de objetivo

Conviven a propósito y son complementarios, no redundantes:

- `Objetivo` — el **plan**: qué se va a hacer y por qué. Lleva estrategias con
  motivo obligatorio e historial auditable. Muchas cosas que importan en
  nutrición no son un número (ordenar las cenas, sostener la adherencia).
- `ObjetivoComposicion` — el **resultado** esperado, medible y proyectable
  contra las antropometrías.

`Objetivo.objetivoComposicionId` los vincula, opcional y único: un número sin
plan no dice qué hacer el lunes, y un plan sin número no se puede evaluar.
Vinculados, la tarjeta del plan muestra el progreso REAL medido en vez de una
autoevaluación. Siguen existiendo sueltos: hay planes sin número y metas sin
plan escrito.

El borrado es `SET NULL`, nunca cascada: eliminar la meta numérica no puede
llevarse puesto el plan ni su historial, que es información clínica.

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
- Tres tests protegen invariantes estructurales y conviene no borrarlos:
  `src/arquitectura.test.ts` (reglas de capas),
  `modelosInquilino.test.ts` (schema vs MODELOS_INQUILINO) y
  `src/servidor/trpc.test.ts` (traducción de errores: códigos semánticos,
  reporte al monitor y saneo del mensaje)

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
- Nunca llamar a `IProveedorWhatsapp.preparar()` desde una lectura: con la Cloud
  API conectada ese método ENVÍA el mensaje. Una vista previa pregunta
  `modoActual()` y arma el enlace por su cuenta (ya pasó una vez: el query de
  vista previa mandaba un recordatorio cada vez que el cliente lo refrescaba)
- Nunca validar la agenda del consultorio (días/horario de atención) en un solo
  caso de uso: agendar y reprogramar comparten
  `verificarDentroDeLaAgenda`, y separarlas deja abierto el otro camino
- Nunca leer el día de la semana de un turno con `getDay()`: `Turno.fecha` es un
  `DATE` que llega como medianoche UTC y en nuestra zona el día se corre para
  atrás. Va `getUTCDay()`
- Nunca agregar un campo al plan tocando solo el `update` del repositorio: hay
  que escribirlo también en el `create`. La modalidad se perdió así —los planes
  en PDF nacían como planes de la app— y no falló nada: el default de la base le
  ganó a un valor que nunca se mandó
- Nunca sumar un filtro al listado de planes tocando solo el DTO y el
  repositorio: `ObtenerPlanesPaginado` enumera los campos a mano (para no
  arrastrar la paginación al conteo) y lo que no esté ahí se descarta en
  silencio. Ya pasó con `grupoId`
- Nunca borrar una asignación de plan para "limpiar": son el historial clínico
  del paciente. Se desactivan, con su fecha de fin
- Nunca embeber un archivo del bucket por su URL firmada: es otro origen y el
  visor queda a merced de sus cabeceras. Para mostrar adentro de la app está
  `/api/archivos/[id]/ver`
- Nunca agregar un CHECK que exija "exactamente un dueño" sobre `archivos`: la
  app sube el archivo ANTES de que exista su dueño (una receta nueva no tiene
  id hasta que se guarda) y lo vincula después. El invariante correcto es
  `<= 1` y está en la migración 34; la 27 puso `= 1` y rompió todos los
  adjuntos hasta que alguien lo reportó
- Nunca importar el contenedor desde un componente de UI (arrastra Prisma al
  bundle del navegador)
- Nunca usar `any`
- Nunca guardar passwords en texto plano
- Nunca poner secretos en el código, siempre variables de entorno
