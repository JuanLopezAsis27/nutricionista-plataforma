# Bioimpedancia

Pestaña de la ficha del paciente, al lado de Antropometría. Se cargan las
mediciones de la balanza de bioimpedancia por fecha, se miran en un dashboard y
se plantean metas sobre ellas (migración 72).

## Qué se carga

Lo que informa el equipo, tal cual:

| Campo                | Unidad | Rango    |
| -------------------- | ------ | -------- |
| Peso (obligatorio)   | kg     | 20–400   |
| Masa muscular        | kg     | 1–150    |
| Porcentaje muscular  | %      | 1–90     |
| Masa grasa           | kg     | 0–200    |
| Porcentaje graso     | %      | 1–75     |
| Grasa visceral       | nivel  | 1–59, entero |

Más la fecha y observaciones. Una medición por paciente y fecha
(`UNIQUE (pacienteId, fecha)`), como la antropometría y la evolución.

Los rangos viven una sola vez en `RANGOS_BIOIMPEDANCIA`
(`dominio/entidades/Bioimpedancia.ts`) y los leen la entidad, el DTO, el
formulario y las metas. Además la entidad rechaza un tejido en kg mayor que el
peso (el error de tipeo típico al pasar los números de la pantalla de la
balanza) y porcentajes que juntos superen el 100 %.

### Grasa visceral: un nivel, no una masa (migración 75)

La balanza no informa la grasa visceral en kg ni en %: la informa como un
**nivel**, un entero de la escala del equipo. Por eso la columna es `INTEGER`
—el resto de la tabla es `DECIMAL`— y el rango lleva `entero: true`, que
respetan la entidad, el DTO (`.int()`), el formulario y las metas: una meta de
nivel 8,5 no se alcanza nunca porque ninguna balanza la muestra.

El rango 1–59 es el de Tanita, la escala más amplia en uso (Omron llega a 30).
Se acepta la más amplia porque el rango está para frenar un error de tipeo, no
para decidir qué equipo usa el consultorio. La base, además, tiene un CHECK que
solo impide el cero y los negativos.

Al no tener unidad, `RANGOS_BIOIMPEDANCIA` la deja vacía y los mensajes se
arman con `describirRangoBioimpedancia` («entre 1 y 59», sin el espacio
colgado). Va en su propio indicador y su propio gráfico, **nunca** junto a la
grasa en kg o %: son magnitudes distintas y compartir eje las haría parecer
comparables.

`GRASA_VISCERAL` se agregó al final del enum `VariableBioimpedancia`
(`ADD VALUE`); como con `MetodoGrasa`, sus valores solo se agregan.

## Por qué es un módulo aparte y no parte de la antropometría

**Es otra fuente y no se mezcla.** La balanza estima la composición por la
resistencia eléctrica del cuerpo —y se mueve con la hidratación, el ayuno, la
hora del día—; el fraccionamiento de Kerr y las ecuaciones de pliegues la
reconstruyen desde medidas anatómicas. Un «% graso» de cada lado son dos
números de dos métodos, igual que dos ecuaciones de pliegues entre sí (ver
`docs/ANTROPOMETRIA.md`). Por eso:

- Son tablas propias (`bioimpedancias`, `objetivos_bioimpedancia`), no
  columnas nuevas de `antropometrias`.
- Las metas son `ObjetivoBioimpedancia`, no variables nuevas de
  `ObjetivoComposicion`: una meta de «% graso» que mezclara consultas de balanza
  con consultas de pliegues dibujaría saltos que son el cambio de método y no
  del paciente.

**Nada es derivado.** Al revés que la antropometría —donde nada derivado se
persiste—, acá el equipo ya calculó la composición y el profesional anota lo
que ve. Los porcentajes se guardan tal cual: recalcularlos desde los kg daría
otro número que el que el paciente vio en la balanza.

## Qué comparte con la antropometría

- **La proyección de metas.** `proyectarMeta` (`dominio/servicios/
  proyeccionComposicion.ts`) es la misma regla para las dos: el progreso se
  mide desde que la meta existe, el estado contra la última medición, el ritmo
  por regresión, y el valor proyectado se descarta si se sale del rango de la
  variable. `proyectarObjetivo` quedó como envoltorio de la antropometría.
- **La tarjeta de la meta** (`componentes/antropometria/TarjetaMeta.tsx`), que
  dibuja esa proyección. Lo propio de la antropometría (los pliegues
  proyectados) entra por `children`.
- **La paleta.** Músculo y grasa usan los colores de la masa muscular y la
  adiposa del dashboard de antropometría: el mismo tejido se lee con el mismo
  color en las dos pestañas.

## El dashboard

- Cuatro indicadores de la última medición (peso, músculo, grasa y grasa
  visceral) con la diferencia contra la anterior.
- La grasa visceral tiene su propio gráfico de barras, al lado del peso y en
  tinta neutra (una sola serie: el color no identifica nada).
- Músculo y grasa en barras (consultas discretas, como en la antropometría),
  en **kg** y en **%**. El **peso** va aparte y como **línea de tiempo**
  (`componentes/comunes/LineaDeTiempo.tsx`): es la serie que se sigue de punta
  a punta, el eje es de tiempo real (las consultas quedan separadas por lo que
  las separa) y no arranca en cero, porque con barras desde cero bajar tres
  kilos sobre ochenta no se ve.
  Kilos y porcentajes van en gráficos separados para no tener un eje doble; el
  peso va solo porque músculo y grasa no lo suman (falta el resto del cuerpo) y
  una barra al lado de ellas se leería como un tejido más.
- La tabla de «Mediciones» es la vista con los números crudos.

## Metas

Una vigente por paciente y variable (`UNIQUE (pacienteId, variable)`);
guardar sobre una variable que ya tiene meta la replantea. El formulario no
ofrece para una meta NUEVA las variables que ya tienen una —se replantean
editando—, y arranca del valor de la última medición.

## Alcance

Es material del profesional: no hay procedimiento de paciente. El portal («Mi
composición») sigue mostrando solo la antropometría.

## Dónde vive

| Capa           | Archivos                                                          |
| -------------- | ----------------------------------------------------------------- |
| Dominio        | `entidades/Bioimpedancia.ts`, `entidades/ObjetivoBioimpedancia.ts` |
| Casos de uso   | `aplicacion/casos-de-uso/bioimpedancia/`                          |
| Servicio       | `aplicacion/servicios/evaluacion/ServicioBioimpedancia.ts` (en la fachada `ServicioEvaluacion.bioimpedancia`) |
| API            | `servidor/routers/evaluacion.ts` (`*Bioimpedancia`)               |
| UI             | `componentes/bioimpedancia/`                                      |
