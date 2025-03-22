import Player, { ILine } from "./player";

export type IRoomsOverviewRequest = "";
export type IRoomsOverviewInfo = number[];

export interface IJoinRoomInfo {
  rn: number;
  pobj: Player;
}

export interface IJoinedRoomSuccessInfo {
  room: number;
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
}
