"use client";
import { useEffect, type RefObject } from "react";

export function useMouseGlow(originRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      document.documentElement.style.setProperty("--mx", "50%");
      document.documentElement.style.setProperty("--my", "18%");
      return;
    }

    let rafId: number | null = null;
    let targetX = 50;
    let targetY = 50;
    let currentX = 50;
    let currentY = 50;

    const onMouseMove = (e: MouseEvent) => {
      targetX = (e.clientX / window.innerWidth) * 100;
      targetY = (e.clientY / window.innerHeight) * 100;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        targetX = (touch.clientX / window.innerWidth) * 100;
        targetY = (touch.clientY / window.innerHeight) * 100;
      }
    };

    const animate = () => {
      currentX += (targetX - currentX) * 0.1;
      currentY += (targetY - currentY) * 0.1;

      const rect = originRef.current?.getBoundingClientRect();
      if (rect) {
        const originX = rect.left + rect.width / 2;
        const originY = rect.top + rect.height / 2;
        const cursorX = window.innerWidth * currentX / 100;
        const cursorY = window.innerHeight * currentY / 100;
        const dx = cursorX - originX;
        const dy = cursorY - originY;

        document.documentElement.style.setProperty("--beam-x", `${originX}px`);
        document.documentElement.style.setProperty("--beam-y", `${originY}px`);
        document.documentElement.style.setProperty("--beam-length", `${Math.hypot(dx, dy) + 90}px`);
        document.documentElement.style.setProperty("--beam-angle", `${Math.atan2(dy, dx)}rad`);
      }

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Set initial position to center
    document.documentElement.style.setProperty("--mx", "50%");
    document.documentElement.style.setProperty("--my", "50%");
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [originRef]);
}
