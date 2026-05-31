"use client";
// page.tsx (обновленный Main компонент)
import styles from "./page.module.css";
import Roulette from "../components/Roulette";
import { useEffect, useState } from "react";
import AddFilmModal from "../components/AddModal/addFilmModal";
import { Film } from "../services/api";
import { api } from "../services/api";
import { Icon } from "@iconify/react";

function Main() {
  const [films, setFilms] = useState<Film[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Загружаем фильмы с json-server при монтировании
  useEffect(() => {
    api
      .getFilms()
      .then((data) => {
        setFilms(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Ошибка загрузки фильмов:", err);
        setError(
          "Не удалось загрузить фильмы. Проверьте, что json-server запущен на порту 4000.",
        );
        setLoading(false);
      });
  }, []);

  // Удаление фильма через API и локально
  async function deleteFilm(id: string) {
    try {
      await api.deleteFilm(id);
      setFilms((prev) => prev.filter((f) => f.id !== id));
    } catch (err) {
      console.error("Ошибка удаления фильма:", err);
    }
  }
  const users = [
    { id: "dzhebra", name: "Джебра" },
    { id: "artem", name: "Артем" },
    { id: "andrey", name: "Андрей" },
    { id: "misha", name: "Миша" },
  ];

  function getUserEngName(userName: string): string {
    const user = users.find((u) => u.name === userName);
    return user ? user.id : userName;
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
        <div className={styles.film_section__header}>
          <div className={styles.left_side}>
            <h1>Список фильмов</h1>
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
                      from: f.from || userName,
                      year: f.year,
                      poster: f.poster,
                      engName: getUserEngName(f.from || userName),
                    })),
                  );
                  setFilms((prev) => [...prev, ...addedFilms]);
                } catch (err) {
                  console.error("Ошибка добавления фильмов:", err);
                }
              }}
            />
          )}
        </div>

        <div className={styles.film_section__main}>
          {loading && <p className={styles.loading}>Загрузка фильмов...</p>}
          {error && <p className={styles.error}>{error}</p>}
          {!loading &&
            !error &&
            Object.entries(grouped).map(([person, personFilms]) => (
              <div key={person} className={styles.from_cards}>
                <h1>{person}</h1>
                {personFilms.map((film) => (
                  <div key={film.id}>
                    {film.title}
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

      <div className={styles.roulette_section}>
        <div className={styles.roulette_section__header}>
          <h1>Рулетка</h1>
        </div>
        <Roulette films={films} />
      </div>
    </div>
  );
}

export default Main;
