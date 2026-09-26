# Cuentas de paciente: una persona, varios consultorios

Una persona puede atenderse con dos nutricionistas. Cada consultorio tiene su
propia **ficha** (el email del paciente es único por consultorio, no global),
pero la persona tiene **una sola cuenta**: un email, una contraseña y una foto.
Desde la migración 78, cada ficha dice de qué cuenta es.

## El modelo

```
usuarios (la persona / la cuenta) 1 ──── N pacientes (la ficha) N ──── 1 nutricionistas
```

| Tabla            | Qué es                                                  | ¿De un consultorio?                              |
| ---------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `usuarios`       | La CUENTA: email, contraseña, rol, foto                 | La del paciente, **no** (`nutricionistaId` NULL) |
| `pacientes`      | La ficha: la relación persona ↔ consultorio, con todo lo clínico colgando | Sí                  |
| `nutricionistas` | El consultorio                                          | Es el inquilino                                  |

**`pacientes` es la tabla intermedia del muchos a muchos** entre personas y
consultorios. No es liviana, y no puede serlo: el nombre como lo cargó cada
profesional, el teléfono, el archivado, la bienvenida y las 45+ tablas clínicas
son de la relación, no de la persona. Si vivieran en un «paciente global», un
consultorio leería y editaría los datos de otro. Por eso tampoco hay una tabla
«persona» aparte: no tendría ninguna columna que no sea de la ficha o de la
cuenta.

`pacientes.usuarioId` es NULL en la ficha sin portal. La identidad compartida
entre consultorios es SOLO la cuenta, que la persona controla con su email:
unir fichas por nombre o teléfono le diría a un consultorio que la persona se
atiende en otro.

Antes, `usuarios` tenía `pacienteId` y el `nutricionistaId` del consultorio de
esa ficha. Así era imposible tener dos: `usuarios.email` es único global, y el
segundo consultorio recibía «ese email ya tiene una cuenta en la plataforma».
(Una primera versión de la migración usaba una tabla `accesos_portal` para el
vínculo; como cada ficha tiene como mucho una cuenta, alcanzaba con la columna,
y se reemplazó antes de aplicarla.)

Invariantes:

- `UNIQUE (nutricionistaId, usuarioId)` en `pacientes`: una ficha por
  consultorio y por cuenta, igual que el email del paciente es único por
  consultorio.
- `pacientes.usuarioId` es `ON DELETE SET NULL`: dar de baja la cuenta deja la
  ficha clínica intacta, sin portal.
- CHECK `rol <> 'PACIENTE' OR nutricionistaId IS NULL`, y lo mismo en la
  entidad `Usuario`: si la cuenta de un paciente tuviera inquilino, la
  extensión de Prisma la escondería de los demás consultorios.
- La entidad `Paciente` no conoce `usuarioId`: lo escribe solo
  `ICuentaPacienteRepositorio.vincular` (al dar de alta), y el `update` de la
  ficha no lo toca.

### Cómo se lee una cuenta que no es de nadie

`usuarios` sigue siendo tabla de inquilino (la cuenta del profesional lo es, y
de ahí salen `listarPorRol("NUTRICIONISTA")` y la foto del profesional en el
chat). El filtro automático (`nutricionistaId = <consultorio>`) volvería
invisible la cuenta del paciente para todos, incluido el propio paciente dentro
de su sesión.

Por eso `PrismaRepositorioUsuario` escribe el filtro a mano (`visibles`): un
consultorio ve su propia cuenta y las de los pacientes dueños de alguna de
SUS fichas, y la consulta corre con alcance global para que la extensión no le
sume el suyo. Sigue siendo fail-closed: sin alcance fijado, lanza.

Hay una escritura global legítima: crear la cuenta de un paciente
(`crear` con `esPaciente`). La fila no es de ningún consultorio, así que no hay
inquilino que declarar; con alcance de inquilino, la extensión le pondría el
del consultorio que da el alta y el CHECK la rechazaría.

## La regla que importa: exclusividad

**Un consultorio solo administra la cuenta si es EXCLUSIVAMENTE suya**
(`dominio/servicios/cuentaPaciente.ts`, `esCuentaExclusiva`). Si el consultorio
B pudiera fijar la contraseña de una cuenta que también usa A, podría entrar
como el paciente y leer los datos clínicos de A. Con el email de inicio de
sesión pasa lo mismo: cambiarlo desde B se lo cambia en A.

| Operación                              | Cuenta exclusiva                                | Cuenta compartida                                                  |
| -------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| Alta con ese email                     | Crea la cuenta con la contraseña del formulario | **Vincula** la existente; la contraseña del formulario se descarta |
| Bienvenida manual con `{{contrasena}}` | Genera o usa la manual y la asigna              | No toca la contraseña; sale la plantilla de cuenta existente       |
| Editar el email de la ficha            | Sincroniza el email de la cuenta                | Cambia la ficha; el login queda como está                          |
| Eliminar la ficha                      | Borra la cuenta (con sus sesiones)              | Borra la ficha; la cuenta sigue para el otro                       |

`ICuentaPacienteRepositorio.contarDeUsuario` devuelve un NÚMERO y no la lista a
propósito: quien pregunta desde un consultorio necesita saber si la cuenta es
solo suya, no con quién la comparte.

Una cuenta de profesional nunca se vincula como paciente: `CrearPaciente` sigue
rechazando ese email, sin decir de quién es.

## Contraseña provisional

`usuarios.passwordProvisional` marca la contraseña que eligió un PROFESIONAL:
la del alta de una cuenta nueva y la de la bienvenida manual
(`Usuario.fijarPasswordProvisional`). Cualquier cambio de la persona la limpia
(`cambiarPassword`: Mi perfil y la recuperación por email). El re-hasheo del
login no (`rehashearPassword`): es la misma contraseña con otro costo.

El portal muestra una **advertencia** (`AvisoContrasenaProvisional`, en el
layout, y una línea en Mi perfil) que recomienda cambiarla. **No obliga**: se
decidió así. La defensa real contra que un consultorio conozca la contraseña de
otro es la exclusividad; la advertencia cubre el caso restante (el consultorio
que creó la cuenta la conoce hasta que la persona la cambie, también después de
que otro consultorio la vincule).

La marca no viaja en el JWT: se lee de `perfil.mio`, así la advertencia se va
apenas se cambia la contraseña, sin reemitir la sesión. Las cuentas que ya
existían antes de la migración quedaron en `false`.

## La bienvenida de quien ya tenía cuenta

Plantilla de sistema aparte, `BIENVENIDA_CUENTA_EXISTENTE`, sin
`{{contrasena}}`: «X te sumó a su consultorio; entrás con tu email y la
contraseña que ya usás». Se siembra en cada consultorio (migración 78,
`ProvisionadorNutricionista` y el seed) y se edita en Configuración como las
demás. `EnviarEmailDeBienvenida` la elige con `cuentaExistente`, que llega:

- del alta (`CrearPaciente` devuelve `cuentaExistente` y
  `ServicioPaciente.darLaBienvenida` se lo pasa, con la misma política
  `bienvenidaAutomaticaActiva` de siempre);
- del envío manual, cuando la cuenta no es exclusiva.

## El consultorio activo

La sesión lleva el consultorio en el que se está trabajando: `pacienteId` y
`nutricionistaId` del JWT significan «la ficha y el inquilino ACTIVOS». Por eso
`conAlcanceDeSesion`, `pacienteDeSesion` y los routers del portal no cambiaron.

`ResolverConsultorioActivo` es el ÚNICO camino que decide cuál, y lo usan los
tres momentos que emiten una sesión: el login (`authorize`), la renovación con
el token de refresco y el cambio de consultorio (callback `jwt` con
`trigger === "update"`). Con una ficha, esa. Con varios, el que eligió la
persona en ese dispositivo si todavía es suyo; si no, ninguno.

**La elección se recuerda por dispositivo**, en la cookie httpOnly
`consultorio` (`lib/autenticacion/consultorioActivo.ts`), durante un año.
Nadie confía en ella: se revalida contra las fichas de la cuenta cada vez, porque puede
nombrar una ficha que se borró.

**Sin consultorio elegido**, el layout del portal manda a `/mis-consultorios`
(«Elegí tu consultorio», en el grupo `(auth)` para no quedar debajo del layout
que redirige). Esa sesión no tiene inquilino, así que cualquier consulta a una
tabla de inquilino falla cerrado.

**Cambiar** es `POST /api/autenticacion/consultorio` y no una mutación de tRPC,
porque toca cookies: valida que la ficha sea suya (`CambiarConsultorioActivo`, 403 si no es
suyo), guarda la cookie y reemite el JWT con `unstable_update`. El cliente
después hace `update()`, `router.refresh()` e invalida la caché.

**El payload de `update()` es solo una preferencia.** Cualquier script de la
página puede llamarlo con lo que quiera, así que el callback `jwt` nunca copia
los datos del cliente: vuelve a resolver la identidad desde la base, y
`ResolverConsultorioActivo` solo acepta una ficha que sea de ESA cuenta.

**Red de seguridad**: `sesionSigueVigente` valida al paciente contra sus
fichas (el par ficha/consultorio del token tiene que ser una de ellas), no
contra el `nutricionistaId` de la cuenta. Si le borran la ficha activa, la
sesión se corta en la request siguiente. El handler del cambio llama a
`olvidarSesion` para que una ficha recién vinculada no choque con el caché.

## En pantalla

- **Selector** (`SelectorConsultorio`): un ícono en el pie de la barra lateral
  del portal y en la barra móvil. Solo aparece con dos o más consultorios.
- **«Elegí tu consultorio»** (`EleccionConsultorio`): tarjetas con el nombre del
  profesional. La foto suele caer a las iniciales, porque la autorización de
  archivos mira el consultorio de la sesión y ahí todavía no hay ninguno.
- **Dashboard**: el alta avisa «ya tenía una cuenta en la plataforma: se la
  vinculó y sigue entrando con su contraseña», sin decir de qué consultorio. La
  bienvenida manual avisa cuántas salieron sin contraseña por ser compartidas.
- **Tiempo real**: el canal SSE es de la cuenta, así que llegan eventos de los
  dos consultorios. `mensaje.nuevo` lleva el `pacienteId` de la ficha, y el
  portal no muestra el toast si no es del consultorio activo.
- **Recuperación de contraseña**: firma con el nombre del profesional si la
  cuenta tiene un solo consultorio; con varios va sin firma, porque la
  contraseña es de todos.

## Limitaciones conocidas

- **La foto de perfil del paciente** es un `Archivo` del consultorio donde la
  subió (la tabla `archivos` es de inquilino). Los otros consultorios no la ven y
  muestran las iniciales.
- **El paciente no puede cambiar su email de inicio de sesión** si la cuenta es
  compartida: ninguno de los consultorios lo puede tocar y el portal no tiene
  esa pantalla.

## Lo que NO hay que hacer

- **Nunca fijar la contraseña ni cambiar el email de login de una cuenta que
  no sea exclusiva.** Es la llave de las fichas de otro consultorio. Pasa por
  `esCuentaExclusiva`.
- **Nunca copiar al token lo que manda `update()`.** Es una preferencia: se
  revalida con `ResolverConsultorioActivo`.
- **Nunca volver a colgar la cuenta de una ficha** (`usuarios.pacienteId`) ni
  darle `nutricionistaId` a la cuenta de un paciente. Se llega a la cuenta por
  la ficha (`pacientes.usuarioId`, `IUsuarioRepositorio.obtenerPorPacienteId`).
- **Nunca consultar `usuarios` buscando cuentas de pacientes sin el filtro de
  `visibles`.** Con el filtro automático de la extensión, la cuenta no aparece,
  y sin ningún filtro aparecen las de todos los consultorios.
- **Nunca borrar la cuenta desde `EliminarPaciente` sin contar sus fichas**:
  se llevaría puesta la entrada al otro consultorio.
- **Nunca obligar a cambiar la contraseña provisional** sin revisar esta
  decisión: se eligió advertir, no bloquear.
