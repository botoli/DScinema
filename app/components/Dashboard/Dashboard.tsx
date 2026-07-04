"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MdAdd, MdCheck, MdDelete, MdEdit, MdInfoOutline, MdLogout, MdOutlineEmojiEvents, MdRefresh, MdSync } from "react-icons/md";
import { useAllFilms, useFilmsByUser, useAddFilms, useDeleteFilm, useUpdateFilm } from "../../hooks/useFilms";
import { usePatchNotes } from "../../hooks/usePatchNotes";
import { useRouletteState } from "../../hooks/useRoulette";
import { api, type Film, type RouletteState } from "../../services/api";
import AddFilmModal from "../AddModal/addFilmModal";
import EditFilmModal from "../AddModal/editFilmModal";
import Roulette from "../Roulette";
import RouletteReel from "../RouletteReel/RouletteReel";
import WinnersTab from "../WinnersTab/WinnersTab";
import styles from "./Dashboard.module.css";
import { AnimatePresence, motion } from "motion/react";
import { cardReveal, curtainReveal, staggerContainer, tactile } from "../../lib/motion";

const USERS = [
  { id: "artem", name: "Артём", phrase: "рекомендует", color: "#f06a43" },
  { id: "dzhebra", name: "Джебра", phrase: "добавил", color: "#b8c98a" },
  { id: "andrey", name: "Андрей", phrase: "выбрал", color: "#d9a441" },
  { id: "misha", name: "Миша", phrase: "в игре", color: "#91a477" },
];

const userName = (id: string) => USERS.find((u) => u.id === id)?.name ?? id;
const userId = (name: string) => USERS.find((u) => u.name === name)?.id ?? name;

interface DashboardProps { variant: "host" | "member"; defaultShowWinners?: boolean }

function FilmTile({
  film,
  onDelete,
  onEdit,
  confirming,
  deleting,
  noTactile,
}: {
  film: Film;
  onDelete?: () => void;
  onEdit?: () => void;
  confirming?: boolean;
  deleting?: boolean;
  noTactile?: boolean;
}) {
  const owner = USERS.find((user) => film.from === user.name || film.engName === user.id);
  const tactileProps = noTactile ? { whileTap: tactile.whileTap } : tactile;

  return (
    <motion.article layout variants={cardReveal} initial="hidden" animate="visible" exit="exit" {...tactileProps} className={`${styles.filmTile} ${confirming ? styles.confirming : ""}`}>
      <div className={styles.poster} style={{ backgroundImage: film.poster ? `url(${film.poster})` : undefined }}>
        {!film.poster && <span>{film.title.slice(0, 1)}</span>}
      </div>
      <div className={styles.cardActions}>
        {onEdit && (
          <button className={styles.editButton} onClick={onEdit} aria-label={`Редактировать ${film.title}`}>
            <MdEdit />
          </button>
        )}
        {onDelete && (
          <button className={styles.deleteButton} onClick={onDelete} aria-label={confirming ? `Подтвердить удаление ${film.title}` : `Удалить ${film.title}`}>
            {deleting ? <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}><MdRefresh /></motion.span> : confirming ? <MdCheck /> : <MdDelete />}
          </button>
        )}
      </div>
      <div className={styles.filmInfo}>
        <strong>{film.title}</strong>
        <span>{film.year || "Год не указан"}</span>
        <small><i style={{ background: owner?.color }} />{owner?.name ?? film.from}</small>
      </div>
    </motion.article>
  );
}

export default function Dashboard({ variant, defaultShowWinners }: DashboardProps) {
  const isMember = variant === "member";
  const [me, setMe] = useState("");
  const [autoSync, setAutoSync] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const [editingFilm, setEditingFilm] = useState<Film | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [patchOpen, setPatchOpen] = useState(false);
  const [memberTimeLeft, setMemberTimeLeft] = useState(120);
  const [filmFilter, setFilmFilter] = useState("all");
  const addRef = useRef<HTMLButtonElement>(null);
  const memberRemoving = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (!isMember) return;
    const saved = localStorage.getItem("me") || "";
    queueMicrotask(() => setMe(saved));
  }, [isMember]);

  const polling = autoSync ? 20_000 : false;
  const allQuery = useAllFilms({ refetchInterval: polling });
  const mineQuery = useFilmsByUser(me, { enabled: isMember && !!me, refetchInterval: polling });
  const rouletteQuery = useRouletteState();
  const patchQuery = usePatchNotes();
  const addMutation = useAddFilms();
  const deleteMutation = useDeleteFilm();
  const updateMutation = useUpdateFilm();
  const allFilms = allQuery.data ?? [];
  const films = isMember ? (mineQuery.data ?? []) : allFilms;
  const loading = allQuery.isPending || (isMember && !!me && mineQuery.isPending);
  const rouletteData = rouletteQuery.data;
  const winner = rouletteData?.winner;
  const wonAt = rouletteData?.wonAt;

  const removeWinnerNow = async (film: Film) => {
    try { await deleteMutation.mutateAsync(film.id); } catch (error) { console.error(error); }
    await api.resetRoulette();
    memberRemoving.current = false;
    allQuery.refetch();
  };
  const removeWinnerFromEffect = useEffectEvent(removeWinnerNow);

  useEffect(() => {
    if (!isMember || !wonAt || !winner) return;
    const tick = () => {
      const remaining = Math.max(0, 120 - Math.floor((Date.now() - wonAt) / 1000));
      setMemberTimeLeft(remaining);
      if (!remaining && !memberRemoving.current) { memberRemoving.current = true; removeWinnerFromEffect(winner); }
    };
    tick(); const interval = setInterval(tick, 1000); return () => clearInterval(interval);
  }, [isMember, winner, wonAt]);

  const addFilms = async (incoming: Film[], owner: string) => {
    await addMutation.mutateAsync(incoming.map((film) => ({ title: film.title, from: isMember ? userName(film.from || me) : film.from || owner, year: film.year, poster: film.poster, engName: isMember ? me : userId(film.from || owner) })));
  };

  const requestDelete = (id: string) => {
    if (confirmingId === id) { setConfirmingId(null); deleteMutation.mutate(id); }
    else setConfirmingId(id);
  };

  const saveFilm = async (id: string, film: Partial<Film>) => {
    try {
      await updateMutation.mutateAsync({ id, film });
      setConfirmingId((current) => current === id ? null : current);
    } finally {
      setEditingFilm(null);
    }
  };

  const groups = USERS.map((user) => ({ ...user, films: allFilms.filter((film) => film.from === user.name || film.engName === user.id) }));
  const today = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date());
  const activeFilter = isMember ? me : filmFilter;
  const collectionFilms = activeFilter === "all" ? allFilms : (groups.find((group) => group.id === activeFilter)?.films ?? []);
  const activeCurator = groups.find((group) => group.id === activeFilter);
  const openAddModal = () => {
    setButtonRect(addRef.current?.getBoundingClientRect() ?? null);
    setModalOpen(true);
  };

  if (defaultShowWinners) return <main className={styles.main}><Header compact onAdd={() => {}} onSync={() => allQuery.refetch()} onExit={() => router.push("/")} winnersHref={isMember ? `/member/${me}/winners` : "/host/winners"} /><WinnersTab /></main>;

  return (
    <main className={`${styles.main} ${isMember ? styles.memberPage : ""}`}>
      <Header compact={false} onAdd={openAddModal} onSync={() => { allQuery.refetch(); mineQuery.refetch(); }} onExit={() => { localStorage.removeItem("me"); router.push("/"); }} addRef={addRef} winnersHref={isMember ? `/member/${me}/winners` : "/host/winners"} />
      <AnimatePresence>
        {modalOpen && <AddFilmModal changeOpen={(open) => { setModalOpen(open); if (!open) setButtonRect(null); }} onAddFilms={addFilms} buttonRect={buttonRect} />}
        {editingFilm && <EditFilmModal film={editingFilm} changeOpen={(open) => { if (!open && !updateMutation.isPending) setEditingFilm(null); }} onSaveFilm={(payload) => saveFilm(editingFilm.id, payload)} isSaving={updateMutation.isPending} />}
      </AnimatePresence>

      <motion.section className={styles.intro} initial="hidden" animate="visible" variants={curtainReveal}>
        <div><span className={styles.eyebrow}>Редакционный киноклуб</span><h1>Вечерний выбор</h1></div>
        <div className={styles.eveningMeta}><span>{today}</span><span>{USERS.length} участника</span><span>{allFilms.length} фильмов</span></div>
      </motion.section>

      {!isMember && <motion.section className={styles.curators} aria-label="Кураторы вечера" initial="hidden" animate="visible" variants={staggerContainer(0.07)}>{groups.map((u) => <motion.article key={u.id} className={styles.curator} variants={cardReveal}><span className={styles.avatar} style={{ "--curator": u.color } as React.CSSProperties}>{u.name[0]}</span><div><strong>{u.name}</strong><span>{u.phrase} · {u.films.length}</span></div></motion.article>)}</motion.section>}

      <div className={isMember ? styles.memberContent : undefined}>
      <section className={`${styles.editorialSection} ${styles.rouletteSection} ${isMember ? styles.memberRouletteSection : ""}`}>
        {!isMember && <div className={styles.step}><b>01</b><span>Выбор вечера</span></div>}
        <div className={styles.sectionBody}>{isMember ? <MemberRoulette films={allFilms} state={rouletteData} time={memberTimeLeft} remove={() => winner && removeWinnerNow(winner)} /> : <Roulette films={films} rouletteState={rouletteData} contributions={groups.map(({ name, films: userFilms }) => ({ name, count: userFilms.length }))} />}</div>
      </section>

      <section className={`${styles.editorialSection} ${isMember ? styles.memberCollection : ""}`}>
        {!isMember && <div className={styles.step}><b>02</b><span>Фильмы в очереди</span></div>}
        <div className={styles.sectionBody}>
          <div className={styles.collectionTop}><div><span className={styles.eyebrow}>{isMember ? "Ваша подборка" : "Общая коллекция"}</span><h2>{activeCurator ? `${activeCurator.name} рекомендует` : "Фильмы в очереди"}</h2></div><div className={styles.collectionActions}><p>{loading ? "Обновляем коллекцию…" : `${collectionFilms.length} вариантов`}</p>{isMember && <button onClick={openAddModal} className={styles.collectionAdd}><MdAdd /> Добавить фильм</button>}</div></div>
          {!isMember && <div className={styles.filters} role="group" aria-label="Фильтр по автору"><button className={filmFilter === "all" ? styles.activeFilter : ""} onClick={() => setFilmFilter("all")}>Все фильмы <span>· {allFilms.length}</span></button>{groups.map((group) => <button key={group.id} className={filmFilter === group.id ? styles.activeFilter : ""} onClick={() => setFilmFilter(group.id)}><i style={{ background: group.color }} />{group.name} <span>· {group.films.length}</span></button>)}</div>}
          <motion.div layout className={`${styles.filmGrid} ${isMember ? styles.memberFilmGrid : ""}`}><AnimatePresence mode="popLayout" initial={false}>{collectionFilms.length ? collectionFilms.map((film) => <FilmTile key={`${film.id}:${film.title}:${film.year ?? ""}:${film.poster ?? ""}:${film.from}:${film.engName ?? ""}`} film={film} confirming={confirmingId === film.id} deleting={confirmingId === film.id && deleteMutation.isPending} onDelete={() => requestDelete(film.id)} onEdit={() => setEditingFilm(film)} noTactile />) : <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={styles.empty}>В этой подборке пока нет фильмов</motion.p>}</AnimatePresence></motion.div>
        </div>
      </section>
      </div>


      <footer className={styles.footer}><button onClick={() => setAutoSync((v) => !v)}><i className={autoSync ? styles.online : ""} /> Автосинхронизация</button><button onClick={() => setPatchOpen((v) => !v)}><MdInfoOutline /> {patchQuery.data?.[0]?.version ?? "DS"}</button>{patchOpen && <p>{patchQuery.data?.[0]?.description}</p>}</footer>
    </main>
  );
}

function Header({ compact, onAdd, onSync, onExit, addRef, winnersHref }: { compact: boolean; onAdd: () => void; onSync: () => void; onExit: () => void; winnersHref: string; addRef?: React.RefObject<HTMLButtonElement | null> }) {
  return <header className={styles.topBar}><Link href="/" className={styles.brand}><b>DS</b><i>•</i><span>cinema</span></Link><nav><button onClick={onSync} aria-label="Обновить"><MdSync /></button><Link href={winnersHref}><MdOutlineEmojiEvents /> Победители</Link>{!compact && <button ref={addRef} onClick={onAdd} className={styles.add}><MdAdd /> Добавить</button>}<button onClick={onExit} aria-label="Выйти"><MdLogout /></button></nav></header>;
}

function MemberRoulette({ films, state, time, remove }: { films: Film[]; state: RouletteState | undefined; time: number; remove: () => void }) {
  const winner = state?.winner;
  const remaining = films.filter((film) => !state?.eliminatedIds.includes(film.id));
  return <div className={styles.live}><div><span className={styles.eyebrow}>{winner ? "Победитель вечера" : state?.active ? "Выбор идёт" : "Очередь готова"}</span><h2>{winner ? winner.title : state?.active ? `В рулетке ${remaining.length}` : "Готовы довериться выбору?"}</h2><p>{winner ? `${winner.from} · удаление через ${Math.floor(time / 60)}:${String(time % 60).padStart(2, "0")}` : "Рулетку запускает киномастер. Экран обновится автоматически."}</p>{winner && <button className={styles.memberRemove} onClick={remove}>Убрать из списка</button>}</div><RouletteReel films={films} state={state} compact /></div>;
}
