"use client";
import {
  MdLocalMovies,
  MdGroups,
  MdCheck,
  MdArrowForward,
  MdBarChart,
  MdEmojiEvents,
  MdVerifiedUser,
  MdLogout,
  MdPersonOutline,
  MdSwitchAccount,
} from "react-icons/md";
import styles from "./page.module.css";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAllFilms } from "./hooks/useFilms";
import { useWinners } from "./hooks/useWinners";

const USERS = [
  { id: "dzhebra", name: "Джебра" },
  { id: "artem", name: "Артём" },
  { id: "andrey", name: "Андрей" },
  { id: "misha", name: "Миша" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Home() {
  const [me, setMe] = useState("");
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedMe = localStorage.getItem("me") || "";
    setMe(savedMe);
    setMounted(true);
  }, []);

  const { data: films = [], isPending: filmsLoading } = useAllFilms();
  const { data: winners = [], isPending: winnersLoading } = useWinners();

  const loading = mounted && (filmsLoading || winnersLoading);

  const filmCounts: Record<string, number> = {};
  films.forEach((f: any) => {
    const key = f.from || f.engName || "unknown";
    filmCounts[key] = (filmCounts[key] || 0) + 1;
  });

  const totalRoulettes = winners.length;
  const watchedFilms = new Set(winners.map((w: any) => w.film?.title)).size;
  const lastWinner = winners.length > 0 ? winners[winners.length - 1] : null;

  const handleLogin = (userId: string) => {
    localStorage.setItem("me", userId);
    router.push(`/member/${userId}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("me");
    setMe("");
  };

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.brandGroup}>
          <img src="/favicon.png" alt="" className={styles.logo} />
          <span className={styles.brand}>
            <span className={styles.brandDs}>DS</span>
            <span className={styles.brandDot}>•</span>
            <span className={styles.brandCinema}>cinema</span>
          </span>
        </div>
      </section>

      <div className={styles.statsBar}>
        <div className={styles.statsBarItem}>
          {loading ? (
            <span className={`${styles.statsBarNum} ${styles.skeleton}`}>
              &nbsp;&nbsp;&nbsp;
            </span>
          ) : (
            <span className={styles.statsBarNum}>{totalRoulettes}</span>
          )}
          <span className={styles.statsBarLabel}>рулеток</span>
        </div>
        <div className={styles.statsBarDivider} />
        <div className={styles.statsBarItem}>
          {loading ? (
            <span className={`${styles.statsBarNum} ${styles.skeleton}`}>
              &nbsp;&nbsp;&nbsp;
            </span>
          ) : (
            <span className={styles.statsBarNum}>{watchedFilms}</span>
          )}
          <span className={styles.statsBarLabel}>фильмов посмотрено</span>
        </div>
        <div className={styles.statsBarDivider} />
        <div className={styles.statsBarItem}>
          <span className={styles.statsBarLabel}>Последний:</span>
          {loading ? (
            <span className={`${styles.statsBarFilm} ${styles.skeleton}`}>
              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
            </span>
          ) : (
            <span className={styles.statsBarFilm}>
              {lastWinner?.film?.title || "—"}
            </span>
          )}
        </div>
      </div>

      <div className={styles.contentGrid}>
        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <MdGroups size={28} />
          </div>
          <h2 className={styles.cardTitle}>Участники</h2>
          <p className={styles.cardDesc}>
            Добавляют свои фильмы и следят за выбором
          </p>

          {me && (
            <div className={styles.currentSession}>
              <button
                className={styles.profileChip}
                onClick={() => router.push(`/member/${me}`)}
              >
                <MdSwitchAccount size={18} />
                {USERS.find((u) => u.id === me)?.name || me}
                <MdArrowForward size={16} />
              </button>
            </div>
          )}

          <div className={styles.userGrid}>
            {USERS.map((user) => {
              const count = filmCounts[user.name] ?? 0;
              return (
                <button
                  key={user.id}
                  className={`${styles.userBtn} ${me === user.id ? styles.userBtnActive : ""}`}
                  onClick={() => handleLogin(user.id)}
                  disabled={loading}
                >
                  <span className={styles.userName}>{user.name}</span>
                  <span className={styles.userStatus}>
                    <span className={styles.dot} />
                    {loading ? (
                      <span className={styles.skeletonInline}>
                        &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      </span>
                    ) : (
                      <>
                        {count}{" "}
                        {count === 1
                          ? "фильм"
                          : count >= 2 && count <= 4
                            ? "фильма"
                            : "фильмов"}
                      </>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {me && (
            <button className={styles.logoutLink} onClick={handleLogout}>
              <MdLogout size={14} />
              Выйти
            </button>
          )}
        </div>
        <div className={styles.card}>
          <div className={styles.cardIcon}>
            <MdLocalMovies size={28} />
          </div>
          <h2 className={styles.cardTitle}>Киномастер</h2>
          <p className={styles.cardDesc}>
            Управляет списком фильмов и запускает рулетку
          </p>
          <ul className={styles.checklist}>
            <li>
              <MdCheck size={16} /> Добавлять фильмы участников
            </li>
            <li>
              <MdCheck size={16} /> Редактировать список
            </li>
            <li>
              <MdCheck size={16} /> Запускать рулетку выбывания
            </li>
            <li>
              <MdCheck size={16} /> Выбирать победителя
            </li>
          </ul>
          <Link href="/host" className={styles.cardButton}>
            Открыть панель
          </Link>
        </div>
      </div>
    </div>
  );
}
