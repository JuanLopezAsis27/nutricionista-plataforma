-- Pliegue pectoral: no lo usa ninguna ecuación vigente (solo lo pedían
-- Jackson & Pollock y Parrillo, ya retirados). Se borra la columna: se pierde
-- el dato histórico ya cargado, decisión explícita del profesional.
ALTER TABLE "antropometrias" DROP COLUMN "plieguePectoral";

-- Ecuaciones de grasa por pliegues que el nutricionista elige mostrar. El
-- default deja a las cuentas existentes viendo exactamente las mismas 6 que
-- hoy están activas.
ALTER TABLE "configuracion_consultorio"
  ADD COLUMN "formulasGrasaVisibles" "MetodoGrasa"[] NOT NULL
  DEFAULT ARRAY['YUHASZ_CARTER', 'YUHASZ_CARTER_KERR', 'FAULKNER', 'FAULKNER_KERR', 'WITHERS', 'DURNIN_WOMERSLEY']::"MetodoGrasa"[];
