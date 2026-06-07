/**
 * Детерминированный «рандом» на основе строкового ключа.
 * Один и тот же ID всегда даёт одинаковые значения — без прыжков при ререндерах.
 */

function hash(str: string, offset: number): number {
  let h = offset;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 1000) / 1000; // 0..1
}

export function shuffleTransform(id: string): {
  x: number;
  y: number;
  rotate: number;
} {
  return {
    x: Math.round((hash(id, 0) - 0.5) * 300),    // -150..150
    y: Math.round((hash(id, 1) - 0.5) * 300),    // -150..150
    rotate: Math.round((hash(id, 2) - 0.5) * 40), // -20..20
  };
}
