import type { ServicioHistoriaClinica } from "./evaluacion/ServicioHistoriaClinica";
import type { ServicioEvoluciones } from "./evaluacion/ServicioEvoluciones";
import type { ServicioAntropometria } from "./evaluacion/ServicioAntropometria";
import type { ServicioAlertasAlimentarias } from "./evaluacion/ServicioAlertasAlimentarias";
import type { ServicioLaboratorios } from "./evaluacion/ServicioLaboratorios";

/**
 * Fachada de Evaluación Integral.
 *
 * NO tiene lógica: agrupa los servicios del módulo para que el router siga
 * viendo un único punto de entrada por área funcional.
 *
 * ## Por qué existe
 *
 * Antes esto era una sola clase con **20 dependencias de constructor** y 216
 * líneas de métodos separados por comentarios de sección. Esos comentarios
 * —`// --- Historia clínica ---`, `// --- Laboratorios ---`— eran las costuras
 * a la vista: el autor ya había identificado los subdominios y los había
 * separado visualmente porque no podía separarlos estructuralmente.
 *
 * El costo concreto de tenerlos juntos era doble. Uno, **SRP**: cambiar el
 * protocolo de laboratorios obligaba a tocar el archivo donde vive la
 * antropometría. Dos, **ISP**: un test de historia clínica tenía que construir
 * o simular veinte colaboradores para ejercitar dos.
 *
 * ## Por qué la evolución es un servicio aparte de la historia clínica
 *
 * La historia se carga UNA vez y describe de dónde viene el paciente; las
 * evoluciones se cargan en CADA consulta y describen cómo viene. Comparten una
 * sola pieza —la lectura del documento con IA, que las trae a las dos de una
 * pasada— y esa vive en `ServicioHistoriaClinica`, porque el archivo que se
 * sube es el de la historia.
 *
 * ## Por qué antropometría es uno y no tres
 *
 * Antropometría, composición corporal y plantillas de carga tenían secciones
 * propias, pero **se llaman entre sí** (registrar una medición devuelve la
 * evolución; guardar un objetivo devuelve la composición recalculada).
 * Separarlas habría obligado a que un servicio dependiera de otro para
 * contestarle a la UI: son un solo subdominio con tres vistas, y viven juntas
 * en `ServicioAntropometria`.
 *
 * ## Cómo crece
 *
 * Sumar un subdominio —ecografías, por decir— es un archivo nuevo y una
 * línea acá, no una edición de un constructor con veinte parámetros
 * posicionales donde invertir dos del mismo tipo es un bug silencioso.
 */
export class ServicioEvaluacion {
  constructor(
    readonly historiaClinica: ServicioHistoriaClinica,
    readonly evoluciones: ServicioEvoluciones,
    readonly antropometria: ServicioAntropometria,
    readonly alertasAlimentarias: ServicioAlertasAlimentarias,
    readonly laboratorios: ServicioLaboratorios,
  ) {}
}
