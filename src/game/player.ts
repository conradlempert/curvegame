export interface IPlayerPositionUpdate {
  room: number;
  localID: number;
  x: number;
  y: number;
  angle: number;
  steering: number;
}

export type ILine = [number, number][];

export default class Player {
  x: number;
  y: number;
  angle: number;
  steering: number;
  active: boolean;

  constructor() {
    this.active = false;
    this.x = Math.floor(Math.random() * 500);
    this.y = Math.floor(Math.random() * 500);
    this.angle = Math.random() * 2 * Math.PI;
    this.steering = 0;
  }
}
