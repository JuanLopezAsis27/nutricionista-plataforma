"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AtSign, KeyRound, TicketPlus, UserPlus, Wand2 } from "lucide-react";
import type {
  CredencialesPortalSalidaDto,
  InvitacionEmitidaSalidaDto,
  ResultadoAccesoSalidaDto,
} from "@/aplicacion/dtos/acceso-portal.dto";
import {
  passwordNuevaDto,
  LARGO_MINIMO_PASSWORD,
} from "@/aplicacion/dtos/password";
import {
  REGLA_NOMBRE_USUARIO,
  esNombreUsuarioValido,
  normalizarNombreUsuario,
} from "@/dominio/servicios/nombreUsuario";
import { useAccesoPortal } from "@/lib/hooks/useAccesoPortal";
import { useRevisionEmail } from "@/lib/hooks/useRevisionEmail";
import { formatearFecha } from "@/lib/formato";
import { Badge } from "@/componentes/ui/badge";
import { Button } from "@/componentes/ui/button";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/componentes/ui/dialog";
import {
  CodigoInvitacion,
  Credenciales,
  ResultadoAccesoPortal,
} from "./ResultadoAccesoPortal";

type Accion = "DAR" | "RESTABLECER" | "USUARIO" | "INVITAR";

/**
 * «Acceso al portal» en la ficha del paciente (migración 80): con qué entra, y
 * lo que el profesional puede hacer con su cuenta.
 *
 * - **Sin cuenta**: darle una (usuario y/o email, contraseña), o, si ya tiene
 *   cuenta con otro profesional, emitir un código para que sume este
 *   consultorio desde ella.
 * - **Cuenta exclusiva** de este consultorio: restablecer la contraseña —es el
 *   «olvidé mi contraseña» de quien no tiene email— y emitir un código para
 *   juntarla con otra cuenta que la persona ya tenía.
 * - **Cuenta compartida** con otro consultorio: es de la persona. No se muestra
 *   con qué entra ni se toca nada.
 */
export function AccesoPortalPaciente({
  pacienteId,
  nombre,
  apellido,
  emailPaciente,
}: {
  pacienteId: string;
  nombre: string;
  apellido: string;
  emailPaciente: string | null;
}) {
  const nombrePaciente = `${nombre} ${apellido}`;
  const { obtener } = useAccesoPortal();
  const acceso = obtener({ pacienteId });
  const [accion, setAccion] = useState<Accion | null>(null);

  if (!acceso.data) return null;
  const a = acceso.data;

  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-muted-foreground">Portal: </span>
        {a.estado === "SIN_CUENTA" && <span>sin acceso</span>}
        {a.estado === "COMPARTIDA" && (
          <span>
            comparte su cuenta con otro consultorio (entra con sus propios
            datos)
          </span>
        )}
        {a.estado === "EXCLUSIVA" && (
          <span>
            entra con{" "}
            <strong>
              {[a.email, a.nombreUsuario].filter(Boolean).join(" o ")}
            </strong>
          </span>
        )}
        {a.estado !== "SIN_CUENTA" && !a.activa && (
          <Badge variant="destructive">desactivada</Badge>
        )}
        {a.passwordProvisional && (
          <Badge variant="outline">contraseña provisional</Badge>
        )}
        {a.invitacionVigenteHasta && (
          <Badge variant="outline">
            código pendiente hasta {formatearFecha(a.invitacionVigenteHasta)}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {a.estado === "SIN_CUENTA" && (
          <Button size="sm" variant="outline" onClick={() => setAccion("DAR")}>
            <UserPlus className="h-4 w-4" />
            Darle acceso
          </Button>
        )}
        {a.estado === "EXCLUSIVA" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAccion("RESTABLECER")}
          >
            <KeyRound className="h-4 w-4" />
            Restablecer contraseña
          </Button>
        )}
        {a.estado === "EXCLUSIVA" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAccion("USUARIO")}
          >
            <AtSign className="h-4 w-4" />
            {a.nombreUsuario ? "Cambiar usuario" : "Ponerle usuario"}
          </Button>
        )}
        {a.estado !== "COMPARTIDA" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAccion("INVITAR")}
          >
            <TicketPlus className="h-4 w-4" />
            {a.estado === "SIN_CUENTA"
              ? "Ya tiene cuenta con otro profesional"
              : "Juntar con otra cuenta suya"}
          </Button>
        )}
      </div>

      <Dialog
        open={accion !== null}
        onOpenChange={(abierto) => !abierto && setAccion(null)}
      >
        <DialogContent>
          {accion === "DAR" && (
            <DarAcceso
              pacienteId={pacienteId}
              nombre={nombre}
              apellido={apellido}
              emailPaciente={emailPaciente}
              onListo={() => setAccion(null)}
            />
          )}
          {accion === "RESTABLECER" && (
            <Restablecer
              pacienteId={pacienteId}
              nombrePaciente={nombrePaciente}
              onListo={() => setAccion(null)}
            />
          )}
          {accion === "USUARIO" && (
            <CambiarUsuario
              pacienteId={pacienteId}
              actual={a.nombreUsuario}
              tieneEmail={Boolean(a.email)}
              onListo={() => setAccion(null)}
            />
          )}
          {accion === "INVITAR" && (
            <Invitar
              pacienteId={pacienteId}
              nombrePaciente={nombrePaciente}
              emailPaciente={emailPaciente}
              yaTieneCuenta={a.estado === "EXCLUSIVA"}
              onListo={() => setAccion(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DarAcceso({
  pacienteId,
  nombre,
  apellido,
  emailPaciente,
  onListo,
}: {
  pacienteId: string;
  nombre: string;
  apellido: string;
  emailPaciente: string | null;
  onListo: () => void;
}) {
  const nombrePaciente = `${nombre} ${apellido}`;
  const { darAcceso, sugerirNombreUsuario } = useAccesoPortal();
  const sugerencia = sugerirNombreUsuario({ nombre, apellido });
  const [nombreUsuario, setNombreUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAccesoSalidaDto | null>(
    null,
  );
  // Igual que en el alta: el usuario hace falta solo si no puede entrar con
  // su email (no tiene, o ya es el ingreso de otra cuenta del consultorio).
  const revision = useRevisionEmail(emailPaciente ?? undefined, pacienteId);
  const emailTomado = Boolean(emailPaciente && revision?.esIngresoDeOtraCuenta);
  const usuarioObligatorio = !emailPaciente || emailTomado;
  const [quiereUsuario, setQuiereUsuario] = useState(false);
  const mostrarUsuario = usuarioObligatorio || quiereUsuario;

  if (resultado) {
    return (
      <>
        <DialogHeader>
          <DialogTitle>Acceso al portal</DialogTitle>
        </DialogHeader>
        <ResultadoAccesoPortal
          nombrePaciente={nombrePaciente}
          resultado={resultado}
          contrasena={password}
          onListo={onListo}
        />
      </>
    );
  }

  function enviar() {
    const usuario = normalizarNombreUsuario(nombreUsuario);
    if (!usuario && usuarioObligatorio) {
      setError(
        emailPaciente
          ? "Ese email ya lo usa otra cuenta para entrar: elegí un nombre de usuario."
          : "Sin email, elegí un nombre de usuario.",
      );
      return;
    }
    if (usuario && !esNombreUsuarioValido(usuario)) {
      setError(REGLA_NOMBRE_USUARIO);
      return;
    }
    const validada = passwordNuevaDto.safeParse(password);
    if (!validada.success) {
      setError(validada.error.issues[0]?.message ?? "Contraseña inválida");
      return;
    }
    setError(null);
    darAcceso.mutate(
      { pacienteId, nombreUsuario: usuario || null, password },
      { onSuccess: setResultado },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Darle acceso al portal</DialogTitle>
        <DialogDescription>
          {!emailPaciente
            ? "No tiene email: va a entrar con un nombre de usuario."
            : emailTomado
              ? `${emailPaciente} ya es con lo que entra ${revision?.ingresoDe ?? "otra cuenta"}: este paciente va a entrar con un nombre de usuario.`
              : `Va a entrar con su email, ${emailPaciente}.`}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        {!mostrarUsuario && (
          <button
            type="button"
            className="text-xs text-primary underline-offset-2 hover:underline"
            onClick={() => setQuiereUsuario(true)}
          >
            Agregar también un nombre de usuario (opcional)
          </button>
        )}
        {mostrarUsuario && (
          <div className="space-y-1">
            <Label htmlFor="acceso-usuario">
              Nombre de usuario{usuarioObligatorio ? "" : " (opcional)"}
            </Label>
            <div className="flex gap-2">
              <Input
                id="acceso-usuario"
                autoCapitalize="none"
                placeholder={sugerencia.data?.nombreUsuario ?? "juan.perez"}
                value={nombreUsuario}
                onChange={(e) => setNombreUsuario(e.target.value)}
              />
              {sugerencia.data?.nombreUsuario && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="Usar el nombre de usuario sugerido"
                  onClick={() =>
                    setNombreUsuario(sugerencia.data?.nombreUsuario ?? "")
                  }
                >
                  <Wand2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        )}
        <div className="space-y-1">
          <Label htmlFor="acceso-password">Contraseña</Label>
          <Input
            id="acceso-password"
            placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onListo}>
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={darAcceso.isPending}>
            {darAcceso.isPending ? "Creando…" : "Crear cuenta"}
          </Button>
        </div>
      </div>
    </>
  );
}

function Restablecer({
  pacienteId,
  nombrePaciente,
  onListo,
}: {
  pacienteId: string;
  nombrePaciente: string;
  onListo: () => void;
}) {
  const { restablecerPassword } = useAccesoPortal();
  const [manual, setManual] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [credenciales, setCredenciales] =
    useState<CredencialesPortalSalidaDto | null>(null);

  function enviar() {
    if (manual) {
      const validada = passwordNuevaDto.safeParse(manual);
      if (!validada.success) {
        setError(validada.error.issues[0]?.message ?? "Contraseña inválida");
        return;
      }
    }
    setError(null);
    restablecerPassword.mutate(
      {
        pacienteId,
        contrasena: manual
          ? { modo: "MANUAL", valor: manual }
          : { modo: "GENERADA" },
      },
      { onSuccess: setCredenciales },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Restablecer contraseña</DialogTitle>
        <DialogDescription>
          La anterior deja de funcionar y se cierran sus sesiones abiertas. La
          nueva queda como provisional: el portal le recomienda cambiarla.
        </DialogDescription>
      </DialogHeader>
      {credenciales ? (
        <div className="space-y-4">
          <Credenciales
            nombrePaciente={nombrePaciente}
            identificador={credenciales.identificador}
            contrasena={credenciales.contrasena}
          />
          <div className="flex justify-end">
            <Button onClick={onListo}>Listo</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="restablecer-password">
              Contraseña nueva (vacía = generar una al azar)
            </Label>
            <Input
              id="restablecer-password"
              placeholder={`Mínimo ${LARGO_MINIMO_PASSWORD} caracteres`}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onListo}>
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={restablecerPassword.isPending}>
              Restablecer
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function Invitar({
  pacienteId,
  nombrePaciente,
  emailPaciente,
  yaTieneCuenta,
  onListo,
}: {
  pacienteId: string;
  nombrePaciente: string;
  emailPaciente: string | null;
  yaTieneCuenta: boolean;
  onListo: () => void;
}) {
  const { generarInvitacion } = useAccesoPortal();
  const [porEmail, setPorEmail] = useState(Boolean(emailPaciente));
  const [invitacion, setInvitacion] =
    useState<InvitacionEmitidaSalidaDto | null>(null);

  return (
    <>
      <DialogHeader>
        <DialogTitle>Código de invitación</DialogTitle>
        <DialogDescription>
          {yaTieneCuenta
            ? `Si ${nombrePaciente} ya tenía otra cuenta (con otro profesional), puede juntarlas: entra con esa y carga este código en «Mis consultorios». Esta ficha pasa a esa cuenta y la que tiene ahora se borra.`
            : `Si ${nombrePaciente} ya tiene cuenta con otro profesional, no le crees otra: entra con la suya y carga este código en «Mis consultorios». Así la ficha de acá queda en su cuenta.`}
        </DialogDescription>
      </DialogHeader>
      {invitacion ? (
        <div className="space-y-4">
          <CodigoInvitacion
            nombrePaciente={nombrePaciente}
            invitacion={invitacion}
          />
          <div className="flex justify-end">
            <Button onClick={onListo}>Listo</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {emailPaciente && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={porEmail}
                onChange={(e) => setPorEmail(e.target.checked)}
              />
              Mandarlo también a {emailPaciente}
            </label>
          )}
          <p className="text-xs text-muted-foreground">
            Generar un código nuevo anula el anterior.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onListo}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                generarInvitacion.mutate(
                  { pacienteId, enviarPorEmail: porEmail },
                  { onSuccess: setInvitacion },
                )
              }
              disabled={generarInvitacion.isPending}
            >
              Generar código
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Poner, cambiar o sacar el nombre de usuario (solo cuentas exclusivas).
 * Sacarlo solo se puede si la cuenta entra también con email.
 */
function CambiarUsuario({
  pacienteId,
  actual,
  tieneEmail,
  onListo,
}: {
  pacienteId: string;
  actual: string | null;
  tieneEmail: boolean;
  onListo: () => void;
}) {
  const { cambiarUsuario } = useAccesoPortal();
  const [valor, setValor] = useState(actual ?? "");
  const [error, setError] = useState<string | null>(null);

  function guardar() {
    const usuario = normalizarNombreUsuario(valor);
    if (!usuario && !tieneEmail) {
      setError(
        "La cuenta no tiene email: el usuario es con lo único que entra.",
      );
      return;
    }
    if (usuario && !esNombreUsuarioValido(usuario)) {
      setError(REGLA_NOMBRE_USUARIO);
      return;
    }
    setError(null);
    cambiarUsuario.mutate(
      { pacienteId, nombreUsuario: usuario || null },
      {
        onSuccess: ({ identificador }) => {
          toast.success(`Ahora entra con ${identificador}.`);
          onListo();
        },
      },
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nombre de usuario</DialogTitle>
        <DialogDescription>
          {tieneEmail
            ? "Es otra forma de entrar, además del email. Dejalo vacío para sacarlo."
            : "No tiene email: es con lo único que entra. Avisale el cambio."}
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <Input
          autoCapitalize="none"
          placeholder="juan.perez"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onListo}>
            Cancelar
          </Button>
          <Button onClick={guardar} disabled={cambiarUsuario.isPending}>
            Guardar
          </Button>
        </div>
      </div>
    </>
  );
}
