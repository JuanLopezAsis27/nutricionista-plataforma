/**
 * Ayudas de test del dominio: mocks de puertos y fábricas de entidades.
 *
 * Este archivo es solo la FACHADA. El contenido vive en `_ayudas/`, partido en
 * tres por tipo de ayuda.
 *
 * Se mantiene el punto de entrada porque lo importan 144 archivos de test, y
 * porque el motivo de partirlo no era el import sino los conflictos de merge:
 * era el segundo archivo más modificado del repositorio, y cada feature nueva
 * lo tocaba en el mismo lugar.
 */
export * from "./_ayudas/repositorios";
export * from "./_ayudas/servicios";
export * from "./_ayudas/entidades";
