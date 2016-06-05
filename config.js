exports.port = 3000;
exports.serverSize = 10;

function Room(nr) {
	this.nr = nr;
	this.players = new Array();
	this.lines = new Array();
	this.playerCount = 0;
	this.active = false;
};

exports.Room = Room;