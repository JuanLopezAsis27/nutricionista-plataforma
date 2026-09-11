import { ConfirmarAsistencia } from "@/componentes/turnos/ConfirmarAsistencia";

/** Página pública del botón "Confirmar asistencia" del recordatorio por email. */
export default async function PaginaConfirmarTurno({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ConfirmarAsistencia token={token ?? ""} />;
}
