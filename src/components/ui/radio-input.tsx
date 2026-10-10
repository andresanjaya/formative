import * as React from "react"
import { cn } from "cn"

function RadioInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      data-slot="radio-input"
      type="radio"
      className={cn(
        "size-4 shrink-0 accent-primary outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { RadioInput }
