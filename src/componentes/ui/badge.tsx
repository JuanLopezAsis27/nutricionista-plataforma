import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utilidades";

const variantesBadge = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface PropsBadge
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof variantesBadge> {}

function Badge({ className, variant, ...props }: PropsBadge) {
  return (
    <div className={cn(variantesBadge({ variant }), className)} {...props} />
  );
}

export { Badge, variantesBadge };
