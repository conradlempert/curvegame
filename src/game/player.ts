import Config from "../../config";

export interface IPlayerPositionUpdate {
  room: number;
  localID: number;
  x: number;
  y: number;
  angle: number;
  steering: number;
}

export type ILine = [number, number][];

export interface IPlayerData {
  x: number;
  y: number;
  angle: number;
  steering: number;
  active: boolean;
}

export default class Player {
  x: number;
  y: number;
  angle: number;
  steering: number;
  active: boolean;

  constructor() {
    this.active = false;
    this.placeAtRandomPosition();
  }

  public placeAtRandomPosition(): void {
    this.x = Math.floor(Math.random() * 500);
    this.y = Math.floor(Math.random() * 500);
    this.angle = Math.random() * 2 * Math.PI;
    this.steering = 0;
  }

  public static getLineWithoutEnding(line: ILine): ILine {
    return line.slice(0, -Config.collisionLineEndingRemoval);
  }

  public static fromData(data: IPlayerData): Player {
    const player = new Player();
    player.x = data.x;
    player.y = data.y;
    player.angle = data.angle;
    player.steering = data.steering;
    player.active = data.active;
    return player;
  }

  public collidesWithLines(lines: ILine[]): boolean {
    for (const line of lines) {
      for (const point of line) {
        if (this.collidesWithPoint(point)) {
          return true;
        }
      }
    }
    return false;
  }
  public collidesWithPoint(point: [number, number]): boolean {
    const distance = Math.sqrt(
      Math.pow(point[0] - this.x, 2) + Math.pow(point[1] - this.y, 2)
    );
    return distance < Config.collisionDistance;
  }
}
