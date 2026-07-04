"use client";
import { useEffect, useRef } from "react";

/**
 * Частица пыли: координаты, скорость, время жизни, размер, прозрачность.
 */
interface DustParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;    // оставшееся время жизни 0..1
  maxLife: number;  // исходное время жизни для вычисления fade
  size: number;
  brightness: number; // 0..1 — вариация яркости
}

const PARTICLE_COUNT = 150;
const SPAWN_RATE = 1.5;       // частиц за кадр при движении
const MIN_SPEED = 0.2;
const MAX_SPEED = 1.5;
const MIN_SIZE = 0.6;
const MAX_SIZE = 2.0;
const MIN_LIFE = 0.4;        // в секундах
const MAX_LIFE = 1.5;
const MOUSE_IDLE_THRESHOLD = 2; // px — порог движения мыши

/**
 * Компонент MouseDustTrail — canvas с сотнями пылевых частиц,
 * которые разлетаются радиально *от* курсора при его движении
 * и плавно затухают.
 */
export default function MouseDustTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<DustParticle[]>([]);
  const mouseRef = useRef({ x: -100, y: -100, prevX: -100, prevY: -100 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let lastTimestamp = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    resize();
    window.addEventListener("resize", resize);

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      mouseRef.current.prevX = mouseRef.current.x;
      mouseRef.current.prevY = mouseRef.current.y;
      mouseRef.current.x = touch.clientX;
      mouseRef.current.y = touch.clientY;
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });

    // Спавн частиц при движении мыши
    const spawnParticles = (dt: number) => {
      const { x, y, prevX, prevY } = mouseRef.current;
      const dx = x - prevX;
      const dy = y - prevY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < MOUSE_IDLE_THRESHOLD) return;

      // Количество частиц пропорционально скорости мыши и времени кадра
      const count = Math.min(Math.floor(dist * SPAWN_RATE * dt), 5); // Ограничено 5 за кадр чтобы не плодить тысячи

      for (let i = 0; i < count; i++) {
        // Случайный угол разлёта от курсора
        const angle = Math.random() * Math.PI * 2;
        const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);
        const life = MIN_LIFE + Math.random() * (MAX_LIFE - MIN_LIFE);

        const particle: DustParticle = {
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          maxLife: life,
          size: MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE),
          brightness: 0.4 + Math.random() * 0.6,
        };
        particlesRef.current.push(particle);
      }
    };

    // Обновление и отрисовка
    const updateAndDraw = (timestamp: number) => {
      const dt = lastTimestamp ? (timestamp - lastTimestamp) / 1000 : 0.016;
      lastTimestamp = timestamp;
      timeRef.current += dt;

      // Спавн новых частиц
      spawnParticles(dt);

      // Очистка canvas
      ctx.clearRect(0, 0, width, height);

      // Обновление и отрисовка частиц
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        // Уменьшаем время жизни
        p.life -= dt / p.maxLife;

        // Удаляем мёртвые частицы
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }

        // Движение
        p.x += p.vx;
        p.y += p.vy;
        // Лёгкое замедление
        p.vx *= 0.98;
        p.vy *= 0.98;

        // Прозрачность по времени жизни (ease-out)
        const alpha = p.life * p.life * 0.7 * p.brightness;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(232, 168, 64, ${alpha})`;
        ctx.fill();

        // Лёгкое свечение для крупных частиц
        if (p.size > 1.4 && p.life > 0.3) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 200, 120, ${alpha * 0.15})`;
          ctx.fill();
        }
      }

      // Ограничиваем количество частиц
      if (particles.length > PARTICLE_COUNT + 200) {
        particles.splice(PARTICLE_COUNT);
      }

      animationId = requestAnimationFrame(updateAndDraw);
    };

    animationId = requestAnimationFrame(updateAndDraw);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 6,
      }}
      aria-hidden="true"
    />
  );
}