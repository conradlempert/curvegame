export default class Room {
  nr: number;
  players: Array<any>;
  lines: Array<any>;
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
