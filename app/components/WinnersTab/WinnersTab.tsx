"use client";
import { Icon } from "@iconify/react";
import { useWinners } from "../../hooks/useWinners";
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
  const { data: winnersData, isLoading, isError } = useWinners();
  const winners = winnersData ? [...winnersData].reverse() : [];

  if (isLoading) {
    return <p className={styles.status}>Загрузка победителей...</p>;
  }

  if (isError) {
    return <p className={styles.error}>Не удалось загрузить список победителей</p>;
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
          style={{
            backgroundImage: w.film.poster
              ? `url(${w.film.poster})`
              : undefined,
          }}
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
