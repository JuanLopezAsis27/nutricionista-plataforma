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
