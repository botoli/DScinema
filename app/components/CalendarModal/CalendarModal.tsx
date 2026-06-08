"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  MdClose,
  MdChevronLeft,
  MdChevronRight,
  MdEmojiEvents,
  MdMovieCreation,
  MdPerson,
  MdSchedule,
  MdRefresh,
} from "react-icons/md";
import styles from "./CalendarModal.module.css";

interface Winner {
  id: string;
  film: {
    title: string;
    from: string;
    year?: number;
    poster?: string;
  };
  wonAt: string;
}

interface CalendarModalProps {
  winners: Winner[];
  onClose: () => void;
}

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const MONTHS = [
  "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
  "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь",
];

function formatDateRu(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDayKey(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarModal({ winners, onClose }: CalendarModalProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detail, setDetail] = useState<{
    winner: Winner;
    description: string | null;
    loading: boolean;
  } | null>(null);
  const detailAbortRef = useRef<AbortController | null>(null);

  const winnersByDay = new Map<string, Winner>();
  for (const w of winners) {
    const key = getDayKey(w.wonAt);
    winnersByDay.set(key, w);
  }

  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = getDayKey(now.toISOString());

  const cells: (number | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
    setDetail(null);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
    setDetail(null);
  };

  const handleDayClick = useCallback((day: number) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    if (key === selectedDay) {
      setSelectedDay(null);
      setDetail(null);
      return;
    }

    setSelectedDay(key);
    const w = winnersByDay.get(key);
    if (w) {
      if (detailAbortRef.current) {
        detailAbortRef.current.abort();
      }

      setDetail({ winner: w, description: null, loading: true });

      const abortController = new AbortController();
      detailAbortRef.current = abortController;

      fetch(`/api/movie-detail?title=${encodeURIComponent(w.film.title)}${w.film.year ? `&year=${w.film.year}` : ""}`, {
        signal: abortController.signal,
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          setDetail(prev => prev ? { ...prev, description: data?.description ?? null, loading: false } : null);
        })
        .catch(() => {
          setDetail(prev => prev ? { ...prev, loading: false } : null);
        });
    }
  }, [year, month, winnersByDay, selectedDay]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      if (detailAbortRef.current) detailAbortRef.current.abort();
    };
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          <MdClose size={24} />
        </button>

        <div className={styles.layout}>
          <div className={styles.calendar}>
            <div className={styles.calendarHeader}>
              <button className={styles.navBtn} onClick={prevMonth}>
                <MdChevronLeft size={24} />
              </button>
              <span className={styles.calendarTitle}>
                {MONTHS[month]} {year}
              </span>
              <button className={styles.navBtn} onClick={nextMonth}>
                <MdChevronRight size={24} />
              </button>
            </div>

            <div className={styles.weekdays}>
              {DAYS.map(d => (
                <span key={d} className={styles.weekday}>{d}</span>
              ))}
            </div>

            <div className={styles.daysGrid}>
              {cells.map((day, i) => {
                if (day === null) return <div key={i} className={styles.dayEmpty} />;

                const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayWinners = winnersByDay.get(key);
                const isToday = key === todayKey;
                const isSelected = key === selectedDay;

                return (
                  <button
                    key={i}
                    className={`${styles.day} ${isToday ? styles.dayToday : ""} ${isSelected ? styles.daySelected : ""} ${dayWinners ? styles.dayHasWinner : ""}`}
                    onClick={() => handleDayClick(day)}
                  >
                    <span className={styles.dayNum}>{day}</span>
                    {dayWinners && (
                      <div className={styles.dayPosters}>
                        <div
                          className={styles.miniPoster}
                          style={{
                            backgroundImage: dayWinners.film.poster
                              ? `url(${dayWinners.film.poster})`
                              : undefined,
                          }}
                        />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${styles.detail} ${selectedDay ? styles.detailVisible : ""}`}>
            {!selectedDay && (
              <div className={styles.detailEmpty}>
                <MdEmojiEvents size={48} />
                <p>Выберите день с победами</p>
              </div>
            )}

            {selectedDay && detail && (
              <div className={styles.detailContent}>
                {detail.winner.film.poster ? (
                  <div
                    className={styles.detailPoster}
                    style={{ backgroundImage: `url(${detail.winner.film.poster})` }}
                  />
                ) : (
                  <div className={styles.detailPosterPlaceholder}>
                    <MdMovieCreation size={48} />
                  </div>
                )}

                <h3 className={styles.detailTitle}>{detail.winner.film.title}</h3>
                {detail.winner.film.year && (
                  <span className={styles.detailYear}>{detail.winner.film.year}</span>
                )}

                <div className={styles.detailMeta}>
                  <div className={styles.detailMetaItem}>
                    <MdPerson size={16} />
                    <span>{detail.winner.film.from}</span>
                  </div>
                  <div className={styles.detailMetaItem}>
                    <MdSchedule size={16} />
                    <span>{formatDateRu(detail.winner.wonAt)}</span>
                  </div>
                </div>

                <div className={styles.detailDescription}>
                  {detail.loading ? (
                    <div className={styles.detailLoading}>
                      <MdRefresh size={20} className={styles.spin} />
                      <span>Загрузка описания...</span>
                    </div>
                  ) : detail.description ? (
                    <p>{detail.description}</p>
                  ) : (
                    <p className={styles.detailNoDesc}>Описание не найдено</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
