# Mi perfil

La cuenta propia: la foto y la contraseña. Una sola pantalla, los dos roles.

## Una pantalla, dos rutas

`/dashboard/mi-perfil` (nutricionista) y `/mi-perfil` (portal del paciente) son
dos `page.tsx` de tres líneas que montan el MISMO componente,
`componentes/perfil/MiPerfil`. Las rutas están separadas porque cada rol vive
bajo su propio layout —barra lateral distinta, guarda de sesión distinta— pero
lo que la pantalla hace no depende del rol: la foto y la contraseña son de la
cuenta, y la cuenta es la misma tabla.

Duplicar la pantalla habría duplicado el formulario de contraseña, que es
justamente la parte que no conviene tener escrita dos veces.

Cómo se llega:

| Rol           | Desde dónde                                                   |
| ------------- | ------------------------------------------------------------- |
| Nutricionista | Menú del avatar (barra superior) y «Mi perfil» en la lateral   |
| Paciente      | «Mi perfil», último ítem de la barra lateral del portal        |

El enlace del nutricionista está en los DOS lugares a propósito: la barra
superior es `hidden … md:flex`, así que desde el teléfono el menú del avatar no
existe.

## Lo que NO se edita acá: el nombre

`Usuario` guarda credenciales y rol; no tiene columna de nombre. El nombre del
paciente vive en su ficha (`Paciente.nombreCompleto`, lo carga el profesional) y
el del profesional en `nutricionistas.nombre` (se edita en Configuración). La
pantalla lo MUESTRA —para que se vea de quién es la cuenta— y no deja cambiarlo: abrir
una segunda puerta al mismo dato termina en dos nombres distintos según dónde se
lo mire.

Resolver de dónde sale el nombre es todo el trabajo de `ObtenerMiPerfil`. Un
SUPERADMIN no tiene ni ficha ni consultorio: se lo nombra por su email.

## El nombre del profesional: una sola fuente, en `nutricionistas`

`nutricionistas.nombre` (`TEXT NOT NULL`, migración 74) es el ÚNICO lugar de
donde sale el nombre del nutricionista, en todos los lugares donde se lo
inserta:

| Dónde                                           | Quién lo lee                                        |
| ----------------------------------------------- | --------------------------------------------------- |
| `{{profesional}}` del recordatorio por WhatsApp | `armarRecordatorio`, `EnviarPlantillaWhatsapp`      |
| `{{profesional}}` del recordatorio por email    | `EnviarRecordatoriosPorEmail`                       |
| Email de bienvenida y email de prueba           | `EnviarEmailDeBienvenida`, `EnviarEmailDePrueba`    |
| Firma del email de recuperación                 | `SolicitarRecuperacionPassword` (por id, ver abajo) |
| Vista previa de las plantillas de email         | `useNombreProfesional` → `variablesEjemploCliente`  |
| Membrete de los PDF                             | los cuatro `*Pdf.tsx`, vía `configuracion.obtener`  |
| Encabezado del chat del paciente, «Mi perfil»   | `ObtenerContraparteDelHilo`, `ObtenerMiPerfil`      |
| Marca de la barra lateral del panel             | `BarraLateral` (`useNombreProfesional`)             |

### Por qué en `nutricionistas` y no en la configuración

Estuvo un tiempo en `ConfiguracionConsultorio.nombreProfesional` y se movió,
por razones de datos y no de gusto:

- **La base no podía garantizar que existiera.** La fila de configuración es
  0..1 por consultorio y la columna era nullable: dos niveles de ausencia, y
  la obligatoriedad solo la sostenían el DTO y la entidad. En `nutricionistas`
  es `NOT NULL` y lo garantiza el motor.
- **El alta no es atómica.** `CrearCuentaNutricionista` hace tres escrituras
  sueltas (inquilino, usuario, aprovisionamiento). Con el nombre en la
  configuración, un fallo del aprovisionamiento dejaba una cuenta que podía
  entrar y no tenía nombre. Ahora el nombre va en el mismo INSERT que crea al
  inquilino (`INutricionistaRepositorio.crear(id, nombre)`).
- **Es identidad, no una preferencia.** El resto de la configuración son
  preferencias (colores del PDF, qué mostrar, prefijo telefónico).
- **Las lecturas sin alcance quedan limpias.** `nutricionistas` no es tabla de
  inquilino: la recuperación de contraseña y "Mi perfil" lo leen por id
  (`nombreDe`), sin cruzar el filtro de la extensión.

No va en `Usuario` porque `Usuario` guarda credenciales y rol, a propósito sin
nombre; la fila de `Nutricionista` (mismo id que su cuenta) es la que
representa al profesional.

### Cómo se lee y cómo se edita

Dentro de un inquilino (recordatorios, emails, chat) se pide
`nombreDelActual()`, que resuelve el consultorio del alcance en curso como lo
hacía `configuracion.obtener()`. La pantalla de Configuración y los PDF lo
siguen recibiendo en `ConfiguracionSalidaDto.nombreProfesional`: el read model
es de la pantalla, y `ServicioConfiguracion` lo SUMA a la salida y lo SEPARA
al guardar (`CambiarNombreProfesional` para el nombre, `GuardarConfiguracion`
para el resto). Se puede cambiar pero no vaciar
(`nombreProfesionalValidado`, en `dominio/entidades/nombreProfesional.ts`).

**Quién lo carga.** El SUPERADMIN al crear la cuenta (`/admin`: el campo
«Nombre» es obligatorio, `crearCuentaNutricionistaDto`). Después lo edita cada
profesional en Configuración → «Membrete del profesional».

**Los consultorios que ya existían.** La migración 74 copió el nombre que
tenían cargado en la configuración, y a los que no tenían ninguno les puso el
provisional **«Nutricionista»**, que el profesional corrige en Configuración.
Se eligió ese y no el email porque va adentro de mensajes que lee el paciente
(«Te espera Nutricionista») y es lo que ya veían (el respaldo anterior era
«tu nutricionista»).

**Por qué se sacó la variable de entorno.** Antes los emails lo leían de
`NOMBRE_PROFESIONAL` (con un nombre real de respaldo en `nucleo.ts`), y el logo
de las pantallas públicas y la barra lateral lo tenían escrito a mano. La app
es multi-inquilino: el recordatorio por email de cualquier consultorio salía
firmado por el mismo profesional, y distinto del de WhatsApp. La variable ya no
existe (se sacó de `nucleo.ts`, del compose de producción y de los
`.env.*.example`).

**La recuperación de contraseña es el caso raro.** Es pública y corre con
alcance global, así que no hay "consultorio actual": pide
`nombreDe(usuario.nutricionistaId)`. Un SUPERADMIN (sin consultorio) recibe el
email SIN firma, que es mejor que firmado por otro.

**Las pantallas públicas no nombran a ningún profesional.** Login, recuperar,
restablecer, sin conexión y confirmar turno se ven antes de saber de qué
consultorio se trata: `LogoConsultorio` muestra la marca de la plataforma
(`NOMBRE_PLATAFORMA`, «NutriOffice»), la misma del manifest.

## La foto de perfil

### Dónde vive la FK, y por qué de ese lado

La columna es `usuarios.fotoPerfilId → archivos.id` (migración 53), con
`ON DELETE SET NULL`. Es el patrón del logo del membrete
(`configuracion_consultorio.logoArchivoId`) y **no** el de las fotos de receta o
de evolución, que cuelgan del arco exclusivo de dueños de `archivos`.

El criterio: el arco de dueños responde «¿de qué cosa es este archivo?», y sus
dueños son entidades de contenido —una receta, un plan, un laboratorio—. Una
foto de perfil no es un adjunto de la cuenta: es algo que la cuenta TIENE.

Consecuencia buscada: **la foto de perfil es un archivo sin dueño**. Eso es
legítimo desde la migración 34, que cambió el CHECK `archivos_un_solo_dueno` de
`= 1` a `<= 1`; y no la toca el barrido de huérfanos del worker, que borra
objetos del bucket sin fila de metadatos, no filas sin dueño.

### Subir es dos pasos que se ven como uno

Los archivos nunca viajan por tRPC. La imagen va primero a `POST /api/archivos`
(multipart, contexto `perfil`) y recién con su id vuelve la mutación
`perfil.cambiarFoto`, que apunta la cuenta a esa imagen.

El orden importa: si falla el segundo paso queda un archivo huérfano en el
bucket que el barrido semanal recoge. Lo inverso —la cuenta apuntando a algo que
no se subió— no puede pasar.

### Cambiar la foto BORRA la anterior

`CambiarFotoPerfil` borra la foto vieja (fila y objeto del bucket) después de
guardar la nueva. Sin eso, cada cambio deja un archivo muerto para siempre: la
limpieza de huérfanos del worker mira objetos SIN fila, y esta tiene fila.

Dos guardas que parecen de más y no lo son:

- **El archivo tiene que ser del contexto `perfil`.** La otra imagen que un
  paciente puede subir es la foto de una comida de su diario. Aceptarla acá
  haría que el próximo cambio de foto borrara un registro del diario.
- **Elegir la misma foto que ya tenía es un no-op.** Sin la salida temprana, el
  borrado de «la anterior» se lleva puesta la que se acaba de elegir. Es el caso
  del doble clic.

### Quién puede VER la foto de quién

Un paciente ve la cara de su nutricionista en el chat, y ese archivo no lo subió
él ni cuelga de ninguna receta, plan o material. La regla nueva vive en
`PuedeVerArchivoPaciente`: **un archivo que es la foto de perfil de alguna
cuenta del consultorio es visible**.

Lo que la acota es el alcance de inquilino: `IUsuarioRepositorio.esFotoDePerfil`
solo ve las cuentas del consultorio en curso, así que el paciente ve la cara de
SU nutricionista y no la de ningún otro. Devuelve un booleano y no el usuario a
propósito: quien pregunta no necesita saber de quién es la foto.

El contrapeso está en el test: un archivo huérfano ajeno que **no** es foto de
perfil sigue dando 403. «Sin dueño» no puede volverse sinónimo de «visible».

La imagen se pide siempre a `/api/archivos/<id>/ver`, nunca a una URL firmada
del bucket (ver `ARCHIVOS.md`).

## Cambiar la contraseña

Tres campos: la **actual**, la **nueva** y la nueva **otra vez**.

La actual no es burocracia. Es el tercer camino por el que una contraseña puede
cambiar y el único que exige la anterior; los otros dos —el restablecimiento por
email y el alta de la cuenta— prueban la identidad de otra forma (un token que
llegó a la casilla, o que quien crea la cuenta es el profesional). Sin ese
campo, una sesión ajena dejada abierta en un consultorio alcanza para quedarse
con la cuenta.

La confirmación es otra cosa y no protege contra nadie: evita quedar afuera por
un error de tipeo. Se valida en el **DTO** y no en el formulario, porque es una
regla de la operación y no del widget: el día que la misma mutación se llame
desde la app de Capacitor tiene que seguir valiendo.

`ErrorPasswordIncorrecta` usa el código `VALIDACION` y no `ACCESO_DENEGADO`:
quien pide el cambio ya está autenticado y no le falta ningún permiso, se
equivocó al tipear un campo. El formulario lo cuelga debajo de ese input en vez
de mostrarlo como un toast.

### Cambiar la contraseña echa a todos los dispositivos

El cambio revoca **todas** las sesiones persistentes de la cuenta, la del
dispositivo desde el que se hace incluida (ver `docs/SESIONES.md`).

Es deliberado y es por el caso que más importa: quien cambia la contraseña
porque sospecha que le entraron a la cuenta no gana nada si el token de refresco
del otro le sigue abriendo la puerta durante semanas — ese token no depende de
la contraseña y no se entera de que cambió. Tener que volver a entrar en el
propio teléfono es el costo, y es lo que ya espera cualquiera que cambió una
contraseña en otro lado.

Lo mismo hace el restablecimiento por email, que es el otro camino que usa quien
sospecha algo.

### El formulario no tiene esquema propio

`FormularioPassword` usa `cambiarPasswordDto` directamente como resolver. En
esta app los formularios suelen declarar su propio esquema Zod, y
`coherencia-formularios.test.ts` existe solo para detectar cuándo esa copia
diverge del DTO. Acá no hace falta ese test porque no hay copia.

## La política de contraseñas bajó de 12 a 8

`LARGO_MINIMO_PASSWORD` pasó de 12 a 8 (`aplicacion/dtos/password.ts`), que es
el piso obligatorio de NIST SP 800-63B; 12 era el valor recomendado.

Es un compromiso consciente. Con 12, «Mi perfil» rechazaba la contraseña que el
paciente ya venía usando en todos lados, y el efecto observable de eso no es
gente eligiendo frases largas: es gente que no cambia nunca la contraseña. Lo
que sostiene el número más bajo es el resto del sistema —bcrypt, límite de tasa
en el login y en el restablecimiento—, no la longitud sola.

**Hubo que ampliar la lista de prohibidas.** Con el mínimo en 12, `password` y
`12345678` no llegaban a esa lista: los rechazaba el largo. Al bajar a 8 pasaron
a ser válidas por forma, así que ahora están nombradas junto con las demás
obvias de 8 a 11 caracteres.

El cambio vale para TODOS los flujos a la vez, que es el punto de tener la
política en un solo archivo: alta de cuenta, alta de paciente, restablecimiento
por email y este cambio desde la sesión.

Lo que **no** cambió: el `minimo = 12` de `prisma/seed.ts` no es esta política.
Es un piso aparte y más alto para las dos credenciales de arranque del sistema
(`SUPERADMIN_PASSWORD`, `SEED_PASSWORD`), que las elige quien despliega y son
las únicas que existen antes de que haya nadie adentro.

## La foto en el chat

Ver `MENSAJERIA.md` → «La cara del que está del otro lado».
