import { randomInt } from "node:crypto";

export interface RouletteScenario {
  winnerId: string;
  targetPosition: number;
  reelFilmIds: string[];
}

type RandomIndex = (maxExclusive: number) => number;

const START_POSITION = 4;

function shuffle<T>(items: readonly T[], randomIndex: RandomIndex): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function createRouletteScenario(
  filmIds: readonly string[],
  randomIndex: RandomIndex = randomInt,
): RouletteScenario {
  if (filmIds.length < 2) throw new Error("At least two films are required");

  const winnerId = filmIds[randomIndex(filmIds.length)];
  const minimumTravel = Math.min(Math.max(filmIds.length * 6, 48), 120);
  const extraTravel = randomIndex(Math.max(filmIds.length * 3, 12));
  const targetPosition = START_POSITION + minimumTravel + extraTravel;
  const reelLength = targetPosition + 9;
  const reelFilmIds: string[] = [];

  while (reelFilmIds.length < reelLength) {
    const bagStart = reelFilmIds.length;
    const bag = shuffle(filmIds, randomIndex);
    const targetInBag = targetPosition - bagStart;

    // Не показываем один и тот же фильм дважды на стыке перемешанных колод.
    const previousId = reelFilmIds.at(-1);
    if (previousId === bag[0] && targetInBag !== 0) {
      const swapIndex = bag.findIndex((filmId, index) => index > 0 && filmId !== previousId);
      [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
    }

    if (targetInBag >= 0 && targetInBag < bag.length) {
      const winnerIndex = bag.indexOf(winnerId);
      [bag[targetInBag], bag[winnerIndex]] = [bag[winnerIndex], bag[targetInBag]];
    }

    reelFilmIds.push(...bag);
  }

  return {
    winnerId,
    targetPosition,
    reelFilmIds: reelFilmIds.slice(0, reelLength),
  };
}
