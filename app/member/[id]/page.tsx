"use client";
// page.tsx (обновленный Main компонент)
import styles from "./page.module.css";
import Roulette from "../../components/Roulette";
import { useEffect, useState } from "react";
import AddFilmModal from "../../components/AddModal/addFilmModal";
import { Film } from "../../services/api";
import { api } from "../../services/api";
import { Icon } from "@iconify/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

function Main() {
  const [films, setFilms] = useState<Film[]>([]);
  const [allFilms, setAllFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [me, setMe] = useState("");
  const router = useRouter();
  const users = [
    { id: "dzhebra", name: "Джебра" },
    { id: "artem", name: "Артем" },
    { id: "andrey", name: "Андрей" },
    { id: "misha", name: "Миша" },
  ];

  function getUserName(engName: string): string {
    const user = users.find((u) => u.id === engName);
    return user ? user.name : engName;
  }

  useEffect(() => {
    const savedMe = localStorage.getItem("me") || "";
    setMe(savedMe);
  }, []);
  // Загружаем фильмы с json-server при монтировании
  useEffect(() => {
    if (!me) return;
    setLoading(true);
    api
      .getFilmsByName(me)
      .then((data) => {
        setFilms(data);
        console.log(data);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки фильмов:", err);
        setError(
          "Не удалось загрузить фильмы. Проверьте, что json-server запущен на порту 4000.",
        );
        setLoading(false);
      });
  }, [me]);
  useEffect(() => {
    setLoading(true);
    api
      .getFilms()
      .then((data) => {
        setAllFilms(data);
        console.log(data);

        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки фильмов:", err);
        setError(
          "Не удалось загрузить фильмы. Проверьте, что json-server запущен на порту 4000.",
        );
        setLoading(false);
      });
  }, [films, me]);

  // Удаление фильма через API и локально
  async function deleteFilm(id: string) {
    try {
      await api.deleteFilm(id);
      setFilms((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Ошибка удаления фильма:", err);
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

  const [isopenModal, setisopenModal] = useState(false);

  return (
    <div className={styles.main}>
      <div className={styles.film_section}>
        <div className={styles.left_side}>
          <Link href="/">
            <div className={styles.logo_div}>
              <img src="/favicon.png" alt="Logo" className={styles.logo} />
              <h1>
                <span className={styles.ds}>DS</span>
                <span className={styles.dot}>•</span>
                <span className={styles.cinema}>cinema</span>
              </h1>
            </div>
          </Link>
        </div>
        <div className={styles.film_section__header}>
          <div className={styles.left_side}>
            <h2>Мой список фильмов</h2>
            <p>{films.length}</p>
          </div>
          <button onClick={() => setisopenModal(true)}>Добавить фильм</button>
          {isopenModal && (
            <AddFilmModal
              changeOpen={setisopenModal}
              onAddFilms={async (newFilms, userName) => {
                // Сохраняем каждый фильм через API
                try {
                  const addedFilms = await api.addFilms(
                    newFilms.map((f) => ({
                      title: f.title,
                      from: getUserName(f.from || userName),
                      year: f.year,
                      poster: f.poster,
                      engName: me,
                    })),
                  );
                  setFilms((prev) => [...prev, ...addedFilms]);
                } catch (err) {
                  console.error("Ошибка добавления фильмов:", err);
                }
              }}
            />
          )}
          <button
            className={styles.logout_btn}
            onClick={() => {
              localStorage.removeItem("me");
              router.push("/");
            }}
          >
            Выйти
            <Icon icon="mdi:logout" />
          </button>
        </div>

        <div className={styles.film_section__main}>
          {loading && <p className={styles.loading}>Загрузка фильмов...</p>}
          {error && <p className={styles.error}>{error}</p>}
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
              <div key={person} className={styles.from_cards}>
                <h3>{person}</h3>
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
                      <Icon icon="material-symbols:close-rounded" width="24" />
                    </button>
                  </div>
                ))}
              </div>
            ))}
        </div>
      </div>
      <div>
        <h2 className={styles.queueHeader}>Все фильмы в очереди</h2>

        <div className={styles.rouletteGrid}>
          {allFilms.map((film) => {
            return (
              <div
                key={film.id}
                className={`
                ${styles.filmCard}
                
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
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Main;
