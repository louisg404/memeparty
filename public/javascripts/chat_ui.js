function divEscapedContentElement(message){
	return $('<div class="text-chat"></div>').text(message);
}

function divSystemContentElement(message){
	return $('<div class="info-chat"></div').text(message);
}

function processUserInput(chatApp, socket) {
	var message = $('#send-message').val();
	var systemMessage;
	if(message != ""){
		if (message.charAt(0) == '/') {
			systemMessage = chatApp.processCommand(message);
			if (systemMessage) {
				$('#messages').append(divSystemContentElement(systemMessage));
			}
		} else {
			chatApp.sendMessage($('#room').text(), message);
			$('#messages').append(divEscapedContentElement(message));
			$('#messages').scrollTop($('#messages').prop('scrollHeight'));
		}
		$('#send-message').val('');
	}
}

var socket = io.connect();

$(document).ready(function(){
	var chatApp = new Chat(socket);

	socket.on('nameResult', function(result){
		var message;

		if (result.success){
			message = 'Bienvenue ' + result.name;
		} else {
			message = result.message;
		}
		$('#messages').append(divSystemContentElement(message));
	});

	socket.on('joinResult', function(result){
		$('#room').text(result.room);
		// $('#messages').append(divSystemContentElement('Nouveau salon'));
	});

	socket.on('message', function(message){
		if(message.text != undefined){
			var newElement = $('<div></div>').text(message.text);
			$('#messages').append(newElement);
		}
	});

	socket.on('rooms', function(rooms) {
	    $('#room-list').empty();
	    for(var room in rooms) {
	    	room = room.substring(1, room.length);
	    	if (room != '') {
	    		$('#room-list').append(divEscapedContentElement(room));
	    	}
		}
	    $('#room-list div').click(function() {
			chatApp.processCommand('/salon ' + $(this).text());
			$('#send-message').focus();
		}); 
	});


	// every second the client sends a 'rooms' event to the server
	// to ask for the rooms list
	setInterval(function(){
		socket.emit('rooms')
	}, 1000);

	$('#send-message').focus();

	$('#send-form').submit(function(){
		processUserInput(chatApp, socket);
		return false;
	})

})


