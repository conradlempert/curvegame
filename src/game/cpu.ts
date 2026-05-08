import Config from "../../config";
import { ILine } from "./player";

// Turning radius (px): how wide a circle the CPU traces at full lock
const TURN_RADIUS = Config.drivingSpeed / Config.turningSpeed; // 40px

// How far ahead each ray marches
const LOOKAHEAD = TURN_RADIUS * 1.5; // 60px

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

function wallDanger(x: number, y: number): number {
  const distX = Math.min(x, Config.gameSize - x);
  const distY = Math.min(y, Config.gameSize - y);
  const dist  = Math.min(distX, distY);

  let danger = 0;
  if (dist < 0) return 10000;
  if (dist < Config.collisionDistance) {
    danger += 2000;
  } else if (dist < TURN_RADIUS) {
    danger += ((TURN_RADIUS - dist) / TURN_RADIUS) * 300;
  }

  // Corner penalty: multiplicative when both axes are close to a wall.
  // This makes corners far more dangerous than a flat wall so the CPU
  // commits to turning away instead of wiggling between two equal sides.
  const cornerRange = TURN_RADIUS * 2.5;
  if (distX < cornerRange && distY < cornerRange) {
    const fx = Math.max(0, 1 - distX / cornerRange);
    const fy = Math.max(0, 1 - distY / cornerRange);
    danger += fx * fy * 1500;
  }

  return danger;
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

    danger += wallDanger(x, y);

    const nearThresh = Config.collisionDistance * 4;
    const nearThresh2 = nearThresh * nearThresh;
    const collide2 = Config.collisionDistance * Config.collisionDistance;

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
        if (dist2 < collide2) {
          danger += 2000;
        } else if (dist2 < nearThresh2) {
          danger += 50;
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

  // Prefer straight when multiple zones tie for safest
  const tieCount = [leftDanger, midDanger, rightDanger].filter(d => d === minDanger).length;
  if (tieCount > 1) return 0;

  if (midDanger   === minDanger) return 0;
  if (leftDanger  === minDanger) return -1;
  return 1;
}
