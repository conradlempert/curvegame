import "./style.css";
import { io, Socket } from "socket.io-client";
import Player, { ILine, IPlayerPositionUpdate } from "./game/player";
import {
  IFullRoomInfo,
  IJoinedRoomSuccessInfo,
  IJoinRoomInfo,
  IRoomResetInfo,
  IRoomsOverviewInfo,
  IScoresInfo,
  IShortRoomInfo,
} from "./game/room";
import Config from "../config";

const socket: Socket = io();

let status: number = 0;
let roomInfo: IRoomsOverviewInfo;
let keys: boolean[] = [];
let localPlayersInfo: Player[] = [];
let localPlayersLines: ILine[] = [];
let thisPlayer: Player;
let context: CanvasRenderingContext2D;
let room: number;
let localID: number;
let currentRound: number = 0;

function initCanvas() {
  var canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  canvas.addEventListener("click", click);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("mouseleave", mouseLeave);
  socket.emit("reqInfo", "");
  context = canvas.getContext("2d")!;
  headLineText("curve game", "black");
  smallText("loading rooms..", "black");
}

let hoveredRoom: number = -1;

function mouseMove(event: MouseEvent): void {
  if (status != 1) return;
  const mouseX = event.offsetX;
  const mouseY = event.offsetY;
  const newHover = getGridClick(mouseX, mouseY, roomInfo.length);
  if (newHover !== hoveredRoom) {
    hoveredRoom = newHover;
    drawGrid(roomInfo.map((x) => x.toString()));
    (document.getElementById("canvas1") as HTMLCanvasElement).style.cursor =
      hoveredRoom !== -1 ? "pointer" : "default";
  }
}

function mouseLeave(): void {
  if (hoveredRoom !== -1) {
    hoveredRoom = -1;
    if (status == 1) drawGrid(roomInfo.map((x) => x.toString()));
    (document.getElementById("canvas1") as HTMLCanvasElement).style.cursor =
      "default";
  }
}

for (var i = 0; i < 200; i++) {
  keys[i] = false;
}

function vectorFromAngle(angle: number): [number, number] {
  return [Math.cos(angle), Math.sin(angle)];
}
function click(event: MouseEvent): void {
  let mouseX: number, mouseY: number;

  if (event.offsetX) {
    mouseX = event.offsetX;
    mouseY = event.offsetY;
  } else {
    mouseX = event.layerX;
    mouseY = event.layerY;
  }

  if (status == 1) {
    const roomNumber = getGridClick(mouseX, mouseY, roomInfo.length);

    if (roomNumber != -1) {
      thisPlayer = new Player();
      const roomJoinInfo: IJoinRoomInfo = {
        roomNumber: roomNumber,
        playerData: thisPlayer,
      };
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
  context.textAlign = "left";
  context.clearRect(0, 50, Config.gameSize, 50);
  context.fillText(txt, 50, 75);
}

function smallText(txt: string, color: string): void {
  context.fillStyle = color;
  context.font = "bold 30px sans-serif";
  context.textAlign = "center";
  context.clearRect(0, 285, Config.gameSize, 30);
  context.fillText(txt, 250, 300);
}

function drawGrid(txtArray: string[]): void {
  context.clearRect(0, 100, Config.gameSize, 400);
  context.font = "bold 20px sans-serif";
  context.textAlign = "center";
  for (var i = 0; i < txtArray.length; i++) {
    var ox = (i % 4) * 125 + 25;
    var oy = Math.floor(i / 4) * 125 + 125;
    const isHovered = i === hoveredRoom;
    context.fillStyle = isHovered ? "#2563eb" : "black";
    context.fillRect(ox, oy, 75, 75);
    if (isHovered) {
      context.fillStyle = "#2563eb";
      context.fillRect(ox + 5, oy + 5, 65, 65);
      context.fillStyle = "white";
    } else {
      context.clearRect(ox + 5, oy + 5, 65, 65);
      context.fillStyle = "black";
    }
    context.fillText("play", ox + 38, oy + 38);
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
  room = msg.roomNumber;
  localID = msg.localID;
  currentRound = msg.round;
  console.log("localID: " + localID);
  for (var i = 0; i <= localID; i++) {
    if (!localPlayersLines[i]) localPlayersLines[i] = [];
  }
  goInGame();
});
socket.on("roomReset", function (msg: IRoomResetInfo): void {
  currentRound = msg.round;
  localPlayersLines = localPlayersLines.map(() => new Array());
  thisPlayer.placeAtRandomPosition();
});
function goInGame(): void {
  context.clearRect(0, 0, Config.gameSize, Config.gameSize);
  startTickLoop(20);
}

function startTickLoop(intervalMs: number): void {
  // Browsers throttle setInterval/setTimeout in background tabs (down to ~1Hz),
  // which would slow the game to a crawl when the tab loses focus.
  // Web Workers are not throttled, so drive the tick from a worker.
  try {
    const workerSrc = `let id=null;onmessage=(e)=>{if(e.data&&e.data.type==='start'){clearInterval(id);id=setInterval(()=>postMessage('tick'),e.data.interval);}else if(e.data&&e.data.type==='stop'){clearInterval(id);id=null;}};`;
    const blob = new Blob([workerSrc], { type: "application/javascript" });
    const worker = new Worker(URL.createObjectURL(blob));
    worker.onmessage = () => tick();
    worker.postMessage({ type: "start", interval: intervalMs });
  } catch (err) {
    console.warn("Worker timer unavailable, falling back to setInterval", err);
    window.setInterval(tick, intervalMs);
  }
}

function tick(): void {
  context.clearRect(0, 0, Config.gameSize, Config.gameSize);
  thisPlayer.steering = 0;
  if (keys[37]) {
    thisPlayer.angle -= Config.turningSpeed;
    thisPlayer.steering = -1;
  }
  if (keys[39]) {
    thisPlayer.angle += Config.turningSpeed;
    thisPlayer.steering = 1;
  }
  thisPlayer.x += vectorFromAngle(thisPlayer.angle)[0] * Config.drivingSpeed;
  thisPlayer.y += vectorFromAngle(thisPlayer.angle)[1] * Config.drivingSpeed;
  localPlayersLines[localID].push([thisPlayer.x, thisPlayer.y]);
  context.fillStyle = "black";
  context.fillRect(
    thisPlayer.x,
    thisPlayer.y,
    Config.playerHeadSize,
    Config.playerHeadSize
  );

  // draw the lines of all players
  for (var p = 0; p < localPlayersLines.length; p++) {
    for (var i = 0; i < localPlayersLines[p].length; i++) {
      context.fillStyle = "red";
      if (p == localID) {
        context.fillStyle = "black";
      }
      context.fillRect(
        localPlayersLines[p][i][0],
        localPlayersLines[p][i][1],
        Config.playerHeadSize,
        Config.playerHeadSize
      );
    }
  }

  // compute the position of all other players
  for (var i = 0; i < localPlayersInfo.length; i++) {
    if (i != localID) {
      computeOtherPlayer(i);
    }
  }
  const playerPositionUpdate: IPlayerPositionUpdate = {
    room: room,
    localID: localID,
    round: currentRound,
    x: thisPlayer.x,
    y: thisPlayer.y,
    angle: thisPlayer.angle,
    steering: thisPlayer.steering,
  };
  socket.emit("playerPositionUpdate", playerPositionUpdate);
}

socket.on("giveRoomInfo", function (serverPlayers: IShortRoomInfo): void {
  for (var i = 0; i < serverPlayers.length; i++) {
    if (i != localID) {
      localPlayersInfo[i] = serverPlayers[i];
    }
  }
});

socket.on("giveFullInfo", function (serverLines: IFullRoomInfo): void {
  for (var i = 0; i < serverLines.length; i++) {
    localPlayersLines[i] = serverLines[i];
  }
});

let scores: IScoresInfo = [];
socket.on("scoresUpdate", function (msg: IScoresInfo): void {
  scores = msg;
  renderScoreboard();
});

function renderScoreboard(): void {
  const el = document.getElementById("scoreboard");
  if (!el) return;
  if (!scores || scores.length === 0) {
    el.innerHTML =
      '<h2>Scores</h2><div class="empty">Join a room to start scoring.</div>';
    return;
  }
  const items = scores
    .map((score, idx) => {
      const isYou = idx === localID;
      const label = isYou ? `Player ${idx + 1} (you)` : `Player ${idx + 1}`;
      return `<li class="${isYou ? "you" : ""}"><span>${label}</span><span>${score}</span></li>`;
    })
    .join("");
  el.innerHTML = `<h2>Scores</h2><ul>${items}</ul>`;
}

renderScoreboard();

function computeOtherPlayer(nr: number): void {
  if (localPlayersInfo[nr].steering == 1) {
    localPlayersInfo[nr].angle += Config.turningSpeed;
  }
  if (localPlayersInfo[nr].steering == -1) {
    localPlayersInfo[nr].angle -= Config.turningSpeed;
  }

  localPlayersInfo[nr].x +=
    vectorFromAngle(localPlayersInfo[nr].angle)[0] * Config.drivingSpeed;
  localPlayersInfo[nr].y +=
    vectorFromAngle(localPlayersInfo[nr].angle)[1] * Config.drivingSpeed;
  localPlayersLines[nr].push([localPlayersInfo[nr].x, localPlayersInfo[nr].y]);

  context.fillStyle = "red";
  context.fillRect(localPlayersInfo[nr].x, localPlayersInfo[nr].y, 5, 5);
}

document.body.onkeydown = function (event: KeyboardEvent): void {
  keys[event.keyCode] = true;
};
document.body.onkeyup = function (event: KeyboardEvent): void {
  keys[event.keyCode] = false;
};
