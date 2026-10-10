import * as React from "react"
import { cn } from "cn"

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-group" className={cn("grid gap-4", className)} {...props} />
}

function Field({ className, orientation = "vertical", ...props }: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return <div data-slot="field" data-orientation={orientation} className={cn(orientation === "horizontal" ? "flex items-center gap-3" : "grid gap-2", className)} {...props} />
}

function FieldLabel({ className, ...props }: React.ComponentProps<"label">) {
  return <label data-slot="field-label" className={cn("text-sm font-medium leading-none", className)} {...props} />
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="field-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return <fieldset data-slot="field-set" className={cn("grid gap-4", className)} {...props} />
}

function FieldLegend({ className, ...props }: React.ComponentProps<"legend">) {
  return <legend data-slot="field-legend" className={cn("text-base font-medium", className)} {...props} />
}

function FieldSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="field-separator" role="separator" className={cn("h-px bg-border", className)} {...props} />
}

export { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet }
