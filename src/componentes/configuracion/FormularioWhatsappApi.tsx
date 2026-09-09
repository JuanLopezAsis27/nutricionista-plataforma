"use client";

import { useEffect, useState } from "react";
import { Plug, CheckCircle2, Circle } from "lucide-react";
import { useCredenciales } from "@/lib/hooks/useCredenciales";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/componentes/ui/card";
import { Input } from "@/componentes/ui/input";
import { Label } from "@/componentes/ui/label";
import { Button } from "@/componentes/ui/button";
import { Skeleton } from "@/componentes/ui/skeleton";
import { EliminarCredenciales } from "./EliminarCredenciales";

/**
 * Conexión con la Cloud API oficial de Meta. Con esto cargado, el recordatorio
 * sale solo (sin abrir WhatsApp a mano) y los mensajes del paciente aparecen
 * dentro de la app.
 *
 * Los secretos se guardan cifrados y nunca vuelven al navegador: los campos
 * arrancan vacíos y dejarlos así significa "no cambiar".
 */
export function FormularioWhatsappApi() {
  const { estado, guardar } = useCredenciales();
  const consulta = estado();
  const e = consulta.data;

  const [token, setToken] = useState("");
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [urlWebhook, setUrlWebhook] = useState("");

  // El phone_number_id no es secreto: se precarga para poder verificarlo.
  useEffect(() => {
    if (e?.whatsappPhoneNumberId) setPhoneNumberId(e.whatsappPhoneNumberId);
  }, [e?.whatsappPhoneNumberId]);

  useEffect(() => {
    setUrlWebhook(`${window.location.origin}/api/whatsapp/webhook`);
  }, []);

  if (consulta.isLoading || !e) {
    return <Skeleton className="h-80 w-full" />;
  }

  function onGuardar() {
    guardar.mutate({
      whatsappToken: token.trim() || undefined, // vacío = no cambiar
      whatsappPhoneNumberId: phoneNumberId.trim() || undefined,
      whatsappVerifyToken: verifyToken.trim() || undefined,
      whatsappAppSecret: appSecret.trim() || undefined,
    });
    setToken("");
    setVerifyToken("");
    setAppSecret("");
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plug className="h-5 w-5 text-primary" /> Conexión con la API oficial
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5 text-sm">
          <Marca
            activo={e.whatsappConfigurado}
            texto="Envío conectado (token + número)"
          />
          <Marca
            activo={e.whatsappWebhookListo}
            texto="Webhook listo (verify token + app secret)"
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Necesita un número dedicado dado de alta en Meta Business: ese número
          deja de funcionar en la app de WhatsApp del celular y no arrastra el
          historial previo. Sin esto cargado, el recordatorio sigue funcionando
          por enlace wa.me.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="wa-phone">Phone number ID</Label>
            <Input
              id="wa-phone"
              placeholder="Ej: 123456789012345"
              value={phoneNumberId}
              onChange={(ev) => setPhoneNumberId(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-token">Access token</Label>
            <Input
              id="wa-token"
              type="password"
              autoComplete="off"
              placeholder={
                e.whatsappConfigurado
                  ? "Guardado — dejalo vacío para no cambiarlo"
                  : "EAAG…"
              }
              value={token}
              onChange={(ev) => setToken(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-verify">Verify token del webhook</Label>
            <Input
              id="wa-verify"
              type="password"
              autoComplete="off"
              placeholder={
                e.whatsappWebhookListo
                  ? "Guardado"
                  : "El que inventes y pegues en Meta"
              }
              value={verifyToken}
              onChange={(ev) => setVerifyToken(ev.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wa-secret">App secret</Label>
            <Input
              id="wa-secret"
              type="password"
              autoComplete="off"
              placeholder={
                e.whatsappWebhookListo ? "Guardado" : "De la app de Meta"
              }
              value={appSecret}
              onChange={(ev) => setAppSecret(ev.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wa-url">URL del webhook (pegala en Meta)</Label>
          <Input
            id="wa-url"
            readOnly
            value={urlWebhook}
            onFocus={(ev) => ev.target.select()}
          />
          <p className="text-xs text-muted-foreground">
            Suscribite al campo{" "}
            <code className="rounded bg-muted px-1">messages</code>. Sin el app
            secret cargado, la app rechaza todos los webhooks que entren.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <EliminarCredenciales
            integracion="WHATSAPP"
            nombre="WhatsApp Cloud API"
            consecuencia="Los recordatorios vuelven a salir por enlace wa.me y la app deja de recibir los mensajes del paciente."
            configurada={e.whatsappConfigurado || e.whatsappWebhookListo}
          />
          <Button
            type="button"
            disabled={guardar.isPending}
            onClick={onGuardar}
          >
            Guardar conexión
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Marca({ activo, texto }: { activo: boolean; texto: string }) {
  return (
    <p className="flex items-center gap-2">
      {activo ? (
        <CheckCircle2 className="h-4 w-4 text-primary" />
      ) : (
        <Circle className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={activo ? "" : "text-muted-foreground"}>{texto}</span>
    </p>
  );
}
