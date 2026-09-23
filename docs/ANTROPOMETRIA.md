# Antropometría — modelos, ecuaciones y distribución

Detalle del módulo de composición corporal. El resumen conceptual —los dos
modelos que conviven y por qué no se mezclan— está en `AGENTS.md`.

## Los tres bloques que produce una medición

| Bloque                | Qué contesta           | Dónde vive                              |
| --------------------- | ---------------------- | --------------------------------------- |
| Fraccionamiento Kerr  | Cuánto hay, anatómico  | `composicionCorporal.ts`                |
| Grasa por pliegues    | Cuánto hay, por regresión | `grasaPorPliegues.ts`                |
| Distribución          | **Dónde** está         | `composicion/distribucion.ts`           |

Ninguno se persiste: todo se recalcula de las medidas crudas en cada lectura.

## Ecuaciones del modelo de 2 componentes

Nueve, y cada una con su población de validación y su juego de sitios. La UI
muestra, para cada una, **qué sitios sumó y cuánto dio esa Σ**: sin eso, cargar
un pliegue que solo entra en una ecuación parecía no servir para nada.

| Ecuación                   | Sitios | Población                       | Devuelve   |
| -------------------------- | ------ | ------------------------------- | ---------- |
| Yuhasz / Carter            | 6      | Deportistas                     | % directo  |
| Yuhasz / Carter — Kerr     | 6      | Sedentarios (×1,17)             | % directo  |
| Faulkner                   | 4      | Deportistas                     | % directo  |
| Faulkner — Kerr            | 4      | Sedentarios (×1,14)             | % directo  |
| Withers                    | 7 (M) / 4 (F) | Atletas                  | densidad   |
| Durnin & Womersley         | 4      | Población general, 16–72        | densidad   |
| Jackson & Pollock          | 7      | Población general, 18–61        | densidad   |
| Jackson & Pollock          | 4      | Población general (abreviada)   | **% directo** |
| Parrillo                   | 9      | Fisicoculturismo y fuerza       | % directo  |

Las que devuelven densidad convierten con Siri (1961). **Jackson & Pollock de
4 sitios devuelve el porcentaje DIRECTO**: es el error clásico al
transcribirla, porque el mismo autor publicó ecuaciones de densidad para otros
juegos de pliegues, y aplicarle Siri encima da disparates. Hay un test que lo
congela.

Parrillo es la única que depende del **peso**, y su coeficiente (27) está en
unidades imperiales: se convierte el peso a libras en vez de reexpresar la
constante, para que el 27 siga siendo verificable de un vistazo contra la
publicación.

### Los sitios que el perfil ISAK no tiene

Migración 39: Jackson & Pollock de 7 pedía **pectoral** y **axilar medio**;
Parrillo pedía **pectoral** y **lumbar**. Ambas ecuaciones ya se retiraron de
la aplicación (ver más abajo), y el pectoral se borró en la migración 57 por no
tener ningún uso sin ellas. **Axilar medio** y **lumbar** quedan como campos
elegibles para una plantilla propia, aunque hoy tampoco alimenten ninguna
ecuación activa. No son sinónimos de ninguno de los ocho del ISAK: el axilar
medio va sobre la línea axilar media a la altura del xifoides y el lumbar
sobre los erectores, a la altura de la cresta ilíaca.

### El sitio «suprailíaco»

**Decisión declarada, revisable en una línea** (`PLIEGUE_SUPRAILIACO` en
`grasaPorPliegues.ts`): el suprailíaco de Jackson & Pollock y de Parrillo se
toma como la **cresta ilíaca** del ISAK.

Ninguna de las dos familias se escribió pensando en la distinción que el ISAK
hace entre cresta ilíaca (línea axilar media) y supraespinal (línea
ilioespinal). Se elige cresta ilíaca por coherencia con Durnin & Womersley,
que ya usaba ese sitio para su propio suprailíaco: si dos ecuaciones tomaran
sitios distintos bajo el mismo nombre, cambiar de ecuación en la serie de un
paciente movería el número por dos motivos a la vez.

## Distribución adiposa y muscular

Otra pregunta, no otra versión de la misma. El fraccionamiento y las
ecuaciones dan **totales**; dos personas con el mismo total pueden tener toda
la grasa en el tronco o repartida en las extremidades, y eso cambia tanto el
riesgo cardiometabólico como la lectura del entrenamiento.

Son **tres zonas adiposas y tres segmentos musculares**, que es la partición de
la planilla del profesional.

### Adiposa: superior, central, inferior

Los pliegues se agrupan por altura anatómica y cada zona vale lo que su Σ
aporta a la Σ total de los pliegues medidos.

| Zona     | Sitios ISAK                | Sitios de fuera del ISAK   |
| -------- | -------------------------- | -------------------------- |
| Superior | tricipital, subescapular   | bicipital, axilar medio    |
| Central  | supraespinal, abdominal    | cresta ilíaca, lumbar      |
| Inferior | muslo, pantorrilla         | —                          |

Con el perfil ISAK de 6 pliegues las tres zonas caen en tres pares, que es lo
que hace la lectura comparable entre consultas aunque el perfil crezca.

**El subescapular es SUPERIOR, no central.** La zona central es la *cintura*
—lo que se mira por riesgo cardiometabólico—; el tronco alto se mueve con el
tren superior. Meterlo en central movería las dos zonas a la vez y dejaría la
única que se lee clínicamente contaminada con espalda.

Los tres sitios de fuera del ISAK entran igual: la zona es anatómica, no
depende de qué protocolo nombre el sitio.

Con **una sola zona medida no hay distribución**: el reparto daría 100 % y eso
no es un reparto, es el único pliegue que se tomó.

### Muscular: brazo, muslo, pierna

Cada segmento es un perímetro con el pliegue del mismo segmento descontado
(`perímetro − 3,141 · pliegue / 10`), que es exactamente la corrección del
fraccionamiento de Kerr — si acá se corrigiera distinto, dos partes de la misma
pantalla dirían cosas distintas sobre el mismo brazo. Un segmento con perímetro
pero **sin** su pliegue no entra a medias: llevaría el tejido adiposo adentro y
abultaría su parte del reparto.

El muslo va por el perímetro **máximo** y no por el medial, aunque el pliegue se
tome a media altura: la referencia Phantom del muslo corregido está definida
sobre el máximo. Calcular el valor del paciente sobre un sitio para compararlo
contra otro daría un Score-Z que mide la diferencia entre dos protocolos.

### El Score-Z del segmento

El porcentaje dice cómo se reparte el músculo entre los tres segmentos; **no**
dice si el segmento es grande o chico. Tres segmentos flacos por igual dan el
mismo reparto que tres grandes por igual. Por eso cada uno lleva además su
Score-Z contra el Phantom, con la medida escalada a 170,18 cm como el resto del
perfil de proporcionalidad. Sin talla no hay Z —un Z sin escalar mediría el
tamaño de la persona, no su proporción—, pero el reparto se muestra igual.

La **media** de la referencia no se escribe a mano: se deriva aplicándole al
Phantom la misma corrección que al paciente, y da exactamente los valores
publicados (brazo 22,05; muslo 47,34; pierna 30,22). Derivarla es lo que
garantiza que las dos puntas de la resta usen la misma constante para siempre,
y hay un test que lo fija: un sujeto con las medidas medias del Phantom tiene
que dar Z = 0 en los tres segmentos.

El **desvío** sí es un dato publicado (Ross & Marfell-Jones: 1,91 / 3,59 / 1,97)
y no se puede derivar: el perímetro y el pliegue del mismo segmento están
correlacionados, y propagarlos como independientes lo sobreestimaría — los
corregidos dispersan *menos* que sus perímetros crudos, no más.

Las bandas del color son por **valor absoluto** (< 1 DE, 1–2 DE, ≥ 2 DE): un Z
de −2,5 se aparta de la referencia tanto como uno de +2,5, y en
proporcionalidad eso es lo que se mira. El color nunca va solo: el número está
escrito adentro de la pastilla y el `title` dice la banda.

### Cómo se dibuja

Tres piezas que dicen cosas distintas y no se reemplazan:

- **Las barras** comparan cada perímetro con su corregido en una escala única
  que arranca en cero. Lo que se lee es la *caída* entre los dos —el tejido
  adiposo que envuelve el segmento—, y esa caída es la única parte del cuadro
  que se ve como una diferencia y no como un número. Con un eje por segmento, o
  empezando en el mínimo, se vería del mismo tamaño en un brazo y en un muslo.
- **La figura** es una silueta partida al medio, adiposo a la izquierda y
  muscular a la derecha, con los porcentajes de cada tejido de su lado. Hace de
  leyenda: evita traducir «superior» o «pierna» a un lugar del cuerpo. No lleva
  marcas por sitio —las zonas son regiones, no puntos, y un punto prometería una
  precisión de palpación que este reparto no tiene—.
- **Las tablas** dan el número exacto. La adiposa lista de qué pliegues está
  hecha cada zona: sin eso, «Central 35,87 %» no se puede auditar contra la
  planilla.

Los colores de los dos tejidos son los del resto del dashboard
(`TEMAS_COMPOSICION.masas`), no una paleta propia de esta tarjeta: la masa
adiposa no puede ser de un color en el donut y de otro tres tarjetas más abajo.

## Qué campos pide el formulario

El perfil ISAK son 25 medidas y en la consulta real se toman seis. Los **dos
protocolos son las plantillas principales** y cada uno lleva su lista de
medidas, configurable; las plantillas propias son juegos de campos adicionales
que se acomodan a los protocolos que admiten.

| Nivel              | Quién lo arma                              | Piso                                  |
| ------------------ | ------------------------------------------ | ------------------------------------- |
| **Protocolo**      | Configuración → Antropometría → Protocolos | Kerr en 5 componentes; una ecuación de grasa en 2 |
| **Plantilla propia** | Configuración → Antropometría → Plantillas | resolver ALGO                       |

**No hay «perfil completo»** como tercera opción del modal. Uno de los dos
protocolos ya es el perfil entero si así se lo configura, y una lista fija al
lado dejaba a la configuración de los protocolos sin efecto justo en la
pantalla donde se carga.

En el modal se elige primero el **protocolo** y después la **plantilla**, en
ese orden y en el mismo bloque, arriba del formulario: las dos cosas deciden
qué campos se piden, y la segunda depende de la primera. El valor por defecto
de la plantilla es *los campos del protocolo*, así que un consultorio que nunca
configuró nada ve exactamente lo de siempre.

### Una plantilla propia solo sirve para los protocolos que admite

`protocolosQueAdmite` contesta con qué protocolos se puede cargar usando una
lista de campos, y el piso es **el mismo** que el de la personalización del
protocolo: si un juego de campos no sirve para configurar un protocolo, tampoco
sirve para cargar con él. Dos reglas para lo mismo se separan sin que nada
falle.

La consecuencia práctica: la plantilla de 6 pliegues sirve para 2 componentes y
**no** para 5 —con ella la medición saldría sin el fraccionamiento, que es lo
único que ese protocolo viene a contestar—. En el desplegable las incompatibles
aparecen **deshabilitadas y con el motivo**, no escondidas: desaparecer de la
lista al cambiar de protocolo se lee como que la plantilla se borró. Y si ya
había una elegida que deja de servir al cambiar de protocolo, se vuelve sola a
«los campos del protocolo».

Ninguna plantilla válida se queda sin protocolo: el piso de 2 componentes es el
mismo que el de la entidad (resolver algo), y todo lo que resuelve las 5 masas
resuelve también Faulkner y Yuhasz, porque sus seis pliegues están entre las 21
medidas de Kerr.

El gestor de plantillas lo dice mientras se arma la plantilla («Se puede usar
con: …»), para que nadie se encuentre con una deshabilitada en el modal sin
entender por qué.

### El protocolo es del diálogo, no del formulario

`FormularioMedicion` lo recibe por **prop**. Vivía en su estado de
`react-hook-form`, y ahí no se podía ofrecer una lista de plantillas que
dependiera de él: el desplegable está afuera. El protocolo sigue guardándose en
la medición igual que antes, y al editar una se arranca con el suyo —no con el
de la última carga, que reordenaría la planilla y escondería medidas que esa
medición sí tiene—.

### Por qué los dos protocolos tienen pisos distintos

Una plantilla propia puede quedarse en los 4 pliegues de Faulkner: es un juego
de campos más corto y nada más. Un **protocolo** no, porque su razón de ser es
el resultado que promete. El de 5 componentes sin las 21 medidas de Kerr no es
un protocolo más chico: es el de 2 componentes con otro nombre. El de 2
componentes sin ninguna ecuación de grasa produce mediciones sin un solo
porcentaje.

Por eso la regla está partida en dos (`dominio/entidades/protocolosMedicion.ts`,
`faltaParaElProtocolo`):

- **5 componentes**: las medidas de `REQUERIDOS_CINCO_MASAS` no se pueden
  destildar — el editor las deja deshabilitadas, con el motivo en el `title`—.
  Lo que sí se saca es lo que el fraccionamiento no usa: cintura máxima,
  cadera, muslo medial, brazo flexionado, bicipital, cresta ilíaca.
- **2 componentes**: no hay campo bloqueado, porque el piso depende de la
  COMBINACIÓN. Se valida en vivo y el guardado queda deshabilitado con el
  motivo escrito.

### El panel de alcance

Al costado del selector de campos, `PanelAlcanceCampos` parte en dos lo que se
puede y lo que **no** se va a poder calcular, y cada pérdida nombra las medidas
que la recuperan. Sin eso, destildar la cresta ilíaca hacía desaparecer a
Durnin & Womersley sin decir que había sido ESE campo, y el efecto recién se
notaba al cargar la primera medición.

Las dos mitades salen de `estadoDeResultados`, que lee la MISMA
`REQUISITOS_RESULTADO` que valida el servidor: lo que el panel promete mientras
se destilda es lo que después se acepta. Withers figura dos veces en esa tabla
(una por sexo) y el panel lo colapsa en una línea, aclarando el alcance; cuando
no sale por ningún camino, lo que informa como faltante es el de la variante a
la que menos le falta.

### Lo que el vocabulario de plantillas no nombra

El peso, los kg de grasa de la fórmula propia y la dinamometría **no** están en
`CAMPOS_PLANTILLA`, así que no se filtran: se muestran siempre. Filtrarlos por
una lista que nunca los nombra los escondía para siempre, y con el peso eso era
grave —es el único campo obligatorio, y sin él en pantalla el formulario no se
podía enviar—.

### Qué pide cada protocolo de fábrica

`CINCO_COMPONENTES` es el perfil ISAK entero, porque lo necesita entero.

`DOS_COMPONENTES` es lo mínimo para lo que ESE protocolo contesta: **los
pliegues que alimentan alguna ecuación vigente** —hoy los 6 de la planilla más
el bicipital y la cresta ilíaca, sin los cuales Durnin & Womersley no sale
nunca y Withers solo sale en mujeres—, los **tres perímetros que se siguen por
clínica** (cintura mínima, cintura máxima y cadera) y la **talla**, que es lo
que da el IMC. Los diámetros óseos y los demás perímetros quedan destildados:
solo sirven para el fraccionamiento, que en 2 componentes no se calcula. La
carga de todos los días pasa de 25 campos a 12.

La lista de pliegues se **deriva** de `REQUISITOS_RESULTADO` en vez de
escribirse a mano: si mañana entra una ecuación que pide el axilar medio, ese
pliegue aparece solo. Escrita a mano se quedaba vieja sin que nada fallara —el
pliegue simplemente no se pedía—.

### El protocolo de una medición IMPORTADA se deduce

Es la única deducción del módulo, y tiene motivo: en la carga a mano el
profesional elige el protocolo antes de empezar, pero una planilla trae años de
consultas y preguntárselo columna por columna es impracticable. El dato ya está
en la columna: si trae las 21 medidas del fraccionamiento de Kerr, esa consulta
se tomó con el perfil ISAK completo.

`protocoloSegunMedidas` lo contesta y lo aplica `ImportarMediciones` cuando la
columna no declara protocolo. Antes entraban **todas** como de 2 componentes
—el default de la entidad—, así que una proforma ISAK importada abría el
dashboard en el modelo equivocado aunque el fraccionamiento se calculara igual.

Mira las medidas **cargadas**, no los campos pedidos: un campo presente pero
vacío no cuenta. La tabla de revisión muestra el protocolo de cada columna con
la misma función, así que completar a mano un diámetro que la IA no leyó pasa
esa consulta a 5 componentes a la vista.

Del lado del prompt, la **regla 11** de `MEDICIONES` existe para esto: le pide
al modelo que no se saltee las filas que solo aparecen en las proformas (los
seis diámetros, los perímetros de cabeza, antebrazo, tórax, muslo máximo y
pantorrilla, la talla sentado), que son justamente las que definen la
diferencia. El protocolo NO se lo pide al modelo —se cuenta en código—: lo que
depende de él es que las medidas lleguen.

### Dónde se guarda

Dos columnas `String[]` en `configuracion_consultorio` (migración 70).
**Vacío = la fila es anterior a la migración**, y el juego de fábrica se
resuelve al LEER (`camposDelProtocolo`, en el repositorio), no con un backfill:
así la lista de medidas no queda congelada en SQL, donde nadie la mantendría al
sumar un sitio.

## Objetivos: uno por FORMA DE MEDIR

El módulo mide lo mismo de tres maneras, y la meta se plantea sobre una de
ellas. El selector de variable está agrupado por esas tres —`origenDeVariable`
en `ObjetivoComposicion.ts`— porque en una lista plana de diecisiete, «masa
adiposa» (Kerr, anatómico) y «masa grasa» (regresión contra densitometría) se
eligen a ciegas, y son números de modelos distintos que no se comparan entre sí.

- **Fraccionamiento en 5 masas**: las cinco, en kg y en porcentaje. Hasta la
  migración 40 solo la adiposa y la muscular eran objetivables; las otras tres
  se calculaban y se dibujaban en el donut sin poder plantearse como meta.
- **Grasa por pliegues**: `PORCENTAJE_GRASA` y `MASA_GRASA_KG`, cada una atada
  a UNA ecuación.
- **Básicos e índices**: peso, IMC, cintura, Σ6. No dependen de ningún modelo.

**La unicidad es por (paciente, variable, ecuación)**, no por variable. Seguir
el % graso por Yuhasz y por Durnin & Womersley son dos metas sobre dos formas
de medir, no una contradicción; antes, plantear la segunda pisaba la primera.
Una variable de grasa se agota en el selector recién cuando todas sus
ecuaciones tienen meta.

Son **dos índices únicos** y no uno (migración 40), por la misma particularidad
de Postgres que ya mordió en los recordatorios: los NULL no colisionan entre
sí. El compuesto cubre las metas con ecuación; un índice **parcial**
(`WHERE metodoGrasa IS NULL`) cubre las que no la llevan. Sin el segundo se
podrían cargar diez metas de peso para el mismo paciente y nada fallaría hasta
que el dashboard tuviera que elegir cuál dibujar.

Por eso el `guardar` del repositorio es un upsert **por id** y no por la clave
de negocio: Prisma no admite null en una clave compuesta única. Quién decide si
la meta se replantea o se crea es el caso de uso, que busca la combinación
primero.

## Σ 6 y Σ 8

`sumatoria6Pliegues` es la de la planilla habitual. `sumatoria8Pliegues` suma
el bicipital y la cresta ilíaca: existe porque esos dos sitios, cuando se
miden, no aparecían en **ningún** número de la pantalla —los usan Withers y
Durnin & Womersley por dentro, pero eso no se veía— y parecía que cargarlos no
servía para nada.

## La serie de grasa: línea de tiempo, y todas las ecuaciones a la vez

Las tres series históricas del dashboard (`TarjetasEvolucion`) no se dibujan
igual, y la diferencia no es estética:

| Serie                  | Forma   | Por qué                                                                                                    |
| ---------------------- | ------- | ---------------------------------------------------------------------------------------------------------- |
| Masas (kg) y Score-Z   | Barras  | Son cinco magnitudes que se reparten un total. Las mediciones son eventos discretos y espaciados, y el eje X es una ranura por consulta. |
| Porcentaje graso       | **Líneas, eje de tiempo** | Es una magnitud sola, y lo que se lee es la *pendiente*.                                      |

En la serie de grasa el eje X es **tiempo de verdad** (`type="number"`,
`scale="time"`, marcas en las fechas medidas): cada punto se ubica en su fecha
y no en una ranura de igual ancho, así que la pendiente entre dos consultas es
la velocidad real del cambio y dos meses de hueco se ven como dos meses de
hueco — que es la objeción que las barras resolvían no dibujando la línea. Es
además la misma forma que el PDF ya usaba para esta serie, así que pantalla y
papel dejaron de contradecirse.

### El filtro tiene dos posiciones, y son dos lecturas

Arranca en **todas las ecuaciones**, una línea por cada una:

- **Todas** muestra la dispersión. Yuhasz, Faulkner, Withers y Durnin &
  Womersley se validaron en poblaciones distintas y dan números distintos para
  el mismo paciente; el ancho de la banda, y que se mueva entera, es lo que
  dice cuánto de una bajada es del paciente y cuánto de la fórmula elegida.
- **Una** es el seguimiento, que es como venía funcionando: la misma fórmula de
  punta a punta. El aviso debajo del gráfico cambia con la posición, porque la
  advertencia también cambia.

Las series nunca se promedian ni se mezclan en una línea. El color de cada
ecuación sale de su **índice en `METODOS_GRASA`** (`colorDeEcuacion` en
`paleta.ts`), no de su posición en el gráfico: filtrar a una sola no repinta a
las que quedan.

El filtro es el MISMO en las dos pantallas —el dashboard del profesional y
«Mi composición» del paciente— y vive en un solo lugar (`SelectorEcuacion.tsx`:
el desplegable, `ecuacionesDeLaSerie` y `ecuacionesElegidas`). Cuando el
paciente pregunta por un número, los dos tienen que poder poner la pantalla en
el mismo estado; con una copia por pantalla, una podía ofrecer un filtro que la
otra no.

**No hay que filtrar por las ecuaciones activas del consultorio**: los
resultados llegan ya recortados desde `ObtenerComposicionCorporal`, que oculta
una ecuación desmarcada incluso en mediciones viejas que la tenían calculada.
Todo lo que mira `grasaPorPliegues.resultados` —los dos dashboards, las dos
pantallas y los tres PDF— hereda ese recorte sin repetirlo.

### Lo que sostiene que seis líneas se puedan leer

- La rampa es la de los pliegues —las seis ranuras categóricas del sistema, en
  ese orden—, validada con el validador de dataviz sobre el par-a-par de
  vecinos, que es el que corresponde a líneas. En el tema claro tres de los
  seis tonos no llegan a 3:1 contra la superficie: por eso **la leyenda lleva
  el último valor de cada ecuación escrito al lado**. El número nunca depende
  solo del color de una línea de 2px.
- Un hueco es un hueco: una consulta que no resuelve esa ecuación va como
  `null` y la línea se **corta** (`connectNulls={false}`). Unirla con la
  siguiente insinuaría un valor que nadie midió.
- El eje Y está recortado al rango medido ±1, no desde cero. Son líneas y el
  recorrido vive entre 10 % y 30 %; desde cero queda aplastado contra el techo.
- El tooltip lista **todas** las ecuaciones de esa fecha, con sus kg, y no solo
  la línea señalada: con seis series casi pegadas, apuntarle a una es
  imposible, y la distancia entre ellas es justamente lo que se viene a leer.

## La pestaña de mediciones

Una **tarjeta por consulta**, no una columna por consulta. La planilla de
columnas mostraba las ~40 filas de todas las mediciones a la vez y crecía hacia
el costado: a partir de la cuarta consulta había que hacer scroll horizontal
para llegar a la última, que es la que se mira. Y la unidad de trabajo del
profesional es LA CONSULTA —qué se midió ese día y cómo quedó—, no la fila
«peso a lo largo del tiempo», que para eso están los gráficos de evolución.

La tarjeta muestra cuatro cifras (peso con su delta, grasa de la ecuación
destacada, IMC y Σ6) y la ficha completa se abre al clickearla, con la
diferencia contra la consulta anterior al lado de cada medida. La definición de
las filas vive en `filasMedicion.ts` y la leen las dos vistas: mientras estuvo
adentro del componente de la tabla, agregar una medida al formulario podía
dejar a una de las dos sin mostrarla, en silencio.

## Importar una planilla de evolución

El seguimiento del profesional venía en un Excel: **una columna por consulta**
(encabezada por su fecha), una fila por medida y años de historia. Cargarlo a
mano son 20 medidas x 10 fechas por paciente, así que la planilla se sube, una
IA la lee y se importan TODAS las consultas de una vez
(`ImportadorMediciones`, botón «Importar planilla» de la pestaña).

Por qué la lee una IA y no un parser: **cada planilla es distinta**. Los
rótulos son los que el profesional escribió («P TRICIPITAL», «C Brazo»,
«Cintura Máxima»), la orientación puede estar dada vuelta, las unidades a veces
están en una leyenda al pie y las filas de derivados conviven con las de datos.
Un parser de posiciones fijas anda con una planilla y falla con la siguiente.

Las cuatro reglas que sostienen esto:

- **La planilla se serializa POSICIONALMENTE, no como texto plano**
  (`planillaATexto` en `documentoParaLLM.ts`). Cada celda viaja con su
  referencia (`B5: 87.3`), porque el dato de una planilla de evolución está en
  el cruce de fila con columna; de una fórmula va el **resultado cacheado** y
  las fechas se pasan a ISO. Un `.xls` anterior a 2007 se rechaza con un
  mensaje que dice qué hacer, igual que el `.doc`.
- **Los derivados NO se importan**: la sumatoria de pliegues, los kg bajados y
  el % de grasa los recalcula el dominio en cada lectura, y una planilla vieja
  puede traerlos con otra ecuación. Se le pide al modelo que ignore esas filas.
  `kgGrasa` es la excepción: es un dato que el profesional carga a mano.
- **Nada se persiste hasta que el profesional confirma.** La IA precarga la
  tabla de revisión —fecha y peso editables, el resto desplegable— y cada
  consulta se corrige o se descarta. Es la misma política que la lectura de una
  ficha de alta, y por el mismo motivo: lo que sale de un modelo no entra solo
  al historial de una persona.
- **La importación NO es todo-o-nada** (`ImportarMediciones`). Una fecha que ya
  tenía medición se informa como DUPLICADA y no pisa nada; una medida fuera de
  rango, como RECHAZADA. El resto entra igual: una planilla de años no puede
  caerse entera por una columna. Solo un fallo de infraestructura corta el
  lote — se propaga en vez de anotarse como rechazo de dato.

Las columnas sin peso se descartan al normalizar la respuesta: la entidad lo
exige y una columna con dos pliegues sueltos no se puede registrar. Las que no
tienen fecha sí llegan a la revisión, desmarcadas, para que el profesional la
complete.

## Qué índices se muestran, y cuáles no

La tarjeta «Índices» (`TarjetaIndices`) y su gemela del PDF
(`DashboardComposicionPdf`) muestran los mismos y **en el mismo orden**: IMC,
cintura/cadera con su riesgo, Σ de pliegues, músculo/óseo y adiposo/muscular.

`calcularIndices` computa además **índice córmico**, **superficie corporal**
(Du Bois) e **índice muscular/lastre**, que salieron de las dos vistas porque
no se usan en la consulta: ninguno cambia una conducta ni entra en un objetivo,
y en una tarjeta que se lee de un vistazo cada fila de más cuesta.

Siguen calculándose —son baratos, están cubiertos por tests y el cálculo es la
referencia contra la planilla del profesional—: lo que se sacó es la fila de la
pantalla y la del PDF. Volver a mostrarlos es agregar una `Fila` en cada uno de
los dos archivos; sacar solo uno de los dos deja la pantalla y el PDF diciendo
cosas distintas de la misma medición.

## Layout del dashboard

El perfil Phantom crece con la cantidad de medidas cargadas y con el ISAK
completo es la pieza más alta de la pantalla. Va **solo en su columna**, con la
somatocarta, los índices y la energía apilados al lado; `xl:items-start` impide
que la columna corta se estire hasta igualar a la larga. Cuando la somatocarta
compartía fila solo con el Phantom, quedaba con media pantalla de blanco
debajo.

## Al tocar esto

- Una ecuación nueva se suma en `METODOS_GRASA`, `DEFINICIONES_METODO` y
  `porcentajeDe`, **y además** en `REQUISITOS_RESULTADO`
  (`PlantillaAntropometrica.ts`): sin lo último, la plantilla no la promete y
  el test de coherencia con el cálculo real no la cubre.
- Un sitio nuevo toca schema + migración, `MedidasComposicion`,
  `ETIQUETAS_MEDIDA`, la entidad, `CAMPOS_PLANTILLA`, los DTOs, el mapeador de
  Prisma, `GRUPOS` del formulario y `filasMedicion.ts`. El test de mapeadores
  (`mapeadores.evaluacion.test.ts`) da a cada medida un valor único justamente
  para cazar un cruce entre campos vecinos. Si además tiene que pedirse desde
  el vamos, va en `CAMPOS_PROTOCOLO_POR_DEFECTO`: los consultorios que nunca
  configuraron los protocolos lo reciben solos, los que sí lo tienen que
  tildar.
- El selector de campos de la configuración es UNO
  (`SelectorCamposMedicion`), compartido por los dos protocolos y por las
  plantillas, igual que el panel de alcance. Con una copia por editor, el
  primer arreglo se aplica en uno solo.
- Una serie histórica **nunca** cambia de modelo ni de ecuación. Por eso los
  valores del enum `MetodoGrasa` solo se agregan, nunca se renombran ni se
  reordenan. Lo mismo vale para `VariableComposicion`: el orden de un enum de
  Postgres es su orden de comparación y las metas ya cargadas lo usan.
- Un sitio nuevo entra solo a la importación por planilla si está en
  `CAMPOS_PLANTILLA`: de ahí salen tanto el esquema JSON que se le pide al
  modelo como los campos editables de la revisión.
- Una variable objetivable nueva va en `VARIABLES_COMPOSICION`,
  `RANGOS_VARIABLE`, `ORIGEN_DE_VARIABLE`, el `switch` de `valorDeVariable` y
  —si apunta a una de las cinco masas— en `MASA_DE_VARIABLE` de
  `TortaMasasConObjetivos`. Las tres primeras rompen la compilación si se
  olvidan; las dos últimas no.

## Los dos PDF, y por qué los dos llevan gráficos

| PDF                            | Quién lo baja   | Qué trae                                   |
| ------------------------------ | --------------- | ------------------------------------------ |
| `MedicionAntropometricaPdf`    | El **paciente** | Su medición: reparto del peso, evolución y la planilla completa |
| `DashboardComposicionPdf`      | El profesional  | El dashboard técnico: Phantom, somatocarta, índices |

El del paciente era solo la planilla: cuarenta números crudos en una tabla,
que es justo lo que `ComposicionPaciente` evita mostrarle sin interpretación.
Ahora arranca con los mismos dos gráficos que mira en pantalla —cómo se reparte
su peso y su evolución— y la planilla queda debajo, para quien la quiera.

El reparto sale del **fraccionamiento de Kerr** cuando está, que es la
partición completa; si no hay, de la ecuación de pliegues destacada, que reparte
el peso en dos (graso y no graso). Sin ninguno de los dos no se dibuja: una
barra de un solo color no dice nada.

La serie de evolución llega **hasta esa medición**, no hasta la última: el PDF
de una medición de marzo con la curva completa hasta hoy diría cosas que en
marzo no se sabían, y dos descargas del mismo PDF en fechas distintas no
coincidirían.

### En papel, una sola curva y las demás tabuladas

En pantalla las seis ecuaciones se dibujan juntas porque hay un tooltip donde
apoyarse: se apunta a una fecha y salen los seis valores. **El PDF no tiene
dónde apoyarse**, así que seis curvas casi pegadas serían un ovillo. El PDF del
paciente resuelve el mismo pedido en dos piezas:

- **Curva** de una sola ecuación, la principal de esa medición, de punta a
  punta.
- **Tabla** con las OTRAS ecuaciones activas y su valor —% y kg— en esa
  medición nada más. Es lo que las pone en contexto sin prometer una serie que
  no se puede leer.

La curva se fija a UNA ecuación para toda la serie. Antes tomaba la destacada de
CADA consulta, y como la destacada se elige medición por medición, una serie
podía saltar de Faulkner a Yuhasz en el medio y dibujar un escalón que el
paciente no vivió — exactamente lo que el filtro de pantalla evita.

Los gráficos los dibuja `infraestructura/pdf/graficosPdf.tsx`, compartido por
los dos documentos. react-pdf tiene su propio renderer —los componentes de
pantalla son SVG del DOM y no se pueden reusar—, así que ahí viven las dos
formas de dibujar que sirven: `View` con `flex` proporcional para las barras y
`Canvas` (el lienzo vectorial de PDFKit) para las trayectorias en el plano.
Estaban adentro del PDF del dashboard cuando era el único con gráficos;
copiarlas al segundo habría dejado dos evoluciones del mismo gráfico.

Cada gráfico va **acompañado de sus números exactos** —la leyenda de la barra,
el valor sobre cada punto, la tabla debajo de la evolución—, nunca los
reemplaza: con muchas mediciones el gráfico saltea etiquetas para que no se
pisen, y el número tiene que estar en algún lado.

## Los resultados de la planilla, partidos por modelo

La planilla de cada medición (la ficha, el PDF y el Excel leen la misma
definición, `aplicacion/servicios/evaluacion/filasMedicion.ts`) ya no tiene un
único bloque «Resultados calculados». Son tres, en este orden:

1. **Resultados · 5 componentes (Kerr)** — las cinco masas.
2. **Resultados · 2 componentes (grasa por pliegues)** — una fila por ecuación
   visible.
3. **Otros resultados** — IMC, índice cintura/cadera, somatotipo, metabolismo
   basal, gasto energético y los kg de grasa cargados a mano: lo que no sale de
   ninguno de los dos modelos.

Juntos, la masa adiposa de Kerr y el % graso de una ecuación quedaban a dos
renglones como si fueran el mismo número medido dos veces, y son dos modelos
que no se comparan (ver arriba).

## Fuerza de prensión

La dinamometría de mano se llama **fuerza de prensión** (apretar), no «de
presión». La migración 52 la nombró bien en su comentario pero las columnas
nacieron como `fuerzaPresion…`; la 72 las renombra a `fuerzaPrensionDerecha` /
`fuerzaPrensionIzquierda` y el código y las etiquetas acompañan. La misma
migración corrige el texto de los prompts personalizados de lectura de
planillas que nombraban las claves viejas.

## La evolución del % graso abre en la ecuación favorita

El gráfico de evolución del porcentaje graso (dashboard del profesional y «Mi
composición» del paciente) muestra **una ecuación por vez**, y arranca en la
**favorita**: la que el profesional destacó («Ecuación de grasa a destacar»)
en la medición más reciente que destaca alguna. Sin ninguna destacada, la
primera que la serie resolvió. La regla vive una vez en `ecuacionFavorita`
(`componentes/antropometria/SelectorEcuacion.tsx`) y en el selector se marca
con ★. Comparar todas juntas sigue disponible, como la última opción.

Se toma de la última medición que DESTACA una y no de la última a secas: una
consulta cargada sin elegir ecuación no es un cambio de favorita.

## Masa grasa en Progreso

La pestaña Progreso muestra, además del peso, la evolución de la **masa grasa
en kg** del período (`componentes/tracking/TarjetaMasaGrasa.tsx`), con una
fuente por vez como el peso: **Antropometría** (predeterminada) o
**Bioimpedancia**. De la antropometría se usa una sola ecuación para toda la
serie, la favorita, elegida sobre la historia completa para que cambiar de
período no cambie de ecuación. Es solo del lado del profesional: las dos
fuentes se leen por procedimientos suyos.
