"use client";
import { Icon } from "@iconify/react";
import styles from "./page.module.css";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function Home() {
  const [me, setMe] = useState("");

  useEffect(() => {
    const savedMe = localStorage.getItem("me") || "";
    setMe(savedMe);
  }, []);
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <img src="/favicon.png" alt="Logo" className={styles.logo} />
        <span className={styles.brand}>DScinema</span>
        <h1>Вход в рулетку</h1>
        <p>Выбери, как войти в бурмалдянку</p>
      </div>

      <div className={styles.split}>
        <div className={styles.pane} style={{"--i": 0} as React.CSSProperties}>
          <h2>Участник</h2>
          <p>Присоединиться к существующей сессии и предлагать свои фильмы</p>
          <Link href={me ? `/member/${me}` : "/ChooseProfile"}>
            <button>
              <Icon icon="mdi:account-outline" width="18" />
              Войти как участник
            </button>
          </Link>
        </div>

        <div className={styles.pane} style={{"--i": 1} as React.CSSProperties}>
          <h2>Хост</h2>
          <p>
            Создать новую сессию, управлять списком фильмов и запускать рулетку
          </p>
          <Link href={`/host`}>
            <button>
              <Icon icon="mdi:monitor-screenshot" width="18" />
              Войти как хост
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
