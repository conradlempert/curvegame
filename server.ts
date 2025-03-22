import express, { Request, Response } from "express";
import { Server } from "socket.io";
import Config from "./config";
import Room from "./room";

const app = express();
const rooms: Room[] = [];
const server = app.listen(Config.port, serverStarted);
const io = new Server(server);

function serverStarted(): void {
  console.log("Server started on port " + Config.port);
}

initializeRooms();
setInterval(function () {
  giveRoomInfo();
}, 20);
setInterval(function () {
  giveFullInfo();
}, 500);

app.get("/", function (req: Request, res: Response): void {
  res.sendFile(__dirname + "/index.html");
});

app.get("/client.js", function (req: Request, res: Response): void {
  res.sendFile(__dirname + "/client.js");
});

io.on("connection", function (socket): void {
  socket.on("reqInfo", function (): void {
    var roomInfo = new Array();
    for (var i = 0; i < rooms.length; i++) {
      roomInfo[i] = rooms[i].playerCount;
    }
    socket.emit("resInfo", roomInfo);
  });
  socket.on("joinRoom", function (msg) {
    socket.join("room" + msg.rn);
    rooms[msg.rn].players.push(msg.pobj);
    rooms[msg.rn].lines.push(new Array());
    console.log("A player joined Room " + msg.rn);
    rooms[msg.rn].active = true;
    socket.emit("joinRoomSuccess", {
      room: msg.rn,
      localID: rooms[msg.rn].players.length - 1,
    });
  });
  socket.on("playerPositionUpdate", function (msg) {
    rooms[msg.room].players[msg.localID].x = msg.x;
    rooms[msg.room].players[msg.localID].y = msg.y;
    rooms[msg.room].players[msg.localID].angle = msg.angle;
    rooms[msg.room].players[msg.localID].steering = msg.steering;
    rooms[msg.room].lines[msg.localID].push([msg.x, msg.y]);
  });
});

function giveRoomInfo(): void {
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].active) {
      io.to("room" + i).emit("giveRoomInfo", rooms[i].players);
    }
  }
}

function giveFullInfo(): void {
  for (var i = 0; i < rooms.length; i++) {
    if (rooms[i].active) {
      io.to("room" + i).emit("giveFullInfo", rooms[i].lines);
    }
  }
}

function initializeRooms(): void {
  rooms.length = 0; // empties the array
  for (var i = 0; i < 10; i++) {
    rooms[i] = new Room(i);
  }
}
