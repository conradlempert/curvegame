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
}

export type IShortRoomInfo = Player[];
export type IFullRoomInfo = ILine[];

export default class Room {
  nr: number;
  players: Player[];
  lines: ILine[];
  playerCount: number;
  active: boolean;

  constructor(nr: number) {
    this.nr = nr;
    this.players = new Array();
    this.lines = new Array();
    this.playerCount = 0;
    this.active = false;
  }

  public computeCollisions(): void {
    for (var i = 0; i < this.players.length; i++) {
      const relevantLines = this.getRelevantLines(i);
      if (this.players[i].collidesWithLines(relevantLines)) {
        console.log("collision");
        this.resetRoom();
        return;
      }
    }
  }

  public resetRoom(): void {
    this.players.forEach((player) => {
      player.placeAtRandomPosition();
    });
    this.lines = this.players.map(() => new Array());
  }

  private getRelevantLines(playerIndex: number): ILine[] {
    return this.lines.map((line, lineIndex) => {
      return lineIndex === playerIndex
        ? Player.getLineWithoutEnding(line)
        : line;
    });
  }
}
