import { NextRequest, NextResponse } from "next/server";

interface WatchResult {
  platform: "kinopoisk" | "rutube" | "vkvideo";
  label: string;
  url: string;
  relevance: number; // 0-1, насколько релевантен результат
}

interface KinopoiskMovie {
  id: number;
  name?: string;
  alternativeName?: string;
  enName?: string;
  year?: number;
  movieLength?: number;
  rating?: { kp?: number };
  poster?: { url?: string; previewUrl?: string };
}

/** Нормализация названия для сравнения */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Проверка, содержит ли название стоп-слова (трейлер, обзор и т.д.) */
function hasStopWords(title: string): boolean {
  const stopWords = [
    "трейлер",
    "teaser",
    "тизер",
    "обзор",
    "реакция",
    "разбор",
    "сцена",
    "отрывок",
    "фрагмент",
    "нарезка",
    "момент",
  ];
  const lower = title.toLowerCase();
  return stopWords.some((w) => lower.includes(w));
}

/** Насколько схожи два названия (0..1) */
function titleSimilarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  const aWords = na.split(" ");
  const bWords = nb.split(" ");
  const common = aWords.filter((w) => bWords.includes(w));
  return common.length / Math.max(aWords.length, bWords.length);
}

// ============================================================
// Kinopoisk
// ============================================================

async function searchKinopoisk(
  title: string,
  year?: number,
): Promise<WatchResult | null> {
  const API_KEY = process.env.KINOPOISK_API_KEY;
  if (!API_KEY) return null;

  try {
    const response = await fetch(
      `https://api.poiskkino.dev/v1.4/movie/search?page=1&limit=10&query=${encodeURIComponent(title)}`,
      {
        headers: { "X-API-KEY": API_KEY },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const docs: KinopoiskMovie[] = data.docs ?? [];

    // Ищем лучшее совпадение по названию и году
    let best: KinopoiskMovie | null = null;
    let bestScore = 0;

    for (const movie of docs) {
      const movieTitle =
        movie.name || movie.alternativeName || movie.enName || "";
      let score = titleSimilarity(title, movieTitle);

      // Бонус за совпадение года
      if (year && movie.year === year) {
        score += 0.15;
      }

      // Длительность не менее 60 минут — бонус
      if (movie.movieLength && movie.movieLength >= 60) {
        score += 0.05;
      }

      if (score > bestScore) {
        bestScore = score;
        best = movie;
      }
    }

    if (best && bestScore >= 0.5) {
      return {
        platform: "kinopoisk",
        label: "Кинопоиск",
        url: `https://www.kinopoisk.ru/film/${best.id}/`,
        relevance: Math.min(bestScore, 1),
      };
    }

    // Если не нашли точного совпадения — возвращаем поисковую ссылку
    return {
      platform: "kinopoisk",
      label: "Кинопоиск",
      url: `https://www.kinopoisk.fr/search/${encodeURIComponent(title + (year ? ` ${year}` : ""))}/`,
      relevance: 0.3,
    };
  } catch {
    return null;
  }
}

// ============================================================
// RuTube
// ============================================================

async function searchRuTube(
  title: string,
  year?: number,
): Promise<WatchResult | null> {
  try {
    const query = `${title} ${year || ""}`;
    const response = await fetch(
      `https://rutube.ru/api/video/search/?query=${encodeURIComponent(query)}&page=1&size=10`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Origin: "https://rutube.ru",
          Referer: "https://rutube.ru/",
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      // Если API недоступен — возвращаем ссылку на поиск
      return {
        platform: "rutube",
        label: "RuTube",
        url: `https://rutube.ru/search/?query=${encodeURIComponent(query)}`,
        relevance: 0.2,
      };
    }

    const data = await response.json();
    const results = data.results ?? [];

    let bestScore = 0;
    let bestUrl = "";

    // Фильтруем и оцениваем результаты
    for (const item of results) {
      const itemTitle: string = item.title || "";
      const duration: number = item.duration || 0; // в секундах
      const itemYear: number | undefined = item.year || undefined;

      // Фильтр: длительность не менее 60 минут (3600 секунд)
      if (duration < 3600) continue;

      // Фильтр: стоп-слова
      if (hasStopWords(itemTitle)) continue;

      // Оценка совпадения названия
      let score = titleSimilarity(title, itemTitle);

      // Бонус за совпадение года
      if (year && itemYear === year) {
        score += 0.15;
      }

      // Бонус за длительность (близка к 90 мин — typical movie length)
      if (duration >= 5400 && duration <= 10800) {
        score += 0.1;
        // Дополнительный бонус, если длительность >= 70% от стандартной длительности фильма
      } else if (duration >= 4200) {
        score += 0.05;
      }

      if (score > bestScore) {
        bestScore = score;
        bestUrl = item.link || item.videoUrl || "";
        // Если есть rutube ID, строим URL
        if (!bestUrl && item.id) {
          bestUrl = `https://rutube.ru/video/${item.id}/`;
        }
      }
    }

    if (bestScore >= 0.5 && bestUrl) {
      return {
        platform: "rutube",
        label: "RuTube",
        url: bestUrl,
        relevance: Math.min(bestScore, 1),
      };
    }

    // Fallback — поисковая ссылка
    return {
      platform: "rutube",
      label: "RuTube",
      url: `https://rutube.ru/search/?query=${encodeURIComponent(title + (year ? ` ${year}` : ""))}`,
      relevance: 0.2,
    };
  } catch {
    return {
      platform: "rutube",
      label: "RuTube",
      url: `https://rutube.ru/search/?query=${encodeURIComponent(title + (year ? ` ${year}` : ""))}`,
      relevance: 0.2,
    };
  }
}

// ============================================================
// VK Видео
// ============================================================

async function searchVKVideo(
  title: string,
  year?: number,
): Promise<WatchResult | null> {
  try {
    const query = `${title} ${year || ""}`;
    const response = await fetch(
      `https://api.vk.com/method/video.search?q=${encodeURIComponent(query)}&v=5.131&count=10`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      return {
        platform: "vkvideo",
        label: "VK Видео",
        url: `https://vk.com/video?q=${encodeURIComponent(query)}`,
        relevance: 0.2,
      };
    }

    const data = await response.json();

    // VK API может требовать ключ; без него — ответ с ошибкой
    if (data.error) {
      return {
        platform: "vkvideo",
        label: "VK Видео",
        url: `https://vk.com/video?q=${encodeURIComponent(query)}`,
        relevance: 0.2,
      };
    }

    const items: any[] = data.response?.items ?? [];

    let bestScore = 0;
    let bestUrl = "";

    for (const item of items) {
      const itemTitle: string = item.title || "";
      const duration: number = item.duration || 0; // в секундах

      // Фильтр: длительность не менее 60 минут
      if (duration < 3600) continue;

      // Фильтр: стоп-слова
      if (hasStopWords(itemTitle)) continue;

      let score = titleSimilarity(title, itemTitle);

      // Бонус за длительность (близка к длине полного фильма)
      if (duration >= 5400 && duration <= 10800) {
        score += 0.1;
      } else if (duration >= 4200) {
        score += 0.05;
      }

      if (score > bestScore) {
        bestScore = score;
        const ownerId = item.owner_id;
        const videoId = item.id;
        if (ownerId && videoId) {
          bestUrl = `https://vk.com/video${ownerId}_${videoId}`;
        }
      }
    }

    if (bestScore >= 0.5 && bestUrl) {
      return {
        platform: "vkvideo",
        label: "VK Видео",
        url: bestUrl,
        relevance: Math.min(bestScore, 1),
      };
    }

    return {
      platform: "vkvideo",
      label: "VK Видео",
      url: `https://vk.com/video?q=${encodeURIComponent(title + (year ? ` ${year}` : ""))}`,
      relevance: 0.2,
    };
  } catch {
    return {
      platform: "vkvideo",
      label: "VK Видео",
      url: `https://vk.com/video?q=${encodeURIComponent(title + (year ? ` ${year}` : ""))}`,
      relevance: 0.2,
    };
  }
}

// ============================================================
// GET /api/search-watch?title=...&year=...
// ============================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const title = searchParams.get("title");
  const yearStr = searchParams.get("year");
  const year = yearStr ? parseInt(yearStr, 10) : undefined;

  if (!title) {
    return NextResponse.json(
      { error: "Title parameter is required" },
      { status: 400 },
    );
  }

  try {
    const [kinopoisk, rutube, vkvideo] = await Promise.allSettled([
      searchKinopoisk(title, year),
      searchRuTube(title, year),
      searchVKVideo(title, year),
    ]);

    const results: WatchResult[] = [];

    if (kinopoisk.status === "fulfilled" && kinopoisk.value) {
      results.push(kinopoisk.value);
    }
    if (rutube.status === "fulfilled" && rutube.value) {
      results.push(rutube.value);
    }
    if (vkvideo.status === "fulfilled" && vkvideo.value) {
      results.push(vkvideo.value);
    }

    // Сортировка по релевантности (убывание)
    results.sort((a, b) => b.relevance - a.relevance);

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Search watch error:", error);
    return NextResponse.json(
      { error: "Failed to search watch platforms" },
      { status: 500 },
    );
  }
}
