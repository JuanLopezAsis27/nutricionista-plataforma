# Navegación entre pantallas

## El problema

Todas las rutas son **dinámicas**: los layouts leen la sesión con `auth()`.
En una ruta dinámica, Next no puede prefetchear la página, y al tocar un enlace
**espera la respuesta del servidor con la pantalla anterior quieta**. En el
celular, con la red más lenta, no se distinguía un toque que no entró de una
pantalla que estaba cargando.

El problema no era la demora sino la falta de respuesta. Hay dos arreglos
complementarios.

## 1. `loading.tsx` en cada segmento con hijos

Un `loading.tsx` envuelve la página en un `<Suspense>`, y Next prefetchea ese
fallback aunque la ruta sea dinámica: al tocar el enlace la pantalla cambia al
instante al esqueleto (`CargandoPagina`) y el contenido se completa cuando
llega. El layout (barra lateral, barra superior) queda montado e interactivo.

Un `loading.tsx` solo actúa cuando cambia un segmento **debajo** de él. Por eso
hay uno en la raíz de cada espacio (`dashboard/`, `(paciente)/`, `admin/`) y
otro en cada carpeta que tiene subpáginas propias:

| Archivo                             | Cubre                                      |
| ----------------------------------- | ------------------------------------------ |
| `dashboard/loading.tsx`             | pasar de una sección del panel a otra      |
| `dashboard/pacientes/loading.tsx`   | listado → ficha, listado → nuevo           |
| `dashboard/planes/loading.tsx`      | listado → plan                             |
| `dashboard/recetas/loading.tsx`     | recetario → receta                         |
| `dashboard/turnos/loading.tsx`      | agenda → nuevo turno                       |
| `(paciente)/loading.tsx`            | pasar de una sección del portal a otra     |
| `(paciente)/mi-plan/loading.tsx`    | mis planes → plan                          |
| `(paciente)/mis-recetas/loading.tsx`| mis recetas → receta                       |
| `admin/loading.tsx`                 | entrada al panel del SUPERADMIN            |

**Al agregar una carpeta con subpáginas** (`algo/[id]/page.tsx`), sumale su
`loading.tsx`: sin él, el salto del listado al detalle vuelve a quedar mudo,
porque el `loading.tsx` de arriba no se activa (su segmento no cambió).

## 2. El menú responde al toque

- **Móvil:** el panel deslizante se cierra al tocar el enlace, no al cambiar la
  ruta. Antes quedaba abierto durante toda la espera.
- **Escritorio:** el ícono del enlace se convierte en un spinner mientras la
  navegación está pendiente (`useLinkStatus`, en `IconoEnlace` de
  `componentes/layout/SidebarNav.tsx`). Es del mismo tamaño que el ícono, así
  que no desplaza nada. Si la ruta ya estaba prefetcheada, no llega a verse.

## 3. Qué entra en la barra lateral

La barra del profesional llegó a 14 entradas cuando Alimentos pasó a ser una
sección. Para achicarla se hicieron dos cosas: se sacó lo que no se visita a
diario y se agrupó el resto.

- **Integraciones** es una pestaña de Configuración y no una entrada: conectar
  Google o WhatsApp se hace una vez. Se llega con
  `/dashboard/configuracion?pestana=integraciones` (`RUTA_INTEGRACIONES` en
  `src/lib/rutas.ts`). Con esa ruta vuelven el OAuth de Google y los enlaces
  de Recordatorios y WhatsApp, y la página toma la pestaña de `searchParams`.
  `/dashboard/integraciones` redirige ahí (`next.config.ts`) con sus
  parámetros, así que un enlace viejo sigue sirviendo.
- **Mi perfil** se abre desde el email del pie (`enlacePerfil` de
  `SidebarNav`). No se puede quitar de la barra sin reemplazo, porque en el
  celular la barra superior con el menú del avatar no se dibuja y el pie es la
  única puerta.
- **Grupos**: el enlace que abre un grupo lleva `grupo` (Contenido, Análisis,
  Consultorio), y el título se dibuja antes de ese enlace. Con la barra plegada
  el título es una línea divisoria. Los primeros enlaces (Dashboard, Pacientes,
  Turnos y Mensajes) van sin grupo porque son lo de todos los días.

Los grupos no pueden costar alto. La primera versión, con títulos de
`pt-4` y el perfil en una fila aparte del «Salir», quedaba más alta que la
barra de 14 entradas que venía a reemplazar. Por eso los títulos son chicos
(`text-[10px]`, `leading-none`), las entradas van con `py-1.5` y
`space-y-0.5`, y el perfil y el botón de salir comparten una sola fila del pie.
Las entradas más bajas también se ven en el portal del paciente, que usa el
mismo `SidebarNav`.

## 4. Las pestañas de Configuración

Eran once, una por formulario, y la fila de pestañas se partía en tres
renglones. Hoy son cinco, por tema, y cada una apila sus secciones:

| Pestaña (`?pestana=`)                  | Qué tiene                                          |
| -------------------------------------- | -------------------------------------------------- |
| Consultorio (`consultorio`)            | Membrete del profesional, establecimientos         |
| Documentos y mensajes (`documentos`)   | PDF del plan, plantillas de email, teléfonos       |
| Ficha clínica (`ficha`)                | Campos de historia clínica y evolución, antropometría |
| IA y seguimiento (`ia`)                | Análisis de fotos del diario, base de conocimiento |
| Integraciones (`integraciones`)        | Google, WhatsApp Cloud API, prompts de IA          |

Los enlaces desde otras pantallas usan las constantes de `src/lib/rutas.ts`,
no la ruta escrita a mano: los valores de `pestana` ya cambiaron una vez.
Las secciones que no traen título propio lo reciben de `Seccion`, en la
página.
