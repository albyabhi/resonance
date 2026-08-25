import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "../../lib/utils";

function LoadingButton({
  loading = false,
  loadingText = "Loading...",
  spinnerOnly = false,
  children,
  disabled,
  className,
  ...props
}) {
  const isLoading = loading || disabled;

  return (
    <Button
      disabled={isLoading}
      className={cn(className)}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {!spinnerOnly && loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export { LoadingButton };