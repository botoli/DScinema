"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import styles from "./Roulette.module.css";
import {
  MdPause,
  MdPlayArrow,
  MdRestartAlt,
  MdEmojiEvents,
  MdDelete,
} from "react-icons/md";
import { api, type Film } from "../services/api";
import { useAddWinner } from "../hooks/useWinners";
import { filmKeys } from "../hooks/useFilms";
import WatchLinks from "./WatchLinks/WatchLinks";

interface RouletteProps {
  films: Film[];
}

function Roulette({ films }: RouletteProps) {
  const queryClient = useQueryClient();
  const [currentFilms, setCurrentFilms] = useState<Film[]>([]);
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);
  const [winner, setWinner] = useState<Film | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [winnerRevealedAt, setWinnerRevealedAt] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(120);

  const COUNTDOWN = 120; // seconds

  const addWinnerMutation = useAddWinner();

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const remainingFilmsRef = useRef<Film[]>([]);
  const removingRef = useRef(false);

  const setRunning = (value: boolean) => {
    setIsRunning(value);
    isRunningRef.current = value;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetState = (filmList: Film[]) => {
    setCurrentFilms([...filmList]);
    setEliminatingId(null);
    setWinner(null);
    setWinnerRevealedAt(null);
    setTimeLeft(COUNTDOWN);
    setRunning(false);
    remainingFilmsRef.current = [...filmList];
  };

  useEffect(() => {
    if (!films || films.length === 0) {
      setCurrentFilms([]);
      return;
    }
    resetState(films);
  }, [films]);

  useEffect(() => {
    return clearTimer;
  }, []);

  useEffect(() => {
    if (!winner || !winnerRevealedAt) return;

    const tick = () => {
      const elapsed = Math.floor((Date.now() - winnerRevealedAt) / 1000);
      const remaining = Math.max(0, COUNTDOWN - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0 && !removingRef.current) {
        removingRef.current = true;
        handleRemoveWinner();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [winner, winnerRevealedAt]);

  const handleRemoveWinner = async () => {
    if (!winner) return;
    try {
      await api.deleteFilm(winner.id);
      queryClient.invalidateQueries({ queryKey: filmKeys.all });
    } catch (err) {
      console.error("Ошибка удаления фильма:", err);
    }
    await api.resetRoulette();
    removingRef.current = false;
    resetState(films.filter((f) => f.id !== winner.id));
  };

  const saveWinner = async (winnerFilm: Film) => {
    try {
      await addWinnerMutation.mutateAsync(winnerFilm);
    } catch (err) {
      console.error("Ошибка сохранения победителя:", err);
    }
  };

  const stopRoulette = () => {
    clearTimer();
    setRunning(false);
    setEliminatingId(null);
  };

  const SCHEDULE = { SHAKE: 700, GAP: 300 };

  const eliminateNext = useCallback(() => {
    if (!isRunningRef.current) return;

    const remaining = remainingFilmsRef.current;

    if (remaining.length <= 1) {
      setRunning(false);
      const winnerFilm = remaining[0];
      if (winnerFilm) {
        const now = Date.now();
        setWinner(winnerFilm);
        setWinnerRevealedAt(now);
        setCurrentFilms([winnerFilm]);
        saveWinner(winnerFilm);
        api.finishRoulette(winnerFilm, now);
      }
      return;
    }

    const randomIndex = Math.floor(Math.random() * remaining.length);
    const eliminatedFilm = remaining[randomIndex];
    if (!eliminatedFilm) return;

    setEliminatingId(eliminatedFilm.id);

    timerRef.current = setTimeout(() => {
      api.eliminateFilm(eliminatedFilm.id);
      remainingFilmsRef.current = remainingFilmsRef.current.filter(
        (f) => f.id !== eliminatedFilm.id,
      );
      setCurrentFilms([...remainingFilmsRef.current]);
      setEliminatingId(null);

      timerRef.current = setTimeout(eliminateNext, SCHEDULE.GAP);
    }, SCHEDULE.SHAKE);
  }, []);

  const startRoulette = () => {
    const currentFilmsState = currentFilms.length > 0 ? currentFilms : films;

    if (currentFilmsState.length <= 1 || isRunningRef.current) return;

    clearTimer();

    setRunning(true);
    remainingFilmsRef.current = [...currentFilmsState];

    api.startRoulette(currentFilmsState.map((f) => f.id));

    timerRef.current = setTimeout(eliminateNext, SCHEDULE.GAP);
  };

  const resetRoulette = () => {
    clearTimer();
    api.resetRoulette();
    if (films && films.length > 0) {
      resetState(films);
    }
  };

  if (!films || films.length === 0) {
    return (
      <div className={styles.roulette}>
        <p className={styles.emptyState}>Нет фильмов для рулетки</p>
      </div>
    );
  }

  const filmsToShow = currentFilms.length > 0 ? currentFilms : films;

  return (
    <div className={styles.roulette}>
      <div className={styles.rouletteControls}>
        <button
          className={styles.rouletteButton}
          onClick={isRunning ? stopRoulette : startRoulette}
          disabled={filmsToShow.length <= 1 && !isRunning}
        >
          <div className={styles.btn_start}>
            {isRunning ? <MdPause size={20} /> : <MdPlayArrow size={20} />}
            <span>{isRunning ? "Стоп" : "Старт"}</span>
          </div>
        </button>
        <button
          className={styles.rouletteButtonSecondary}
          onClick={resetRoulette}
          disabled={isRunning}
        >
          <div className={styles.btn_start}>
            <MdRestartAlt size={20} />
            <span>Перезапустить</span>
          </div>
        </button>
      </div>

      {winner ? (
        <div className={styles.winnerView}>
          <div className={styles.winnerContent}>
            <div
              className={styles.winnerCard}
              style={{
                backgroundImage: winner.poster
                  ? `url(${winner.poster})`
                  : undefined,
              }}
            >
              <div className={styles.winnerCardOverlay} />
              <div className={styles.winnerCardContent}>
                <div className={styles.winnerCardTitle}>{winner.title}</div>
                {winner.year && (
                  <div className={styles.winnerCardMeta}>{winner.year}</div>
                )}
                <div className={styles.winnerCardFrom}>{winner.from}</div>
              </div>
            </div>
            <WatchLinks title={winner.title} year={winner.year} />
          </div>
          <div className={styles.winnerAnnouncement}>
            <MdEmojiEvents size={44} className={styles.winnerTrophy} />
            <h2 className={styles.winnerText}>Победитель!</h2>
            <div className={styles.winnerTimer}>
              Фильм будет удалён из списка через {Math.floor(timeLeft / 60)}:
              {String(timeLeft % 60).padStart(2, "0")}
            </div>
            <button className={styles.removeBtn} onClick={handleRemoveWinner}>
              <MdDelete size={18} />
              Удалить из списка
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.rouletteGrid}>
          {filmsToShow.map((film) => {
            const classes = [styles.filmCard];
            if (eliminatingId === film.id) classes.push(styles.eliminating);
            return (
              <div
                key={film.id}
                className={classes.join(" ")}
                style={{
                  backgroundImage: film.poster
                    ? `url(${film.poster})`
                    : undefined,
                }}
              >
                <div className={styles.filmCardOverlay} />
                <div className={styles.filmCardContent}>
                  <div className={styles.filmCardTitle}>{film.title}</div>
                  {film.year && (
                    <div className={styles.filmCardMeta}>{film.year}</div>
                  )}
                  <div className={styles.filmCardFrom}>{film.from}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filmsToShow.length === 0 && !winner && (
        <p className={styles.emptyState}>Все фильмы выбыли</p>
      )}
    </div>
  );
}

export default Roulette;
