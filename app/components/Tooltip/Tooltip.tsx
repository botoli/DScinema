"use client";
import { useState, useRef, useCallback } from "react";
import styles from "./Tooltip.module.css";

interface TooltipProps {
  children: React.ReactNode;
  label: string;
}

function Tooltip({ children, label }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  }, []);

  return (
    <div className={styles.wrapper} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {visible && <div className={styles.tooltip}>{label}</div>}
    </div>
  );
}

export default Tooltip;
