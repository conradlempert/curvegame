import Config from "../../config";
import Player, { ILine, IPlayerData } from "./player";
import { cpuSteeringGenetic } from "./cpu_grid";

export type IRoomsOverviewRequest = "";
export type IRoomsOverviewInfo = number[];

export interface IJoinRoomInfo {
  roomNumber: number;
  playerData: IPlayerData;
}

export interface IJoinedRoomSuccessInfo {
  roomNumber: number;
  localID: number;
  round: number;
}

export interface IRoomResetInfo {
  round: number;
}

export interface IGameOverInfo {
  scores: number[];
  winnerIndex: number;
}

export type IShortRoomInfo = Player[];
export type IFullRoomInfo = ILine[];
export type IScoresInfo = number[];

export const WINNING_SCORE = 10;

export default class Room {
  nr: number;
  players: Player[];
  lines: ILine[];
  scores: number[];
  playerCount: number;
  active: boolean;
  round: number;
  gameOver: boolean;
  cpuIndex: number | null;

  constructor(nr: number) {
    this.nr = nr;
    this.players = new Array();
    this.lines = new Array();
    this.scores = new Array();
    this.playerCount = 0;
    this.active = false;
    this.round = 0;
    this.gameOver = false;
    this.cpuIndex = null;
  }

  public hasWinner(): boolean {
    return this.scores.some((s) => s >= WINNING_SCORE);
  }

  public winnerIndex(): number {
    let best = -1;
    for (let i = 0; i < this.scores.length; i++) {
      if (best === -1 || this.scores[i] > this.scores[best]) best = i;
    }
    return best;
  }

  public get humanPlayers(): number {
    return this.players.filter((p) => !p.disconnected && !p.isCpu).length;
  }

  public addCpu(): void {
    const cpu = new Player();
    cpu.isCpu = true;
    this.players.push(cpu);
    this.lines.push([]);
    this.scores.push(0);
    this.cpuIndex = this.players.length - 1;
  }

  public removeCpu(): void {
    if (this.cpuIndex === null) return;
    this.players[this.cpuIndex].disconnected = true;
    this.lines[this.cpuIndex] = [];
    this.cpuIndex = null;
  }

  public tickCpu(): void {
    if (this.cpuIndex === null) return;
    const cpu = this.players[this.cpuIndex];
    if (cpu.disconnected) return;
    const steering = cpuSteeringGenetic(cpu.x, cpu.y, cpu.angle, this.lines, this.cpuIndex);
    cpu.angle += steering * Config.turningSpeed;
    cpu.x += Math.cos(cpu.angle) * Config.drivingSpeed;
    cpu.y += Math.sin(cpu.angle) * Config.drivingSpeed;
    this.lines[this.cpuIndex].push([cpu.x, cpu.y]);
  }

  public fullReset(): void {
    this.players = [];
    this.lines = [];
    this.scores = [];
    this.active = false;
    this.round = 0;
    this.gameOver = false;
    this.cpuIndex = null;
  }

  public computeCollisions(): number[] {
    const dead: number[] = [];
    for (var i = 0; i < this.players.length; i++) {
      if (this.players[i].disconnected) continue;
      if (
        this.players[i].x < 0 ||
        this.players[i].x > Config.gameSize ||
        this.players[i].y < 0 ||
        this.players[i].y > Config.gameSize
      ) {
        dead.push(i);
        continue;
      }
      const relevantLines = this.getRelevantLines(i);
      if (this.players[i].collidesWithLines(relevantLines)) {
        dead.push(i);
      }
    }
    return dead;
  }

  public get activePlayers(): number {
    return this.players.filter((p) => !p.disconnected).length;
  }

  public awardPointsForDeaths(dead: number[]): void {
    if (dead.length === 0) return;
    const deadSet = new Set(dead);
    const survivors = this.players.filter(
      (p, i) => !p.disconnected && !deadSet.has(i)
    );
    if (survivors.length > 0) {
      // Normal case: survivors earn a point
      for (var i = 0; i < this.players.length; i++) {
        if (!this.players[i].disconnected && !deadSet.has(i)) {
          this.scores[i] = (this.scores[i] || 0) + 1;
        }
      }
    } else {
      // Solo or everyone-dies case: the dead player(s) earn a point each
      for (const i of dead) {
        this.scores[i] = (this.scores[i] || 0) + 1;
      }
    }
  }

  public resetRoom(): void {
    this.lines = this.players.map(() => new Array());
    // Also reset server-side player positions so stale death positions don't
    // immediately re-trigger collisions on the next tick before clients have
    // had time to send updates for the new round.
    for (const p of this.players) {
      p.placeAtRandomPosition();
    }
  }

  private getRelevantLines(playerIndex: number): ILine[] {
    return this.lines.map((line, lineIndex) => {
      return lineIndex === playerIndex
        ? Player.getLineWithoutEnding(line)
        : line;
    });
  }
}
