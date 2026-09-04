# Historia clínica, evoluciones y alta desde un documento

Tres funciones que comparten la misma pieza —leer un documento con IA— y la
misma regla: **nada se guarda solo**. La IA precarga un formulario y el
profesional revisa y confirma.

## Por qué la IA no persiste nada

Es la decisión de la que cuelga todo lo demás. Lo que sale de un modelo entra a
la historia clínica de una persona real, así que:

- Los interpretadores **LANZAN si no hay IA configurada**, no degradan a un
  stub. Mismo criterio que `ResumidorConsultaLLM` y que las grabaciones: un
  dato de demostración guardado en una ficha es un registro clínico inventado.
- Todo lo que devuelve el modelo se **revalida en el adaptador** aunque el
  esquema JSON ya lo haya pedido (`normalizarFicha`). El esquema es una
  instrucción al modelo, no una garantía. Un email que no tiene forma de email,
  una fecha que no es `YYYY-MM-DD`, un sexo fuera del enum o una alerta con un
  tipo desconocido se descartan en silencio en vez de viajar a la pantalla.
- El **email nunca se deduce del nombre**: tiene que estar escrito en el
  documento.

## Leer un documento: `documentoParaLLM.ts`

Un solo lugar convierte un archivo del bucket en el bloque que se le manda al
modelo, para que las dos funciones acepten exactamente los mismos formatos
(estaban separadas y el Word andaba en una sola).

| Formato                  | Cómo viaja                        | Por qué                                                                                       |
| ------------------------ | --------------------------------- | --------------------------------------------------------------------------------------------- |
| JPG / PNG / WEBP         | Imagen en base64                  | El modelo la mira.                                                                              |
| PDF                      | Documento en base64               | Conserva la maquetación. Una ficha clínica suele ser una TABLA, y en texto plano se pierde qué valor va con qué etiqueta. |
| Word `.docx`             | Texto extraído con `mammoth`      | Ningún modelo lee un `.docx`: es un zip con XML adentro.                                        |
| Word `.doc` (anterior a 2007) | **Se rechaza**               | Es un binario propietario, NO un `.docx` renombrado. Mandar sus bytes devolvería campos inventados; el error dice que hay que guardarlo como `.docx` o PDF. |

Un `.docx` sin texto (un escaneo pegado adentro) también se rechaza: mammoth
devuelve vacío y el modelo no tendría nada que leer.

### El esquema entero viaja al modelo

`ProveedorLLMOpenRouter` **serializa el JSON Schema completo dentro del system
prompt**. Es la pieza de la que depende toda la extracción, y por qué:
OpenRouter no acepta `response_format` en varios modelos, así que el formato se
pide por prompt. Antes se listaban solo las claves de PRIMER NIVEL
(«paciente, historiaClinica, alertas, antropometria…»), sin decirle nunca al
modelo qué campos van adentro de cada una. El modelo inventaba los nombres
internos, `normalizarFicha` —que lee claves exactas— los descartaba, y la ficha
volvía medio vacía **sin un solo error a la vista**.

El proveedor de Anthropic no tiene el problema: manda el esquema en
`output_config.format`.

### Esfuerzo alto, y un cajón de sastre

Dos cosas que la extracción necesita y no son obvias:

- **`esfuerzo: "alto"`** (`output_config.effort` en Anthropic, `reasoning.effort`
  en OpenRouter — los dos adaptadores lo implementan; que uno lo ignorara hacía
  que subirlo no cambiara nada). El resto de la
  app corre en `bajo`, que alcanza para lo conversacional. Leer una planilla
  clínica —a veces escaneada, a veces manuscrita— y repartirla en campos no es
  una tarea de una pasada: con esfuerzo bajo el modelo devolvía los campos
  obvios y dejaba media ficha sin extraer.
- **`otrosDatos`**, el cajón de sastre. El esquema JSON es cerrado
  (`additionalProperties: false`), así que sin un lugar donde ponerlo, todo lo
  que la ficha traía y no era un campo conocido —obra social, DNI, ocupación,
  domicilio, el rótulo propio de esa planilla— se perdía en silencio. Lo que
  cae ahí entra como campo personalizado SUELTO del paciente, con el rótulo del
  documento como etiqueta.

El prompt también deletrea dos cosas que el modelo erraba solo: cómo separar
**nombre y apellido** (una ficha escribe "Apellido y Nombre: Pérez, Ana", y lo
que va antes de la coma es el apellido) y que **el sexo** llega como "M", "F",
"Masc", "Varón" o "Mujer" y hay que mapearlo al enum.

## Evoluciones de control

La historia clínica se carga UNA vez y dice de dónde viene el paciente. La
**evolución** se carga en cada consulta y dice cómo viene:

```
12/07/2024
Cumplimiento dieta: 50%. 10 días no respetó por viaje.
Entrenamiento: 3 veces pesas. Mejoró las cargas.
Deposiciones: normales o constipada.
Orina: clarito. Sí toma agua, pero podría mejorar. No tiene calambres.
Descanso: 7 hs.
Indispuesta: no.
Se percibe: igual. No tomó nada nuevo.
```

Siete campos fijos (`CAMPOS_EVOLUCION`), más los personalizados del
consultorio, más los sueltos de esa consulta. Se cargan a mano en Evaluación →
Evoluciones, o **salen del documento que se sube en la historia clínica**.

### Por qué son TEXTO libre y no números

«50%» sin «10 días no respetó por viaje» es la mitad del dato, y el motivo es
justamente lo que cambia la conducta de la próxima consulta. Un enum de tres
opciones tampoco tiene dónde poner «normales o constipada», que es lo que el
paciente efectivamente contesta. Lo cuantitativo del seguimiento ya vive en
otro lado: el peso y los pliegues en `Antropometria`, la adherencia día a día
en el diario del paciente.

### Es la contracara de la antropometría, y va aparte

Las dos son «una por consulta», las dos se ordenan por fecha y las dos tienen
`@@unique([pacienteId, fecha])`. Pero una guarda lo que se **midió** y la otra
lo que el paciente **contó**, se cargan en momentos distintos —la medición con
el calibre en la mano, la evolución hablando— y una consulta puede tener
cualquiera de las dos sin la otra.

El unique no es decorativo: es lo que hace que **volver a leer el mismo
documento no duplique el seguimiento entero**. Pasa, porque se sube de nuevo
para corregir un campo.

### Se leen del MISMO documento que la historia

`InterpretadorHistoriaClinicaLLM` devuelve ahora `{ campos, evoluciones }` en
una sola llamada. El cuaderno del profesional suele ser un archivo único —la
ficha adelante, las consultas atrás—, así que partirlo en dos llamadas costaría
el doble para leer lo mismo.

El prompt lleva el ejemplo de arriba **literal**: es lo que le enseña al modelo
que una fecha seguida de esos rótulos es UNA evolución, y que la fecha
siguiente empieza otra. Y le dice explícitamente que copie el texto entero, que
no lo resuma ni lo convierta en un número.

Lo leído aparece en una tarjeta de revisión debajo del subidor
(`RevisionEvolucionesLeidas`): se marca qué se importa y se corrige la fecha
—la identidad de la consulta—, y recién ahí se guarda. Lo único editable ahí es
la fecha; el contenido se corrige después desde la evolución ya cargada, que es
donde está el formulario completo.

**La importación no es todo-o-nada** (`ImportarEvoluciones`), por lo mismo que
la de mediciones: una fecha ya cargada se informa como DUPLICADA y no pisa
nada, una evolución vacía como RECHAZADA, y el resto entra igual. Solo un fallo
de infraestructura corta el lote.

Una evolución **sin fecha** llega igual a la revisión, desmarcada: descartarla
perdería una consulta que el documento sí traía, y la fecha la completa el
profesional.

## Campos personalizados

Hay **dos listas** —una para la historia clínica y otra para las evoluciones—
y en cada una conviven **dos clases a propósito**, que se guardan igual:

- **Del consultorio** (`CampoHistoriaClinica`, una fila por inquilino).
  Se declaran en Configuración → Historia clínica y aparecen en la historia de
  TODOS los pacientes. Son los que se pueden comparar entre fichas. Mismo modelo
  que `PlantillaAntropometrica`.
- **Sueltos**, cargados en la ficha de UN paciente. Para lo que aparece una vez
  y no justifica sumárselo a los otros 300.

Los valores viven en `historias_clinicas.camposPersonalizados` y en
`evoluciones.camposPersonalizados` (JSONB), como `[{ clave, etiqueta, valor }]`.

**Las dos listas van separadas** (`CampoHistoriaClinica` y `CampoEvolucion`)
porque describen cosas distintas: «antecedentes familiares» no se pregunta
consulta a consulta, y «horas de pantalla esta semana» no se congela en el
alta. Unirlas obligaría a que cada campo declarara en cuál de los dos
formularios aparece: la misma separación, con un flag y una fuente más de
error. La pantalla que los administra sí es una sola
(`GestionCamposPersonalizados`), porque la mecánica es idéntica.

La derivación de la clave (`derivarClave`) vive en
`dominio/servicios/claveCampo.ts` y la comparten las dos: con dos copias, el
mismo nombre daría claves distintas según en qué formulario se lo definió.

### Las tres reglas que sostienen los datos ya cargados

1. **`clave` es estable y se deriva del nombre UNA vez.** Renombrar un campo no
   la toca (el repositorio deja `clave` fuera del `update` a propósito). Si se
   moviera, renombrar "Adherencia" a "Adherencia previa" vaciaría el campo en
   todas las fichas que ya lo tenían.
2. **El valor guarda su `etiqueta`, no solo la clave.** Por eso un campo cuya
   definición se borró se sigue mostrando con su nombre en cada ficha: es
   información clínica escrita, y no puede desaparecer porque alguien reordenó
   un formulario en Configuración. Mismo criterio que `AsignacionPlan.nombrePlan`.
3. **Borrar la definición NO borra los valores.** `EliminarCampoHistoriaClinica`
   saca el campo del formulario; lo cargado queda.

La clave lleva un sufijo aleatorio de 8 caracteres: sin él, "Suplementos" y
"suplementos!" colisionarían y los dos campos escribirían sobre el mismo valor.

### El invariante de la historia mira los dos conjuntos

`HistoriaClinica` exige al menos un campo con contenido. Ese chequeo cuenta
también los personalizados: una historia cargada enteramente con campos del
consultorio es una historia con contenido, y antes se habría rechazado.

## Alta de paciente desde una ficha

`/dashboard/pacientes` → **Desde documento**.

1. Se sube la ficha (PDF, `.docx` o foto). El archivo queda **huérfano**: el
   paciente todavía no existe, y el arco de dueños de `archivos` ya admite el
   huérfano temporal (migración 34).
2. `InterpretarFichaPaciente` lee el archivo y le describe al modelo los campos
   personalizados del consultorio para que también los busque. **No persiste
   nada.**
3. El formulario queda precargado con lo que se encontró: datos del paciente,
   historia clínica, alertas alimentarias, medición inicial y laboratorios. Cada
   bloque se puede descartar antes de guardar.
4. `CrearPacienteDesdeFicha` da de alta al paciente con su cuenta y crea los
   asociados.

### Por qué precarga en vez de crear solo

El email es **obligatorio** en la entidad `Paciente` (es con lo que el paciente
inicia sesión) y una ficha en papel casi nunca lo trae, igual que la contraseña
de acceso. Un alta automática tendría que inventarlos o fallar.

### Por qué el archivo huérfano se verifica

`InterpretarFichaPaciente` **rechaza un archivo que ya tiene dueño**. Sin esa
comprobación, pasando el id del archivo de otro paciente se podría leer su ficha
para crear un tercero: una fuga de datos clínicos entre fichas del mismo
consultorio.

### El orden de escritura y las advertencias

Primero el paciente —si eso falla, no se creó nada—; después cada asociado por
separado, cada uno en su propio `try`. Un asociado que no valida devuelve una
**advertencia** y el resto se guarda igual.

No es negligencia: cuando se llega ahí el paciente YA existe, así que una
alergia mal transcripta no puede tumbar el alta entera ni llevarse puesta la
medición y la historia. Las advertencias se muestran una por una en pantalla
para que el profesional sepa qué le falta cargar a mano. Es el mismo criterio
que el email de bienvenida en `ServicioPaciente.crearPaciente`.

Al terminar, el documento leído se vincula a la ficha del paciente: es la fuente
de lo que se cargó, y sin eso quedaría huérfano en el bucket hasta la limpieza.

## Dónde vive cada cosa

| Pieza                                          | Qué hace                                        |
| ---------------------------------------------- | ----------------------------------------------- |
| `infraestructura/ia/documentoParaLLM.ts`       | Archivo del bucket → bloque para el modelo      |
| `infraestructura/ia/InterpretadorHistoriaClinicaLLM.ts` | Los 7 campos, para un paciente que ya existe |
| `infraestructura/ia/InterpretadorFichaPacienteLLM.ts`   | La ficha completa de un paciente nuevo    |
| `dominio/entidades/CampoHistoriaClinica.ts`    | La definición del consultorio (clave estable)   |
| `dominio/entidades/HistoriaClinica.ts`         | Los valores, con su etiqueta                    |
| `casos-de-uso/pacientes/InterpretarFichaPaciente.ts`  | Lee y sugiere (no persiste)              |
| `casos-de-uso/pacientes/CrearPacienteDesdeFicha.ts`   | El alta confirmada, con advertencias     |
| `componentes/pacientes/AltaPacienteDesdeDocumento.tsx` | Subir → revisar → confirmar             |
| `componentes/configuracion/GestionCamposPersonalizados.tsx` | Declarar los campos del consultorio (historia y evolución) |
| `dominio/entidades/Evolucion.ts`               | El repaso de una consulta, con sus invariantes  |
| `dominio/entidades/CampoEvolucion.ts`          | La definición del consultorio para evoluciones  |
| `casos-de-uso/evaluacion/ImportarEvoluciones.ts` | El alta en lote, no todo-o-nada               |
| `componentes/evaluacion/EvolucionesPaciente.tsx` | La lista de la ficha, una tarjeta por consulta |
| `componentes/evaluacion/RevisionEvolucionesLeidas.tsx` | Revisar lo que la IA leyó antes de importar |

Migración **43** (`campos_personalizados_historia`): la tabla
`campos_historia_clinica` y la columna JSONB en `historias_clinicas`.
`CampoHistoriaClinica` está en `MODELOS_INQUILINO`.

Migración **47** (`evoluciones_de_control`): las tablas `evoluciones` y
`campos_evolucion`. `Evolucion` y `CampoEvolucion` están en
`MODELOS_INQUILINO`.

## El modelo configurado es el techo

Todo lo de arriba se apoya en el modelo que el consultorio eligió en
Configuración → Integraciones. Un modelo chico y barato completa una ficha
simple pero se queda corto en lo demás: encadenar varias herramientas, razonar
sobre una planilla escaneada o sostener una conversación con contexto. Si la
extracción o el asistente responden pobre y el código ya hace lo que tiene que
hacer, **mirar primero qué modelo está configurado**.
