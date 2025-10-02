import { photoUID } from "./utils.js";

/**
 * Select a representative photo from bursts of near-duplicate shots.
 * - Groups photos taken within `windowSec` of each other into bursts.
 * - From each burst, picks the highest-weight photo; on ties picks the middle by time.
 * - Across bursts, chooses the representative with highest weight; on ties, prefers
 *   the one that appears earlier in the given candidate order (assumed weight-desc).
 *
 * @param {Array<any>} candidates Weighted, unsent photos (ideally weight-desc order)
 * @param {{ windowSec?: number }} opts Options; windowSec defaults to 10 seconds
 * @returns {{ chosen: any|null, burst: any[]|[], bursts: any[][] }}
 */
export function selectFromBursts(candidates, { windowSec = 10 } = {}) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return { chosen: null, burst: [], bursts: [] };
  }

  // Build bursts by time proximity (ascending time)
  const byTime = [...candidates].sort((a, b) => (a.time ?? 0) - (b.time ?? 0));
  const bursts = [];
  let group = [];
  for (const p of byTime) {
    if (group.length === 0) {
      group.push(p);
      continue;
    }
    const last = group[group.length - 1];
    if ((p.time ?? 0) - (last.time ?? 0) <= windowSec) {
      group.push(p);
    } else {
      bursts.push(group);
      group = [p];
    }
  }
  if (group.length) bursts.push(group);

  // Helper: pick representative for a single burst
  function chooseFromBurst(burst) {
    if (!burst || burst.length === 0) return null;
    const maxW = Math.max(...burst.map((p) => p.weight ?? 0));
    const winners = burst.filter((p) => (p.weight ?? 0) === maxW);
    if (winners.length === 1) return winners[0];
    // Tie: middle photo among the tied set (time-ordered because burst is time-ordered)
    const mid = Math.floor(winners.length / 2);
    return winners[mid];
  }

  // Build weight-order map using the provided order (assumed weight-desc)
  const weightOrder = new Map(candidates.map((p, i) => [photoUID(p), i]));

  let chosen = null;
  let chosenBurst = [];
  for (const b of bursts) {
    const rep = chooseFromBurst(b);
    if (!rep) continue;
    if (!chosen) {
      chosen = rep;
      chosenBurst = b;
      continue;
    }
    const cw = chosen.weight ?? 0;
    const rw = rep.weight ?? 0;
    if (rw > cw) {
      chosen = rep;
      chosenBurst = b;
    } else if (rw === cw) {
      const ci = weightOrder.get(photoUID(chosen)) ?? Number.MAX_SAFE_INTEGER;
      const ri = weightOrder.get(photoUID(rep)) ?? Number.MAX_SAFE_INTEGER;
      if (ri < ci) {
        chosen = rep;
        chosenBurst = b;
      }
    }
  }

  return { chosen, burst: chosenBurst, bursts };
}
