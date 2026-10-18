// app/api/search-movie/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("query")?.trim();
  const page = searchParams.get("page") || "1";
  const limit = searchParams.get("limit") || "10";

  if (!query) {
    return NextResponse.json(
      { error: "Укажите название фильма" },
      { status: 400 },
    );
  }

  const API_KEY = process.env.KINOPOISK_API_KEY?.trim();

  if (!API_KEY) {
    return NextResponse.json(
      { error: "На сервере не настроен KINOPOISK_API_KEY для ПоискКино" },
      { status: 500 },
    );
  }

  try {
    const url = new URL("https://api.poiskkino.dev/v1.5/movie/search");
    url.searchParams.set("query", query);
    url.searchParams.set("page", page);
    url.searchParams.set("limit", limit);

    const response = await fetch(
      url,
      {
        headers: {
          "X-API-KEY": API_KEY,
        },
        signal: AbortSignal.timeout(10000),
      },
    );

    if (!response.ok) {
      console.error("Ошибка поиска ПоискКино, статус:", response.status);
      const error = response.status === 401
        ? "ПоискКино отклонил API-ключ. Проверьте KINOPOISK_API_KEY на сервере"
        : response.status === 403
          ? "ПоискКино запретил доступ. Проверьте права ключа и ограничения тарифа"
          : response.status === 429
            ? "Превышен лимит запросов к ПоискКино. Попробуйте позже"
            : "Сервис ПоискКино временно недоступен";
      return NextResponse.json(
        { error, upstreamStatus: response.status },
        { status: response.status === 429 ? 429 : 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Ошибка поиска фильмов:", error);
    return NextResponse.json(
      { error: "Не удалось связаться с ПоискКино. Попробуйте позже" },
      { status: 502 },
    );
  }
}
