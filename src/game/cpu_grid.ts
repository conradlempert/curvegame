import Config from "../../config";
import { ILine } from "./player";

// Game runs at one tick per 20 ms
const TICKS_PER_SECOND = Math.round(1000 / 20); // 50
const GENERATIONS     = 5;
const FIRST_GEN_COUNT = 9;  // candidates in generation 1
const SURVIVORS       = 3;  // survivors kept per generation
const BRANCH_COUNT    = 3;  // branches per survivor in gen 2+ (3×3 = 9 total)

const CD2 = Config.collisionDistance * Config.collisionDistance;

// n uniformly-spaced values in [-1, +1]
function steeringOptions(n: number): number[] {
  if (n === 1) return [0];
  return Array.from({ length: n }, (_, i) => -1 + (2 * i) / (n - 1));
}

// State carried through the beam search tree
interface SimPath {
  x: number;
  y: number;
  angle: number;
  firstSteering: number;    // steering chosen in gen 1 (what we ultimately return)
  simTrail: [number, number][];  // trail accumulated across all parent generations
  fitness: number;          // total ticks survived so far
}

// Simulate one second (TICKS_PER_SECOND ticks) with a constant steering value.
// Returns whether the candidate survived the full second and the resulting state.
function simulateSecond(
  path: SimPath,
  steering: number,
  otherLines: ILine[],           // frozen snapshot of other players' lines
  frozenOwnLine: [number, number][] // pre-existing own line, already end-trimmed
): { survived: boolean; next: SimPath } {
  let x = path.x;
  let y = path.y;
  let angle = path.angle;
  const newPoints: [number, number][] = [];
  let survived = true;

  outer: for (let t = 0; t < TICKS_PER_SECOND; t++) {
    angle += steering * Config.turningSpeed;
    x += Math.cos(angle) * Config.drivingSpeed;
    y += Math.sin(angle) * Config.drivingSpeed;

    // Wall
    if (x < 0 || x > Config.gameSize || y < 0 || y > Config.gameSize) {
      survived = false;
      break;
    }

    // Other players' lines (frozen)
    for (const line of otherLines) {
      for (const pt of line) {
        const dx = pt[0] - x;
        const dy = pt[1] - y;
        if (dx * dx + dy * dy < CD2) { survived = false; break outer; }
      }
    }

    // Pre-existing own line (end already trimmed when snapshot was taken)
    for (const pt of frozenOwnLine) {
      const dx = pt[0] - x;
      const dy = pt[1] - y;
      if (dx * dx + dy * dy < CD2) { survived = false; break outer; }
    }

    // Simulation trail accumulated from parent generations (trim the recent tail)
    const parentTrimEnd = Math.max(
      0,
      path.simTrail.length - Config.collisionLineEndingRemoval
    );
    for (let pi = 0; pi < parentTrimEnd; pi++) {
      const dx = path.simTrail[pi][0] - x;
      const dy = path.simTrail[pi][1] - y;
      if (dx * dx + dy * dy < CD2) { survived = false; break outer; }
    }

    // New trail drawn in this generation (trim recent tail the same way)
    const newTrimEnd = Math.max(
      0,
      newPoints.length - Config.collisionLineEndingRemoval
    );
    for (let pi = 0; pi < newTrimEnd; pi++) {
      const dx = newPoints[pi][0] - x;
      const dy = newPoints[pi][1] - y;
      if (dx * dx + dy * dy < CD2) { survived = false; break outer; }
    }

    newPoints.push([x, y]);
  }

  const next: SimPath = {
    x,
    y,
    angle,
    firstSteering: path.firstSteering,
    // Carry the accumulated trail forward for the next generation's self-collision checks
    simTrail: path.simTrail.concat(newPoints),
    fitness: path.fitness + newPoints.length,
  };

  return { survived, next };
}

// Sort survivors: most ticks first, tiebreak by preferring steering closer to 0
function rankAndTrim(paths: SimPath[]): SimPath[] {
  return paths
    .sort(
      (a, b) =>
        b.fitness - a.fitness ||
        Math.abs(a.firstSteering) - Math.abs(b.firstSteering)
    )
    .slice(0, SURVIVORS);
}

// Returns a steering value in [-1, +1].
// Positive = right, negative = left, 0 = straight (same convention as cpu.ts).
export function cpuSteeringGenetic(
  cpuX: number,
  cpuY: number,
  cpuAngle: number,
  lines: ILine[],
  cpuLineIndex: number
): number {
  // Snapshot other players' lines (read-only reference — call is synchronous)
  const otherLines: ILine[] = lines.map((line, i) =>
    i === cpuLineIndex ? [] : line
  );

  // Snapshot the CPU's own existing line with the ending trimmed,
  // matching exactly what the collision system does.
  const rawOwn = lines[cpuLineIndex] ?? [];
  const frozenOwnLine = rawOwn.slice(
    0,
    Math.max(0, rawOwn.length - Config.collisionLineEndingRemoval)
  ) as [number, number][];

  // --- Generation 1: try FIRST_GEN_COUNT distinct steering values ---
  let survivors: SimPath[] = [];

  for (const s of steeringOptions(FIRST_GEN_COUNT)) {
    const seed: SimPath = {
      x: cpuX,
      y: cpuY,
      angle: cpuAngle,
      firstSteering: s,
      simTrail: [],
      fitness: 0,
    };
    const { survived, next } = simulateSecond(
      seed,
      s,
      otherLines,
      frozenOwnLine
    );
    if (survived) survivors.push(next);
  }

  survivors = rankAndTrim(survivors);
  if (survivors.length === 0) return 0; // nothing survived even 1 second → go straight

  // --- Generations 2 – GENERATIONS: branch each survivor into BRANCH_COUNT options ---
  for (let gen = 2; gen <= GENERATIONS; gen++) {
    const candidates: SimPath[] = [];

    for (const parent of survivors) {
      for (const s of steeringOptions(BRANCH_COUNT)) {
        const { survived, next } = simulateSecond(
          parent,
          s,
          otherLines,
          frozenOwnLine
        );
        if (survived) candidates.push(next);
      }
    }

    // If every branch crashed this generation, keep last generation's survivors
    // and stop early — they represent the best reachable future.
    if (candidates.length === 0) break;

    survivors = rankAndTrim(candidates);
  }

  // Return the gen-1 steering that leads to the best surviving lineage
  return survivors[0].firstSteering;
}
