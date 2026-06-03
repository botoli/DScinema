"use client";
import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, type Film, type PatchNote } from "../../services/api";
import AddFilmModal from "../AddModal/addFilmModal";
import Roulette from "../Roulette";
import Tooltip from "../Tooltip/Tooltip";
import WinnersTab from "../WinnersTab/WinnersTab";
import styles from "./Dashboard.module.css";

const USERS = [
  { id: "dzhebra", name: "Джебра" },
  { id: "artem", name: "Артём" },
  { id: "andrey", name: "Андрей" },
  { id: "misha", name: "Миша" },
];

function getUserName(engName: string): string {
  const user = USERS.find((u) => u.id === engName);
  return user ? user.name : engName;
}

function getUserEngName(userName: string): string {
  const user = USERS.find((u) => u.name === userName);
  return user ? user.id : userName;
}

interface DashboardProps {
  variant: "host" | "member";
}

function Dashboard({ variant }: DashboardProps) {
  const [films, setFilms] = useState<Film[]>([]);
  const [allFilms, setAllFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState("");
  const [autoSync, setAutoSync] = useState(true);
  const [isopenModal, setisopenModal] = useState(false);
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [showWinners, setShowWinners] = useState(false);
  const router = useRouter();

  const isMember = variant === "member";
  const title = isMember ? "Мой список фильмов" : "Список фильмов";

  // Инициализация me (только для member)
  useEffect(() => {
    if (isMember) {
      const savedMe = localStorage.getItem("me") || "";
      setMe(savedMe);
    }
  }, [isMember]);

  // Загрузка всех фильмов
  const fetchAll = useCallback(() => {
    return api
      .getFilms()
      .then((data) => {
        setAllFilms(data);
        if (!isMember) setFilms(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error("Ошибка загрузки фильмов:", err);
        setError("Не удалось загрузить фильмы.");
        setLoading(false);
      });
  }, [isMember]);

  // Загрузка своих фильмов (только для member)
  const fetchMy = useCallback(() => {
    if (!me || !isMember) return Promise.resolve();
    return api
      .getFilmsByName(me)
      .then((data) => {
        setFilms(data);
        setLoading(false);
        setError(null);
      })
      .catch((err) => {
        console.error("Ошибка загрузки фильмов:", err);
        setError("Не удалось загрузить фильмы.");
        setLoading(false);
      });
  }, [me, isMember]);

  // Первичная загрузка
  useEffect(() => {
    if (isMember && !me) return;
    fetchAll();
    if (isMember) fetchMy();
  }, [me, isMember, fetchAll, fetchMy]);

  // Автосинхронизация с polling
  useEffect(() => {
    if (!autoSync) return;
    if (isMember && !me) return;
    let cancelled = false;

    const safeAll = () => {
      if (cancelled) return;
      api
        .getFilms()
        .then((data) => {
          if (!cancelled) {
            setAllFilms(data);
            if (!isMember) setFilms(data);
            setLoading(false);
            setError(null);
          }
        })
        .catch(() => {
          if (!cancelled) setError("Не удалось загрузить фильмы.");
        });
    };

    let safeMy: (() => void) | null = null;
    if (isMember) {
      safeMy = () => {
        if (!me || cancelled) return;
        api
          .getFilmsByName(me)
          .then((data) => {
            if (!cancelled) {
              setFilms(data);
              setLoading(false);
              setError(null);
            }
          })
          .catch(() => {
            if (!cancelled) setError("Не удалось загрузить фильмы.");
          });
      };
    }

    safeAll();
    safeMy?.();

    const intervalAll = setInterval(safeAll, 20_000);
    const intervalMy = isMember ? setInterval(safeMy!, 20_000) : null;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        safeAll();
        safeMy?.();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(intervalAll);
      if (intervalMy) clearInterval(intervalMy);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [me, autoSync, isMember]);

  // Загрузка patch notes
  useEffect(() => {
    api
      .getPatchNotes()
      .then(setPatchNotes)
      .catch(() => {});
  }, []);

  // Ручная синхронизация
  const handleSync = () => {
    fetchAll();
    if (isMember) fetchMy();
  };

  // Удаление фильма
  async function deleteFilm(id: string) {
    try {
      await api.deleteFilm(id);
      setFilms((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Ошибка удаления фильма:", err);
    }
  }

  // Добавление фильмов
  async function handleAddFilms(newFilms: any[], userName: string) {
    try {
      const addedFilms = await api.addFilms(
        newFilms.map((f) => ({
          title: f.title,
          from: isMember ? getUserName(f.from || me) : f.from || userName,
          year: f.year,
          poster: f.poster,
          engName: isMember ? me : getUserEngName(f.from || userName),
        })),
      );
      setFilms((prev) => [...prev, ...addedFilms]);
    } catch (err) {
      console.error("Ошибка добавления фильмов:", err);
    }
  }

  const grouped = films.reduce(
    (acc, film) => {
      if (!acc[film.from]) acc[film.from] = [];
      acc[film.from].push(film);
      return acc;
    },
    {} as Record<string, typeof films>,
  );

  return (
    <div className={styles.main}>
      {/* Верхняя панель с логотипом и кнопками */}
      <div className={styles.topBar}>
        <div className={styles.brandGroup}>
          <Link href="/" className={styles.brandLink}>
            <img src="/favicon.png" alt="Logo" className={styles.logo} />
            <span className={styles.brand}>
              <span className={styles.ds}>DS</span>
              <span className={styles.dot}>•</span>
              <span className={styles.cinema}>cinema</span>
            </span>
          </Link>
        </div>

        <div className={styles.actions}>
          <Tooltip label="Обновить список фильмов">
            <button className={styles.syncBtn} onClick={handleSync}>
              <Icon icon="mdi:sync" width="18" />
            </button>
          </Tooltip>
          <Tooltip
            label={
              autoSync
                ? "Автосинхронизация: включена (каждые 20 сек)"
                : "Автосинхронизация: выключена"
            }
          >
            <button
              className={`${styles.autoBtn} ${autoSync ? styles.autoOn : styles.autoOff}`}
              onClick={() => setAutoSync((v) => !v)}
            >
              <span className={styles.autoDot} />
              Авто
            </button>
          </Tooltip>

          <span className={styles.actionSep} />

          <Tooltip label="Посмотреть предыдущих победителей">
            <button
              className={`${styles.winnersBtn} ${showWinners ? styles.winnersActive : ""}`}
              onClick={() => setShowWinners((v) => !v)}
            >
              <Icon icon="mdi:trophy-outline" width="18" />
              Победители
            </button>
          </Tooltip>

          <Tooltip label="Добавить новый фильм в очередь">
            <button
              className={styles.addBtn}
              onClick={() => setisopenModal(true)}
            >
              <Icon icon="mdi:plus" width="18" />
              Добавить
            </button>
          </Tooltip>

          <Tooltip label="Вернуться на главную">
            <button
              className={styles.logoutBtn}
              onClick={() => {
                localStorage.removeItem("me");
                router.push("/");
              }}
            >
              <Icon icon="mdi:logout" />
            </button>
          </Tooltip>
        </div>
      </div>

      {showWinners ? (
        <div className={styles.winnersSection}>
          <div className={styles.winnersHeader}>
            <h2 className={styles.winnersTitle}>
              <Icon icon="mdi:trophy-outline" width="22" />
              Предыдущие победители
            </h2>
          </div>
          <WinnersTab />
        </div>
      ) : (
        <div className={styles.content}>
          {/* Левая панель — список фильмов */}
          <div className={styles.filmSection}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{title}</h2>
              <span className={styles.sectionCount}>{films.length}</span>
            </div>

            {isopenModal && (
              <AddFilmModal
                changeOpen={setisopenModal}
                onAddFilms={handleAddFilms}
              />
            )}

            <div className={styles.filmList}>
              {loading && (
                <p className={styles.statusText}>Загрузка фильмов...</p>
              )}
              {error && <p className={styles.errorText}>{error}</p>}
              {!loading && !error && films.length === 0 && (
                <div className={styles.emptyState}>
                  <Icon icon="mdi:movie-open-outline" width="36" />
                  <p>Нет фильмов. Добавьте первый фильм!</p>
                </div>
              )}
              {!loading &&
                !error &&
                films.length > 0 &&
                Object.entries(grouped).map(([person, personFilms]) => (
                  <div key={person} className={styles.group}>
                    <h3 className={styles.groupTitle}>{person}</h3>
                    {personFilms.map((film) => (
                      <div key={film.id} className={styles.filmRow}>
                        <div className={styles.filmRowInfo}>
                          {film.poster ? (
                            <img
                              src={film.poster}
                              alt=""
                              className={styles.filmRowPoster}
                            />
                          ) : (
                            <div className={styles.filmRowNoPoster}>
                              <Icon icon="mdi:movie-outline" width="16" />
                            </div>
                          )}
                          <span>{film.title}</span>
                        </div>
                        <button
                          className={styles.deleteFilm}
                          onClick={() => deleteFilm(film.id)}
                        >
                          <Icon icon="mdi:delete" width="24" />
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          </div>

          {/* Правая панель — рулетка или очередь */}
          {isMember ? (
            <div>
              <h2 className={styles.queueHeader}>Все фильмы в очереди</h2>
              <div className={styles.filmGrid}>
                {allFilms.map((film) => (
                  <div
                    key={film.id}
                    className={styles.filmCard}
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
            </div>
          ) : (
            <div className={styles.rouletteSection}>
              <h1 className={styles.rouletteHeader}>Рулетка</h1>
              <Roulette films={films} />
            </div>
          )}
        </div>
      )}

      {/* Patch notes */}
      {patchNotes.length > 0 && (
        <div className={styles.patchNotes}>
          <button
            className={styles.patchNotesToggle}
            onClick={() => setPatchNotesOpen(!patchNotesOpen)}
          >
            <Icon icon="mdi:information-outline" width="12" />
            <span>{patchNotes[0].version}</span>
          </button>
          {patchNotesOpen && (
            <div className={styles.patchNotesDropdown}>
              {patchNotes.map((note) => (
                <div key={note.version} className={styles.patchNoteItem}>
                  <span className={styles.patchNoteVersion}>
                    {note.version}
                  </span>
                  <span className={styles.patchNoteDesc}>
                    {note.description}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
