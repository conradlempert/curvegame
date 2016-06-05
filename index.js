var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var c = require('./config');

initializeRooms();
setInterval(function() {giveRoomInfo() },20);
setInterval(function() {giveFullInfo() },500);

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
  socket.on('wow', function(msg){
    console.log('User clicked!');
  });
  socket.on('reqInfo', function(msg){
	var roomInfo = new Array();
	for(var i = 0; i < rooms.length; i++) {
		roomInfo[i] = rooms[i].playerCount;
	};
	socket.emit('resInfo',roomInfo);
  });
  socket.on('joinRoom', function(msg) {
	socket.join(msg.rn);
	rooms[msg.rn].players.push(msg.pobj);
	rooms[msg.rn].lines.push(new Array());
	console.log('A player joined Room ' + msg.rn);
	rooms[msg.rn].active = true;
	socket.emit('joinRoomSuccess',{room: msg.rn, localID: rooms[msg.rn].players.length-1 });
  });
  socket.on('playerPositionUpdate', function(msg) {
	rooms[msg.room].players[msg.localID].x = msg.x;
	rooms[msg.room].players[msg.localID].y = msg.y;
	rooms[msg.room].players[msg.localID].angle = msg.angle;
	rooms[msg.room].players[msg.localID].steering = msg.steering;
	rooms[msg.room].lines[msg.localID].push( [msg.x, msg.y] );
  });
});

http.listen(c.port, function(){
  console.log('listening on *:' + c.port);
});

function giveRoomInfo() {
	for(var i = 0; i < rooms.length; i++) {
		if(rooms[i].active) {
			console.log('Info emitted to room ' + i);
			io.to(i).emit('giveRoomInfo', rooms[i].players);
		};
	};
};

function giveFullInfo() {
	for(var i = 0; i < rooms.length; i++) {
		if(rooms[i].active) {
			console.log('Full Info emitted to room ' + i);
			io.to(i).emit('giveFullInfo', rooms[i].lines);
		};
	};
};

function initializeRooms() {
	rooms = new Array();
	for(var i = 0; i < 10; i++) {
		rooms[i] = new c.Room;
	};
};