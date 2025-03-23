import express, { Request, Response } from "express";
import { Server, Socket } from "socket.io";
import Config from "./config";
import Room, {
  IFullRoomInfo,
  IJoinedRoomSuccessInfo,
  IJoinRoomInfo,
  IRoomsOverviewInfo,
  IRoomsOverviewRequest,
  IShortRoomInfo,
} from "./src/game/room";
import Player, { IPlayerPositionUpdate } from "./src/game/player";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const rooms: Room[] = [];
const server = app.listen(Config.serverPort, serverStarted);
const io = new Server(server, { cors: { origin: "*" } });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function serverStarted(): void {
  if (process.env.NODE_ENV === "development") {
    console.log("Development server started.");
    console.log("Backend server started on port " + Config.serverPort);
    console.log("Frontend server started on port " + Config.clientDevPort);
  }
  if (process.env.NODE_ENV === "production") {
    console.log("Production server started.");
    console.log("Server started on port " + Config.serverPort);
  }
}

app.get("/", function (req: Request, res: Response): void {
  if (process.env.NODE_ENV === "development") {
    res.redirect("http://localhost:" + Config.clientDevPort);
  }
  if (process.env.NODE_ENV === "production") {
    res.sendFile(__dirname + "/dist/index.html");
  }
});

app.get("/assets/*", function (req: Request, res: Response): void {
  res.sendFile(__dirname + "/dist" + req.url);
});

initializeRooms();
setInterval(function () {
  giveRoomInfo();
}, 20);
setInterval(function () {
  giveFullInfo();
}, 500);

io.on("connection", function (socket: Socket): void {
  console.log("A player connected");
  socket.on("reqInfo", function (msg: IRoomsOverviewRequest): void {
    const roomsOverviewInfo: IRoomsOverviewInfo = new Array();
    for (var i = 0; i < rooms.length; i++) {
      roomsOverviewInfo[i] = rooms[i].playerCount;
    }
    socket.emit("resInfo", roomsOverviewInfo);
  });
  socket.on("joinRoom", function (msg: IJoinRoomInfo): void {
    socket.join("room" + msg.roomNumber);
    rooms[msg.roomNumber].players.push(Player.fromData(msg.playerData));
    rooms[msg.roomNumber].lines.push(new Array());
    console.log("A player joined Room " + msg.roomNumber);
    rooms[msg.roomNumber].active = true;
    const info: IJoinedRoomSuccessInfo = {
      roomNumber: msg.roomNumber,
      localID: rooms[msg.roomNumber].players.length - 1,
    };
    socket.emit("joinRoomSuccess", info);
  });
  socket.on(
    "playerPositionUpdate",
    function (msg: IPlayerPositionUpdate): void {
      rooms[msg.room].players[msg.localID].x = msg.x;
      rooms[msg.room].players[msg.localID].y = msg.y;
      rooms[msg.room].players[msg.localID].angle = msg.angle;
      rooms[msg.room].players[msg.localID].steering = msg.steering;
      rooms[msg.room].lines[msg.localID].push([msg.x, msg.y]);
    }
  );
});

function giveRoomInfo(): void {
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].active) {
      const info: IShortRoomInfo = rooms[i].players;
      io.to("room" + i).emit("giveRoomInfo", info);
    }
  }
}

function giveFullInfo(): void {
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].active) {
      rooms[i].computeCollisions();
      const info: IFullRoomInfo = rooms[i].lines;
      io.to("room" + i).emit("giveFullInfo", info);
    }
  }
}

function initializeRooms(): void {
  rooms.length = 0; // empties the array
  for (var i = 0; i < Config.serverSize; i++) {
    rooms[i] = new Room(i);
  }
}
