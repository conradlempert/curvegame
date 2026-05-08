import "./style.css";
import { io, Socket } from "socket.io-client";
import Player, { ILine, IPlayerPositionUpdate } from "./game/player";
import {
  IFullRoomInfo,
  IGameOverInfo,
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

function playerColor(index: number, lightness: number = 45): string {
  const hue = (index * 137.508) % 360;
  return `hsl(${hue}, 70%, ${lightness}%)`;
}

function initCanvas() {
  var canvas = document.getElementById("canvas1") as HTMLCanvasElement;
  canvas.addEventListener("click", click);
  canvas.addEventListener("mousemove", mouseMove);
  canvas.addEventListener("mouseleave", mouseLeave);
  socket.emit("reqInfo", "");
  context = canvas.getContext("2d")!;
  headLineText("curve game", "black");
  smallText("loading rooms..", "black");
  initTouchControls();
}

function initTouchControls(): void {
  const btnLeft = document.getElementById("btnLeft");
  const btnRight = document.getElementById("btnRight");
  if (!btnLeft || !btnRight) return;
  bindHoldButton(btnLeft, 37);
  bindHoldButton(btnRight, 39);
}

function bindHoldButton(el: HTMLElement, keyCode: number): void {
  const press = (e: Event) => {
    e.preventDefault();
    keys[keyCode] = true;
    el.classList.add("pressed");
  };
  const release = (e: Event) => {
    e.preventDefault();
    keys[keyCode] = false;
    el.classList.remove("pressed");
  };
  el.addEventListener("pointerdown", (e) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    press(e);
  });
  el.addEventListener("pointerup", release);
  el.addEventListener("pointercancel", release);
  el.addEventListener("pointerleave", release);
  el.addEventListener("contextmenu", (e) => e.preventDefault());
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
  document.body.style.backgroundColor = playerColor(localID, 85);
  goInGame();
});
socket.on("roomReset", function (msg: IRoomResetInfo): void {
  currentRound = msg.round;
  localPlayersLines = localPlayersLines.map(() => new Array());
  thisPlayer.placeAtRandomPosition();
});
function goInGame(): void {
  context.clearRect(0, 0, Config.gameSize, Config.gameSize);
  document.getElementById("topBar")?.classList.add("visible");
  startTickLoop(20);
}

document.getElementById("btnMenu")?.addEventListener("click", () => {
  location.reload();
});

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
  if (status !== 2) return;
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
  context.fillStyle = playerColor(localID);
  context.fillRect(
    thisPlayer.x,
    thisPlayer.y,
    Config.playerHeadSize,
    Config.playerHeadSize
  );

  // draw the lines of all players
  for (var p = 0; p < localPlayersLines.length; p++) {
    context.fillStyle = playerColor(p);
    for (var i = 0; i < localPlayersLines[p].length; i++) {
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
    // Skip the local player: we already extend our own line every tick
    // client-side. Overwriting it with the server's slightly stale snapshot
    // causes a visible gap behind the head that jumps forward each sync.
    if (i === localID) continue;
    localPlayersLines[i] = serverLines[i];
  }
});

let scores: IScoresInfo = [];
socket.on("scoresUpdate", function (msg: IScoresInfo): void {
  scores = msg;
  renderScoreboard();
});

socket.on("gameOver", function (msg: IGameOverInfo): void {
  status = 3;
  scores = msg.scores;
  renderScoreboard();
  drawGameOverScreen(msg);
  const btn = document.getElementById("btnMenu");
  if (btn) btn.textContent = "← Main Menu";
});

function drawGameOverScreen(msg: IGameOverInfo): void {
  const w = Config.gameSize;
  const h = Config.gameSize;
  context.clearRect(0, 0, w, h);

  // Background
  context.fillStyle = "#f9fafb";
  context.fillRect(0, 0, w, h);

  // Title
  context.fillStyle = "#111";
  context.font = "bold 52px sans-serif";
  context.textAlign = "center";
  context.fillText("Game Over", w / 2, 80);

  // Winner banner
  const winnerColor = playerColor(msg.winnerIndex);
  const winnerLabel =
    msg.winnerIndex === localID ? "You win! 🎉" : `Player ${msg.winnerIndex + 1} wins!`;
  context.fillStyle = winnerColor;
  context.fillRect(60, 100, w - 120, 60);
  context.fillStyle = "white";
  context.font = "bold 28px sans-serif";
  context.fillText(winnerLabel, w / 2, 140);

  // Sorted scores table
  const sorted = msg.scores
    .map((s, i) => ({ score: s, index: i }))
    .sort((a, b) => b.score - a.score);

  const rowH = 52;
  const tableTop = 185;
  sorted.forEach(({ score, index }, rank) => {
    const y = tableTop + rank * rowH;
    const isYou = index === localID;
    const isWinner = index === msg.winnerIndex;

    context.fillStyle = isWinner ? playerColor(index, 85) : isYou ? "#dbeafe" : "#f3f4f6";
    context.fillRect(60, y, w - 120, rowH - 6);

    // Color swatch
    context.fillStyle = playerColor(index);
    context.fillRect(68, y + 8, 24, 36);

    // Rank
    context.fillStyle = "#555";
    context.font = "bold 20px sans-serif";
    context.textAlign = "left";
    context.fillText(`#${rank + 1}`, 102, y + 32);

    // Name
    const name = isYou ? `Player ${index + 1} (you)` : `Player ${index + 1}`;
    context.fillStyle = "#111";
    context.font = isYou ? "bold 22px sans-serif" : "22px sans-serif";
    context.fillText(name, 150, y + 32);

    // Score
    context.fillStyle = playerColor(index);
    context.font = "bold 22px sans-serif";
    context.textAlign = "right";
    context.fillText(`${score} pts`, w - 68, y + 32);
  });

  // Instruction
  context.fillStyle = "#888";
  context.font = "18px sans-serif";
  context.textAlign = "center";
  context.fillText('Use "← Menu" above to play again', w / 2, h - 24);
}

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
      const swatch = `<span class="swatch" style="background:${playerColor(idx)}"></span>`;
      return `<li class="${isYou ? "you" : ""}"><span class="name">${swatch}${label}</span><span>${score}</span></li>`;
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

  context.fillStyle = playerColor(nr);
  context.fillRect(localPlayersInfo[nr].x, localPlayersInfo[nr].y, 5, 5);
}

document.body.onkeydown = function (event: KeyboardEvent): void {
  keys[event.keyCode] = true;
};
document.body.onkeyup = function (event: KeyboardEvent): void {
  keys[event.keyCode] = false;
};
