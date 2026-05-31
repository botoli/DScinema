"use client";
import Link from "next/link";
import styles from "./ChooseProfile.module.css";
export default function ChooseProfile() {
  const users = [
    { id: "dzhebra", name: "Джебра" },
    { id: "artem", name: "Артем" },
    { id: "andrey", name: "Андрей" },
    { id: "misha", name: "Миша" },
  ];
  function saveMe(name: string) {
    localStorage.removeItem("me");
    localStorage.setItem("me", name);
  }
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Выбор Профиля</h1>
        <p>Выбери себя</p>
      </div>
      <div className={styles.split}>
        {users.map((u) => (
          <div className={styles.pane} key={u.id}>
            <h2>{u.name}</h2>
            <p>Присоединиться к существующей сессии и предлагать свои фильмы</p>
            <Link href={`/member/${encodeURIComponent(u.id)}`}>
              <button
                onClick={() => saveMe(u.id)}
              >{`Войти как ${u.name}`}</button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
