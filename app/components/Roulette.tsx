"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MdDelete, MdPlayArrow, MdRestartAlt } from "react-icons/md";
import { api, type Film, type RouletteState } from "../services/api";
import { filmKeys } from "../hooks/useFilms";
import { winnerKeys } from "../hooks/useWinners";
import WatchLinks from "./WatchLinks/WatchLinks";
import RouletteReel from "./RouletteReel/RouletteReel";
import styles from "./Roulette.module.css";
import { AnimatePresence, motion } from "motion/react";

interface RouletteProps {
  films: Film[];
  contributions: { name: string; count: number }[];
  rouletteState?: RouletteState;
  onHistoryChange?: (films: Film[]) => void;
}

const COUNTDOWN = 120;
export default function Roulette({ films, contributions, rouletteState, onHistoryChange }: RouletteProps) {
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN);
  const [startError, setStartError] = useState<string | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishingRef = useRef(false);
  const removingRef = useRef(false);
  const winner = rouletteState?.winner ?? null;
  const isRunning = Boolean(rouletteState?.active);

  const clearFinishTimer = () => {
    if (finishTimerRef.current) clearTimeout(finishTimerRef.current);
    finishTimerRef.current = null;
  };

  useEffect(() => () => clearFinishTimer(), []);

  useEffect(() => {
    onHistoryChange?.([]);
  }, [onHistoryChange]);

  const resetRoulette = useCallback(async () => {
    clearFinishTimer();
    setTimeLeft(COUNTDOWN);
    await api.resetRoulette();
    await queryClient.invalidateQueries({ queryKey: ["roulette"] });
  }, [queryClient]);

  const handleRemoveWinner = useCallback(async () => {
    if (!winner || removingRef.current) return;
    removingRef.current = true;
    try {
      await api.deleteFilm(winner.id);
      await api.addWinner(winner);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: filmKeys.all }),
        queryClient.invalidateQueries({ queryKey: winnerKeys.all }),
      ]);
    } catch (error) {
      console.error("Ошибка сохранения победителя и удаления фильма:", error);
      removingRef.current = false;
      return;
    }
    removingRef.current = false;
    await resetRoulette();
  }, [queryClient, resetRoulette, winner]);

  useEffect(() => {
    if (!winner || !rouletteState?.wonAt) return;
    const tick = () => {
      const remaining = Math.max(0, COUNTDOWN - Math.floor((Date.now() - rouletteState.wonAt!) / 1000));
      setTimeLeft(remaining);
      if (!remaining && !removingRef.current) {
        void handleRemoveWinner();
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [handleRemoveWinner, winner, rouletteState?.wonAt]);

  useEffect(() => {
    if (!rouletteState?.active || !rouletteState.startedAt || !rouletteState.duration || !rouletteState.winnerId) return;
    const selected = films.find((film) => film.id === rouletteState.winnerId);
    if (!selected) return;

    const finish = async () => {
      if (finishingRef.current) return;
      finishingRef.current = true;
      try {
        const nextState = await api.finishRoulette(selected);
        queryClient.setQueryData(["roulette"], nextState);
      } catch (error) {
        console.error("Ошибка завершения рулетки:", error);
      } finally {
        finishingRef.current = false;
      }
    };

    const clockOffset = rouletteState.serverTime ? rouletteState.serverTime - Date.now() : 0;
    const remaining = Math.max(0, rouletteState.startedAt + rouletteState.duration - (Date.now() + clockOffset));
    finishTimerRef.current = setTimeout(() => void finish(), remaining);
    return clearFinishTimer;
  }, [films, queryClient, rouletteState?.active, rouletteState?.duration, rouletteState?.serverTime, rouletteState?.startedAt, rouletteState?.winnerId]);

  const startRoulette = async () => {
    if (films.length <= 1 || isRunning) return;
    setStartError(null);
    clearFinishTimer();
    finishingRef.current = false;
    try {
      const nextState = await api.startRoulette(films.map((film) => film.id));
      queryClient.setQueryData(["roulette"], nextState);
    } catch (error) {
      console.error("Ошибка запуска рулетки:", error);
      setStartError(error instanceof Error ? error.message : "Не удалось запустить рулетку");
    }
  };

  if (!films.length) return <div className={styles.roulette}><p className={styles.emptyState}>Нет фильмов для рулетки</p></div>;

  return (
    <div className={styles.roulette}>
      <div className={styles.stage}>
        <div className={styles.launchCopy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={winner ? "winner" : isRunning ? "running" : "ready"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              <span className={styles.kicker}>{winner ? "Выбор сделан" : isRunning ? "Идёт выбор" : "Очередь собрана"}</span>
              <h2>{winner ? winner.title : isRunning ? "Смотрим, где остановится…" : "Готовы довериться выбору?"}</h2>
            </motion.div>
          </AnimatePresence>
          <p>{isRunning ? "Постеры замедляются у центральной отметки." : <><strong>{films.length} фильмов</strong> — один случайный выбор на вечер.</>}</p>
          {!isRunning && !winner && <div className={styles.contributions}>{contributions.map((item) => <span key={item.name}>{item.name} {item.count}</span>)}</div>}
          <div className={styles.rouletteControls}>
            <button className={styles.rouletteButton} onClick={startRoulette} disabled={isRunning || !!winner || films.length <= 1}><MdPlayArrow size={20} />Запустить выбор</button>
            <button className={styles.rouletteButtonSecondary} onClick={() => void resetRoulette()} disabled={isRunning}><MdRestartAlt size={20} />Перезапустить</button>
          </div>
          {startError && <p role="alert">{startError}</p>}
        </div>

        <RouletteReel films={films} state={rouletteState} />
      </div>

      <AnimatePresence>
        {winner && <motion.div className={styles.winnerView} initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 18 }}><div className={styles.winnerContent}><motion.div className={styles.winnerCard} initial={{ scale: 0.92, rotate: -2 }} animate={{ scale: 1, rotate: 0 }} style={{ backgroundImage: winner.poster ? `url(${winner.poster})` : undefined }} /><WatchLinks title={winner.title} year={winner.year} /></div><div className={styles.winnerAnnouncement}><span className={styles.winnerKicker}>Победитель вечера</span><h2 className={styles.winnerText}>{winner.title}</h2><div className={styles.winnerTimer}>Фильм будет удалён из списка через {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div><button className={styles.removeBtn} onClick={() => void handleRemoveWinner()}><MdDelete size={18} />Удалить из списка</button></div></motion.div>}
      </AnimatePresence>
    </div>
  );
}
