"use client";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import { api, type Winner } from "../../services/api";
import styles from "./WinnersTab.module.css";

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function WinnersTab() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .getWinners()
      .then((data) => {
        setWinners(data.reverse()); // новые сверху
        setLoading(false);
      })
      .catch(() => {
        setError("Не удалось загрузить список победителей");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <p className={styles.status}>Загрузка победителей...</p>;
  }

  if (error) {
    return <p className={styles.error}>{error}</p>;
  }

  if (winners.length === 0) {
    return (
      <div className={styles.empty}>
        <Icon icon="mdi:trophy-outline" width="36" />
        <p>Победителей пока нет. Запустите рулетку!</p>
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {winners.map((w) => (
        <div
          key={w.id}
          className={styles.card}
          style={
            w.film.poster
              ? { backgroundImage: `url(${w.film.poster})` }
              : undefined
          }
        >
          <div className={styles.cardOverlay} />
          <div className={styles.cardContent}>
            <div className={styles.trophy}>
              <Icon icon="mdi:trophy" width="20" />
            </div>
            <div className={styles.cardTitle}>{w.film.title}</div>
            {w.film.year && (
              <div className={styles.cardMeta}>{w.film.year}</div>
            )}
            <div className={styles.cardFrom}>{w.film.from}</div>
            <div className={styles.cardDate}>{formatDate(w.wonAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
