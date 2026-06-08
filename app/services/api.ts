// services/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export interface Film {
  id: string;
  title: string;
  from: string;
  year?: number;
  poster?: string;
  engName?: string;
  addedAt?: string;
}

export interface Winner {
  id: string;
  film: Film;
  wonAt: string;
}

export interface RouletteState {
  active: boolean;
  eliminatedIds: string[];
  winner: Film | null;
  filmIds: string[];
  wonAt?: number;
}

export interface PatchNote {
  version: string;
  description: string;
  date: string;
}

export const api = {
  // Получить все фильмы
  async getFilms(): Promise<Film[]> {
    const response = await fetch(`${API_URL}/films`);
    if (!response.ok) throw new Error("Failed to fetch films");
    return response.json();
  },
  // Получить фильмы по name
  async getFilmsByName(engName: string): Promise<Film[]> {
    const response = await fetch(
      `${API_URL}/films?engName=${encodeURIComponent(engName)}`,
    );
    if (!response.ok) throw new Error("Failed to fetch films");
    return response.json();
  },

  // Получить фильм по ID
  async getFilm(id: string): Promise<Film> {
    const response = await fetch(`${API_URL}/films/${id}`);
    if (!response.ok) throw new Error("Failed to fetch film");
    return response.json();
  },

  // Генерация случайного строкового ID
  generateId(): string {
    return Math.random().toString(36).substring(2, 12);
  },

  // Добавить фильм
  async addFilm(film: Omit<Film, "id">): Promise<Film> {
    const response = await fetch(`${API_URL}/films`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...film,
        id: this.generateId(),
        addedAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error("Failed to add film");
    return response.json();
  },

  // Добавить несколько фильмов
  async addFilms(films: Omit<Film, "id">[]): Promise<Film[]> {
    const promises = films.map((film) => this.addFilm(film));
    return Promise.all(promises);
  },

  // Обновить фильм
  async updateFilm(id: string, film: Partial<Film>): Promise<Film> {
    const response = await fetch(`${API_URL}/films/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(film),
    });
    if (!response.ok) throw new Error("Failed to update film");
    return response.json();
  },

  // Удалить фильм
  async deleteFilm(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/films/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete film");
  },

  // Поиск фильмов
  async searchFilms(query: string): Promise<Film[]> {
    const response = await fetch(
      `${API_URL}/films?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) throw new Error("Failed to search films");
    return response.json();
  },

  // Фильтрация по пользователю
  async getFilmsByUser(userName: string): Promise<Film[]> {
    const response = await fetch(`${API_URL}/films?from=${userName}`);
    if (!response.ok) throw new Error("Failed to fetch user films");
    return response.json();
  },

  // ===== Победители =====

  // Получить всех победителей
  async getWinners(): Promise<Winner[]> {
    const response = await fetch(`${API_URL}/winners`);
    if (!response.ok) throw new Error("Failed to fetch winners");
    return response.json();
  },

  // Сохранить победителя
  async addWinner(film: Film): Promise<Winner> {
    const response = await fetch(`${API_URL}/winners`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        film,
        wonAt: new Date().toISOString(),
      }),
    });
    if (!response.ok) throw new Error("Failed to add winner");
    return response.json();
  },

  // ===== Рулетка =====

  async getRouletteState(): Promise<RouletteState> {
    const response = await fetch(`${API_URL}/roulette`);
    if (!response.ok) throw new Error("Failed to fetch roulette state");
    return response.json();
  },

  async startRoulette(filmIds: string[]): Promise<void> {
    await fetch(`${API_URL}/roulette`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", filmIds }),
    });
  },

  async eliminateFilm(filmId: string): Promise<void> {
    await fetch(`${API_URL}/roulette`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "eliminate", filmId }),
    });
  },

  async finishRoulette(winner: Film, wonAt?: number): Promise<void> {
    await fetch(`${API_URL}/roulette`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish", winner, wonAt }),
    });
  },

  async resetRoulette(): Promise<void> {
    await fetch(`${API_URL}/roulette`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
  },

  // ===== Patch notes =====

  async getPatchNotes(): Promise<PatchNote[]> {
    const response = await fetch(`${API_URL}/patch-notes`);
    if (!response.ok) throw new Error("Failed to fetch patch notes");
    return response.json();
  },
};
