var socket = io();
var status = 0;
var roomInfo = new Array();
var keys = new Array();
var turningSpeed = 0.05;
var drivingSpeed = 2;
var lPD = new Array();
var lPL = new Array();

for(var i = 0; i < 200; i++) {
	keys[i] = false;
	
};

function Player() {
	this.active = false;
	this.x = Math.floor(Math.random()*500);
	this.y = Math.floor(Math.random()*500);
	this.angle = Math.random()*2*Math.PI;
	this.steering = 0;
};
function vFA (a) {
	var vec = new Array;
	vec[0] = Math.cos(a);
	vec[1] = Math.sin(a);
	return vec;
};
function Click(e) {
	
	var mouseX, mouseY;
	
	if(e.offsetX) {
		mouseX = e.offsetX;
		mouseY = e.offsetY;
	}
	else if(e.layerX) {
		mouseX = e.layerX;
		mouseY = e.layerY;
	};
	
	socket.emit('wow','');
	
	if(status == 1) {
		var cc = getGridClick(mouseX, mouseY, roomInfo.length);
		
		if(cc != -1) {
			player1 = new Player();
			socket.emit('joinRoom',{rn: cc, pobj: player1 });
		};
	};
};

function mouseMove(e) {
	
};
document.body.onload = initCanvas();

socket.on('resInfo', function(msg) {
	roomInfo = msg;
	drawGrid(roomInfo);
	status = 1;
});

function initCanvas() {
	var canvas = document.getElementById('canvas1');
	socket.emit('reqInfo','');
	context = canvas.getContext('2d');
	headLineText('Curve Game','black');
	smallText('Loading Rooms..','black');
	
};

function headLineText(txt,color) {
	context.fillStyle = color;
	context.font = 'bold 50px sans-serif';
	context.textAlign = 'center';
	context.clearRect(0,50,500,50);
	context.fillText(txt,250,75);
};

function smallText(txt,color) {
	context.fillStyle = color;
	context.font = 'bold 30px sans-serif';
	context.textAlign = 'center';
	context.clearRect(0,285,500,30);
	context.fillText(txt,250,300);
};

function drawGrid(txtArray) {
	context.clearRect(0,100,500,400);
	context.font = 'bold 20px sans-serif';
	context.textAlign = 'center';
	for(var i = 0; i < txtArray.length; i++) {
		var ox =  (i % 4) * 125 + 25;
		var oy =  Math.floor(i / 4) * 125 + 125;
		context.fillRect(ox,oy,75,75);
		context.clearRect(ox + 5, oy + 5, 65, 65);
		context.fillText(txtArray[i], ox + 38, oy + 38);
	};
};

function getGridClick(x,y,arrayLength) {
	for(var i = 0; i < arrayLength; i++) {
		var ox =  (i % 4) * 125 + 25;
		var oy =  Math.floor(i / 4) * 125 + 125;
		if(x > ox && x < ox+75 && y > oy && y < oy+75) {
			return i;
		};
	};	
	return -1;
};

socket.on('joinRoomSuccess', function(msg) {
	status = 2;
	room = msg.room;
	localID = msg.localID;
	goInGame();
});
function goInGame() {
	context.clearRect(0,0,500,500);
	window.setInterval( function() {tick()}, 20);
};

function tick() {
	context.clearRect(0,0,500,500);
	player1.steering = 0;
	if(keys[37]) {
		player1.angle -= turningSpeed;
		player1.steering = -1;
	};
	if(keys[39]) {
		player1.angle += turningSpeed;
		player1.steering = 1;
	};
	player1.x += vFA(player1.angle)[0]*2;
	player1.y += vFA(player1.angle)[1]*2;
	lPL[localID].push( [player1.x, player1.y] );
	context.fillStyle = "black";
	context.fillRect(player1.x,player1.y,5,5);
	
	//Die Linien aller Spieler malen
	for(var p = 0; p < lPL.length; p++) {
		for(var i = 0; i < lPL[p].length; i++) {
			context.fillStyle = "red";
			if(p == localID) {
				context.fillStyle = "black";
			};
			context.fillRect(lPL[p][i][0],lPL[p][i][1],5,5);
		};
	};
	//Daten der anderen Spieler berechnen
	for(var i = 0; i < lPD.length; i++) {
		if(i != localID) {
			computeOtherPlayer(i);
			
		};
	};
	socket.emit('playerPositionUpdate',{room: room, localID: localID, x: player1.x, y: player1.y, angle: player1.angle, steering:player1.steering });
};

socket.on('giveRoomInfo', function(serverPlayers) {
	for(var i = 0; i < serverPlayers.length; i++) {
		if(i != localID) {
			lPD[i] = serverPlayers[i];
		};
	};
});

socket.on('giveFullInfo', function(serverLines) {
	for(var i = 0; i < serverLines.length; i++) {
		lPL[i] = serverLines[i];
	};
	console.log(lPL);
});

function computeOtherPlayer(nr) {
	if(lPD[nr].steering == 1) {
		lPD[nr].angle += turningSpeed;
	};
	if(lPD[nr].steering == -1) {
		lPD[nr].angle -= turningSpeed;
	};
	
	lPD[nr].x += vFA(lPD[nr].angle)[0]*2;
	lPD[nr].y += vFA(lPD[nr].angle)[1]*2;
	lPL[nr].push( [lPD[nr].x, lPD[nr].y] );
	
	context.fillStyle = "red";
	context.fillRect(lPD[nr].x,lPD[nr].y,5,5);
	
	
	
};

document.body.onkeydown = function(event) {
	keys[event.keyCode] = true;
};
document.body.onkeyup = function(event) {
	keys[event.keyCode] = false;
};