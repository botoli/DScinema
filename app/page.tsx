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
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAllFilms } from "./hooks/useFilms";
import { useWinners } from "./hooks/useWinners";
import { useMouseGlow } from "./hooks/useMouseGlow";
import { motion } from "motion/react";
import { cardReveal, cinemaEase, curtainReveal, staggerContainer, tactile } from "./lib/motion";

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
  const logoRef = useRef<HTMLImageElement>(null);
  useMouseGlow(logoRef);
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
      <motion.section className={styles.hero} initial="hidden" animate="visible" variants={staggerContainer(0.12)}>
        <motion.div className={styles.brandGroup} variants={curtainReveal}>
          <motion.img ref={logoRef} src="/favicon.png" alt="" className={styles.logo} initial={{ scale: 0.7, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.1 }} />
          <span className={styles.brand}>
            <span className={styles.brandDs}>DS</span>
            <span className={styles.brandDot}>•</span>
            <span className={styles.brandCinema}>cinema</span>
          </span>
        </motion.div>
      </motion.section>

      <motion.div className={styles.statsBar} initial="hidden" animate="visible" variants={staggerContainer(0.09)}>
        <motion.div className={styles.statsBarItem} variants={cardReveal}>
          {loading ? (
            <span className={`${styles.statsBarNum} ${styles.skeleton}`}>
              &nbsp;&nbsp;&nbsp;
            </span>
          ) : (
            <span className={styles.statsBarNum}>{totalRoulettes}</span>
          )}
          <span className={styles.statsBarLabel}>рулеток</span>
        </motion.div>
        <div className={styles.statsBarDivider} />
        <motion.div className={styles.statsBarItem} variants={cardReveal}>
          {loading ? (
            <span className={`${styles.statsBarNum} ${styles.skeleton}`}>
              &nbsp;&nbsp;&nbsp;
            </span>
          ) : (
            <span className={styles.statsBarNum}>{watchedFilms}</span>
          )}
          <span className={styles.statsBarLabel}>фильмов посмотрено</span>
        </motion.div>
        <div className={styles.statsBarDivider} />
        <motion.div className={styles.statsBarItem} variants={cardReveal}>
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
        </motion.div>
      </motion.div>

      <motion.div className={styles.contentGrid} initial="hidden" animate="visible" variants={staggerContainer(0.14)}>
        <motion.div className={styles.card} variants={cardReveal} {...tactile}>
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
                <motion.button
                  key={user.id}
                  className={`${styles.userBtn} ${me === user.id ? styles.userBtnActive : ""}`}
                  onClick={() => handleLogin(user.id)}
                  disabled={loading}
                  whileHover={{ y: -4, borderColor: "var(--accent)", transition: { type: "spring", stiffness: 420, damping: 24 } }}
                  whileTap={{ scale: 0.96 }}
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
                </motion.button>
              );
            })}
          </div>

          {me && (
            <button className={styles.logoutLink} onClick={handleLogout}>
              <MdLogout size={14} />
              Выйти
            </button>
          )}
        </motion.div>
        <motion.div className={styles.card} variants={cardReveal} {...tactile} transition={{ duration: 0.65, ease: cinemaEase }}>
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
        </motion.div>
      </motion.div>
    </div>
  );
}
