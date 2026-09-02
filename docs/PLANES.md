# Planes nutricionales

Un plan se asigna a un paciente vía `AsignacionPlan`. Antes se llamaba "Dieta";
se renombró en la Fase 3 y hay redirects permanentes en `next.config.ts`.

Este documento cubre lo que se sumó después: **las dos modalidades de plan**,
**el material adjunto** y **la asignación desde la ficha del paciente**.

## Dos modalidades, no dos variantes

|                           | `APP`                    | `PDF`                   |
| ------------------------- | ------------------------ | ----------------------- |
| Qué es el plan            | las franjas cargadas acá | el archivo subido       |
| Comidas                   | al menos una             | ninguna (no se admiten) |
| Archivo principal         | ninguno (prohibido)      | obligatorio             |
| Anexos                    | sí                       | sí                      |
| PDF generado con membrete | sí                       | no aplica               |
| Sirve de plantilla        | sí                       | no                      |

**Son dos maneras de trabajar, no dos formas de llenar el mismo plan.** Quien
arma sus planes en Word o Canva los tiene terminados y solo quiere que el
paciente los vea; quien los carga en la app quiere las franjas, las opciones
intercambiables y el PDF con membrete que sale de ellas.

### Por qué está declarado y no deducido

La primera versión (migración 36) puso el PDF como un adjunto opcional del plan:
si estaba, la vista lo mostraba primero. Eso mezcló las dos cosas y trajo dos
problemas que son el mismo error:

- el anexo de un plan cargado —la lista de compras— se mostraba **como si fuera
  el plan**, tapándolo;
- solo se podía adjuntar **uno**, porque el campo era 1 a 1.

"¿Tiene un PDF?" no alcanza para saber qué es ese PDF. Por eso ahora son dos
preguntas separadas (migración 37):

- **`modalidad`** dice de qué clase es el plan;
- **`archivoPrincipalId`** dice cuál de sus archivos ES el plan, y solo tiene
  sentido en modalidad PDF.

La entidad lo hace cumplir en las dos direcciones: un plan PDF con comidas
cargadas se rechaza (habría dos planes en el mismo registro y ninguna forma de
decir cuál rige) y un plan APP con archivo principal también (ahí ningún anexo
puede hacer de plan).

**La modalidad no se cambia editando.** Pasar de PDF a APP dejaría un plan sin
comidas; al revés tiraría las que ya se cargaron. Se elige al dar de alta, con
dos botones distintos en `/dashboard/planes`.

## Cómo se guardan los archivos

Los archivos del plan son **`Archivo`**, dueños del arco exclusivo igual que las
fotos de una receta:

```
archivos.planId                        → planes_nutricionales.id  (1 a N, CASCADE)
planes_nutricionales.archivoPrincipalId → archivos.id             (SET NULL)
```

No es una columna con una ruta porque un plan no "tiene un path": tiene un
Archivo, con su clave en el bucket, su MIME, su tamaño y su borrado compensado,
que es lo que el módulo Archivos ya resuelve.

El contexto de subida es `plan` (`CONTEXTOS_ARCHIVO`), prefijo `planes/`, **solo
`application/pdf`**, 25 MB. Solo PDF porque el punto es que el paciente lo LEA
adentro de la app: un `.docx` obligaría a descargarlo y a tener Office.

**Se suben antes de que el plan exista** y se vinculan al guardarlo, igual que
los adjuntos de una receta. Por eso el CHECK `archivos_un_solo_dueno` es `<= 1` y
no `= 1` (ver migración 34).

`IPlanRepositorio.crear/actualizar` reciben `archivoIds`: es el **estado final**,
lo que no está en la lista se desvincula. El principal viaja en esa lista aunque
venga además en `archivoPrincipalId` — ser el plan no lo exime de estar
vinculado a él.

**Un archivo que sale de la lista se BORRA, no se desvincula**
(`PrismaRepositorioPlan.vincularArchivos`). Un archivo sin dueño no lo recoge
nadie: el barrido semanal del worker limpia objetos del bucket **sin fila**, no
filas sin dueño. Borrada la fila, el objeto queda huérfano de verdad y ese
barrido sí se lo lleva.

El principal se fija **después** de vincular: la FK exige que el archivo exista,
y fijarlo antes apuntaría a uno que todavía no es del plan.

### El fallback del principal vive en la entidad

`PlanNutricional.archivoPrincipal` resuelve el caso de que el elegido ya no esté
—se borró el archivo y la FK quedó en NULL— cayendo en el primero disponible, y
`adjuntos` devuelve el resto. El DTO de salida expone esos dos ya resueltos, no
la lista cruda: si cada pantalla repitiera el fallback, dos vistas del mismo plan
podrían mostrar archivos distintos. Es exactamente el error que ya se cometió
con la foto de la receta (migración 35).

Por eso el `INCLUIR_HIJOS` del repositorio trae los archivos con `orderBy`: sin
él "el primero" cambia entre consultas y el fallback iría rotando solo.

## Cómo lo ve el paciente

`GET /api/archivos/[id]/ver` — sirve el archivo **en línea y desde la app**.

Es el hermano de `/api/archivos/[id]`, que redirige a una URL firmada del
bucket. Los dos existen porque hacen cosas distintas: aquel es para **bajar** un
adjunto, este para **mostrarlo adentro**. Un iframe apuntado a la URL firmada
carga otro origen y queda a merced de las cabeceras del bucket y de lo que el
navegador —o el WebView de Android— acepte embeber.

La autorización de las dos rutas es **idéntica, a propósito**: son dos formas de
leer el mismo archivo, y si una fuera más permisiva sería la puerta de atrás de
la otra.

La regla del paciente (`PuedeVerArchivoPaciente`) alcanza a **todos** los
archivos del plan **ACTIVO** —el principal y los anexos—, y solo a ese: el plan
vigente es la indicación vigente, y dejar abierto el de un plan finalizado es
dejar al paciente siguiendo un plan que ya se cambió.

`VisorPdf` trae un botón "Abrir en una pestaña" que no es decorativo: es la
salida cuando el navegador no puede dibujar PDFs embebidos —pasa en el WebView
de Android, que no trae visor— y ahí el sistema lo abre con la app que
corresponda.

En `VistaPlan` el orden es siempre el mismo: **el plan primero** (el visor si es
PDF, las franjas si es APP) y el **material adjunto al final**. Un anexo nunca va
arriba: eso es lo que llevó a separar las dos modalidades.

## El PDF generado y el PDF subido son dos cosas

`GET /api/planes/[id]/pdf` **genera** un PDF con el membrete del consultorio a
partir del plan cargado. No tiene nada que ver con los archivos subidos.

Por eso el botón "PDF" solo aparece en modalidad APP: generar el plan cargado de
un plan que ya ES un PDF da un documento vacío.

## Un plan en PDF no sirve de plantilla

`clonar()` lo rechaza con un mensaje explícito. Cada archivo pertenece a UN plan
y compartirlo haría que borrar el original le vaciara el clon; copiar el objeto
del bucket sería otra función. Se dice ahí y no se deja fallar más abajo como "un
plan en PDF necesita el archivo", que no explicaría nada.

Un plan APP clonado tampoco se lleva sus anexos, por lo mismo — pero ahí no es
un impedimento: el plan sigue completo.

## El nombre del plan es único

Por consultorio, y con **planes y plantillas como espacios separados**
(migración 38). Una plantilla «Descenso» y el plan «Descenso» que sale de ella
es el flujo esperado, no un choque.

El nombre es lo único que se ve al elegir un plan para asignar: dos planes
llamados igual son indistinguibles ahí, y asignar el equivocado no se descubre
hasta que el paciente pregunta.

La garantía dura es el índice único; el caso de uso consulta antes solo para
dar un mensaje entendible en vez de un error de Prisma. La consulta usa
`mode: "insensitive"` —«Descenso» y «descenso» son el mismo plan para quien
mira la lista—, así que es **más estricta** que el índice.

**Los archivados cuentan.** Siguen apareciendo en el historial y en el listado
con el filtro puesto, así que dos con el mismo nombre seguirían siendo ambiguos.
Para reusar un nombre hay que renombrar el viejo: una decisión explícita, no un
accidente.

**Clonar una plantilla NUMERA el nombre** («Descenso (2)», «(3)»…). Clonar es un
clic sin formulario: si fallara por nombre repetido, el botón quedaría
inservible a partir del segundo uso de la misma plantilla. Un nombre escrito a
mano, en cambio, no se toca: si choca, se avisa.

## Carpetas

`GrupoPlan` agrupa planes por **propósito**, que es como el profesional los
busca: por paciente («Julia Pérez»), por objetivo («Descenso»), por población
(«Deportistas»).

Es una carpeta libre y no una categoría cerrada porque el criterio lo pone quien
trabaja, y las dos formas responden a la misma necesidad: que la lista de planes
deje de ser una sola bolsa cuando pasa de veinte.

**No apunta al paciente** aunque el caso típico sea una carpeta por paciente.
Atarla a un paciente la volvería otra cosa —sus planes ya se consultan por
asignación— y dejaría afuera el resto de los criterios.

**Borrar la carpeta no borra los planes**: la FK es SET NULL y quedan sueltos.
Una carpeta es cómo están ordenados, no de quién son; llevarse el contenido al
tirar el rótulo sería una pérdida de datos disfrazada de organización.

### Se navegan como directorios

La pantalla de planes es un explorador, no un desplegable de filtro:

- **en la raíz** se ven las carpetas y, debajo, los planes **sueltos**;
- **al entrar** a una carpeta, la ruta muestra dónde estás y la lista pasa a
  mostrar solo lo de adentro;
- **crear un plan estando adentro lo guarda ahí** (`grupoIdInicial`), sin el
  paso de "crearlo y después moverlo";
- cada plan tiene un botón **Mover** que abre solo el selector de carpeta.

**Las carpetas son de los PLANES: las plantillas no viven en carpetas.** No hay
navegador de carpetas en la pestaña de plantillas, la lista las muestra todas,
el formulario no ofrece el campo Carpeta cuando se está creando una plantilla y
la acción Mover no aparece. Una plantilla es un molde del que se saca un plan;
guardarla dentro de la carpeta de un paciente la vuelve imposible de encontrar
desde cualquier otro, que es lo contrario de para qué existe. Las carpetas
ordenan el trabajo con UN paciente; las plantillas son transversales a todos.

Es deliberado que se parezca a un explorador de archivos: «guardar el plan de
Julia en la carpeta de Julia» es una idea espacial. Un desplegable no da la
sensación de haber entrado a ningún lado, y peor, **nada indica que la carpeta
existe hasta que lo desplegás**.

Que la raíz liste los **sueltos** y no todo también es a propósito: si mostrara
todo, los planes de las carpetas aparecerían dos veces —arriba en su carpeta y
abajo en la lista— y entrar a una carpeta no cambiaría nada.

**No hay carpetas dentro de carpetas.** Un nivel alcanza para el volumen de un
consultorio, y el anidamiento traería mover carpetas, romper ciclos y migas de
pan para un problema que nadie tiene todavía.

Los conteos de cada carpeta van **separados por tipo** (`cantidadPlanes` /
`cantidadPlantillas`) porque la pantalla navega planes y plantillas por
separado: una carpeta con 3 planes y ninguna plantilla tiene que verse vacía en
la pestaña de plantillas, no decir «3» y abrirse sin nada.

**Mover es su propio caso de uso** (`MoverPlanAGrupo`), no un `ActualizarPlan`
con un campo distinto: ordenar no es editar. Pasar un plan de carpeta por el
editor completo obligaría a reenviar comidas, archivos y recomendaciones
enteras para cambiar un campo, y cualquier fallo a mitad de camino reescribiría
el plan.

En el repositorio, `null` filtra los sueltos y `undefined` no filtra: son dos
preguntas distintas y colapsarlas haría imposible pedir la raíz.

## El historial de planes del paciente

`AsignacionPlan` siempre fue el historial —asignar desactiva la anterior en vez
de pisarla— pero tenía dos agujeros que lo vaciaban justo cuando servía
(migración 38):

1. **La FK al plan era CASCADE**: borrar un plan borraba la historia de todos
   los que lo habían seguido. Qué plan siguió un paciente y entre qué fechas es
   información clínica: le pertenece al paciente, no al plan. Ahora es SET NULL
   y la asignación queda, con `nombrePlan` —una **foto**, no un cache— para
   decir qué se le asignó aunque el plan ya no exista o se haya renombrado.

2. **No se guardaba cuándo terminó de verdad.** `fechaFin` es el fin
   _planificado_ al asignar y suele estar vacío; cuando el plan se reemplaza
   antes de esa fecha —el caso normal— no había cómo decir hasta cuándo rigió.
   Para eso está `finalizadaEn`, el fin **real**.

Las dos fechas conviven a propósito: planificar un fin y que efectivamente
termine ahí son dos cosas distintas.

**La anterior se cierra con la fecha de INICIO de la nueva**, no con «hoy». El
plan viejo rigió hasta que empezó el que lo reemplaza; si el profesional
antedata la asignación, el historial queda sin huecos ni superposiciones. Al
finalizar a mano (sin reemplazo) sí es hoy.

`GenerarAlertasDeSeguimiento` aprovecha `nombrePlan`: antes hacía una lectura
por cada plan vencido para recuperar un dato que ahora viaja en la asignación.

## Quiénes tienen un plan

`/dashboard/planes/[id]` lista sus asignaciones —**activas e históricas**— con
las fechas, y deja finalizar desde ahí. Mostrar solo las vigentes escondería que
el plan se usó, que es justo lo que hay que saber antes de borrarlo.

Es la contracara de asignar desde la ficha del plan: se decide sobre el plan, y
obligar a entrar a cada paciente para soltarlo era el mismo viaje de ida y
vuelta que ya se había sacado en la asignación.

## Asignar el plan desde la ficha del paciente

`FormularioAsignacionPlan` acepta los dos extremos como opcionales porque se
entra desde las dos puntas:

| Desde              | Viene fijado | Se elige en el formulario |
| ------------------ | ------------ | ------------------------- |
| Ficha del plan     | `planId`     | el paciente               |
| Ficha del paciente | `pacienteId` | el plan                   |

**El lado fijado no se muestra.** Cambiarlo ahí sería asignar algo distinto de lo
que dice la pantalla.

El selector de planes lista solo `esPlantilla: false` e
`incluirArchivados: false`: una plantilla no se asigna (se clona) y un plan
archivado ya se dio de baja.

En la pestaña "Plan actual" de la ficha hay tres acciones según el estado:
**Asignar plan** si no tiene, y **Cambiar plan** / **Finalizar plan** si tiene.
"Cambiar" reusa el mismo diálogo: la advertencia de que el plan anterior se
desactiva ya la trae el formulario.

## Al tocar esto

- Los archivos entran al modelo como `Archivo`, no como columnas. Si hace falta
  otro dueño, se suma al mismo arco y se actualiza el CHECK
  `archivos_un_solo_dueno` (sigue siendo `<= 1`).
- `PlanNutricional.archivos` lo completa el **repositorio** al leer: al crear el
  plan solo se conocen los ids, porque subir y guardar son dos pasos. Es el mismo
  patrón que `recetaNombre` en una opción.
- El DTO de salida expone `archivoPrincipal` y `adjuntos` **ya resueltos**. No
  agregues la lista cruda "por si acaso": es la puerta para que una pantalla
  vuelva a resolver el principal por su cuenta.
- Editar un plan **reemplaza** sus archivos: el formulario manda los que quiere
  que queden. Igual que manda las comidas que no tocó.
- Al sumar un filtro al listado, **acordate de `ObtenerPlanesPaginado`**: arma
  el filtro campo por campo para no arrastrar la paginación al conteo, así que
  un filtro que solo esté en el DTO y en el repositorio no hace nada. Le pasó a
  `grupoId`, y el síntoma fue "el filtro de carpetas no anda", sin ningún error.
- Al agregar un campo al plan, **acordate del `create` del repositorio**, no solo
  del `update`. La modalidad se perdió exactamente así: la escribía `actualizar`
  pero no `crear`, y todos los planes en PDF nacían como planes de la app con el
  archivo colgado de anexo. El síntoma no fue un error sino un default correcto
  ganándole a un valor que nunca se mandó.
