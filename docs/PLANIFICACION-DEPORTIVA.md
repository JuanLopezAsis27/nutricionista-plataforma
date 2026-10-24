# Planificación deportiva

La estrategia nutricional de una **competencia**: qué se ingiere y CUÁNDO.
Empieza por las carreras de **running y trail running** (migración 94) y está
armada para sumar otros deportes. Las categorías de alimento que usa —«Geles
deportivos», «Bebidas isotónicas»— llegaron con la migración 93
(`docs/CATALOGO-BASE.md`, «Categorías»).

## No es un plan más

|                     | `PlanNutricional`        | `PlanSemanal`        | `PlanificacionDeportiva`            |
| ------------------- | ------------------------ | -------------------- | ----------------------------------- |
| Qué describe        | el día tipo              | los siete días       | UN evento (una carrera)             |
| Eje de tiempo       | franjas del día          | días × franjas       | minutos desde la largada            |
| Metas               | por día                  | por día              | **por hora de carrera**             |
| Carpetas            | sí                       | no                   | sí (la del paciente se arma sola)   |
| Asignación          | `AsignacionPlan`         | `AsignacionPlanSemanal` | `AsignacionPlanificacion`, con competencia |
| Dónde la ve el paciente | Mi plan              | Mi semana            | **Mis competencias**                |

Meterla como una modalidad de plan habría obligado a que una franja tuviera un
minuto de carrera opcional, y a que «las metas del día» significaran g/h en un
plan y g/día en otro. Es otro agregado, con su propio router
(`planificacionDeportiva`), su página (`/dashboard/planificacion-deportiva`) y
su pantalla en el portal.

## Un deporte, una tabla de detalle

```
planificaciones_deportivas   lo común: nombre, carpeta, tipo, descripción
├── planificaciones_carrera  1 a 1, solo con tipo CARRERA
├── ingestas_planificacion   la línea de tiempo (minuto, km, notas)
│   └── alimentos_ingesta    COPIAS de alimentos, como en el plan semanal
└── asignaciones_planificacion  paciente + competencia opcional
grupos_planificacion         carpetas (la de cada paciente con su pacienteId)
```

`TipoPlanificacionDeportiva` tiene un valor, `CARRERA`. Un deporte nuevo
(ciclismo, triatlón) es **un valor más del enum y su tabla de detalle**: la
línea de tiempo de ingestas es la misma para cualquier deporte de resistencia.
La entidad exige que una planificación de carrera tenga sus datos (la base no
puede exigirlo entre dos tablas) y el tipo no cambia al editar: pasar una
carrera a otro deporte tiraría sus datos.

La carrera guarda: modalidad (calle o trail), distancia, **duración estimada**,
desniveles, hora de largada, temperatura, objetivos por hora (carbohidratos
g/h, líquidos ml/h, sodio mg/h) y tres textos libres (estrategia previa,
puestos de abastecimiento, recuperación).

## El tiempo de cada ingesta

Cada ingesta se guarda en **minutos desde la largada** (`minuto`), que es como
la vive el corredor: «el gel a los 0:45» es lo que mira en el reloj. Con la
hora de largada, la pantalla dice además la hora del día (`horaDeIngesta`, que
da la vuelta al día para una ultra que larga de noche). Se eligió así y no por
hora del día porque la hora de largada se corre —una ola, una postergación— y
la estrategia no.

- **Negativo es antes de largar** (hasta 12 h: el desayuno sí, la cena previa
  no). Se muestra aparte y **no cuenta para los valores por hora**.
- **No puede caer después de la llegada estimada**: lo de después de llegar va
  en «Recuperación». Si se acorta la duración, las ingestas que quedaron
  afuera hay que moverlas; la validación lo dice.
- El **km** es opcional y no puede pasar la distancia. Sin km, en **calle** se
  muestra el km aproximado a ritmo parejo («≈ km 21,1»); en **trail** no,
  porque con desnivel el ritmo no es parejo y el número engañaría.
- Una ingesta lleva alimentos y/o una indicación («agua a demanda en el
  puesto»); vacía no se guarda. Se guardan en orden de tiempo.

## Qué suma por hora

`PlanificacionDeportiva.resumen`, calculado en cada lectura (nada se persiste):

- **Durante** = las ingestas con `0 ≤ minuto ≤ duración estimada`. Sus macros
  divididos por la duración en horas son los **g/h de carbohidratos** y las
  kcal/h.
- **Líquidos** = los alimentos medidos en **mililitros** (unidad base del
  alimento, `docs/MEDIDAS-ALIMENTOS.md`): agua, isotónica. Un alimento en
  gramos no suma líquido, aunque se tome con agua: el agua se carga aparte.
- Contra los objetivos por hora con **±10 %** (`compararConObjetivo`): debajo,
  en el objetivo, encima.
- El **mayor tramo sin ingerir**, contando desde la largada y hasta la llegada:
  la pantalla avisa si pasa de una hora.
- **El sodio es informativo**: los alimentos no traen sodio, así que el
  objetivo se muestra pero no se compara. Sumarlo pide agregar el sodio a los
  alimentos (columna, planilla y buscador) — es el paso siguiente natural.

## Cafeína (migración 96)

Cada alimento de una ingesta COPIA la cafeína del alimento
(`alimentos_ingesta.cafeinaPor100`, mg por 100 g/ml, migración 95), como copia
los macros, y se puede corregir en la ingesta. El resumen dice:

- los **mg de cada ingesta** y los de **antes de largar** y **durante** por
  separado;
- el **total de la competencia** (antes + durante): la cafeína de antes de
  largar —el gel de una hora antes— SÍ cuenta para la dosis, aunque no cuente
  para los valores por hora;
- los **mg por hora de carrera** (solo lo de durante);
- los **mg/kg**: el total dividido por el **peso del deportista**
  (`planificaciones_deportivas.pesoReferenciaKg`).

El peso es de la planificación y no se lee del paciente en cada vista: una
planificación general se asigna a varios, y cada uno tiene su peso. Al crearla
desde la ficha arranca con el **último peso del paciente** (el de su última
antropometría o el del diario, si es más nuevo: `seguimiento.informeProgreso`)
y se edita como cualquier otro dato. Sin peso, el resumen da los mg pero no el
mg/kg.

Pasar de **6 mg/kg** (`CAFEINA_MG_KG_HABITUAL`, el rango de 3 a 6 mg/kg de
las guías: consenso del COI 2018, posición de la ISSN) se avisa en amarillo y
no se impide: la dosis la decide el profesional.

Null es SIN DATO: si ningún alimento trae cafeína, el resumen no dice «0 mg»
sino que no hay dato.

El formulario muestra el mismo resumen **mientras se edita**
(`componentes/planificacion-deportiva/formulario/resumen.ts`). Es un espejo
del dominio porque la presentación no puede llamarlo; `resumen.test.ts` arma la
misma planificación de las dos formas y compara el resumen entero. Si tocás la
cuenta, tocá las dos.

## Carpetas y pacientes: como los planes

Se gestiona igual que los planes nutricionales, a propósito:

- **Generales**: se crean en el módulo (en la raíz o en una carpeta) y se
  **asignan** a uno o varios pacientes. Es la misma planificación para todos:
  editarla la cambia para todos, y la pantalla de edición lo advierte. Para
  adaptarla a uno, se **duplica** («(copia)», «(copia 2)»…; sin asignaciones).
- **Desde la ficha** del paciente (pestaña Deporte): «Nueva» crea la
  planificación, la guarda en la carpeta con su nombre —la primera vez se
  crea— y se la asigna. Es UN caso de uso (`CrearPlanificacionParaPaciente`),
  no tres pasos de la pantalla, para que un fallo a mitad no deje una
  planificación suelta que el paciente no ve.

La carpeta del paciente se reencuentra por `pacienteId`, no por nombre: es la
misma regla que la de los planes, y por eso vive una sola vez
(`grupos-plan/carpetaDelPaciente.ts`) y la usan los dos. Las carpetas usan
además los mismos casos de uso y la misma entidad (`GrupoPlan`) que las de los
planes, con su propio repositorio (`PrismaRepositorioGrupoPlanificacion`, que
cumple `IGrupoPlanRepositorio`).

### Edición concurrente

Editar reemplaza la planificación entera (datos e ingestas), así que lleva el
mismo **bloqueo optimista** que los planes: la pantalla de edición manda el
`actualizadoEn` que tenía al abrirse —fijado una vez, no el último que trajo la
query—, y la condición viaja al WHERE del UPDATE (`enVersion`) dentro de la
transacción que borra y recrea los hijos. Si otro la guardó mientras tanto,
sale `ErrorEdicionConcurrente` y no se escribe nada. El testigo es opcional,
como en todos lados.

## Competencias: lo que une el perfil deportivo con la planificación

El perfil deportivo y el calendario de competencias (`PerfilDeportivo`,
`Competencia`, migración 24) dicen QUÉ hace el paciente y CUÁNDO compite. La
planificación dice QUÉ COMER en esa competencia. Se unen en la
**asignación**: `asignaciones_planificacion.competenciaId` dice para cuál de
sus competencias es (opcional; SET NULL si la competencia se borra).

- Está en la asignación y no en la planificación porque una planificación
  general («Media maratón en 1:45») se asigna a varios pacientes, cada uno con
  SU carrera.
- **La competencia tiene que ser del paciente** (`verificarCompetenciaDelPaciente`):
  la base no lo puede exigir, y atada a la de otro mostraría en el portal una
  fecha y un lugar que no son suyos. Al crear desde la ficha se valida ANTES de
  escribir nada.
- Asignar dos veces la misma al mismo paciente no la duplica (único en la
  base): le cambia la competencia.
- El selector de «Asignar existente» busca por nombre en el servidor y
  muestra las primeras 20: con una página fija, las que quedaban afuera no se
  podían asignar desde la ficha.
- En la pestaña Deporte, cada competencia próxima ofrece **«Planificar»**
  (abre el alta ya atada a ella, con su nombre) o **«Ver planificación»** si ya
  tiene una. Debajo del calendario, la lista de planificaciones del paciente.

## Qué ve el paciente

**Mis competencias** (`/mis-competencias`): sus planificaciones, cada una con
la competencia para la que es, y sus próximas competencias que todavía no
tienen una. El detalle es la misma vista que la del profesional
(`VistaPlanificacion`): la carrera, los valores por hora, la línea de tiempo
con hora del día y km, y los textos de antes y después.

- Es una pantalla aparte de «Mi plan»: el plan es lo de todos los días y esto
  es la estrategia de una carrera; mezclarlos llenaría el día a día de geles.
- **La entrada del menú aparece solo si tiene alguna asignada**: a quien no
  compite, una sección vacía lo confunde. El menú lo pregunta con
  `cuantasMias` (un `count`), no trayendo las planificaciones: se dibuja en
  cada pantalla del portal.
- Qué competencia ya pasó se decide por DÍA (`esFechaPasada`): la fecha es un
  DATE a medianoche UTC y, contra la medianoche local, la carrera de hoy
  figuraba como terminada.
- La lista (`mias`) es la autorización, como en «Mis recetas»: el detalle sale
  de ella, y una planificación que no le asignaron no está.
- Se asigna = se ve. No hay borrador: lo que no está listo, no se asigna.

## Al tocar esto

- **Nunca sumes al valor por hora lo de antes de largar** ni lo de después de
  la llegada: los g/h son de la carrera. Y si tocás esa cuenta, tocá el espejo
  del formulario (`resumen.test.ts` es lo único que las mantiene iguales).
- **Nunca ates una asignación a la competencia de otro paciente**: pasá por
  `verificarCompetenciaDelPaciente`.
- **Todo camino nuevo que copie un alimento a una ingesta tiene que llevar
  `alimentoOrigenId`, `unidadBase` y `cafeinaPor100`**: sin el primero sus
  usos no se cuentan (`PrismaRepositorioUsosDeAlimento` ya cuenta las
  planificaciones); sin el segundo, una isotónica deja de sumar líquidos; sin
  el tercero, el gel con cafeína deja de sumar cafeína. Ninguno de los tres
  falla: el número sale mal en silencio.
- **Nunca leas el peso del mg/kg del paciente en cada vista**: es de la
  planificación (`pesoReferenciaKg`). Y la cafeína de antes de largar cuenta
  para el total y el mg/kg, no para los mg/h.
- **Un deporte nuevo no va en columnas nuevas de `planificaciones_deportivas`**:
  va en su tabla de detalle, como la carrera. Y al tocar las columnas de una
  tabla de detalle, escribilas en el `create` y en el `update` del repositorio
  (los dos recrean los hijos dentro de la misma transacción).
- Las tablas hijas llevan `nutricionistaId` materializado y están en
  `MODELOS_INQUILINO`, como las del plan semanal.
