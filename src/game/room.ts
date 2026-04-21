import Config from "../../config";
import Player, { ILine, IPlayerData } from "./player";

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

export type IShortRoomInfo = Player[];
export type IFullRoomInfo = ILine[];
export type IScoresInfo = number[];

export default class Room {
  nr: number;
  players: Player[];
  lines: ILine[];
  scores: number[];
  playerCount: number;
  active: boolean;
  round: number;

  constructor(nr: number) {
    this.nr = nr;
    this.players = new Array();
    this.lines = new Array();
    this.scores = new Array();
    this.playerCount = 0;
    this.active = false;
    this.round = 0;
  }

  public computeCollisions(): number[] {
    const dead: number[] = [];
    for (var i = 0; i < this.players.length; i++) {
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

  public awardPointsForDeaths(dead: number[]): void {
    if (dead.length === 0) return;
    const deadSet = new Set(dead);
    for (var i = 0; i < this.players.length; i++) {
      if (!deadSet.has(i)) {
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
