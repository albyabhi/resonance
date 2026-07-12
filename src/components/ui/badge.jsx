import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15",
        error:
          "border-transparent bg-red-500/10 text-red-700 hover:bg-red-500/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export { Badge, badgeVariants };
