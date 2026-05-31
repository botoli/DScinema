"use client";
// components/Roulette.tsx
import { useState, useEffect, useRef } from "react";
import styles from "./Roulette.module.css";
import { Icon } from "@iconify/react";
import { api, type Film } from "../services/api";

interface RouletteProps {
  films: Film[];
}

function Roulette({ films }: RouletteProps) {
  const [currentFilms, setCurrentFilms] = useState<Film[]>([]);
  const [currentHighlight, setCurrentHighlight] = useState<string | null>(null);
  const [winner, setWinner] = useState<Film | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRefs = useRef<NodeJS.Timeout[]>([]);
  const isRunningRef = useRef(false);
  const remainingFilmsRef = useRef<Film[]>([]);

  // Инициализация рулетки
  useEffect(() => {
    if (!films || films.length === 0) {
      setCurrentFilms([]);
      return;
    }

    setCurrentFilms([...films]);
    setCurrentHighlight(null);
    setWinner(null);
    setIsRunning(false);
    isRunningRef.current = false;
    remainingFilmsRef.current = [...films];
  }, [films]);

  // Сохраняем победителя в json-server
  const saveWinner = async (winnerFilm: Film) => {
    try {
      await api.addWinner(winnerFilm);
      console.log("Победитель сохранён в json-server:", winnerFilm.title);
    } catch (err) {
      console.error("Ошибка сохранения победителя:", err);
    }
  };

  // Запуск рулетки
  const startRoulette = () => {
    const currentFilmsState = currentFilms.length > 0 ? currentFilms : films;

    if (currentFilmsState.length <= 1 || isRunningRef.current) {
      return;
    }

    // Очищаем предыдущие таймеры
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    // Сбрасываем состояние
    setWinner(null);
    setCurrentHighlight(null);
    setIsRunning(true);
    isRunningRef.current = true;

    // Копируем массив фильмов для работы
    remainingFilmsRef.current = [...currentFilmsState];

    intervalRef.current = setInterval(() => {
      const remaining = remainingFilmsRef.current;

      // Если остался один фильм - объявляем победителя
      if (remaining.length <= 1) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        const winnerFilm = remaining[0];
        if (winnerFilm) {
          setWinner(winnerFilm);
          setCurrentFilms([winnerFilm]); // Оставляем только победителя
          // Сохраняем победителя в json-server
          saveWinner(winnerFilm);
        }
        setCurrentHighlight(null);
        setIsRunning(false);
        isRunningRef.current = false;
        return;
      }

      // Выбираем случайный фильм для выбывания
      const randomIndex = Math.floor(Math.random() * remaining.length);
      const eliminatedFilm = remaining[randomIndex];

      if (!eliminatedFilm) return;

      // Подсвечиваем фильм
      setCurrentHighlight(eliminatedFilm.id);

      // Удаляем фильм через задержку
      const timeoutId = setTimeout(() => {
        // Удаляем из оставшихся
        remainingFilmsRef.current = remainingFilmsRef.current.filter(
          (f) => f.id !== eliminatedFilm.id,
        );

        // Обновляем отображаемые фильмы
        setCurrentFilms([...remainingFilmsRef.current]);
        setCurrentHighlight(null);
      }, 750);

      timeoutRefs.current.push(timeoutId);
    }, 350);
  };

  // Остановка рулетки
  const stopRoulette = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];

    setIsRunning(false);
    isRunningRef.current = false;
    setCurrentHighlight(null);
  };

  // Сброс рулетки
  const resetRoulette = () => {
    stopRoulette();

    if (films && films.length > 0) {
      setCurrentFilms([...films]);
      setCurrentHighlight(null);
      setWinner(null);
      setIsRunning(false);
      isRunningRef.current = false;
      remainingFilmsRef.current = [...films];
    }
  };

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      timeoutRefs.current.forEach(clearTimeout);
    };
  }, []);

  if (!films || films.length === 0) {
    return (
      <div className={styles.roulette}>
        <p className={styles.emptyState}>Нет фильмов для рулетки</p>
      </div>
    );
  }

  const filmsToShow = currentFilms.length > 0 ? currentFilms : films;
  const isWinnerDisplayed = winner !== null;

  return (
    <div className={styles.roulette}>
      <div className={styles.rouletteControls}>
        <button
          className={styles.rouletteButton}
          onClick={isRunning ? stopRoulette : startRoulette}
          disabled={filmsToShow.length <= 1 && !isRunning}
        >
          {isRunning ? (
            <div className={styles.btn_start}>
              <Icon icon="material-symbols-light:pause-outline" width="20" />
              <p>Стоп</p>
            </div>
          ) : (
            <div className={styles.btn_start}>
              <Icon icon="boxicons:play" width="20" />
              <p>Старт</p>
            </div>
          )}
        </button>
        <button
          className={styles.rouletteButtonSecondary}
          onClick={resetRoulette}
          disabled={isRunning}
        >
          <div className={styles.btn_start}>
            <Icon icon="material-symbols:restart-alt" width="20" />
            <p>Перезапустить</p>
          </div>
        </button>
      </div>

      <div className={styles.rouletteGrid}>
        {filmsToShow.map((film) => {
          const isHighlighted = currentHighlight === film.id;
          const isWinnerFilm = isWinnerDisplayed && winner?.id === film.id;

          return (
            <div
              key={film.id}
              className={`
                ${styles.filmCard}
                ${isHighlighted ? styles.highlighted : ""}
                ${isWinnerFilm ? styles.winner : ""}
              `}
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
                {isWinnerFilm && (
                  <div className={styles.winnerBadge}>🏆 Победитель!</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filmsToShow.length === 0 && (
        <p className={styles.emptyState}>Все фильмы выбыли</p>
      )}
    </div>
  );
}

export default Roulette;
