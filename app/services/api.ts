// services/api.ts
const API_URL = "http://localhost:4000";

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
};
