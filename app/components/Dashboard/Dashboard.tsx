"use client";
import { useEffect, useState, useRef } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAllFilms,
  useFilmsByUser,
  useAddFilms,
  useDeleteFilm,
} from "../../hooks/useFilms";
import { usePatchNotes } from "../../hooks/usePatchNotes";
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
  const [me, setMe] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [isopenModal, setIsopenModal] = useState(false);
  const [modalButtonRect, setModalButtonRect] = useState<DOMRect | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);
  const [showWinners, setShowWinners] = useState(false);
  const router = useRouter();

  const isMember = variant === "member";
  const title = isMember ? "Мой список фильмов" : "Список фильмов";

  const pollingInterval = autoSync ? 20_000 : false;

  // Инициализация me (только для member)
  useEffect(() => {
    if (isMember) {
      const savedMe = localStorage.getItem("me") || "";
      setMe(savedMe);
    }
  }, [isMember]);

  // Запросы через React Query
  const allFilmsQuery = useAllFilms({
    refetchInterval: pollingInterval,
  });
  const myFilmsQuery = useFilmsByUser(me, {
    enabled: isMember && !!me,
    refetchInterval: pollingInterval,
  });
  const patchNotesQuery = usePatchNotes();
  const addFilmsMutation = useAddFilms();
  const deleteFilmMutation = useDeleteFilm();

  // Ручная синхронизация
  const handleSync = () => {
    allFilmsQuery.refetch();
    if (isMember) myFilmsQuery.refetch();
  };

  const films = isMember ? (myFilmsQuery.data ?? []) : (allFilmsQuery.data ?? []);
  const allFilms = allFilmsQuery.data ?? [];
  const loading = isMember
    ? allFilmsQuery.isPending || (!!me && myFilmsQuery.isPending)
    : allFilmsQuery.isPending;
  const error = allFilmsQuery.error || (isMember ? myFilmsQuery.error : null);
  const patchNotes = patchNotesQuery.data ?? [];

  // Удаление фильма
  async function deleteFilm(id: string) {
    try {
      await deleteFilmMutation.mutateAsync(id);
    } catch (err) {
      console.error("Ошибка удаления фильма:", err);
    }
  }

  // Добавление фильмов
  async function handleAddFilms(
    newFilms: any[],
    userName: string,
  ) {
    try {
      await addFilmsMutation.mutateAsync(
        newFilms.map((f) => ({
          title: f.title,
          from: isMember ? getUserName(f.from || me) : f.from || userName,
          year: f.year,
          poster: f.poster,
          engName: isMember ? me : getUserEngName(f.from || userName),
        })),
      );
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
              ref={addBtnRef}
              className={styles.addBtn}
              onClick={() => {
                const rect = addBtnRef.current?.getBoundingClientRect();
                setModalButtonRect(rect ?? null);
                setIsopenModal(true);
              }}
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
                changeOpen={(v) => {
                  setIsopenModal(v);
                  if (!v) setModalButtonRect(null);
                }}
                onAddFilms={handleAddFilms}
                buttonRect={modalButtonRect}
              />
            )}

            <div className={styles.filmList}>
              {loading && (
                <p className={styles.statusText}>Загрузка фильмов...</p>
              )}
              {error && <p className={styles.errorText}>Не удалось загрузить фильмы.</p>}
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
