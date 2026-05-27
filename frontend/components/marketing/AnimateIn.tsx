"use client";

import { useScrollAnimation } from "@/lib/hooks/useScrollAnimation";
import { clsx } from "clsx";

interface Props {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "left" | "right" | "none";
  className?: string;
}

export function AnimateIn({ children, delay = 0, direction = "up", className }: Props) {
  const { ref, visible } = useScrollAnimation();

  const base = "transition-all duration-700 ease-out";
  const hidden = {
    up: "opacity-0 translate-y-8",
    left: "opacity-0 -translate-x-8",
    right: "opacity-0 translate-x-8",
    none: "opacity-0",
  }[direction];

  return (
    <div
      ref={ref}
      className={clsx(base, visible ? "opacity-100 translate-x-0 translate-y-0" : hidden, className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}