"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
} from "react-hook-form";
import { cn } from "@/lib/utilidades";
import { Label } from "./label";

/** Proveedor de formulario de react-hook-form (alias de FormProvider). */
const Form = FormProvider;

type ContextoCampo = { name: string };
const ContextoCampoForm = React.createContext<ContextoCampo>({} as ContextoCampo);

function FormField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({ ...props }: ControllerProps<TFieldValues, TName>) {
  return (
    <ContextoCampoForm.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </ContextoCampoForm.Provider>
  );
}

function useCampoForm() {
  const contextoCampo = React.useContext(ContextoCampoForm);
  const contextoItem = React.useContext(ContextoItemForm);
  const { getFieldState, formState } = useFormContext();
  const estado = getFieldState(contextoCampo.name, formState);

  const id = contextoItem.id;
  return {
    id,
    name: contextoCampo.name,
    formItemId: `${id}-form-item`,
    formMessageId: `${id}-form-item-message`,
    ...estado,
  };
}

type ContextoItem = { id: string };
const ContextoItemForm = React.createContext<ContextoItem>({} as ContextoItem);

const FormItem = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = React.useId();
    return (
      <ContextoItemForm.Provider value={{ id }}>
        <div ref={ref} className={cn("space-y-2", className)} {...props} />
      </ContextoItemForm.Provider>
    );
  },
);
FormItem.displayName = "FormItem";

const FormLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => {
  const { error, formItemId } = useCampoForm();
  return (
    <Label
      ref={ref}
      className={cn(error && "text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
});
FormLabel.displayName = "FormLabel";

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ ...props }, ref) => {
  const { error, formItemId, formMessageId } = useCampoForm();
  return (
    <Slot
      ref={ref}
      id={formItemId}
      aria-describedby={formMessageId}
      aria-invalid={!!error}
      {...props}
    />
  );
});
FormControl.displayName = "FormControl";

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageId } = useCampoForm();
  const cuerpo = error ? String(error?.message ?? "") : children;
  if (!cuerpo) return null;
  return (
    <p
      ref={ref}
      id={formMessageId}
      className={cn("text-sm font-medium text-destructive", className)}
      {...props}
    >
      {cuerpo}
    </p>
  );
});
FormMessage.displayName = "FormMessage";

export { Form, FormItem, FormLabel, FormControl, FormMessage, FormField, useCampoForm };
