# Biblioteca de materiales

Material educativo del profesional para compartir con sus pacientes: un
archivo del bucket (`Archivo.materialId`) o un enlace externo. Se comparte con
pacientes elegidos o con todos los vigentes de una vez
(`CompartirMaterialConTodos`), y el paciente lo ve en «Mi material».

## Carpetas (migración 87)

`GrupoMaterial` es la misma carpeta que `GrupoPlan` y `GrupoReceta`, con la
misma mecánica y por los mismos motivos:

- **Un solo nivel.** No hay carpetas dentro de carpetas.
- **Borrar la carpeta no borra los materiales**: la FK
  `materiales_biblioteca.grupoId` es `ON DELETE SET NULL` y quedan sueltos.
- **Mover es un caso de uso aparte** (`MoverMaterialAGrupo`), no un campo del
  editor: ordenar no es editar. `ActualizarMaterial` conserva la carpeta que
  el material ya tenía.
- **Un material nuevo nace en la carpeta abierta** (`grupoIdInicial` en
  `FormularioMaterial`). Si no, lo que se agregaba desde adentro de una carpeta
  quedaba suelto y desaparecía de la vista recién creado. `CrearMaterial`
  verifica que la carpeta exista antes de escribir, para dar un «no existe» y
  no un choque contra la FK.
- El nombre es único por consultorio sin distinguir mayúsculas
  (`existeNombre`, con el índice único como garantía dura).
- `GrupoMaterial` es tabla de inquilino: está en `MODELOS_INQUILINO`.

No compite con la categoría ni con las etiquetas: esas describen el material;
la carpeta dice dónde lo guardó el profesional.

La pantalla usa el navegador compartido (`componentes/comunes/NavegadorCarpetas`)
a través de `componentes/biblioteca/NavegadorCarpetas`, que solo dice de dónde
salen las carpetas. Planes, recetario y biblioteca se navegan igual.

## Arrastrar a una carpeta

En la raíz, cada elemento suelto se puede **arrastrar y soltar sobre una
carpeta** para guardarlo ahí. Vale igual en planes, recetario y biblioteca,
porque vive en el navegador compartido:

- `propsArrastrable(id)` hace arrastrable una fila o tarjeta; solo viaja el id,
  con un tipo propio (`application/x-nutricrm-elemento`). Las carpetas ignoran
  cualquier otra cosa que se suelte encima (un archivo del escritorio, un
  texto seleccionado).
- Soltar llama a `onSoltar`, que cada módulo ata a su MISMA mutación de mover
  que el botón «Mover a una carpeta». No es un camino aparte.
- Solo se arrastra lo suelto: adentro de una carpeta no hay carpetas a la vista
  donde soltar. Ahí cada elemento tiene **«Sacar de la carpeta»**, que lo
  deja suelto en un clic (la misma mutación de mover, con `grupoId: null`);
  para pasarlo a otra carpeta sigue el diálogo de mover.
- Es el arrastre nativo del navegador (HTML5), sin librería. En pantallas
  táctiles no funciona; ahí queda el botón, que hace lo mismo.

## El buscador

Funciona como en planes y recetas, respetando la vista:

- **En la raíz** busca carpetas por su nombre (lo filtra el navegador, que ya
  tiene todas) y materiales **sueltos** por título o descripción. Lo guardado
  en una carpeta se encuentra buscando la carpeta, que es como se lo guardó.
- **Adentro de una carpeta** busca solo entre sus materiales.
- Abrir o salir de una carpeta limpia el buscador: lo escrito buscaba en el
  lugar que se deja.

El listado paginado filtra con `grupoId` de tres estados: `null` son los
sueltos (la raíz), un id es esa carpeta, y ausente no filtra (el selector
`obtenerTodos`). Por eso el repositorio compara contra `undefined` y no con
`if (grupoId)`, y `ObtenerMaterialesPaginado` —que enumera los campos a mano—
tiene que pasarlo; lo cubre `ultimosCasos.test.ts`.
