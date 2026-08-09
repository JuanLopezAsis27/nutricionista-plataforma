/** Indicador animado de "pensando" (tres puntos con rebote escalonado). */
export function PensandoAnimado() {
  return (
    <div className="flex justify-start">
      <div
        className="flex items-center gap-1 rounded-2xl rounded-bl-sm bg-muted px-3.5 py-3"
        role="status"
        aria-label="El asistente está pensando"
      >
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  );
}
