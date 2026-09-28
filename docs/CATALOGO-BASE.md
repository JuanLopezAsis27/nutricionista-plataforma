# Catálogo predeterminado de alimentos y recetas

Migración 82. El SUPERADMIN carga alimentos y recetas que ven **todos** los
consultorios; cada profesional sigue sumando los suyos, que quedan solo para él.

## Qué es de quién

| Tabla                      | Dueño            | Inquilino | Quién escribe | Quién lee            |
| -------------------------- | ---------------- | --------- | ------------- | -------------------- |
| `alimentos_base`           | la plataforma    | no        | SUPERADMIN    | todos los consultorios |
| `recetas_base` (+ ingredientes) | la plataforma | no      | SUPERADMIN    | todos los consultorios |
| `alimentos_propios`        | un consultorio   | sí        | ese consultorio | ese consultorio    |
| `recetas`                  | un consultorio   | sí        | ese consultorio | ese consultorio    |

Las tablas del catálogo **no llevan `nutricionistaId` ni están en
`MODELOS_INQUILINO`**: son de todos y de nadie, y la extensión multi-inquilino
no las filtra. Que solo las escriba el SUPERADMIN lo garantiza el procedimiento
(`superadminProcedimiento` en `routers/superadmin.ts`, y el chequeo de rol en
`/api/catalogo/alimentos/importar`).

## Alimentos: la misma colección, otro dueño

Un alimento de la plataforma tiene exactamente la forma y las reglas de uno
propio (macros por 100 g, se importan de una planilla, se editan de a uno, se
buscan por nombre). Por eso **no hay entidad ni casos de uso nuevos**:
`PrismaRepositorioAlimentoBase` implementa el mismo `IAlimentoPropioRepositorio`
y el contenedor arma un segundo `ServicioAlimentosPropios` con él
(`servicioAlimentosBase`). La pantalla también es la misma
(`ImportadorAlimentos` y `ListaAlimentosPropios` con `origen`).

### El buscador

`ProveedorNutricionDespachador` recibe las dos listas en orden de prioridad:

1. si alguna tiene alimentos, busca en **las dos** —la del consultorio
   primero— y combina sin repetir nombre + marca (si el profesional cargó su
   propia versión de un alimento de la plataforma, manda la suya);
2. si las dos están vacías, sale a Open Food Facts, como antes.

Cada resultado lleva su `fuente` (`PROPIO`, `BASE`, `OFF`) y queda guardada en
el alimento de la opción o del ingrediente.

Consecuencia a tener presente: con el catálogo de la plataforma cargado,
**ningún consultorio sale a Open Food Facts**. Es el mismo criterio que ya
regía para la lista propia («si hay lista, no se consulta ninguna API»).

### Un alimento no se carga dos veces (migración 83)

«El mismo alimento» es **mismo nombre y misma marca**, sin distinguir
mayúsculas, tildes ni espacios de más (`AlimentoPropio.claveIdentidad`, con
`normalizarTextoAlimento`): «Leche Descremada» y «leche  descremada» son uno;
la misma leche de dos marcas son dos, porque sus macros no tienen por qué
coincidir. La ñ se compara como n.

- **La columna `claveIdentidad` es única**: por consultorio en
  `alimentos_propios`, global en `alimentos_base`. Un alimento propio igual a
  uno de la plataforma NO es duplicado: es la versión del profesional, y el
  buscador muestra la suya primero.
- **El alta y la edición chequean antes** (`CrearAlimentoPropio`,
  `ActualizarAlimentoPropio`) y lanzan `ErrorAlimentoDuplicado` nombrando al
  que ya estaba con su escritura («"Avena (Quaker)" ya está en la lista»).
  Renombrar hasta chocar con otro cuenta; corregir el propio nombre
  («avena» → «Avena») no. El índice es la garantía si dos altas llegan juntas
  (sale por `traducirErrorPrisma` y se reporta al monitor).
- **La importación no se corta por un repetido**: de las filas con la misma
  clave queda la ÚLTIMA (en una planilla que se fue corrigiendo, la de más
  abajo suele ser la buena), el orden es el de la primera aparición, y la
  respuesta dice cuántas se descartaron (`{ importados, repetidos }`).
- **Los duplicados que ya existían** los resolvió la migración 83 quedándose
  con el más reciente (`creadoEn`). Borrar un alimento no toca planes ni
  recetas: copiaron sus macros.
- La normalización tiene un espejo en SQL (solo en la migración, para
  calcular las filas existentes) que cubre los acentos latinos habituales. Si
  cambia la regla de `normalizarTextoAlimento`, hace falta una migración que
  recalcule la columna.

### Categorías (migración 84)

Cada alimento puede tener UNA categoría de una lista **fija**
(`CATEGORIAS_ALIMENTO`: Carnes, Embutidos (migración 86), Pescados y mariscos, Huevos, Lácteos, Cereales
y derivados, Legumbres, Verduras, Frutas, Frutos secos y semillas, Aceites y
grasas, Azúcares y dulces, Bebidas, Suplementos, Otros). Es un enum de la base
y no etiquetas libres porque es lo que se FILTRA en el buscador de todos los
consultorios: con texto libre, «Lácteos», «lacteos» y «Lácteo» serían tres
filtros. Los valores solo se agregan. Las **recetas**, en cambio, siguen con
sus etiquetas libres (una receta es «vegetariana» y «rápida» a la vez, y cada
consultorio etiqueta a su manera), y se filtran por ellas.

- Es opcional: los alimentos anteriores quedan sin categoría.
- La planilla trae una columna opcional «Categoría» (también «Rubro» o
  «Grupo»). `categoriaDesdeTexto` acepta el nombre, el código, la primera
  palabra y el singular, sin tildes ni mayúsculas; lo que no reconoce entra sin
  categoría, no rompe la importación.
- **Con categoría, la búsqueda no necesita texto** («mostrame los lácteos»).
  Open Food Facts no conoce nuestras categorías: con un filtro puesto devuelve
  `[]` en vez de resultados de cualquier rubro.

### Imágenes (migración 84)

Cada alimento puede tener una imagen, que aparece en el buscador y en la
lista. **No es un `Archivo`**: `archivos` es tabla de inquilino y un alimento
de la plataforma no es de ningún consultorio. Vive como `imagenClave` en la
fila del alimento, y se sirve desde la app (nunca por URL firmada):

- `/api/alimentos/[id]/imagen` — la lista del consultorio. Solo
  NUTRICIONISTA; un alimento de otro consultorio no existe para él (filtro de
  inquilino del repositorio).
- `/api/catalogo/alimentos/[id]/imagen` — el catálogo. La ven NUTRICIONISTA y
  SUPERADMIN; la cambia solo el SUPERADMIN.

GET la sirve, POST (multipart, campo `imagen`) la pone o reemplaza, DELETE la
quita. JPG, PNG o WebP hasta 2 MB, con la **firma binaria verificada** (los
primeros bytes tienen que ser de ese formato, igual que en `archivos`).
`CambiarImagenAlimento` sube la nueva, apunta la fila y recién después borra
la vieja; si la fila no se pudo actualizar, borra la recién subida.

**Caché**: cada subida lleva un nombre nuevo, y la URL lleva su versión
(`?v=`, `AlimentoPropio.imagenVersion`), así que la respuesta puede ser
inmutable por un año sin mostrar nunca una imagen vieja.

**El barrido de huérfanos** (`LimpiarArchivosHuerfanos`) borraba del bucket
todo lo que no tuviera fila en `archivos`. Ahora recibe `otrasFuentes`: los dos
repositorios de alimentos, con `listarClavesDeImagen()`. **Una tabla nueva que
guarde claves del bucket fuera de `archivos` tiene que sumarse ahí**, o sus
objetos desaparecen el domingo siguiente sin ningún error. Borrar un alimento
no borra su imagen en el momento: queda huérfana y la limpia el barrido.

**Reimportar la planilla no pierde lo cargado a mano**: un alimento que ya
estaba (misma `claveIdentidad`) conserva su imagen, y su categoría si la
planilla no trae una (si trae, gana la de la planilla).

### El buscador es un modal

`BuscadorAlimento` es un botón que abre un modal con el campo de búsqueda, los
chips de categoría y los resultados con imagen, macros, categoría y de qué
lista vienen. Elegir uno lo agrega y cierra. Lo usan el formulario de receta,
las opciones del plan, el plan semanal y las recetas de la plataforma (en
este último, con `enCatalogo`, busca solo en el catálogo).

La receta de una opción del plan se elige con `BuscadorReceta`: un modal con
dos pestañas —el recetario del consultorio, filtrable por texto y etiqueta y
con la foto de cada receta, y las de la plataforma, también por etiqueta
(`etiquetasRecetasBase`)—. Usar una de la plataforma la copia y la deja
elegida.

### Un alimento propio igual a uno de la plataforma

Está permitido a propósito: es la **versión del profesional** (otros macros,
otra tabla de composición) y no toca la de todos. En su buscador la suya
reemplaza a la de la plataforma: el despachador descarta la segunda con la
MISMA identidad que el control de duplicados (`claveIdentidadAlimento`, sin
tildes ni espacios de más; antes comparaba solo en minúsculas y «Yogur» y
«Yógur» salían los dos).

Como una copia idéntica no aporta nada, se AVISA sin bloquear:

- al cargarlo a mano, el formulario muestra «"Avena (Quaker)" ya está en los
  alimentos de la plataforma…» (`BuscarCoincidenciaEnCatalogo`,
  `nutricion.coincidenciaEnCatalogo`);
- al importar la planilla, la respuesta cuenta `enPlataforma` y el aviso lo
  dice. Las filas no se descartan.

### Copias y no referencias (migraciones 82 y 85)

Cuando se elige un alimento, sus datos se **copian** a donde se lo usa: la
opción del plan (`items_opcion_comida`), el ingrediente de la receta
(`ingredientes_receta`, `ingredientes_receta_base`) y la comida del plan
semanal (`items_comida_semanal`). Es duplicación deliberada —el mismo patrón
que una factura que copia el precio del producto el día de la venta—: un plan
entregado a un paciente es un documento y no puede cambiar porque alguien
corrija o borre un alimento. Por eso:

- **borrar un alimento no toca nada de lo ya cargado** (no hay FK);
- **editarlo tampoco**: los planes siguen con los macros de cuando se armaron.

Lo que la copia perdía era saber de dónde salió. `alimentoOrigenId` (migración
85) guarda el id del alimento en cada copia, **sin FK**: es solo una
referencia informativa, y un id que ya no existe simplemente no cuenta. Con
eso `ContarUsosDeAlimento` dice dónde se usa un alimento, y la lista lo avisa
al editarlo («Se usa en 2 planes y 1 receta. Si cambiás los macros, esos
planes siguen con los anteriores») y en la confirmación de borrado. En un
consultorio cuenta lo suyo; en el catálogo (SUPERADMIN, alcance global) cuenta
en todos los consultorios y dice en cuántos. Cuenta dueños, no filas: un plan
con avena en tres opciones es un plan.

Las copias anteriores a la migración 85 quedan sin origen (no hay forma
confiable de reconstruirlo: el nombre copiado se pudo editar), así que los
usos se cuentan desde ahí.

Si alguna vez hace falta **actualizar** planes con los macros nuevos de un
alimento, `alimentoOrigenId` es la base, pero tiene que ser una acción
explícita del profesional sobre un plan («actualizar macros desde la
fuente»), nunca una propagación automática.

### Desde el consultorio

En Integraciones → Alimentos el profesional ve su lista (editable, aunque esté
vacía: se puede armar de a uno sin Excel) y la de la plataforma en **solo
lectura**. Lo que agrega va a su lista.

## Recetas: se COPIAN, no se referencian

Un consultorio no usa la receta de la plataforma en su lugar: la **copia** a su
recetario (`CopiarRecetaBaseAlRecetario`) y desde ahí es suya —la edita, le pone
fotos, la guarda en una carpeta, la comparte con un paciente, la vincula a un
plan— con todo lo que ya sabe hacer una receta, y sin un segundo tipo de receta
que cada pantalla (portal, `/mis-recetas`, PDF, planes) tenga que distinguir.

- La copia guarda `recetas.recetaBaseId`, **único por consultorio**: copiar dos
  veces devuelve la misma copia. Así, elegir la misma receta de la plataforma en
  dos opciones del plan no duplica el recetario.
- Editar la receta en la plataforma **no cambia las copias**: una receta ya
  entregada a un paciente no puede reescribirse desde afuera.
- Borrarla de la plataforma deja las copias (FK `SET NULL`).
- Las recetas base usan la misma entidad `Receta` (mismos invariantes y la misma
  cuenta de macros por porción); no tienen fotos, documentos ni carpeta, que son
  cosas de un consultorio.

Se llega a ellas desde el recetario («Recetas de la plataforma», que copia y
abre la copia) y desde el selector de receta de cada opción del plan («Elegir
de la plataforma…», que copia y deja la copia elegida).

## Al tocar esto

- **Nunca agregues `nutricionistaId` a las tablas del catálogo** ni las sumes a
  `MODELOS_INQUILINO`: la extensión las filtraría y ningún consultorio las vería.
- **Nunca referencies una receta base desde un plan o un paciente**: se copia.
  Una FK a `recetas_base` desde una tabla de inquilino haría que un cambio del
  admin reescriba planes ya entregados.
- Un procedimiento nuevo que ESCRIBA el catálogo va en `superadminProcedimiento`.
  Uno que lo LEA para un consultorio va en `nutricionistaProcedimiento`, en el
  router del módulo (nutricion, recetas).
- Importar el catálogo lo **reemplaza** entero, como la lista propia. No rompe
  nada: planes y recetas copian los macros del alimento al elegirlo.
