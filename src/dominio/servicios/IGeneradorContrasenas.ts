/**
 * Puerto de dominio para generar una contraseña provisional al azar.
 *
 * Lo usa el envío manual de la bienvenida: la contraseña que eligió el
 * profesional en el alta ya no existe en ningún lado (se guarda solo su hash
 * bcrypt, que no se puede revertir), así que para mandar una hay que generar
 * otra y asignársela a la cuenta.
 *
 * La contraseña tiene que cumplir la política de `passwordNuevaDto` y poder
 * tipearse a mano desde un email: sin caracteres que se confundan entre sí.
 */
export interface IGeneradorContrasenas {
  generar(): string;
}
