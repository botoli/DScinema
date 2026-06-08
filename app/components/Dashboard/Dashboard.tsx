"use client";
import { useEffect, useState, useRef } from "react";
import {
  MdSync,
  MdOutlineEmojiEvents,
  MdAdd,
  MdRefresh,
  MdLogout,
  MdMovieCreation,
  MdCheck,
  MdDelete,
  MdCasino,
  MdEmojiEvents,
  MdInfoOutline,
  MdPersonOutline,
} from "react-icons/md";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useAllFilms,
  useFilmsByUser,
  useAddFilms,
  useDeleteFilm,
} from "../../hooks/useFilms";
import { usePatchNotes } from "../../hooks/usePatchNotes";
import { useRouletteState } from "../../hooks/useRoulette";
import { api, type Film } from "../../services/api";
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
  defaultShowWinners?: boolean;
}

function Dashboard({ variant, defaultShowWinners }: DashboardProps) {
  const [me, setMe] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [isopenModal, setIsopenModal] = useState(false);
  const [modalButtonRect, setModalButtonRect] = useState<DOMRect | null>(null);
  const addBtnRef = useRef<HTMLButtonElement>(null);
  const [patchNotesOpen, setPatchNotesOpen] = useState(false);
  const [showWinners, setShowWinners] = useState(!!defaultShowWinners);
  const [animatingOutIds, setAnimatingOutIds] = useState<string[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const prevEliminatedRef = useRef<string[]>([]);
  const router = useRouter();
  const [memberTimeLeft, setMemberTimeLeft] = useState(120);
  const memberRemovingRef = useRef(false);
  const COUNTDOWN = 120;

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
  const rouletteQuery = useRouletteState();
  const addFilmsMutation = useAddFilms();
  const deleteFilmMutation = useDeleteFilm();

  // Анимация выбывания для участников
  useEffect(() => {
    const eliminatedIds = rouletteQuery.data?.eliminatedIds ?? [];
    const prev = prevEliminatedRef.current;

    const newIds = eliminatedIds.filter((id: string) => !prev.includes(id));
    if (newIds.length > 0) {
      setAnimatingOutIds((current) => [...current, ...newIds]);
      setTimeout(() => {
        setAnimatingOutIds((current) =>
          current.filter((id) => !newIds.includes(id)),
        );
      }, 700);
    }

    prevEliminatedRef.current = eliminatedIds;
  }, [rouletteQuery.data?.eliminatedIds]);

  // Таймер обратного отсчёта для участника
  useEffect(() => {
    if (!rouletteQuery.data?.wonAt || !rouletteQuery.data?.winner || !isMember)
      return;

    const tick = () => {
      const elapsed = Math.floor(
        (Date.now() - rouletteQuery.data.wonAt!) / 1000,
      );
      const remaining = Math.max(0, COUNTDOWN - elapsed);
      setMemberTimeLeft(remaining);

      if (remaining <= 0 && !memberRemovingRef.current) {
        memberRemovingRef.current = true;
        handleMemberRemoveWinner(rouletteQuery.data.winner!);
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [rouletteQuery.data?.wonAt, rouletteQuery.data?.winner, isMember]);

  const handleMemberRemoveWinner = async (film: Film) => {
    try {
      await deleteFilmMutation.mutateAsync(film.id);
    } catch (err) {
      console.error("Ошибка удаления фильма:", err);
    }
    await api.resetRoulette();
    memberRemovingRef.current = false;
    allFilmsQuery.refetch();
  };

  // Ручная синхронизация
  const handleSync = () => {
    allFilmsQuery.refetch();
    if (isMember) myFilmsQuery.refetch();
  };

  const films = isMember
    ? (myFilmsQuery.data ?? [])
    : (allFilmsQuery.data ?? []);
  const allFilms = allFilmsQuery.data ?? [];
  const loading = isMember
    ? allFilmsQuery.isPending || (!!me && myFilmsQuery.isPending)
    : allFilmsQuery.isPending;
  const error = allFilmsQuery.error || (isMember ? myFilmsQuery.error : null);
  const patchNotes = patchNotesQuery.data ?? [];

  // Удаление фильма с подтверждением
  const confirmDelete = (id: string) => {
    if (confirmingDeleteId === id) {
      setConfirmingDeleteId(null);
      deleteFilmMutation.mutate(id);
    } else {
      setConfirmingDeleteId(id);
    }
  };

  const cancelDelete = () => setConfirmingDeleteId(null);

  // Добавление фильмов
  async function handleAddFilms(newFilms: any[], userName: string) {
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
              <MdSync size={18} />
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
              className={styles.winnersBtn}
              onClick={() =>
                router.push(
                  isMember ? `/member/${me}/winners` : "/host/winners",
                )
              }
            >
              <MdOutlineEmojiEvents size={18} />
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
              disabled={addFilmsMutation.isPending}
            >
              {addFilmsMutation.isPending ? (
                <MdRefresh size={18} className={styles.spin} />
              ) : (
                <MdAdd size={18} />
              )}
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
              <MdLogout size={18} />
            </button>
          </Tooltip>
        </div>
      </div>

      {showWinners ? (
        <div className={styles.winnersSection}>
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
              {error && (
                <p className={styles.errorText}>Не удалось загрузить фильмы.</p>
              )}
              {!loading && !error && films.length === 0 && (
                <div className={styles.emptyState}>
                  <MdMovieCreation size={36} />
                  <p>Нет фильмов. Добавьте первый фильм!</p>
                </div>
              )}
              {!loading &&
                !error &&
                films.length > 0 &&
                Object.entries(grouped).map(([person, personFilms]) => (
                  <div key={person} className={styles.group}>
                    <h3 className={styles.groupTitle}>{person}</h3>
                    {personFilms.map((film) => {
                      const isConfirming = confirmingDeleteId === film.id;
                      const isDeleting =
                        isConfirming && deleteFilmMutation.isPending;
                      return (
                        <div
                          key={film.id}
                          className={`${styles.filmRow} ${isConfirming ? styles.filmRowConfirming : ""}`}
                          onClick={isConfirming ? cancelDelete : undefined}
                        >
                          <div className={styles.filmRowInfo}>
                            {film.poster ? (
                              <img
                                src={film.poster}
                                alt=""
                                className={styles.filmRowPoster}
                              />
                            ) : (
                              <div className={styles.filmRowNoPoster}>
                                <MdMovieCreation size={16} />
                              </div>
                            )}
                            <span>{film.title}</span>
                          </div>
                          <button
                            className={`${styles.deleteFilm} ${isConfirming ? styles.deleteFilmConfirm : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              confirmDelete(film.id);
                            }}
                            disabled={isDeleting}
                          >
                            {isDeleting ? (
                              <MdRefresh size={24} className={styles.spin} />
                            ) : isConfirming ? (
                              <MdCheck size={24} />
                            ) : (
                              <MdDelete size={24} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ))}
            </div>
          </div>

          {/* Правая панель — рулетка или очередь */}
          {isMember ? (
            <div>
              <div className={styles.queueHeaderRow}>
                <h2 className={styles.queueHeader}>
                  {rouletteQuery.data?.active
                    ? "Рулетка"
                    : "Все фильмы в очереди"}
                </h2>
                {rouletteQuery.data?.active && (
                  <span className={styles.rouletteBadge}>
                    <MdCasino size={16} />
                    Рулетка запущена
                  </span>
                )}
              </div>

              {rouletteQuery.data?.winner ? (
                <div
                  className={styles.rouletteWinnerCard}
                  style={{
                    backgroundImage: rouletteQuery.data.winner.poster
                      ? `url(${rouletteQuery.data.winner.poster})`
                      : undefined,
                  }}
                >
                  <div className={styles.filmCardOverlay} />
                  <div className={styles.rouletteWinnerContent}>
                    <MdEmojiEvents size={44} className={styles.winnerIcon} />
                    <h2 className={styles.rouletteWinnerTitle}>Победитель!</h2>
                    <div className={styles.rouletteWinnerFilmTitle}>
                      {rouletteQuery.data.winner.title}
                    </div>
                    {rouletteQuery.data.winner.year && (
                      <div className={styles.filmCardMeta}>
                        {rouletteQuery.data.winner.year}
                      </div>
                    )}
                    <div className={styles.filmCardFrom}>
                      {rouletteQuery.data.winner.from}
                    </div>
                    <div className={styles.memberWinnerTimer}>
                      Фильм будет удалён из списка через{" "}
                      {Math.floor(memberTimeLeft / 60)}:
                      {String(memberTimeLeft % 60).padStart(2, "0")}
                    </div>
                    <button
                      className={styles.memberRemoveBtn}
                      onClick={() =>
                        handleMemberRemoveWinner(rouletteQuery.data.winner!)
                      }
                    >
                      <MdDelete size={18} />
                      Убрать из списка
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.filmGrid}>
                  {allFilms
                    .filter(
                      (f) =>
                        !rouletteQuery.data?.eliminatedIds?.includes(f.id) ||
                        animatingOutIds.includes(f.id),
                    )
                    .map((film) => {
                      const classes = [styles.filmCard];
                      if (animatingOutIds.includes(film.id))
                        classes.push(styles.eliminating);
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
                            <div className={styles.filmCardTitle}>
                              {film.title}
                            </div>
                            {film.year && (
                              <div className={styles.filmCardMeta}>
                                {film.year}
                              </div>
                            )}
                            <div className={styles.filmCardFrom}>
                              {film.from}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
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
            <MdInfoOutline size={12} />
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
