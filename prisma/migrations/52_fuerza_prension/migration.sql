-- Migración 52 — Fuerza de prensión manual
--
-- Dos campos nuevos en la medición: fuerza de prensión derecha e izquierda
-- (dinamometría manual, en kg). Igual que `kgGrasa`, se cargan a mano y no
-- alimentan ninguna ecuación de composición corporal: se registran y se
-- muestran tal cual, sin participar del fraccionamiento, el somatotipo ni
-- las ecuaciones de grasa.
--
-- Nullable, como el resto de la medición (solo el peso es obligatorio).
-- Decimal(4,1) alcanza y sobra: un dinamómetro de mano informa en kg con un
-- decimal, y el valor más alto registrado en competencia no llega a 100 kg.

ALTER TABLE "antropometrias" ADD COLUMN "fuerzaPresionDerecha"   DECIMAL(4,1);
ALTER TABLE "antropometrias" ADD COLUMN "fuerzaPresionIzquierda" DECIMAL(4,1);
