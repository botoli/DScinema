"use client";
// components/AddFilmModal.tsx
import { useState, useEffect, useRef } from "react";
import styles from "./addFilmModal.module.css";
import { Icon } from "@iconify/react";
import { usePathname } from "next/navigation";

interface Film {
  id: string;
  title: string;
  from: string;
  year?: number;
  poster?: string;
}

interface AddFilmModalProps {
  changeOpen: (isOpen: boolean) => void;
  onAddFilms: (films: Film[], userName: string) => void;
}

function AddFilmModal({ changeOpen, onAddFilms }: AddFilmModalProps) {
  const [filmName, setFilmName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedFilms, setSelectedFilms] = useState<Film[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [me, setMe] = useState("");
  const pathname = usePathname();
  useEffect(() => {
    const savedMe = localStorage.getItem("me") || "";
    setMe(savedMe);
  }, []);
  // Для member-авто-устанавливаем selectedUser из localStorage
  useEffect(() => {
    if (pathname.startsWith("/member/") && me) {
      setSelectedUser(me);
    }
  }, [pathname, me]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const users = [
    { id: "dzhebra", name: "Джебра" },
    { id: "artem", name: "Артём" },
    { id: "andrey", name: "Андрей" },
    { id: "misha", name: "Миша" },
  ];

  const API_KEY = process.env.NEXT_PUBLIC_KINOPOISK_API_KEY;

  // Функция поиска с отменой предыдущего запроса
  const searchFilm = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    // Отменяем предыдущий запрос
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/search-movie?query=${encodeURIComponent(query)}&page=1&limit=10`,
        {
          headers: {
            "X-API-KEY": API_KEY || "",
          },
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        throw new Error("Ошибка при поиске фильмов");
      }

      const data = await response.json();
      setSearchResults(data.docs || []);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // Игнорируем abort ошибки
        return;
      }
      setError(err instanceof Error ? err.message : "Произошла ошибка");
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  // Debounce эффект
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Ждем 500ms после последнего ввода
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

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const addFilmToSelection = (movie: any) => {
    const posterUrl = movie.poster?.previewUrl || movie.poster?.url || "";

    const newFilm: Film = {
      id: String(movie.id),
      title:
        movie.name || movie.alternativeName || movie.enName || "Без названия",
      from: selectedUser,
      year: movie.year,
      poster: posterUrl,
    };

    if (!selectedFilms.some((f) => f.id === newFilm.id)) {
      setSelectedFilms([...selectedFilms, newFilm]);
    }
  };

  const removeFilmFromSelection = (filmId: string) => {
    setSelectedFilms(selectedFilms.filter((f) => f.id !== filmId));
  };

  const handleAddFilms = () => {
    if (
      selectedFilms.length > 0 &&
      (selectedUser || pathname.startsWith("/member/"))
    ) {
      onAddFilms(selectedFilms, selectedUser || me);
      changeOpen(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={() => changeOpen(false)}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modal__header}>
          <h1>Добавить фильмы</h1>
          <div className={styles.closeIcon} onClick={() => changeOpen(false)}>
            <Icon icon="material-symbols:close-rounded" width="24" />
          </div>
        </div>

        {/* Блок выбора пользователя */}
        {!pathname.startsWith("/member/") && (
          <div className={styles.userSelection}>
            <h3>Кто добавляет?</h3>
            <div className={styles.userCheckboxes}>
              {users.map((user) => (
                <label key={user.id} className={styles.userLabel}>
                  <input
                    type="radio"
                    name="user"
                    value={user.name}
                    checked={selectedUser === user.name}
                    onChange={(e) => setSelectedUser(e.target.value)}
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
                onChange={(e) => setFilmName(e.target.value)}
                placeholder="Введите название фильма (минимум 2 символа)..."
                className={styles.searchInput}
                autoFocus
              />
              <div className={styles.searchStatus}>
                {isLoading && (
                  <div className={styles.loadingIndicator}>
                    <Icon icon="eos-icons:loading" width="18" />
                    <span>Поиск...</span>
                  </div>
                )}
                {!isLoading &&
                  filmName.length >= 2 &&
                  searchResults.length === 0 &&
                  !error && (
                    <div className={styles.noResults}>
                      <Icon icon="mdi:information-outline" width="18" />
                      <span>Ничего не найдено</span>
                    </div>
                  )}
              </div>
            </div>

            {error && <div className={styles.error}>{error}</div>}

            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                <h3>Результаты поиска:</h3>
                <div className={styles.resultsList}>
                  {searchResults.map((movie) => (
                    <div key={movie.id} className={styles.resultItem}>
                      <div className={styles.posterContainer}>
                        {movie.poster?.previewUrl || movie.poster?.url ? (
                          <img
                            src={movie.poster.previewUrl || movie.poster.url}
                            alt={movie.name || movie.alternativeName}
                            className={styles.poster}
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.noPoster}>
                            <Icon icon="mdi:movie-outline" width="32" />
                          </div>
                        )}
                      </div>
                      <div className={styles.resultInfo}>
                        <span className={styles.resultTitle}>
                          {movie.name || movie.alternativeName || movie.enName}
                        </span>
                        <div className={styles.resultDetails}>
                          <span className={styles.resultYear}>
                            {movie.year || "—"}
                          </span>
                          {movie.rating?.kp && (
                            <span className={styles.resultRating}>
                              ⭐ {movie.rating.kp.toFixed(1)}
                            </span>
                          )}
                          {movie.countries && movie.countries[0] && (
                            <span className={styles.resultCountry}>
                              {movie.countries[0].name}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => addFilmToSelection(movie)}
                        disabled={selectedFilms.some(
                          (f) => f.id === String(movie.id),
                        )}
                        className={styles.addButton}
                      >
                        <Icon icon="mdi:plus" width="18" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {selectedFilms.length > 0 ? (
            <div className={styles.selectedSection}>
              <h3>Выбранные фильмы ({selectedFilms.length}):</h3>
              <div className={styles.selectedList}>
                {selectedFilms.map((film) => (
                  <div key={film.id} className={styles.selectedItem}>
                    <div className={styles.selectedPosterContainer}>
                      {film.poster ? (
                        <img
                          src={film.poster}
                          alt={film.title}
                          className={styles.selectedPoster}
                        />
                      ) : (
                        <div className={styles.selectedNoPoster}>
                          <Icon icon="mdi:movie-outline" width="20" />
                        </div>
                      )}
                    </div>
                    <div className={styles.selectedInfo}>
                      <span className={styles.selectedTitle}>{film.title}</span>
                      {film.year && (
                        <span className={styles.selectedYear}>{film.year}</span>
                      )}
                    </div>
                    <button
                      onClick={() => removeFilmFromSelection(film.id)}
                      className={styles.removeButton}
                    >
                      <Icon icon="mdi:close" width="16" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={styles.selectedSectionPlaceholder}>
              <span>Фильмы не выбраны</span>
            </div>
          )}
        </div>

        <div className={styles.modal__footer}>
          <div className={styles.footerHints}>
            {!pathname.startsWith("/member/") && !selectedUser && (
              <span className={styles.hintItem}>
                <Icon icon="mdi:alert-circle-outline" width="14" />
                Выберите, кто добавляет
              </span>
            )}
            {selectedFilms.length === 0 && (
              <span className={styles.hintItem}>
                <Icon icon="mdi:alert-circle-outline" width="14" />
                Добавьте хотя бы один фильм
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
              onClick={handleAddFilms}
              disabled={
                selectedFilms.length === 0 ||
                (!selectedUser && !pathname.startsWith("/member/"))
              }
              className={styles.addFilmsButton}
            >
              Добавить {selectedFilms.length > 0 && `(${selectedFilms.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AddFilmModal;
