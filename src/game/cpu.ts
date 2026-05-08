import Config from "../../config";
import { ILine } from "./player";

// Turning radius (px): how wide a circle the CPU traces at full lock
const TURN_RADIUS = Config.drivingSpeed / Config.turningSpeed; // 40px

// How far ahead each ray marches
const LOOKAHEAD = TURN_RADIUS * 2; // 80px — two full turning radii

// Step size per ray iteration matches actual movement speed
const RAY_STEP = Config.drivingSpeed;

// Number of rays spread across each zone
const RAYS_PER_ZONE = 5;

// Angular boundaries relative to current heading (radians).
// ZONE_INNER separates the middle zone from the side zones.
// ZONE_OUTER is the far edge of each side zone.
// At LOOKAHEAD distance, ZONE_INNER ≈ 18px wide — roughly half a turn radius.
const ZONE_INNER = Math.atan(TURN_RADIUS / 2 / LOOKAHEAD); // ~0.32 rad (~18°)
const ZONE_OUTER = ZONE_INNER * 3;                          // ~0.97 rad (~55°)

// Inverse-square danger coefficient: at exactly collisionDistance, penalty = DANGER_CAP.
const DANGER_CAP = 4000;
const A = DANGER_CAP * Config.collisionDistance * Config.collisionDistance;

// Sense line points within this radius.
const SENSE_RANGE  = Config.collisionDistance * 8;
const SENSE_RANGE2 = SENSE_RANGE * SENSE_RANGE;

function invSq(dist2: number): number {
  return Math.min(A / Math.max(dist2, 1), DANGER_CAP);
}

function scanRay(
  startX: number,
  startY: number,
  angle: number,
  lines: ILine[],
  cpuLineIndex: number
): number {
  let danger = 0;
  const steps = Math.ceil(LOOKAHEAD / RAY_STEP);
  let x = startX;
  let y = startY;

  for (let s = 1; s <= steps; s++) {
    x += Math.cos(angle) * RAY_STEP;
    y += Math.sin(angle) * RAY_STEP;

    // Treat each wall as a virtual obstacle using the same inverse-square formula.
    // X-axis walls (left/right) and Y-axis walls (top/bottom) are scored separately
    // so corners naturally accumulate danger from both axes at once.
    // Clamp to 0 so rays that cross outside the arena register max danger, not near-zero.
    const distX = Math.max(0, Math.min(x, Config.gameSize - x));
    const distY = Math.max(0, Math.min(y, Config.gameSize - y));
    danger += invSq(distX * distX);
    danger += invSq(distY * distY);

    for (let li = 0; li < lines.length; li++) {
      const line = lines[li];
      // Trim the tail of the CPU's own line the same way collision detection does
      const end =
        li === cpuLineIndex
          ? Math.max(0, line.length - Config.collisionLineEndingRemoval)
          : line.length;

      for (let pi = 0; pi < end; pi++) {
        const dx = line[pi][0] - x;
        const dy = line[pi][1] - y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < SENSE_RANGE2) {
          danger += invSq(dist2);
        }
      }
    }
  }

  return danger;
}

function scanZone(
  x: number,
  y: number,
  baseAngle: number,
  minOffset: number,
  maxOffset: number,
  lines: ILine[],
  cpuLineIndex: number
): number {
  let total = 0;
  for (let i = 0; i < RAYS_PER_ZONE; i++) {
    const t = RAYS_PER_ZONE === 1 ? 0.5 : i / (RAYS_PER_ZONE - 1);
    const angle = baseAngle + minOffset + t * (maxOffset - minOffset);
    total += scanRay(x, y, angle, lines, cpuLineIndex);
  }
  return total;
}

// Returns -1 (steer left), 0 (go straight), or 1 (steer right).
export function cpuSteering(
  cpuX: number,
  cpuY: number,
  cpuAngle: number,
  lines: ILine[],
  cpuLineIndex: number
): number {
  const leftDanger  = scanZone(cpuX, cpuY, cpuAngle, -ZONE_OUTER, -ZONE_INNER, lines, cpuLineIndex);
  const midDanger   = scanZone(cpuX, cpuY, cpuAngle, -ZONE_INNER,  ZONE_INNER, lines, cpuLineIndex);
  const rightDanger = scanZone(cpuX, cpuY, cpuAngle,  ZONE_INNER,  ZONE_OUTER, lines, cpuLineIndex);

  const minDanger = Math.min(leftDanger, midDanger, rightDanger);

  // Panic level: if the safest zone is already this dangerous, we're close to something
  // real and should steer decisively without waiting for a big relative margin.
  const steps = Math.ceil(LOOKAHEAD / RAY_STEP);
  const PANIC_LEVEL = DANGER_CAP * steps * RAYS_PER_ZONE * 0.15;
  const inDanger = minDanger > PANIC_LEVEL;

  // In calm open space use a conservative threshold to suppress jitter.
  // When genuinely close to danger, steer to the safest zone unconditionally.
  if (!inDanger && midDanger <= minDanger * 1.2) return 0;

  if (leftDanger  === minDanger) return -1;
  return 1;
}
