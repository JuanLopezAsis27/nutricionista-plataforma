/**
 * Puerto de aprovisionamiento de una cuenta de nutricionista: crea los datos
 * por defecto de su inquilino (configuración, plantillas de email de sistema y
 * axiomas de ejemplo). La implementación de infraestructura los siembra dentro
 * del alcance del nuevo nutricionista (multi-tenant).
 */
export interface IProvisionadorNutricionista {
  aprovisionar(nutricionistaId: string): Promise<void>;
}
