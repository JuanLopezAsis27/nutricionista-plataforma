# Auditoría del modelo de datos — nutricionista-app

**Fecha:** 2026-08-27
**Rama auditada:** `feature/whatsapp-recordatory`
**Motor:** PostgreSQL 18 (`docker-compose.yml:16`, `prisma/migrations/migration_lock.toml`)
**ORM:** Prisma 6 — esquema único en `prisma/schema.prisma` (1.225 líneas, 44 modelos, 27 migraciones)
**Alcance:** esquema, migraciones SQL, repositorios Prisma y los casos de uso que consumen esas tablas.

## Contexto confirmado con el equipo

| Pregunta                         | Respuesta                                            | Consecuencia sobre esta auditoría                                                                                                                                           |
| -------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Volumen esperado                 | Consultorio único, 1 nutricionista, <1.000 pacientes | **Particionamiento y sharding no aplican.** Ninguna tabla proyecta más de ~10⁵ filas en varios años. Todo lo que sigue prioriza _integridad_ y _corrección_, no throughput. |
| Datos productivos                | No hay                                               | Se pueden proponer migraciones destructivas en una sola pasada, sin `CONCURRENTLY` ni backfills en fases.                                                                   |
| Réplica de lectura (ml-servicio) | A futuro, no existe                                  | Los comentarios del schema que la mencionan (`RetroalimentacionInsight`) documentan una intención, no la topología real.                                                    |

**Consecuencia central:** el código ya está construido como SaaS multi-inquilino (columna `nutricionistaId` en 31 tablas, rol `SUPERADMIN`, extensión de Prisma que filtra por inquilino), pero se opera con un solo inquilino. Eso significa que **todos los defectos de aislamiento de este informe son hoy latentes, no explotables** — y se vuelven críticos el día que exista un segundo `nutricionistaId`. Están calificados por su severidad _en el momento en que se dé de alta el segundo consultorio_, porque arreglarlos ahora (sin datos) cuesta una migración y arreglarlos después cuesta una fuga de datos clínicos.

---

## Estado de aplicación (2026-08-27)

Los hallazgos se aplicaron en dos migraciones y sus cambios de código. El
alcance lo decidió el equipo: **todo menos RLS**, archivado real de pacientes, y
para el no solapamiento de turnos la variante con columna generada (que evita
tocar entidad, DTOs y UI).

| Migración                    | Qué hace                                                                                                                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `27_integridad_modelo_datos` | Inquilino con FK real, columna de inquilino en las 14 tablas hijas, unicidades por inquilino, EXCLUDE de turnos, CHECKs, índices compuestos, `telefonoE164`, `archivadoEn`. |
| `28_credenciales_por_fila`   | `credenciales_integracion` (tabla ancha) → `credenciales_proveedor` + `preferencias_integracion`.                                                                           |

### Verificación

`scripts/verificar-migracion-27.ts` corre **20 comprobaciones contra Postgres
de verdad** (base descartable, cadena de 29 migraciones aplicada desde cero) y
todas pasan: aislamiento entre dos consultorios, doble reserva de turnos,
arco exclusivo, plan activo único, ruteo del webhook por índice y round-trip de
credenciales cifradas. Además: `tsc` sin errores, **418 tests** en verde (eran
402; se sumaron los de archivado, canonización de teléfono y la guardia de
`MODELOS_INQUILINO`), y `next build` compila.

### Hallazgos aplicados

| #         | Estado     | Cómo quedó                                                                                                                                                                                                                                                  |
| --------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1       | ✅         | `archivos` tiene inquilino, FK y está en `MODELOS_INQUILINO`: un archivo de un consultorio ya no se ve ni se borra desde otro.                                                                                                                              |
| C-2       | ✅         | `whatsappPhoneNumberId` vive en `credenciales_proveedor` en claro, con índice `(proveedor, clave, valor)`; el ruteo del webhook es un lookup indexado.                                                                                                      |
| C-3       | ✅         | `@@unique([nutricionistaId, email])`. La misma persona puede ser paciente de dos consultorios.                                                                                                                                                              |
| C-4       | ⚠️ parcial | Tabla `nutricionistas`, `nutricionistaId` NOT NULL con FK `ON DELETE RESTRICT` en las 45 tablas, `CHECK` de id no vacío. **RLS quedó fuera por decisión de alcance**: el aislamiento sigue dependiendo de la extensión de Prisma, ahora respaldada por FKs. |
| C-5       | ✅         | Columna generada `periodo tsrange` + `EXCLUDE USING gist` que ignora los CANCELADOS. `PrismaRepositorioTurno` traduce el `23P01` a `ErrorTurnoConflicto`.                                                                                                   |
| A-1       | ✅         | `mensajes` tiene inquilino: el badge de no leídos ya no suma mensajes de otros consultorios.                                                                                                                                                                |
| A-2       | ✅         | Las 14 tablas hijas llevan inquilino; las tres de unión (`asignaciones_plan/receta/material`) además tienen **FK compuesta**, así la base impide asignarle a un paciente el plan de otro consultorio.                                                       |
| A-3       | ✅         | `Paciente.telefonoE164` (lo calcula la entidad al guardar, con el prefijo del consultorio) + único por inquilino. La ingesta de WhatsApp pasó de traer toda la tabla a un `findFirst` indexado.                                                             |
| A-4       | ✅         | `activo` → `archivadoEn` + `motivoArchivado`, con casos de uso `ArchivarPaciente` / `ReactivarPaciente`, endpoints tRPC y filtro en los listados. Los KPIs de estadísticas ahora miden lo que dicen medir.                                                  |
| A-5       | ✅         | `resumenPorPacienteEnRango` reemplaza las dos consultas por paciente por tres agregadas; el nombre del plan se resuelve con un mapa. De ~2N+1 consultas a 4.                                                                                                |
| A-6       | ✅         | `credenciales_proveedor` (una fila por secreto, con `rotadoEn`) + `preferencias_integracion`. La interfaz de dominio no cambió, así que DTOs, servicios y UI quedaron intactos.                                                                             |
| A-7       | ✅         | `recordatorios_whatsapp` tiene FKs a turno (CASCADE), paciente (CASCADE) y usuario (SET NULL, y `usuarioId` pasó a nullable para que el log de auditoría sobreviva).                                                                                        |
| A-8       | ✅         | Macros unificados en `Decimal(7,2)` en `alimentos_propios`, `ingredientes_receta`, `recetas` y las metas del plan.                                                                                                                                          |
| M-1       | ✅         | `CHECK` de cardinalidad 1 sobre el arco exclusivo de `archivos`.                                                                                                                                                                                            |
| M-2       | ✅         | Idempotencia de emails ahora es `(nutricionistaId, plantillaClave, referenciaId)`.                                                                                                                                                                          |
| M-3 / M-4 | ✅         | ~20 índices sueltos por inquilino convertidos en compuestos con el inquilino a la izquierda; `registros_diarios` ganó el que le faltaba.                                                                                                                    |
| M-5       | ✅         | GIN sobre `etiquetas` en recetas y materiales, declarado en el schema (no como SQL suelto, para que no genere drift).                                                                                                                                       |
| M-6       | ✅         | `pg_trgm` + índice GIN de expresión para la búsqueda de pacientes.                                                                                                                                                                                          |
| M-7       | ✅         | Índice único parcial `asignaciones_plan (pacienteId) WHERE activa`.                                                                                                                                                                                         |
| M-8       | ✅         | Índice parcial de no leídos sobre `mensajes`.                                                                                                                                                                                                               |
| M-9       | ✅         | `actualizadoEn` en las 10 tablas mutables que no lo tenían.                                                                                                                                                                                                 |
| M-10      | ⚠️ parcial | La declaración se alineó con la realidad (`@default(uuid(4))`, ya no miente diciendo `cuid()`). **El tipo físico sigue siendo TEXT**: convertir a `uuid` obliga a migrar todas las PKs y FKs a la vez, y a este volumen el beneficio es nulo.               |
| M-14      | ✅         | Índice parcial de purga sobre `tokens_recuperacion`.                                                                                                                                                                                                        |
| M-15      | ✅         | Comentario corregido: es una fila por inquilino, no una fila única global.                                                                                                                                                                                  |
| B-1       | ✅         | FKs agregadas en `configuracion_consultorio.logoArchivoId` y `planes_nutricionales.planOrigenId` (SET NULL). Las demás referencias sin FK se mantienen a propósito (logs append-only).                                                                      |

### Lo que NO se aplicó, y por qué

| #                                                    | Motivo                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RLS** (parte de C-4)                               | Decisión de alcance del equipo. Es el único cambio que exige reescribir cómo se abre cada conexión (una transacción por request para el `set_config`), con impacto en el pool y en el worker. Sigue siendo la recomendación para el día que haya un segundo inquilino.                                                  |
| **M-12** (turnos a `TIMESTAMPTZ`)                    | Se eligió la variante con columna generada, que resuelve el doble booking sin tocar entidad, DTOs ni UI. La deuda de zona horaria sigue abierta: `fecha` + `hora` siguen siendo hora de pared. Para una agenda de un consultorio es la semántica correcta; deja de serlo si alguna vez hay que atender en varios husos. |
| **M-11** (enum de franja de comida)                  | Toca el diario, sus DTOs y su UI, y conviene hacerlo junto al próximo trabajo sobre ese módulo. Sigue siendo lo primero a hacer _antes_ de acumular datos del diario.                                                                                                                                                   |
| **M-13** (planes: upsert en vez de borrar y recrear) | Cambio de comportamiento del repositorio de planes sin ningún defecto de datos detrás; se difiere para tocarlo junto al módulo.                                                                                                                                                                                         |
| **B-2 / B-3** (nomenclatura)                         | Renombrar columnas y tablas es un cambio grande con beneficio puramente estético; la propia auditoría lo ubicaba último.                                                                                                                                                                                                |
| **B-4** (campos _stringly typed_ a enum)             | Se hizo el más importante (`proveedor` de credenciales, ahora enum `ProveedorIntegracion`). Los otros tres (`tipoInsight`, `fuente`, `clave` de plantilla) quedan para la migración de higiene.                                                                                                                         |
| **B-5 / B-6 / B-7 / B-8 / B-9**                      | Bajos, sin impacto funcional.                                                                                                                                                                                                                                                                                           |

### Una deuda nueva que conviene conocer

`turnos.periodo` es una columna generada y el índice trigram es una expresión:
Prisma no sabe expresar ninguna de las dos. `periodo` quedó declarada como
`Unsupported("tsrange")` para que `prisma migrate diff` no intente borrarla en
cada cambio de esquema; los índices parciales y de expresión Prisma directamente
los ignora, así que sobreviven. Vale tenerlo presente al agregar migraciones:
**lo que vive solo en SQL crudo hay que revisarlo en cada diff**.

Además, `npm run lint` está roto desde antes de este trabajo (`next lint` ya no
existe en Next 16 y no hay `eslint.config.*` en el repo). No se tocó por estar
fuera del alcance de la auditoría, pero conviene arreglarlo.

---

## 1. Tabla de hallazgos

### Críticos

| #   | Problema                                                                                                                                                                                                                                                                                                  | Tabla / entidad afectada                                                                                                                                                                    | Impacto                                                                                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1 | `archivos` no tiene columna de inquilino y por lo tanto queda fuera de `MODELOS_INQUILINO`; el endpoint de descarga resuelve la autorización con `rol !== "NUTRICIONISTA"`, es decir **cualquier nutricionista accede a todo**.                                                                           | `archivos` — `prisma/schema.prisma:377`; `src/infraestructura/repositorios/PrismaClienteSingleton.ts:24`; `src/app/api/archivos/[id]/route.ts:28`, `:47`                                    | Con dos inquilinos, el profesional A lee y **borra** (el DELETE del mismo route) laboratorios, fotos de comida y material del profesional B conociendo solo un `id`. Son datos clínicos.                                                                                                                                                                |
| C-2 | `credenciales_integracion.whatsappPhoneNumberId` no tiene `UNIQUE` ni índice, y el enrutamiento del webhook lo resuelve con `findFirst` en alcance **global**.                                                                                                                                            | `credenciales_integracion` — `prisma/schema.prisma:481`; `src/infraestructura/whatsapp/DirectorioWhatsapp.ts:30`                                                                            | Dos inquilinos pueden guardar el mismo `phone_number_id` (nada lo impide) y los mensajes entrantes se enrutan al que Postgres devuelva primero: conversaciones de pacientes aterrizando en el consultorio equivocado, de forma no determinista y silenciosa.                                                                                            |
| C-3 | `pacientes.email` es `@unique` **global** en un modelo multi-inquilino.                                                                                                                                                                                                                                   | `pacientes` — `prisma/schema.prisma:165`                                                                                                                                                    | Una persona no puede ser paciente de dos nutricionistas. El alta falla con violación de unicidad, que además funciona como oráculo de existencia entre inquilinos. La unicidad correcta es `(nutricionistaId, email)`.                                                                                                                                  |
| C-4 | `nutricionistaId TEXT NOT NULL DEFAULT ''` en 31 tablas, **sin FK a `usuarios`, sin `CHECK <> ''`** y sin RLS. El aislamiento entero descansa en una extensión de Prisma en runtime.                                                                                                                      | 31 tablas — `prisma/schema.prisma` (`:162`, `:206`, `:298`…); `prisma/migrations/12_fase9_multitenant/migration.sql:13-73`; `src/infraestructura/repositorios/PrismaClienteSingleton.ts:63` | Cualquier escritura que se escape de la extensión (un script, el seed, `psql`, un `$queryRaw` futuro) crea filas con `nutricionistaId = ''`: un inquilino fantasma que ninguna consulta de la app volverá a ver ni a borrar. La base no puede rechazar un `nutricionistaId` inexistente. Es el defecto estructural del que cuelgan C-1, C-2, A-1 y A-2. |
| C-5 | La regla "no hay dos turnos solapados" se evalúa leyendo en memoria y escribiendo después, **sin transacción, sin lock y sin constraint**. El modelo lo hace imposible de arreglar en la base: `fecha` es `DATE` y `hora` es `TEXT "HH:mm"`, así que no existe un rango sobre el cual poner un `EXCLUDE`. | `turnos` — `prisma/schema.prisma:300-302`, `:314-316`; `src/dominio/casos-de-uso/turnos/AgendarTurno.ts:34-41`                                                                              | Dos altas concurrentes (secretaría + portal del paciente, o dos pestañas) producen turnos superpuestos. La única regla de negocio que el propio `CLAUDE.md` declara como invariante del dominio no tiene respaldo en la base.                                                                                                                           |

### Altos

| #   | Problema                                                                                                                                                                                                                                                                                                                         | Tabla / entidad afectada                                                                                                                                                     | Impacto                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A-1 | `mensajes` no tiene columna de inquilino; `contarNoLeidos(viewerId)` sin `conversacionId` cuenta sobre **toda** la tabla.                                                                                                                                                                                                        | `mensajes` — `prisma/schema.prisma:1097`; `src/infraestructura/repositorios/PrismaRepositorioMensajeria.ts:110`; `src/servidor/routers/mensajeria.ts:35`                     | El badge de no leídos del nutricionista suma mensajes de pacientes de otros consultorios. Fuga de conteo (no de contenido), permanente y visible en el header de la app.                                                                                                                                        |
| A-2 | Diez tablas hijas quedan fuera del filtro de inquilino porque no tienen `nutricionistaId`: `comidas_consumidas`, `actividades_fisicas`, `opciones_comida`, `ingredientes_receta`, `estrategias`, `historial_objetivos`, `asignaciones_plan`, `asignaciones_receta`, `asignaciones_material` (además de `archivos` y `mensajes`). | `prisma/schema.prisma:535`, `:552`, `:824`, `:740`, `:898`, `:913`, `:966`, `:761`, `:950`                                                                                   | Todo `findUnique({where:{id}})` / `delete({where:{id}})` sobre ellas cruza inquilinos. Hoy los casos de uso compensan navegando al padre (p. ej. `obtenerComida` trae `registro.pacienteId`), pero es una convención no verificable: el próximo repositorio que olvide el salto abre el agujero.                |
| A-3 | `pacientes.telefono` es texto libre, sin columna normalizada ni índice. Resolver quién escribió por WhatsApp exige **traer todos los pacientes y normalizar en memoria**.                                                                                                                                                        | `pacientes` — `prisma/schema.prisma:166`; `src/dominio/casos-de-uso/whatsapp/ResolverPacientePorTelefono.ts:33-36`                                                           | Un `SELECT *` de la tabla entera de pacientes por cada mensaje entrante. Con <1k pacientes es tolerable, pero es un problema de modelo, no de performance: el dato de identidad del canal (E.164) no existe como dato, solo como derivación efímera. También impide detectar dos pacientes con el mismo número. |
| A-4 | `pacientes.activo` se **lee** en tres consultas de estadísticas y **nunca se escribe** en ningún lado del código.                                                                                                                                                                                                                | `pacientes` — `prisma/schema.prisma:169`; `src/infraestructura/repositorios/PrismaRepositorioEstadisticas.ts:32`, `:73`, `:140`                                              | La columna vale `true` para el 100% de las filas. "Pacientes activos" es en realidad "pacientes totales" y "pacientes en riesgo" se calcula sobre el universo completo. Dos KPIs del dashboard son incorrectos por definición, sin ningún síntoma visible.                                                      |
| A-5 | Barrido nocturno con N+1: `pacientes.listar()` sin filtro ni límite, luego **2 consultas por paciente** (`contarRegistros` + `listarPorRango`) y **1 consulta por asignación vencida** (`planes.obtenerPorId`).                                                                                                                  | `src/dominio/casos-de-uso/seguimiento/GenerarAlertasDeSeguimiento.ts:53-97`; `src/trabajos/manejadores/generarAlertasSeguimiento.ts:27-32`                                   | Con 800 pacientes son ~1.600 round-trips secuenciales por noche y por inquilino. Además `listar()` no filtra por `activo`, así que también genera alertas de pacientes dados de baja (ver A-4: hoy no hay ninguno dado de baja, lo cual esconde el bug).                                                        |
| A-6 | `credenciales_integracion` es una tabla ancha con un juego de columnas por proveedor. Las fases 15, 16 y 26 agregaron columnas en vez de filas.                                                                                                                                                                                  | `credenciales_integracion` — `prisma/schema.prisma:470-493`; `prisma/migrations/16_fase15_credenciales/`, `17_fase16_proveedor_ia/`, `26_whatsapp_cloud_api/`                | Cada integración nueva es un `ALTER TABLE` más cambios en DTO, servicio y UI. Ya son 8 columnas de secretos + 4 de criterios de ingredientes en la misma fila. No hay forma de saber _cuándo_ se rotó un token ni de tener dos cuentas del mismo proveedor.                                                     |
| A-7 | `recordatorios_whatsapp` no tiene **ninguna** FK: `turnoId`, `pacienteId` y `usuarioId` son `TEXT` sueltos.                                                                                                                                                                                                                      | `recordatorios_whatsapp` — `prisma/schema.prisma:327-345`                                                                                                                    | Borrar un turno o un paciente deja recordatorios huérfanos para siempre; nada los limpia (la cascada de `pacientes` no los alcanza). El comentario del modelo justifica que sea una tabla aparte, pero no que no tenga integridad referencial.                                                                  |
| A-8 | El mismo concepto —macros de un alimento— está tipado de tres formas distintas.                                                                                                                                                                                                                                                  | `alimentos_propios` (`Float`, `:522-525`), `ingredientes_receta` (`Decimal(6,1)`/`Decimal(5,1)`, `:746-749`), `recetas` (`Int` calorías + `Decimal(6,1)` macros, `:719-722`) | Los `Float` acumulan error en la suma de ingredientes de una receta y comparan mal contra las metas del plan; `calorias Int` trunca. Los tres valores se suman entre sí en el cálculo de la receta, mezclando precisiones.                                                                                      |

### Medios

| #    | Problema                                                                                                                                                                                                                                                                                                     | Tabla / entidad afectada                                                                                                                                                                                                                                                                                                                             | Impacto                                                                                                                                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M-1  | El "arco exclusivo" de dueños de `archivos` está documentado pero **no restringido**: nada impide una fila con `pacienteId` y `recetaId` a la vez, o con los cinco en `NULL`.                                                                                                                                | `archivos` — `prisma/schema.prisma:388-399`                                                                                                                                                                                                                                                                                                          | Archivos con dos dueños se borran por la primera cascada que dispare; archivos sin dueño quedan como basura en el bucket (existe un job de huérfanos justamente por esto: `src/trabajos/manejadores/limpiarArchivosHuerfanos.ts`). Un `CHECK` de cardinalidad 1 lo cierra. |
| M-2  | `emails_enviados` tiene `@@unique([plantillaClave, referenciaId])` **sin** `nutricionistaId`.                                                                                                                                                                                                                | `emails_enviados` — `prisma/schema.prisma:1023`                                                                                                                                                                                                                                                                                                      | Dos inquilinos con `referenciaId` colisionante se pisan la idempotencia: al segundo no le llega el recordatorio y el error es invisible.                                                                                                                                   |
| M-3  | Estrategia de índices desalineada con las consultas reales. `registros_diarios` no tiene índice por `nutricionistaId` pese a que la extensión **siempre** agrega ese predicado; `turnos` tiene `nutricionistaId` y `fecha` como índices sueltos en vez de compuestos, cuando toda consulta filtra por ambos. | `registros_diarios` (`:427`), `turnos` (`:317-319`), `laboratorios` (`:617`), `antropometrias` (`:658`), `alertas_alimentarias` (`:600`), `historias_clinicas`                                                                                                                                                                                       | Postgres resuelve con bitmap AND o seq scan. A este volumen no duele; el punto es que el diseño de índices no refleja el patrón de acceso, y ese desfase escala mal.                                                                                                       |
| M-4  | En el otro sentido: ~20 índices de columna única `@@index([nutricionistaId])` con **un solo inquilino tienen selectividad 0** y jamás serán elegidos por el planner.                                                                                                                                         | `pacientes`, `turnos`, `recetas`, `objetivos`, `planes_nutricionales`, `materiales_biblioteca`, `axiomas_nutricionales`, `emails_enviados`, `consultas_ia`, `analisis_comida`, `metricas_dispositivo`, `competencias`, `suplementos`, `alertas_seguimiento`, `conversaciones`, `cuentas_conectadas`, `sincronizaciones_turno`, `perfiles_deportivos` | Costo de escritura y de vacuum puro, sin beneficio de lectura. Deben ser índices **compuestos con `nutricionistaId` a la izquierda**, no índices sueltos: así sirven hoy (por la segunda columna) y sirven mañana.                                                         |
| M-5  | `etiquetas String[]` se consulta con `has` y no tiene índice GIN.                                                                                                                                                                                                                                            | `recetas` (`:715`), `materiales_biblioteca` (`:937`); `PrismaRepositorioReceta.ts:138`, `PrismaRepositorioMaterial.ts:113`                                                                                                                                                                                                                           | Seq scan en cada filtro por etiqueta. Un GIN sobre `text[]` es una línea.                                                                                                                                                                                                  |
| M-6  | Búsqueda de pacientes con `contains … mode:"insensitive"` sobre tres columnas, sin `pg_trgm`.                                                                                                                                                                                                                | `pacientes` — `PrismaRepositorioPaciente.ts:88-94`                                                                                                                                                                                                                                                                                                   | `ILIKE '%x%'` no usa el índice `(apellido, nombre)` existente. A <1k filas es irrelevante; se anota porque el índice que hay da la falsa impresión de cubrirlo.                                                                                                            |
| M-7  | La regla "un paciente solo puede tener un plan activo a la vez" (declarada en `CLAUDE.md` y en el comentario del modelo) no tiene índice único parcial.                                                                                                                                                      | `asignaciones_plan` — `prisma/schema.prisma:964-981`                                                                                                                                                                                                                                                                                                 | Depende del caso de uso. Mismo patrón de C-5: invariante de negocio sin respaldo en la base. Acá sí se puede expresar con un índice único parcial.                                                                                                                         |
| M-8  | `mensajes` no tiene índice para la consulta de no leídos (`leidoEn IS NULL AND autorId <> $1`).                                                                                                                                                                                                              | `mensajes` — `prisma/schema.prisma:1107`; `PrismaRepositorioMensajeria.ts:110`                                                                                                                                                                                                                                                                       | El índice existente es `(conversacionId, creadoEn)`. El conteo global es seq scan. Un índice parcial sobre `leidoEn IS NULL` lo resuelve y se mantiene diminuto.                                                                                                           |
| M-9  | Columnas de auditoría inconsistentes: `turnos`, `laboratorios`, `antropometrias`, `alertas_alimentarias`, `suplementos`, `competencias`, `alertas_seguimiento`, `comidas_consumidas`, `actividades_fisicas` y `estrategias` tienen `creadoEn` pero no `actualizadoEn`.                                       | varias — `prisma/schema.prisma`                                                                                                                                                                                                                                                                                                                      | No se puede saber cuándo se modificó un turno, un cobro o una medición. Para datos clínicos y de facturación es un problema de trazabilidad, no de estilo.                                                                                                                 |
| M-10 | Los ids se declaran `@default(cuid())` pero el dominio los genera con `crypto.randomUUID()` (46 usos). El default de Prisma nunca se ejecuta y la columna es `TEXT`, no `uuid`.                                                                                                                              | todos los modelos; `src/dominio/casos-de-uso/**` (p. ej. `AgendarTurno.ts:32`, `CrearPaciente.ts:43`)                                                                                                                                                                                                                                                | Declaración que miente sobre el formato real. Índices de 36 bytes de texto en vez de 16 binarios, y comparaciones por collation. Con `@db.Uuid` el motor además valida el formato.                                                                                         |
| M-11 | `comidas_consumidas.franja` y `comidas_plan.nombre` son texto libre ("Desayuno", "Media mañana"…) con sugeridos en la UI.                                                                                                                                                                                    | `prisma/schema.prisma:538`, `:810`                                                                                                                                                                                                                                                                                                                   | Imposible agregar de forma confiable por tipo de comida (adherencia por franja, comparar plan vs. diario). "desayuno", "Desayuno" y "Desayuno " son tres cosas distintas. Es exactamente el análisis que el módulo de IA/ML va a necesitar.                                |
| M-12 | `turnos` guarda `fecha DATE` + `hora TEXT` sin zona horaria; la normalización a medianoche UTC vive en el repositorio.                                                                                                                                                                                       | `turnos` — `prisma/schema.prisma:300-301`; `PrismaRepositorioTurno.ts:87-91`                                                                                                                                                                                                                                                                         | Además de habilitar C-5, cualquier cambio de huso o DST desplaza turnos, y ordenar u operar con horarios exige parsear strings en la app (`Turno.ts:172`).                                                                                                                 |
| M-13 | `actualizar` de planes **borra y recrea** todos los hijos en cada guardado.                                                                                                                                                                                                                                  | `PrismaRepositorioPlan.ts:117-120`                                                                                                                                                                                                                                                                                                                   | Los ids de `comidas_plan`, `opciones_comida`, `equivalencias_plan` y `recomendaciones_plan` cambian en cada edición: ninguna referencia externa a ellos puede sobrevivir, y el `id` deja de ser una identidad estable.                                                     |
| M-14 | `tokens_recuperacion` no tiene índice sobre `expiraEn`.                                                                                                                                                                                                                                                      | `prisma/schema.prisma:687-699`                                                                                                                                                                                                                                                                                                                       | La purga de tokens vencidos hace seq scan. Menor por volumen, pero es una tabla de seguridad que conviene poder limpiar barato.                                                                                                                                            |
| M-15 | `configuracion_consultorio` mezcla cuatro dominios (agenda, membrete profesional, apariencia del PDF, plantilla de WhatsApp) y su comentario está obsoleto: dice "fila única, id constante `default`" cuando en realidad es una fila por inquilino con `@unique(nutricionistaId)`.                           | `prisma/schema.prisma:1173-1202`                                                                                                                                                                                                                                                                                                                     | 20 columnas nullable en una tabla; el comentario induce a error a quien la lea por primera vez.                                                                                                                                                                            |

### Bajos

| #   | Problema                                                                                                                                                                                                                                                   | Tabla / entidad afectada                                                                                                                                                                                   | Impacto                                                                                                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B-1 | Siete referencias lógicas sin FK: `analisis_comida.archivoId`, `sincronizaciones_turno.turnoId`, `configuracion_consultorio.logoArchivoId`, `mensajes.autorId`, `archivos.subidoPorId`, `emails_enviados.pacienteId`, `planes_nutricionales.planOrigenId`. | `prisma/schema.prisma:1140`, `:1059`, `:1186`, `:1100`, `:385`, `:1019`, `:784`                                                                                                                            | Cada una está justificada por comentario (evitar cascadas, log append-only). Varias son decisiones razonables; `logoArchivoId` y `planOrigenId` en cambio se beneficiarían de una FK `ON DELETE SET NULL`. |
| B-2 | Nomenclatura mixta español/inglés en columnas, contra la convención declarada en `CLAUDE.md`.                                                                                                                                                              | `passwordHash`, `tokenHash`, `mimeType`, `tamanoBytes`, `url`, `scopes`, `pdfColorPrimario`, `idExterno`                                                                                                   | Ruido de convención. `tamanoBytes` además evita la `ñ` a medias.                                                                                                                                           |
| B-3 | `@@map` inconsistente entre plural y singular.                                                                                                                                                                                                             | `pacientes`, `turnos` (plural) vs. `configuracion_consultorio`, `credenciales_integracion`, `retroalimentacion_insight`, `analisis_comida`, `historial_objetivos` (singular)                               | Consistencia.                                                                                                                                                                                              |
| B-4 | Campos "stringly typed" que ya tienen dominio cerrado documentado en su propio comentario.                                                                                                                                                                 | `credenciales_integracion.proveedorIA` (`:473`), `retroalimentacion_insight.tipoInsight` (`:503`), `ingredientes_receta.fuente` (`:750`), `plantillas_email.clave` (`:993`), `archivos.categoria` (`:384`) | Sin validación del motor. `tipoInsight` es la etiqueta del futuro entrenamiento de ML: un typo contamina el dataset en silencio.                                                                           |
| B-5 | `ImportanciaCompetencia { A, B, C }`.                                                                                                                                                                                                                      | `prisma/schema.prisma:132-136`                                                                                                                                                                             | Nombres de valor sin significado; jerga del dominio deportivo que no se autoexplica en el modelo.                                                                                                          |
| B-6 | `MensajeWhatsapp` y `Mensaje` conviven como modelos distintos con nombres casi idénticos; `RecordatorioWhatsapp` y `MensajeWhatsapp` se solapan (ambos guardan `telefono`, cuerpo, `idExterno`, estado y timestamps de un saliente).                       | `prisma/schema.prisma:327`, `:351`, `:1097`                                                                                                                                                                | Un recordatorio enviado por la Cloud API se escribe en las dos tablas. Ambigüedad conceptual y doble fuente de verdad para "qué le mandamos al paciente".                                                  |
| B-7 | `alimentos_propios.nombreNormalizado` es una columna mantenida a mano.                                                                                                                                                                                     | `prisma/schema.prisma:521`                                                                                                                                                                                 | Puede desincronizarse de `nombre`. En PG 18 es un caso de libro para columna generada.                                                                                                                     |
| B-8 | `horasSueno` existe en `registros_diarios` y en `metricas_dispositivo` sin regla de precedencia persistida.                                                                                                                                                | `prisma/schema.prisma:417`, `:453`                                                                                                                                                                         | La prioridad (diario manual vs. wearable) vive solo en el código de adherencia a axiomas. Duplicación deliberada pero no arbitrada en el modelo.                                                           |
| B-9 | Las carpetas de migración no llevan el prefijo de timestamp de Prisma (`00_init`, `01_turnos_sin_unico`…).                                                                                                                                                 | `prisma/migrations/`                                                                                                                                                                                       | Funciona (el orden lexicográfico se sostiene con dos dígitos), pero se rompe en la migración 100 y no es lo que genera `prisma migrate dev`.                                                               |

### Lo que está bien resuelto

No todo es hallazgo, y conviene no tocar lo que ya está bien:

- **Cascadas coherentes.** 42 de 44 FKs son `ON DELETE CASCADE` hacia el agregado dueño y las 2 restantes son `SET NULL` donde corresponde (`usuarios.pacienteId`, `opciones_comida.recetaId`). No hay `RESTRICT` accidentales ni ciclos.
- **La `Antropometria` ancha es la decisión correcta.** 8 pliegues + 6 circunferencias como columnas parece un grupo repetitivo que "debería" normalizarse a `(antropometriaId, sitio, valor)`; no es así: el protocolo antropométrico es fijo, siempre se leen las 14 juntas y la forma ancha permite tipar cada una con su precisión. Normalizarla sería sobre-ingeniería.
- **Derivados no persistidos.** Kg bajados y sumatoria de pliegues se calculan en la entidad de dominio. Correcto: nada de columnas calculadas desincronizables.
- **`Decimal` con escala explícita** para pesos, pliegues y precios (`Decimal(5,2)`, `Decimal(10,2)`), y la regla de que `Decimal` nunca cruza la frontera de infraestructura.
- **Denormalización deliberada y acotada** en `conversaciones.ultimoMensajeTexto/ultimoMensajeEn`: evita un `LATERAL` por conversación en la lista y se recalcula en el mismo caso de uso que inserta el mensaje.
- **`historial_objetivos` como log de eventos** con índice `(objetivoId, creadoEn)`: el patrón adecuado para auditar cambios de estado.
- **Claves naturales bien elegidas** donde importan: `(pacienteId, fecha)` en diario y antropometría, `(pacienteId, fecha, fuente)` en métricas, `(nutricionistaId, proveedor)` en cuentas conectadas, `(recetaId, pacienteId)` en asignaciones.
- **`alimentos_propios`** es la única tabla con el índice compuesto correcto de entrada: `(nutricionistaId, nombreNormalizado)`.
- La **extensión multi-inquilino es fail-closed** (`PrismaClienteSingleton.ts:72`): lanza si no hay alcance, en vez de devolver todo. Es la decisión correcta para el mecanismo elegido; el problema es que ese mecanismo sea el único.

---

## 2. Cómo quedaría el modelo corregido

### 2.1 El inquilino pasa a ser un dato de primera clase

Hoy `nutricionistaId` es un `TEXT` con default `''` que ninguna restricción respalda. En el modelo corregido:

- Nace **`nutricionistas`** como tabla propia (o, con menos cambio, se apunta la FK a `usuarios`), y las 31 columnas `nutricionistaId` se vuelven **`NOT NULL` con FK real**, sin default.
- La columna se **propaga a las 11 tablas hijas que hoy no la tienen** (`archivos`, `mensajes`, `comidas_consumidas`, `actividades_fisicas`, `opciones_comida`, `ingredientes_receta`, `estrategias`, `historial_objetivos`, `asignaciones_plan`, `asignaciones_receta`, `asignaciones_material`; `tokens_recuperacion` queda fuera por ser global). Redundante respecto del padre, sí: es **denormalización deliberada al servicio de la integridad**, el mismo trade-off que hace cualquier esquema multi-tenant serio.
- Esa redundancia se blinda con **FKs compuestas**: `asignaciones_plan (nutricionistaId, pacienteId) → pacientes (nutricionistaId, id)`. Así la base misma vuelve imposible asignarle a un paciente el plan de otro consultorio — algo que hoy ninguna capa garantiza.
- Se activa **RLS** (`FORCE ROW LEVEL SECURITY`) con una policy por `current_setting('app.nutricionista_id')`. La extensión de Prisma pasa de ser _el_ control de acceso a ser una comodidad de escritura, con la base como red de seguridad. Con un solo inquilino esto es barato de instalar y caro de retrofitear.

Con eso, C-1, C-2 (la mitad), C-4, A-1 y A-2 dejan de ser posibles por construcción, no por disciplina.

### 2.2 Los invariantes de negocio bajan a la base

- **Turno** deja de ser `DATE` + `TEXT` y pasa a `inicia TIMESTAMPTZ` + `duracionMinutos`, con una columna generada `periodo tstzrange`. Sobre ella, un `EXCLUDE USING gist` que excluye los `CANCELADO`: el doble booking se vuelve un error de constraint, no una carrera. `fecha` y `hora` quedan como _derivados_ para la UI, no como el dato.
- **Un plan activo por paciente** pasa a ser un índice único parcial sobre `asignaciones_plan (pacienteId) WHERE activa`.
- **Email de paciente** se vuelve único por inquilino: `(nutricionistaId, email)`.
- **Idempotencia de emails** se vuelve `(nutricionistaId, plantillaClave, referenciaId)`.
- **`archivos`** gana un `CHECK` que obliga a exactamente un dueño del arco exclusivo.
- **`whatsappPhoneNumberId`** se vuelve `UNIQUE`: un número, un inquilino, garantizado.

### 2.3 El teléfono se convierte en dato, no en derivación

`pacientes` gana `telefonoE164` (normalizado al guardar, único parcial por inquilino). La resolución del webhook pasa de "traer todos los pacientes y normalizar en memoria" a un `findUnique` indexado, y de paso se vuelve detectable el caso de dos pacientes con el mismo número.

### 2.4 Las credenciales pasan de columnas a filas

`credenciales_integracion` se parte en dos:

- **`credenciales_proveedor`** — `(nutricionistaId, proveedor, clave, valorCifrado, rotadoEn)` con unique `(nutricionistaId, proveedor, clave)`. Agregar una integración deja de ser un `ALTER TABLE`, y se gana la fecha de rotación de cada secreto.
- **`preferencias_ingredientes`** — los cuatro criterios de filtrado, que no son credenciales y no tienen por qué compartir tabla con secretos cifrados.

### 2.5 Vocabularios cerrados donde ya lo están de hecho

`franja` y `nombre` de comida pasan a un enum `FranjaComida` (con `OTRO` + etiqueta libre para el caso abierto); `proveedorIA`, `tipoInsight`, `fuente` y `clave` de plantilla pasan a enums. El criterio: si el comentario del campo enumera los valores válidos, el motor debería conocerlos.

### 2.6 Tipos y convenciones

Ids a `@db.Uuid` con `@default(dbgenerated("gen_random_uuid()"))` alineado con lo que el dominio ya genera; macros unificados en `Decimal(7,2)` en las tres tablas; `actualizadoEn` en todas las tablas mutables; `nombreNormalizado` como columna generada.

### 2.7 Lo que explícitamente **no** cambia

**No hay que particionar ni shardear nada.** Con un consultorio y <1.000 pacientes, la tabla más grande es `registros_diarios` con un techo de ~365 × 1.000 ≈ 365k filas _en toda la vida del producto_, y `mensajes` en el mismo orden. Postgres 18 no se despeina; particionar por rango de fecha agregaría complejidad de mantenimiento sin ningún beneficio medible y complicaría los índices únicos (`(pacienteId, fecha)` debería incluir la clave de partición). El día que existan 500 consultorios, la conversación correcta es partición por `nutricionistaId` en las 3–4 tablas calientes — no antes. Lo mismo vale para CQRS o event sourcing: `historial_objetivos` ya cubre la necesidad de auditoría real que tiene este dominio.

---

## 3. Migraciones sugeridas

> Snippets **no ejecutados**, ordenados por prioridad. Escritos para el escenario confirmado (sin datos productivos): son directos, sin `CONCURRENTLY` ni backfill en fases.

### 3.1 [C-4, C-1, A-1, A-2] Inquilino con integridad real

```sql
-- prisma/migrations/27_tenant_integridad/migration.sql

-- 1. El inquilino como entidad referenciable.
CREATE TABLE "nutricionistas" (
  "id"       TEXT PRIMARY KEY,
  "creadoEn" TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO "nutricionistas" ("id")
SELECT DISTINCT "nutricionistaId" FROM "pacientes" WHERE "nutricionistaId" <> '';

-- 2. Quitar el default '' y exigir FK en cada tabla de inquilino.
--    (repetir el bloque por cada una de las 31 tablas)
ALTER TABLE "pacientes"
  ALTER COLUMN "nutricionistaId" DROP DEFAULT,
  ADD CONSTRAINT "pacientes_nutricionista_fk"
    FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT;

-- 3. Clave compuesta en los padres, para poder colgar FKs compuestas de los hijos.
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_tenant_id_uk"
  UNIQUE ("nutricionistaId", "id");

-- 4. Propagar el inquilino a las tablas hijas hoy sin filtro.
ALTER TABLE "archivos" ADD COLUMN "nutricionistaId" TEXT;
UPDATE "archivos" a SET "nutricionistaId" = COALESCE(
  (SELECT p."nutricionistaId"  FROM "pacientes"             p  WHERE p."id"  = a."pacienteId"),
  (SELECT l."nutricionistaId"  FROM "laboratorios"          l  WHERE l."id"  = a."laboratorioId"),
  (SELECT r."nutricionistaId"  FROM "recetas"               r  WHERE r."id"  = a."recetaId"),
  (SELECT m."nutricionistaId"  FROM "materiales_biblioteca" m  WHERE m."id"  = a."materialId"),
  (SELECT rd."nutricionistaId" FROM "comidas_consumidas" cc
     JOIN "registros_diarios" rd ON rd."id" = cc."registroId"
    WHERE cc."id" = a."comidaConsumidaId")
);
ALTER TABLE "archivos"
  ALTER COLUMN "nutricionistaId" SET NOT NULL,
  ADD CONSTRAINT "archivos_nutricionista_fk"
    FOREIGN KEY ("nutricionistaId") REFERENCES "nutricionistas"("id") ON DELETE RESTRICT;
CREATE INDEX "archivos_tenant_paciente_idx" ON "archivos" ("nutricionistaId", "pacienteId");

-- 5. FK compuesta: un hijo no puede apuntar a un padre de otro inquilino.
ALTER TABLE "asignaciones_plan" ADD COLUMN "nutricionistaId" TEXT;
UPDATE "asignaciones_plan" ap
   SET "nutricionistaId" = p."nutricionistaId"
  FROM "pacientes" p WHERE p."id" = ap."pacienteId";
ALTER TABLE "asignaciones_plan"
  ALTER COLUMN "nutricionistaId" SET NOT NULL,
  ADD CONSTRAINT "asignaciones_plan_paciente_mismo_tenant_fk"
    FOREIGN KEY ("nutricionistaId", "pacienteId")
    REFERENCES "pacientes" ("nutricionistaId", "id") ON DELETE CASCADE;
```

Después de esta migración, `MODELOS_INQUILINO` en `PrismaClienteSingleton.ts:24` debe incorporar los 11 modelos nuevos.

### 3.2 [C-4] RLS como red de seguridad

```sql
-- Se aplica al usuario de aplicación; el usuario de migraciones queda exento.
ALTER TABLE "pacientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pacientes" FORCE ROW LEVEL SECURITY;

CREATE POLICY "pacientes_tenant_aislado" ON "pacientes"
  USING      ("nutricionistaId" = current_setting('app.nutricionista_id', true))
  WITH CHECK ("nutricionistaId" = current_setting('app.nutricionista_id', true));
-- Repetir por tabla de inquilino. El alcance global (login, webhook, worker)
-- corre con un rol BYPASSRLS, no desactivando la policy.
```

```ts
// PrismaClienteSingleton.ts: la extensión deja de ser el control de acceso y
// pasa a fijar la variable de sesión —
//   await tx.$executeRaw`SELECT set_config('app.nutricionista_id', ${tenant}, true)`
// (requiere envolver cada request en una transacción, o un pool por inquilino).
```

### 3.3 [C-5, M-12] Turnos sin doble reserva

```sql
-- prisma/migrations/28_turnos_rango/migration.sql
ALTER TABLE "turnos" ADD COLUMN "inicia" TIMESTAMPTZ;
UPDATE "turnos"
   SET "inicia" = ("fecha"::text || ' ' || "hora" || ':00')::timestamp
                  AT TIME ZONE 'America/Argentina/Buenos_Aires';
ALTER TABLE "turnos" ALTER COLUMN "inicia" SET NOT NULL;

ALTER TABLE "turnos" ADD COLUMN "periodo" tstzrange
  GENERATED ALWAYS AS (
    tstzrange("inicia", "inicia" + make_interval(mins => "duracionMinutos"), '[)')
  ) STORED;

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_sin_solapamiento"
  EXCLUDE USING gist (
    "nutricionistaId" WITH =,
    "periodo"         WITH &&
  ) WHERE ("estado" <> 'CANCELADO');

ALTER TABLE "turnos" DROP COLUMN "fecha", DROP COLUMN "hora";
```

```ts
// AgendarTurno.ts deja de comparar en memoria: intenta el insert y traduce el
// error 23P01 (exclusion_violation) a ErrorTurnoConflicto. La regla queda
// expresada UNA vez, en el único lugar capaz de garantizarla.
```

### 3.4 [C-3, C-2, M-2, M-7, M-1] Unicidades y checks que faltan

```sql
-- Email de paciente: único POR INQUILINO, no global.
DROP INDEX "pacientes_email_key";
CREATE UNIQUE INDEX "pacientes_tenant_email_uk"
  ON "pacientes" ("nutricionistaId", lower("email"));

-- Un número de WhatsApp pertenece a un solo inquilino (y se busca por índice).
CREATE UNIQUE INDEX "credenciales_whatsapp_phone_uk"
  ON "credenciales_integracion" ("whatsappPhoneNumberId")
  WHERE "whatsappPhoneNumberId" IS NOT NULL;

-- Idempotencia de emails, acotada al inquilino.
DROP INDEX "emails_enviados_plantillaClave_referenciaId_key";
CREATE UNIQUE INDEX "emails_enviados_idempotencia_uk"
  ON "emails_enviados" ("nutricionistaId", "plantillaClave", "referenciaId");

-- Un plan activo por paciente: la regla de negocio, expresada en la base.
CREATE UNIQUE INDEX "asignaciones_plan_una_activa_uk"
  ON "asignaciones_plan" ("pacienteId") WHERE "activa";

-- Arco exclusivo de archivos: exactamente un dueño.
ALTER TABLE "archivos" ADD CONSTRAINT "archivos_un_solo_dueno" CHECK (
  (("pacienteId"        IS NOT NULL)::int
 + ("laboratorioId"     IS NOT NULL)::int
 + ("comidaConsumidaId" IS NOT NULL)::int
 + ("recetaId"          IS NOT NULL)::int
 + ("materialId"        IS NOT NULL)::int) = 1
);
```

### 3.5 [A-3] Teléfono normalizado como dato

```sql
ALTER TABLE "pacientes" ADD COLUMN "telefonoE164" TEXT;
-- Backfill con la misma normalización del dominio (script Node que reusa
-- src/dominio/casos-de-uso/whatsapp/telefono.ts), nunca con regex en SQL.
CREATE UNIQUE INDEX "pacientes_tenant_telefono_uk"
  ON "pacientes" ("nutricionistaId", "telefonoE164")
  WHERE "telefonoE164" IS NOT NULL;
ALTER TABLE "pacientes" ADD CONSTRAINT "pacientes_telefono_e164_formato"
  CHECK ("telefonoE164" IS NULL OR "telefonoE164" ~ '^[1-9][0-9]{7,14}$');
```

### 3.6 [A-6] Credenciales por fila

```sql
CREATE TABLE "credenciales_proveedor" (
  "id"              TEXT PRIMARY KEY,
  "nutricionistaId" TEXT NOT NULL REFERENCES "nutricionistas"("id") ON DELETE CASCADE,
  "proveedor"       TEXT NOT NULL,   -- ANTHROPIC | OPENROUTER | FATSECRET | WHATSAPP
  "clave"           TEXT NOT NULL,   -- API_KEY | CLIENT_ID | TOKEN | APP_SECRET…
  "valorCifrado"    TEXT NOT NULL,
  "rotadoEn"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  "creadoEn"        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT "credenciales_proveedor_uk" UNIQUE ("nutricionistaId", "proveedor", "clave")
);

CREATE TABLE "preferencias_ingredientes" (
  "nutricionistaId"   TEXT PRIMARY KEY REFERENCES "nutricionistas"("id") ON DELETE CASCADE,
  "excluirMarcas"     BOOLEAN NOT NULL DEFAULT false,
  "requiereMacros"    BOOLEAN NOT NULL DEFAULT false,
  "maxCaloriasPor100" NUMERIC(6,2),
  "excluirTexto"      TEXT[]  NOT NULL DEFAULT '{}'
);
-- Migrar las columnas actuales y luego DROP de las 8 columnas de secretos
-- + las 4 de criterios en "credenciales_integracion".
-- El phone_number_id NO se cifra y queda en "credenciales_proveedor" como
-- clave 'PHONE_NUMBER_ID' en claro (lo necesita el ruteo del webhook).
```

### 3.7 [A-7, B-1] Integridad referencial faltante

```sql
ALTER TABLE "recordatorios_whatsapp"
  ALTER COLUMN "usuarioId" DROP NOT NULL,   -- el log sobrevive a quien lo disparó
  ADD CONSTRAINT "recordatorios_turno_fk"
    FOREIGN KEY ("turnoId")    REFERENCES "turnos"("id")    ON DELETE CASCADE,
  ADD CONSTRAINT "recordatorios_paciente_fk"
    FOREIGN KEY ("pacienteId") REFERENCES "pacientes"("id") ON DELETE CASCADE,
  ADD CONSTRAINT "recordatorios_usuario_fk"
    FOREIGN KEY ("usuarioId")  REFERENCES "usuarios"("id")  ON DELETE SET NULL;

ALTER TABLE "configuracion_consultorio"
  ADD CONSTRAINT "config_logo_fk"
    FOREIGN KEY ("logoArchivoId") REFERENCES "archivos"("id") ON DELETE SET NULL;

ALTER TABLE "planes_nutricionales"
  ADD CONSTRAINT "plan_origen_fk"
    FOREIGN KEY ("planOrigenId") REFERENCES "planes_nutricionales"("id") ON DELETE SET NULL;
```

### 3.8 [M-3, M-4, M-5, M-6, M-8, M-14] Índices alineados con las consultas

```sql
-- Índices sueltos por inquilino → compuestos con el inquilino a la izquierda.
DROP INDEX "turnos_nutricionistaId_idx";
DROP INDEX "turnos_fecha_idx";
CREATE INDEX "turnos_tenant_inicia_idx"        ON "turnos" ("nutricionistaId", "inicia");
CREATE INDEX "turnos_tenant_estado_inicia_idx" ON "turnos" ("nutricionistaId", "estado", "inicia");
-- (mismo patrón en recetas, objetivos, planes_nutricionales, materiales_biblioteca,
--  consultas_ia, analisis_comida, competencias, suplementos, alertas_seguimiento…)

-- Falta por completo, y la extensión SIEMPRE filtra por ahí:
CREATE INDEX "registros_diarios_tenant_fecha_idx"
  ON "registros_diarios" ("nutricionistaId", "fecha");

-- Filtro por etiqueta (el `has` de Prisma se traduce al operador @>).
CREATE INDEX "recetas_etiquetas_gin"    ON "recetas"               USING GIN ("etiquetas");
CREATE INDEX "materiales_etiquetas_gin" ON "materiales_biblioteca" USING GIN ("etiquetas");

-- Búsqueda de pacientes por texto parcial.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "pacientes_busqueda_trgm" ON "pacientes"
  USING GIN (("nombre" || ' ' || "apellido" || ' ' || "email") gin_trgm_ops);

-- No leídos: índice parcial, se mantiene chico porque solo indexa lo pendiente.
CREATE INDEX "mensajes_no_leidos_idx" ON "mensajes" ("conversacionId", "autorId")
  WHERE "leidoEn" IS NULL;

-- Purga de tokens vencidos.
CREATE INDEX "tokens_recuperacion_expira_idx" ON "tokens_recuperacion" ("expiraEn")
  WHERE "usadoEn" IS NULL;

-- Barrido de planes vencidos (A-5).
CREATE INDEX "asignaciones_plan_vencidas_idx" ON "asignaciones_plan" ("fechaFin")
  WHERE "activa";
```

### 3.9 [A-4] Ciclo de vida del paciente

```sql
-- La columna existe y se lee, pero nada la escribe: hay que decidir qué significa.
ALTER TABLE "pacientes"
  ADD COLUMN "archivadoEn"     TIMESTAMPTZ,
  ADD COLUMN "motivoArchivado" TEXT;
ALTER TABLE "pacientes" DROP COLUMN "activo";
CREATE INDEX "pacientes_tenant_vigentes_idx"
  ON "pacientes" ("nutricionistaId", "apellido", "nombre")
  WHERE "archivadoEn" IS NULL;
-- PrismaRepositorioEstadisticas pasa a filtrar por "archivadoEn IS NULL", y el
-- caso de uso de baja de paciente (que hoy no existe) escribe la fecha.
```

### 3.10 [A-8, M-10, M-9, M-11, B-7] Tipos y vocabularios

```sql
-- Macros con una sola precisión en las tres tablas.
ALTER TABLE "alimentos_propios"
  ALTER COLUMN "caloriasPor100"      TYPE NUMERIC(7,2),
  ALTER COLUMN "proteinasPor100"     TYPE NUMERIC(7,2),
  ALTER COLUMN "carbohidratosPor100" TYPE NUMERIC(7,2),
  ALTER COLUMN "grasasPor100"        TYPE NUMERIC(7,2);
ALTER TABLE "recetas" ALTER COLUMN "calorias" TYPE NUMERIC(7,2);

-- Ids: alinear la declaración con lo que el dominio realmente genera (UUIDv4).
ALTER TABLE "turnos" ALTER COLUMN "id" TYPE uuid USING "id"::uuid;
-- (y el resto de PKs/FKs; en schema.prisma:
--  @db.Uuid + @default(dbgenerated("gen_random_uuid()")))

-- Franja de comida como vocabulario cerrado.
CREATE TYPE "FranjaComida" AS ENUM
  ('DESAYUNO','MEDIA_MANANA','ALMUERZO','MERIENDA','CENA','COLACION','OTRO');
ALTER TABLE "comidas_consumidas" ADD COLUMN "franjaTipo" "FranjaComida";
UPDATE "comidas_consumidas" SET "franjaTipo" =
  CASE lower(trim("franja"))
    WHEN 'desayuno'     THEN 'DESAYUNO'
    WHEN 'media mañana' THEN 'MEDIA_MANANA'
    WHEN 'almuerzo'     THEN 'ALMUERZO'
    WHEN 'merienda'     THEN 'MERIENDA'
    WHEN 'cena'         THEN 'CENA'
    WHEN 'colación'     THEN 'COLACION'
    ELSE 'OTRO'
  END::"FranjaComida";
ALTER TABLE "comidas_consumidas" ALTER COLUMN "franjaTipo" SET NOT NULL;
-- "franja" sobrevive como etiqueta libre, válida solo cuando franjaTipo = 'OTRO'.

-- Columna generada en vez de mantenida a mano.
ALTER TABLE "alimentos_propios" DROP COLUMN "nombreNormalizado";
ALTER TABLE "alimentos_propios" ADD COLUMN "nombreNormalizado" TEXT
  GENERATED ALWAYS AS (lower(trim("nombre"))) STORED;

-- Auditoría uniforme en tablas mutables.
ALTER TABLE "turnos"         ADD COLUMN "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE "laboratorios"   ADD COLUMN "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE "antropometrias" ADD COLUMN "actualizadoEn" TIMESTAMPTZ NOT NULL DEFAULT now();
-- (+ suplementos, competencias, alertas_alimentarias, alertas_seguimiento, estrategias)
```

### 3.11 [A-5] El N+1 del barrido — cambio de código, sin migración

```ts
// GenerarAlertasDeSeguimiento.ts: hoy son 2 queries por paciente + 1 por
// asignación vencida. El repositorio debería exponer una sola lectura agregada:
//
//   interface IRegistroDiarioRepositorio {
//     resumenSemanalPorPaciente(desde: Date, hasta: Date): Promise<Map<string, {
//       totalRegistros: number; registroPeso: boolean; huboActividad: boolean;
//     }>>;
//   }
//
// Implementable con un groupBy sobre registros_diarios + un EXISTS sobre
// actividades_fisicas: de ~1.600 round-trips a 2. Y `pacientes.listar()` en el
// barrido debe filtrar por vigentes (ver 3.9).
```

---

## 4. Próximos pasos priorizados

Con la restricción real del proyecto —un consultorio, sin datos productivos— el orden no es por severidad teórica sino por **costo de postergar**. Lo que hoy cuesta una migración de una tarde, con datos clínicos de varios consultorios cuesta un incidente.

**Bloque 1 — Ahora, mientras la base está vacía (1–2 días)**

1. **Migraciones 3.1 + 3.2: inquilino con FK, `NOT NULL`, FKs compuestas y RLS.** Es la única ventana barata para hacerlo. Resuelve C-4 y le quita el filo a C-1, A-1 y A-2. Todo lo demás de esta lista es más fácil después de esto.
2. **Migración 3.4: las cinco unicidades y checks faltantes.** Pocas líneas de SQL que cierran C-2, C-3, M-1, M-2 y M-7. La mejor relación impacto/esfuerzo del informe.
3. **Migración 3.3: turnos como `tstzrange` + `EXCLUDE`.** Cierra C-5 y M-12. Toca la entidad `Turno`, el repositorio y la UI de agenda, así que conviene hacerlo antes de que haya agenda cargada.

**Bloque 2 — Esta iteración (2–3 días)**

4. **A-4: decidir el ciclo de vida del paciente** (migración 3.9). Hoy dos KPIs del dashboard son incorrectos y nadie lo nota. O se implementa la baja, o se borra la columna y se corrigen las estadísticas — pero leer una columna que nadie escribe es la peor de las tres opciones.
5. **A-3: `telefonoE164`** (migración 3.5). Convierte la ingesta de WhatsApp de "cargar todo y filtrar en memoria" a un lookup indexado, y hace detectable el número duplicado.
6. **A-7 + B-1: las FKs faltantes** (migración 3.7). `recordatorios_whatsapp` sin ninguna FK genera huérfanos desde el primer turno borrado.
7. **A-5: eliminar el N+1 del barrido nocturno** (3.11).

**Bloque 3 — Próxima iteración (2–3 días)**

8. **A-6: partir `credenciales_integracion`** (migración 3.6). No urge por volumen; urge porque cada integración nueva hoy es un `ALTER TABLE` y ya van tres.
9. **A-8 + M-10: unificar tipos numéricos e ids** (migración 3.10, primeras dos partes). El `Float` en macros produce sumas con error en el cálculo de recetas.
10. **M-3/M-4/M-5/M-6/M-8/M-14: rediseñar los índices** (migración 3.8). Convertir los ~20 índices sueltos por inquilino en compuestos y agregar los cinco que faltan. El beneficio de performance **hoy** es despreciable — se hace por corrección del diseño, aprovechando el mismo `prisma migrate`.

**Bloque 4 — Cuando toque el módulo correspondiente**

11. **M-11: enum de franja de comida.** Hacerlo _antes_ de acumular datos del diario: es el eje de agregación que va a necesitar el análisis de adherencia y el ML.
12. **M-13: `actualizar` de planes sin borrar y recrear hijos** (upsert por id).
13. **B-6: unificar `recordatorios_whatsapp` y `mensajes_whatsapp`** al retomar el módulo de WhatsApp; hoy un recordatorio enviado por Cloud API se escribe dos veces.
14. **B-2/B-3/B-4/B-5/B-9: convenciones** — nombres en español, `@@map` consistente, enums en lugar de strings, prefijos de migración. Agrupar en una sola migración de higiene.

**Explícitamente descartado:** particionamiento, sharding, star schema, event sourcing y CQRS. Ninguno se justifica con un consultorio y <1.000 pacientes; el techo proyectado de la tabla más grande (`registros_diarios`, ~365k filas de por vida) está tres órdenes de magnitud por debajo de donde esas técnicas empiezan a pagar. Reevaluar solo si el producto pivotea a SaaS con cientos de inquilinos, y en ese caso el primer paso sería partición por `nutricionistaId`, no sharding.
