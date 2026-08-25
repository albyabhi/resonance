import React, { createContext, useState, useRef, useEffect } from "react";
import ReactDOM from "react-dom";

const TooltipContext = createContext(null);

export function TooltipProvider({ children }) {
  return (
    <TooltipContext.Provider value={{}}>
      {children}
    </TooltipContext.Provider>
  );
}

export function TooltipTrigger({ asChild, children, ...props }) {
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { ...children.props, ...props });
  }
  return <div {...props}>{children}</div>;
}

// Simple Portal component
function Portal({ children }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) {
      mountRef.current = document.createElement("div");
      document.body.appendChild(mountRef.current);
    }
    return () => {
      if (mountRef.current && document.body.contains(mountRef.current)) {
        document.body.removeChild(mountRef.current);
      }
    };
  }, []);

  return mountRef.current ? ReactDOM.createPortal(children, mountRef.current) : null;
}

export function TooltipContent({ children, side = "bottom", align = "center", className = "", open, ...props }) {
  const triggerRef = useRef(null);
  const contentRef = useRef(null);

  useEffect(() => {
    if (!triggerRef.current || !contentRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (side) {
      case "top":
        top = triggerRect.top - contentRect.height - 8;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case "bottom":
        top = triggerRect.bottom + 8;
        left = triggerRect.left + (triggerRect.width - contentRect.width) / 2;
        break;
      case "left":
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.left - contentRect.width - 8;
        break;
      case "right":
        top = triggerRect.top + (triggerRect.height - contentRect.height) / 2;
        left = triggerRect.right + 8;
        break;
    }

    // Adjust for alignment
    if (align === "start") {
      if (side === "top" || side === "bottom") {
        left = triggerRect.left;
      } else {
        top = triggerRect.top;
      }
    } else if (align === "end") {
      if (side === "top" || side === "bottom") {
        left = triggerRect.right - contentRect.width;
      } else {
        top = triggerRect.bottom - contentRect.height;
      }
    }

    // Keep within viewport
    if (left < 8) left = 8;
    if (left + contentRect.width > viewportWidth - 8) left = viewportWidth - contentRect.width - 8;
    if (top < 8) top = 8;
    if (top + contentRect.height > viewportHeight - 8) top = viewportHeight - contentRect.height - 8;

    contentRef.current.style.top = `${top}px`;
    contentRef.current.style.left = `${left}px`;
  }, [side, align, open]);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={contentRef}
        className={`fixed z-50 px-3 py-2 text-xs font-medium text-white rounded-lg shadow-lg pointer-events-none animate-in fade-in-0 zoom-in-95 duration-200 ${className}`}
        style={{ backgroundColor: "var(--foreground)", ...props.style }}
        role="tooltip"
      >
        {children}
      </div>
    </Portal>
  );
}

export function Tooltip({ children, delayDuration = 200 }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const timeoutRef = useRef(null);

  const show = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const hide = () => {
    clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  const handleMouseEnter = () => {
    if (triggerRef.current) show();
  };

  const handleMouseLeave = () => hide();

  const handleFocus = () => show();
  const handleBlur = () => hide();

  // Support both call conventions:
  //   Radix style: <Tooltip><TooltipTrigger asChild>{el}</TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>
  //   Legacy single element: <Tooltip>{el}</Tooltip>
  // Children.toArray safely flattens fragments/arrays and drops null/false slots.
  let triggerElement = null;
  let triggerExtraProps = {};
  let contentElement = null;

  for (const child of React.Children.toArray(children)) {
    if (!React.isValidElement(child)) continue;
    if (child.type === TooltipTrigger) {
      // asChild is consumed implicitly — the inner element is always cloned.
      const { asChild: _asChild, children: innerTrigger, ...rest } = child.props;
      if (React.isValidElement(innerTrigger)) {
        triggerElement = innerTrigger;
        triggerExtraProps = rest;
      }
    } else if (child.type === TooltipContent) {
      contentElement = child;
    } else if (triggerElement === null) {
      // No explicit TooltipTrigger — treat a lone element as the trigger.
      triggerElement = child;
    }
  }

  // Nothing hoverable to attach to — render nothing instead of crashing.
  if (!React.isValidElement(triggerElement)) return null;

  const triggerClone = React.cloneElement(triggerElement, {
    ...triggerElement.props,
    ref: triggerRef,
    onMouseEnter: handleMouseEnter,
    onMouseLeave: handleMouseLeave,
    onFocus: handleFocus,
    onBlur: handleBlur,
    ...triggerExtraProps,
  });

  return (
    <>
      {triggerClone}
      {/* Clone preserves the consumer's own children/side/align */}
      {contentElement ? React.cloneElement(contentElement, { open }) : null}
    </>
  );
}