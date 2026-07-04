"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import type { Film, RouletteState } from "../../services/api";
import styles from "./RouletteReel.module.css";

interface RouletteReelProps {
  films: Film[];
  state?: RouletteState;
  compact?: boolean;
}

const IDLE_CENTER = 15;
const START_POSITION = 4;

const easeOutQuint = (value: number) => 1 - Math.pow(1 - value, 5);
const subscribeToReducedMotion = (onChange: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function RouletteReel({ films, state, compact = false }: RouletteReelProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const clockOffsetRef = useRef(0);
  const [position, setPosition] = useState(IDLE_CENTER);
  const [step, setStep] = useState(compact ? 96 : 122);
  const reducedMotion = useSyncExternalStore(subscribeToReducedMotion, getReducedMotion, () => false);

  const filmById = useMemo(() => new Map(films.map((film) => [film.id, film])), [films]);
  const idleIds = useMemo(
    () => Array.from({ length: IDLE_CENTER * 2 + 1 }, (_, index) => films[index % films.length]?.id).filter(Boolean) as string[],
    [films],
  );
  const reelIds = state?.reelFilmIds?.length ? state.reelFilmIds : idleIds;
  const target = state?.targetPosition ?? IDLE_CENTER;
  const hasScenario = Boolean(state?.reelFilmIds?.length && state.targetPosition !== undefined);
  const displayPosition = !hasScenario || !state?.active || reducedMotion ? target : position;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const update = () => {
      const width = viewport.clientWidth;
      setStep(width < 460 ? 82 : compact ? 96 : width < 720 ? 100 : 122);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [compact]);

  useEffect(() => {
    if (state?.serverTime) clockOffsetRef.current = state.serverTime - Date.now();
  }, [state?.serverTime]);

  useEffect(() => {
    if (!hasScenario || !state?.active || reducedMotion || !state.startedAt || !state.duration) return;

    let frame = 0;
    const draw = () => {
      const serverNow = Date.now() + clockOffsetRef.current;
      const progress = Math.min(1, Math.max(0, (serverNow - state.startedAt!) / state.duration!));
      setPosition(START_POSITION + (target - START_POSITION) * easeOutQuint(progress));
      if (progress < 1) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [hasScenario, reducedMotion, state?.active, state?.duration, state?.startedAt, target]);

  return (
    <div ref={viewportRef} className={`${styles.viewport} ${compact ? styles.compact : ""}`} aria-label="Рулетка фильмов">
      <div className={styles.glow} />
      {reelIds.map((filmId, index) => {
        const film = filmById.get(filmId);
        const distance = index - displayPosition;
        const absoluteDistance = Math.abs(distance);
        if (!film || absoluteDistance > 5.2) return null;

        const scale = Math.max(0.64, 1 - absoluteDistance * 0.115);
        const opacity = Math.max(0.18, 1 - absoluteDistance * 0.17);
        const isCentered = absoluteDistance < 0.5;
        const cardStyle = {
          "--reel-x": `${distance * step}px`,
          "--reel-scale": scale,
          "--reel-opacity": opacity,
          "--reel-tilt": `${Math.max(-3, Math.min(3, distance * 1.15))}deg`,
          "--reel-z": Math.max(1, 20 - Math.round(absoluteDistance * 3)),
          backgroundImage: film.poster ? `url(${film.poster})` : undefined,
        } as CSSProperties;

        return (
          <article key={`${filmId}-${index}`} className={`${styles.card} ${isCentered ? styles.centered : ""}`} style={cardStyle} aria-hidden={!isCentered}>
            {!film.poster && <span className={styles.fallback}>{film.title.slice(0, 1)}</span>}
            <div className={styles.cardShade} />
            <div className={styles.cardInfo}>
              <strong>{film.title}</strong>
              <span>{film.year || "—"} · {film.from}</span>
            </div>
          </article>
        );
      })}
    </div>
  );
}
