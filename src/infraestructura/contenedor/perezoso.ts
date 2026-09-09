/**
 * Construcción perezosa y memoizada.
 *
 * El contenedor instanciaba TODO al cargar el módulo: importar un solo
 * servicio construía los 36 repositorios, el cliente S3 y los adaptadores de
 * IA. Eso tenía tres consecuencias:
 *
 *   - Un error al construir cualquier pieza (una variable de entorno mal
 *     formada en un adaptador opcional) tumbaba el proceso entero al importar,
 *     no en la request que la necesitaba.
 *   - El worker arrastraba los 27 servicios para usar dos.
 *   - El build de Next, que importa los módulos para recolectar las páginas,
 *     necesitaba credenciales falsas en el Dockerfile.
 *
 * Con esto, cada pieza se construye la primera vez que alguien la pide y se
 * reutiliza después. El costo a partir de la segunda llamada es una lectura de
 * variable.
 *
 * Se usa una bandera y no `??=` a propósito: hay piezas cuyo valor legítimo es
 * `null` (los adaptadores de Google cuando no hay credenciales), y con `??=`
 * se reconstruirían en cada acceso.
 */
export function perezoso<T>(crear: () => T): () => T {
  let valor: T;
  let creado = false;

  return () => {
    if (!creado) {
      valor = crear();
      creado = true;
    }
    return valor;
  };
}
