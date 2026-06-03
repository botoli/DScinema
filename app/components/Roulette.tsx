"use client";
// components/Roulette.tsx
import { useState, useEffect, useRef } from "react";
import styles from "./Roulette.module.css";
import { Icon } from "@iconify/react";
import { api, type Film } from "../services/api";
import WatchLinks from "./WatchLinks/WatchLinks";

interface RouletteProps {
  films: Film[];
}

function Roulette({ films }: RouletteProps) {
  const [currentFilms, setCurrentFilms] = useState<Film[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);
  const [eliminatingId, setEliminatingId] = useState<string | null>(null);
  const [winner, setWinner] = useState<Film | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const isRunningRef = useRef(false);
  const remainingFilmsRef = useRef<Film[]>([]);

  // --- Вспомогательные функции ---

  /** Синхронизирует состояние и ref isRunning */
  const setRunning = (value: boolean) => {
    setIsRunning(value);
    isRunningRef.current = value;
  };

  /** Останавливает все активные таймеры */
  const clearAllTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  };

  /** Сбрасывает состояние рулетки к переданному списку фильмов */
  const resetState = (filmList: Film[]) => {
    setCurrentFilms([...filmList]);
    setCurrentHighlight(null);
    setEliminatingId(null);
    setWinner(null);
    setRunning(false);
    remainingFilmsRef.current = [...filmList];
  };

  /** Собирает className для карточки фильма */
  const filmCardClassName = (film: Film): string => {
    const classes = [styles.filmCard];
    if (currentHighlight === film.id) classes.push(styles.highlighted);
    if (eliminatingId === film.id) classes.push(styles.eliminating);
    if (winner?.id === film.id) classes.push(styles.winner);
    return classes.join(" ");
  };

  // --- Эффекты ---

  // Инициализация при изменении списка фильмов
  useEffect(() => {
    if (!films || films.length === 0) {
      setCurrentFilms([]);
      return;
    }
    resetState(films);
  }, [films]);

  // Очистка при размонтировании
  useEffect(() => {
    return clearAllTimers;
  }, []);

  // --- API ---

  const saveWinner = async (winnerFilm: Film) => {
    try {
      await api.addWinner(winnerFilm);
      console.log("Победитель сохранён в json-server:", winnerFilm.title);
    } catch (err) {
      console.error("Ошибка сохранения победителя:", err);
    }
  };

  // --- Логика рулетки ---

  const stopRoulette = () => {
    clearAllTimers();
    setRunning(false);
    setCurrentHighlight(null);
    setEliminatingId(null);
  };

  const startRoulette = () => {
    const currentFilmsState = currentFilms.length > 0 ? currentFilms : films;

    if (currentFilmsState.length <= 1 || isRunningRef.current) {
      return;
    }

    clearAllTimers();

    setRunning(true);
    remainingFilmsRef.current = [...currentFilmsState];

    intervalRef.current = setInterval(() => {
      const remaining = remainingFilmsRef.current;

      // Если остался один фильм — объявляем победителя
      if (remaining.length <= 1) {
        stopRoulette();

        const winnerFilm = remaining[0];
        if (winnerFilm) {
          setWinner(winnerFilm);
          setCurrentFilms([winnerFilm]);
          saveWinner(winnerFilm);
        }
        return;
      }

      // Выбираем случайный фильм для выбывания
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const eliminatedFilm = remaining[randomIndex];

      if (!eliminatedFilm) return;

      setCurrentHighlight(eliminatedFilm.id);
      setEliminatingId(eliminatedFilm.id);

      const timeoutId = setTimeout(() => {
        remainingFilmsRef.current = remainingFilmsRef.current.filter(
          (f) => f.id !== eliminatedFilm.id,
        );
        setCurrentFilms([...remainingFilmsRef.current]);
        setCurrentHighlight(null);
        setEliminatingId(null);
      }, 350);

      timeoutRefs.current.push(timeoutId);
    }, 700);
  };

  const resetRoulette = () => {
    clearAllTimers();
    if (films && films.length > 0) {
      resetState(films);
    }
  };

  // --- Рендер ---

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
            <Icon
              icon={
                isRunning
                  ? "material-symbols-light:pause-outline"
                  : "boxicons:play"
              }
              width="20"
            />
            <span>{isRunning ? "Стоп" : "Старт"}</span>
          </div>
        </button>
        <button
          className={styles.rouletteButtonSecondary}
          onClick={resetRoulette}
          disabled={isRunning}
        >
          <div className={styles.btn_start}>
            <Icon icon="material-symbols:restart-alt" width="20" />
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
            <Icon
              icon="material-symbols:trophy"
              width="44"
              className={styles.winnerTrophy}
            />
            <h2 className={styles.winnerText}>Победитель!</h2>
          </div>
        </div>
      ) : (
        <div className={styles.rouletteGrid}>
          {filmsToShow.map((film) => (
            <div
              key={film.id}
              className={filmCardClassName(film)}
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
          ))}
        </div>
      )}

      {filmsToShow.length === 0 && !winner && (
        <p className={styles.emptyState}>Все фильмы выбыли</p>
      )}
    </div>
  );
}

export default Roulette;
