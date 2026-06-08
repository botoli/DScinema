"use client";
import { useState } from "react";
import {
  MdEmojiEvents,
  MdOutlineEmojiEvents,
  MdOutlineCalendarMonth,
  MdOutlineChevronLeft,
} from "react-icons/md";
import { useRouter } from "next/navigation";
import { useWinners } from "../../hooks/useWinners";
import CalendarModal from "../CalendarModal/CalendarModal";
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
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { data: winnersData, isLoading, isError } = useWinners();
  const winners = winnersData ? [...winnersData].reverse() : [];

  if (isLoading) {
    return <p className={styles.status}>Загрузка победителей...</p>;
  }

  if (isError) {
    return (
      <p className={styles.error}>Не удалось загрузить список победителей</p>
    );
  }

  if (winners.length === 0) {
    return (
      <div className={styles.empty}>
        <MdOutlineEmojiEvents size={36} />
        <p>Победителей пока нет. Запустите рулетку!</p>
      </div>
    );
  }

  return (
    <>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => router.back()}>
          <MdOutlineChevronLeft size={22} />
        </button>
        <MdOutlineEmojiEvents size={42} className={styles.headerIcon} />
        <h2 className={styles.headerTitle}>Предыдущие победители</h2>
        <button
          className={styles.calendarBtn}
          onClick={() => setCalendarOpen(true)}
          title="Календарь победителей"
        >
          <MdOutlineCalendarMonth size={28} />
        </button>
      </div>

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
                <MdEmojiEvents size={20} />
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

      {calendarOpen && (
        <CalendarModal
          winners={winnersData ?? []}
          onClose={() => setCalendarOpen(false)}
        />
      )}
    </>
  );
}
