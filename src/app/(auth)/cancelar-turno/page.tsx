import { CancelarTurno } from "@/componentes/turnos/CancelarTurno";

/** Página pública del botón "Cancelar turno" del recordatorio (email o WhatsApp). */
export default async function PaginaCancelarTurno({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <CancelarTurno token={token ?? ""} />;
}
