"use client";

import * as React from "react";

/**
 * VisuallyHidden component - hides content visually but keeps it accessible for screen readers
 * Use this to wrap DialogTitle when you don't want it visible but still need it for accessibility
 */
export const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  React.HTMLAttributes<HTMLSpanElement>
>(({ children, ...props }, ref) => (
  <span
    ref={ref}
    style={{
      position: "absolute",
      width: "1px",
      height: "1px",
      padding: 0,
      margin: "-1px",
      overflow: "hidden",
      clip: "rect(0, 0, 0, 0)",
      whiteSpace: "nowrap",
      border: 0,
    }}
    {...props}
  >
    {children}
  </span>
));

VisuallyHidden.displayName = "VisuallyHidden";
