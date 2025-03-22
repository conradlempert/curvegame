import "./style.css";
import { io, Socket } from "socket.io-client";
import Player, { ILine, IPlayerPositionUpdate } from "./game/player";
import {
  IFullRoomInfo,
  IJoinedRoomSuccessInfo,
  IJoinRoomInfo,
  IRoomsOverviewInfo,
  IShortRoomInfo,
} from "./game/room";
import Config from "../config";

const socket: Socket = io(":" + Config.serverPort);
let status: number = 0;
let roomInfo: IRoomsOverviewInfo;
let keys: boolean[] = [];
let lPD: Player[] = [];
let lPL: ILine[] = [];
let player1: Player;
let context: CanvasRenderingContext2D;
let room: number;
let localID: number;

function initCanvas() {
  var canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  canvas.addEventListener("click", click);
  socket.emit("reqInfo", "");
  context = canvas.getContext("2d")!;
  headLineText("Curve Game", "black");
  smallText("Loading Rooms..", "black");
}

for (var i = 0; i < 200; i++) {
  keys[i] = false;
}

function vFA(a: number): [number, number] {
  return [Math.cos(a), Math.sin(a)];
}
function click(e: MouseEvent): void {
  let mouseX: number, mouseY: number;

  if (e.offsetX) {
    mouseX = e.offsetX;
    mouseY = e.offsetY;
  } else {
    mouseX = e.layerX;
    mouseY = e.layerY;
  }

  if (status == 1) {
    const roomNumber = getGridClick(mouseX, mouseY, roomInfo.length);

    if (roomNumber != -1) {
      player1 = new Player();
      const roomJoinInfo: IJoinRoomInfo = { rn: roomNumber, pobj: player1 };
      socket.emit("joinRoom", roomJoinInfo);
    }
  }
}

document.body.onload = initCanvas;

socket.on("connect_error", (err) => {
  // the reason of the error, for example "xhr poll error"
  console.log(err.message);
});

socket.on("resInfo", function (msg: IRoomsOverviewInfo): void {
  roomInfo = msg;
  drawGrid(roomInfo.map((x) => x.toString()));
  status = 1;
});

function headLineText(txt: string, color: string): void {
  context.fillStyle = color;
  context.font = "bold 50px sans-serif";
  context.textAlign = "center";
  context.clearRect(0, 50, 500, 50);
  context.fillText(txt, 250, 75);
}

function smallText(txt: string, color: string): void {
  context.fillStyle = color;
  context.font = "bold 30px sans-serif";
  context.textAlign = "center";
  context.clearRect(0, 285, 500, 30);
  context.fillText(txt, 250, 300);
}

function drawGrid(txtArray: string[]): void {
  context.clearRect(0, 100, 500, 400);
  context.font = "bold 20px sans-serif";
  context.textAlign = "center";
  for (var i = 0; i < txtArray.length; i++) {
    var ox = (i % 4) * 125 + 25;
    var oy = Math.floor(i / 4) * 125 + 125;
    context.fillRect(ox, oy, 75, 75);
    context.clearRect(ox + 5, oy + 5, 65, 65);
    context.fillText(txtArray[i], ox + 38, oy + 38);
  }
}

function getGridClick(x: number, y: number, arrayLength: number): number {
  for (var i = 0; i < arrayLength; i++) {
    var ox = (i % 4) * 125 + 25;
    var oy = Math.floor(i / 4) * 125 + 125;
    if (x > ox && x < ox + 75 && y > oy && y < oy + 75) {
      return i;
    }
  }
  return -1;
}

socket.on("joinRoomSuccess", function (msg: IJoinedRoomSuccessInfo): void {
  status = 2;
  room = msg.room;
  localID = msg.localID;
  console.log("localID: " + localID);
  goInGame();
});
function goInGame(): void {
  context.clearRect(0, 0, 500, 500);
  window.setInterval(function () {
    tick();
  }, 20);
}

function tick(): void {
  context.clearRect(0, 0, 500, 500);
  player1.steering = 0;
  if (keys[37]) {
    player1.angle -= Config.turningSpeed;
    player1.steering = -1;
  }
  if (keys[39]) {
    player1.angle += Config.turningSpeed;
    player1.steering = 1;
  }
  player1.x += vFA(player1.angle)[0] * Config.drivingSpeed;
  player1.y += vFA(player1.angle)[1] * Config.drivingSpeed;
  lPL[localID].push([player1.x, player1.y]);
  context.fillStyle = "black";
  context.fillRect(player1.x, player1.y, 5, 5);

  //Die Linien aller Spieler malen
  for (var p = 0; p < lPL.length; p++) {
    for (var i = 0; i < lPL[p].length; i++) {
      context.fillStyle = "red";
      if (p == localID) {
        context.fillStyle = "black";
      }
      context.fillRect(lPL[p][i][0], lPL[p][i][1], 5, 5);
    }
  }
  //Daten der anderen Spieler berechnen
  for (var i = 0; i < lPD.length; i++) {
    if (i != localID) {
      computeOtherPlayer(i);
    }
  }
  const playerPositionUpdate: IPlayerPositionUpdate = {
    room: room,
    localID: localID,
    x: player1.x,
    y: player1.y,
    angle: player1.angle,
    steering: player1.steering,
  };
  socket.emit("playerPositionUpdate", playerPositionUpdate);
}

socket.on("giveRoomInfo", function (serverPlayers: IShortRoomInfo): void {
  for (var i = 0; i < serverPlayers.length; i++) {
    if (i != localID) {
      lPD[i] = serverPlayers[i];
    }
  }
});

socket.on("giveFullInfo", function (serverLines: IFullRoomInfo): void {
  for (var i = 0; i < serverLines.length; i++) {
    lPL[i] = serverLines[i];
  }
});

function computeOtherPlayer(nr: number): void {
  if (lPD[nr].steering == 1) {
    lPD[nr].angle += Config.turningSpeed;
  }
  if (lPD[nr].steering == -1) {
    lPD[nr].angle -= Config.turningSpeed;
  }

  lPD[nr].x += vFA(lPD[nr].angle)[0] * Config.drivingSpeed;
  lPD[nr].y += vFA(lPD[nr].angle)[1] * Config.drivingSpeed;
  lPL[nr].push([lPD[nr].x, lPD[nr].y]);

  context.fillStyle = "red";
  context.fillRect(lPD[nr].x, lPD[nr].y, 5, 5);
}

document.body.onkeydown = function (event: KeyboardEvent): void {
  keys[event.keyCode] = true;
};
document.body.onkeyup = function (event: KeyboardEvent): void {
  keys[event.keyCode] = false;
};
