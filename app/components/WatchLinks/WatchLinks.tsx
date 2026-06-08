"use client";
import { useEffect, useState } from "react";
import {
  MdPlayCircleOutline,
  MdMovie,
  MdOpenInNew,
  MdLink,
} from "react-icons/md";
import styles from "./WatchLinks.module.css";

interface WatchResult {
  platform: "kinopoisk" | "rutube" | "vkvideo";
  label: string;
  url: string;
  relevance: number;
}

interface WatchLinksProps {
  title: string;
  year?: number;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  kinopoisk: <MdMovie size={20} />,
  rutube: <MdPlayCircleOutline size={20} />,
  vkvideo: <MdPlayCircleOutline size={20} />,
};

const RELEVANCE_LABELS: Record<string, string> = {
  high: "Полный фильм",
  medium: "Возможно, полный фильм",
  low: "Поиск на платформе",
};

function getRelevanceLevel(score: number): "high" | "medium" | "low" {
  if (score >= 0.7) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}

function getRelevanceClass(score: number): string {
  const level = getRelevanceLevel(score);
  switch (level) {
    case "high":
      return styles.badgeHigh;
    case "medium":
      return styles.badgeMedium;
    default:
      return styles.badgeLow;
  }
}

export default function WatchLinks({ title, year }: WatchLinksProps) {
  const [results, setResults] = useState<WatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams({ title });
    if (year) params.set("year", String(year));

    fetch(`/api/search-watch?${params.toString()}`)
      .then((r) => {
        if (!r.ok) throw new Error("Search failed");
        return r.json();
      })
      .then((data) => {
        if (!cancelled) {
          setResults(data.results ?? []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [title, year]);

  return (
    <div className={styles.watchLinks}>
      <h3 className={styles.heading}>
        <MdPlayCircleOutline size={20} />
        Где посмотреть
      </h3>

      {loading && (
        <p className={styles.status}>Поиск платформ...</p>
      )}

      {error && (
        <p className={styles.error}>Не удалось найти платформы для просмотра</p>
      )}

      {!loading && !error && results.length === 0 && (
        <p className={styles.status}>Ничего не найдено</p>
      )}

      {!loading && results.length > 0 && (
        <div className={styles.platforms}>
          {results.map((result) => {
            const level = getRelevanceLevel(result.relevance);
            return (
              <a
                key={result.platform}
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.platformLink}
              >
                {PLATFORM_ICONS[result.platform] || <MdLink size={20} />}
                <div className={styles.platformInfo}>
                  <span className={styles.platformLabel}>
                    {result.label}
                  </span>
                  <span
                    className={`${styles.relevanceBadge} ${getRelevanceClass(result.relevance)}`}
                  >
                    {RELEVANCE_LABELS[level]}
                  </span>
                </div>
                <MdOpenInNew size={16} className={styles.externalIcon} />
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
