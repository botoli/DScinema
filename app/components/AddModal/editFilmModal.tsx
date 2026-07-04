"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  MdCheck,
  MdClose,
  MdErrorOutline,
  MdInfoOutline,
  MdMovieCreation,
  MdRefresh,
} from "react-icons/md";
import type { Film } from "../../services/api";
import styles from "./addFilmModal.module.css";

type SearchMovie = {
  id: string | number;
  name?: string;
  alternativeName?: string;
  enName?: string;
  year?: number;
  rating?: { kp?: number };
  countries?: Array<{ name: string }>;
  poster?: { previewUrl?: string; url?: string };
};

interface EditFilmModalProps {
  film: Film;
  changeOpen: (isOpen: boolean) => void;
  onSaveFilm: (film: Partial<Film>) => Promise<void>;
  isSaving?: boolean;
}

const USERS = [
  { id: "dzhebra", name: "Джебра" },
  { id: "artem", name: "Артём" },
  { id: "andrey", name: "Андрей" },
  { id: "misha", name: "Миша" },
];

const userId = (name: string) => USERS.find((user) => user.name === name)?.id ?? name;

function buildFilmFromMovie(movie: SearchMovie, from: string): Film {
  return {
    id: String(movie.id),
    title:
      movie.name || movie.alternativeName || movie.enName || "Без названия",
    from,
    year: movie.year,
    poster: movie.poster?.previewUrl || movie.poster?.url || undefined,
  };
}

export default function EditFilmModal({
  film,
  changeOpen,
  onSaveFilm,
  isSaving,
}: EditFilmModalProps) {
  const pathname = usePathname();
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMember = pathname.startsWith("/member/");
  const me = typeof window === "undefined" ? "" : localStorage.getItem("me") || "";
  const initialUser = film.engName || userId(film.from) || me;
  const [filmName, setFilmName] = useState(film.title);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchMovie[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState(initialUser);
  const [selectedFilm, setSelectedFilm] = useState<Film>({
    ...film,
    engName: film.engName || initialUser,
  });

  const API_KEY = process.env.NEXT_PUBLIC_KINOPOISK_API_KEY;

  const searchFilm = useEffectEvent(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    abortControllerRef.current?.abort();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search-movie?query=${encodeURIComponent(query)}&page=1&limit=10`,
        {
          headers: { "X-API-KEY": API_KEY || "" },
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new Error("Ошибка при поиске фильмов");
      }

      const data: { docs?: SearchMovie[] } = await response.json();
      setSearchResults(data.docs || []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (filmName.trim().length >= 2) {
        searchFilm(filmName);
      } else if (filmName.trim().length === 0) {
        setSearchResults([]);
        setError(null);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [filmName]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") changeOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      abortControllerRef.current?.abort();
    };
  }, [changeOpen]);

  const selectMovie = (movie: SearchMovie) => {
    setSelectedFilm((current) => ({
      ...buildFilmFromMovie(movie, current.from),
      engName: current.engName,
      addedAt: current.addedAt,
    }));
  };

  const handleSave = async () => {
    const ownerId = isMember ? film.engName || me : selectedUser;
    await onSaveFilm({
      title: selectedFilm.title,
      year: selectedFilm.year,
      poster: selectedFilm.poster,
      from: isMember ? film.from : USERS.find((user) => user.id === ownerId)?.name || film.from,
      engName: ownerId || film.engName,
    });
    changeOpen(false);
  };

  return (
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => changeOpen(false)}
    >
      <motion.div
        ref={modalRef}
        className={styles.modal}
        onClick={(event) => event.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 14, scale: 0.98 }}
      >
        <div className={styles.modal__header}>
          <h1>Изменить фильм</h1>
          <div className={styles.closeIcon} onClick={() => changeOpen(false)}>
            <MdClose size={24} />
          </div>
        </div>

        {!isMember && (
          <div className={styles.userSelection}>
            <h3>Кто рекомендует?</h3>
            <div className={styles.userCheckboxes}>
              {USERS.map((user) => (
                <label key={user.id} className={styles.userLabel}>
                  <input
                    type="radio"
                    name="user"
                    value={user.id}
                    checked={selectedUser === user.id}
                    onChange={(event) => {
                      const nextUser = event.target.value;
                      setSelectedUser(nextUser);
                      setSelectedFilm((current) => ({
                        ...current,
                        from: USERS.find((userItem) => userItem.id === nextUser)?.name || current.from,
                        engName: nextUser,
                      }));
                    }}
                    className={styles.userRadio}
                  />
                  <span className={styles.userName}>{user.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className={styles.modal__body}>
          <div className={styles.searchSection}>
            <div className={styles.searchInputWrapper}>
              <input
                type="text"
                value={filmName}
                onChange={(event) => setFilmName(event.target.value)}
                placeholder="Введите название фильма (минимум 2 символа)..."
                className={styles.searchInput}
                autoFocus
              />
              <div className={styles.searchStatus}>
                {isLoading && (
                  <div className={styles.loadingIndicator}>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <MdRefresh size={18} />
                    </motion.span>
                    <span>Поиск...</span>
                  </div>
                )}
                {!isLoading &&
                  filmName.length >= 2 &&
                  searchResults.length === 0 &&
                  !error && (
                    <div className={styles.noResults}>
                      <MdInfoOutline size={18} />
                      <span>Ничего не найдено</span>
                    </div>
                  )}
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            <AnimatePresence>
              {searchResults.length > 0 && (
                <motion.div
                  className={styles.searchResults}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h3>Результаты поиска:</h3>
                  <div className={styles.resultsList}>
                    {searchResults.map((movie) => {
                      const resultTitle =
                        movie.name || movie.alternativeName || movie.enName || "Без названия";
                      const posterUrl = movie.poster?.previewUrl || movie.poster?.url;
                      const picked = String(movie.id) === selectedFilm.id;
                      return (
                        <div key={movie.id} className={styles.resultItem}>
                          <div className={styles.posterContainer}>
                            {posterUrl ? (
                              <img
                                src={posterUrl}
                                alt={resultTitle}
                                className={styles.poster}
                                loading="lazy"
                              />
                            ) : (
                              <div className={styles.noPoster}>
                                <MdMovieCreation size={32} />
                              </div>
                            )}
                          </div>
                          <div className={styles.resultInfo}>
                            <span className={styles.resultTitle}>{resultTitle}</span>
                            <div className={styles.resultDetails}>
                              <span className={styles.resultYear}>{movie.year || "—"}</span>
                              {movie.rating?.kp && (
                                <span className={styles.resultRating}>
                                  ⭐ {movie.rating.kp.toFixed(1)}
                                </span>
                              )}
                              {movie.countries?.[0] && (
                                <span className={styles.resultCountry}>
                                  {movie.countries[0].name}
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => selectMovie(movie)}
                            className={styles.addButton}
                            disabled={picked}
                          >
                            {picked ? <MdCheck size={18} /> : <MdCheck size={18} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className={styles.selectedSection}>
            <h3>Новый вариант:</h3>
            <div className={styles.selectedList}>
              <div className={styles.selectedItem}>
                <div className={styles.selectedPosterContainer}>
                  {selectedFilm.poster ? (
                    <img
                      src={selectedFilm.poster}
                      alt={selectedFilm.title}
                      className={styles.selectedPoster}
                    />
                  ) : (
                    <div className={styles.selectedNoPoster}>
                      <MdMovieCreation size={20} />
                    </div>
                  )}
                </div>
                <div className={styles.selectedInfo}>
                  <span className={styles.selectedTitle}>{selectedFilm.title}</span>
                  <span className={styles.selectedYear}>
                    {selectedFilm.year || "Год не указан"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.modal__footer}>
          <div className={styles.footerHints}>
            {!isMember && !selectedUser && (
              <span className={styles.hintItem}>
                <MdErrorOutline size={14} />
                Выберите автора фильма
              </span>
            )}
            {!selectedFilm.title && (
              <span className={styles.hintItem}>
                <MdErrorOutline size={14} />
                Выберите фильм из поиска
              </span>
            )}
          </div>
          <div className={styles.footerActions}>
            <button
              onClick={() => changeOpen(false)}
              className={styles.cancelButton}
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !selectedFilm.title || (!isMember && !selectedUser)}
              className={styles.addFilmsButton}
            >
              {isSaving ? "Сохраняем..." : "Изменить"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
