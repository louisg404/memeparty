var socketio = require('socket.io');
var io;
var guestNumber = 1;
var nickNames = {};
var namesUsed = [];
var currentRoom = {};

exports.listen = function(server){
	io = socketio.listen(server);
	io.set('log level', 1);
	io.sockets.on('connection', function(socket){
		guestNumber = assignGuestName(socket, 
			guestNumber, nickNames, namesUsed);
		joinRoom(socket, 'invite');

		handleMessageBroadcasting(socket, nickNames);
		handleNameChangeAttempts(socket, nickNames, namesUsed);
		handleRoomJoining(socket);

		// responds to a 'rooms' event by sending the rooms list
		socket.on('rooms', function(){
			socket.emit('rooms', io.sockets.manager.rooms);
		});

		handleClientDisconnection(socket, nickNames, namesUsed);
	});
};

function assignGuestName(socket, guestNumber, nickNames, namesUsed) {
	var name = 'Invite' + guestNumber;
	// Associate guest name with client connection ID
	nickNames[socket.id] = name;
	socket.emit('nameResult', {
		success: true,
		name: name
	});
	namesUsed.push(name);
	return guestNumber + 1;
}

function joinRoom(socket, room){
	socket.join(room);
	currentRoom[socket.id] = room;
	socket.emit('joinResult', {room: room});
	socket.broadcast.to(room).emit('message', {
		text: nickNames[socket.id] + ' a rejoint le salon ' + room + '.'
	});

	var usersInRoom = io.sockets.clients(room);

	if (usersInRoom.length > 1){
		var usersInRoomSummary = 'Utilisateurs actuellement dans ' + room + ': ';
		for (var index in usersInRoom) {
			var userSocketId = usersInRoom[index].id;
			if (userSocketId != socket.id){
				if (index > 0){
					usersInRoomSummary += ', ';
				}
				usersInRoomSummary += nickNames[userSocketId];
			}
		}
		usersInRoomSummary += '.';
		socket.emit('message', usersInRoomSummary);
	}
}

function handleMessageBroadcasting(socket, nickNames){
	socket.on('message', function(message){
		socket.broadcast.to(message.room).emit('message', {
			text: nickNames[socket.id] + ' : ' + message.text
		});
	})
};

function handleNameChangeAttempts(socket, nickNames, namesUsed){
	socket.on('nameAttempt', function(name){
		if (name.indexOf('Invite') == 0){
			socket.emit({
				success: false, 
				message: 'Le pseudo ne peut commencer par "Invite".'
			});
		} else {
			if (namesUsed.indexOf(name) == -1){
				var previousName = nickNames[socket.id];
				var previousNameIndex = namesUsed.indexOf(previousName);
				namesUsed.push(name);
				nickNames[socket.id] = name;
				delete namesUsed[previousNameIndex];

				nickNames[socket.id] = name;
				socket.emit('nameResult', {
					success: true, 
					name: name
				});	
				socket.broadcast.to(currentRoom[socket.id]).emit('message', {
					text: previousName + ' se nomme maintenant ' + name
				})
			} else {
				socket.emit('nameResult', {
					success: false, 
					message: 'Ce pseudo est déjà pris'
				});				
			}
		}
	})
};

function handleRoomJoining(socket){
	socket.on('join', function(room){
		socket.leave(currentRoom[socket.id]);
		joinRoom(socket, room.newRoom)
	})
}
function handleClientDisconnection(socket, nickNames, namesUsed){
	socket.on('disconnect', function(){
		var namesIndex = namesUsed.indexOf(nickNames[socket.id]);
		delete namesUsed[namesIndex];
		delete nickNames[socket.id];
	})

}




