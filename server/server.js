var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

var rooms = [];
var users = [];

app.use('/static', express.static(__dirname + '/../client'));

app.set('views', __dirname + '/templates');
app.set('view engine', "jade");
app.engine('jade', require('jade').__express);
app.get("/", function(req, res){
    res.render("index.jade");
});

io.on('connection', function (socket) {
	console.log('on connection : ' + socket.conn.id);

    socket.join(socket.conn.id);

    socket.on('sendOfferToUser', function(data) {
        var user = getUserByUserName(data.to);
        io.sockets.in(user.id).emit('sendOfferToUser', { from : data.username, payload : data.payload});
    });

    socket.on('sendAnswerToUser', function(data) {
        var user = getUserByUserName(data.to);
        io.sockets.in(user.id).emit('sendAnswerToUser', { from : data.username, payload : data.payload});
    });
    
    socket.on('sendIceCandidateToUser', function(data) {
        var user = getUserByUserName(data.to);
        io.sockets.in(user.id).emit('sendIceCandidateToUser', { from : data.username, payload : data.payload});
    });

	socket.on('room', function(data) {
		var room = data.room;
        var username  = data.user;
        addUserToRoom(room, username);
        addUser(socket.conn.id, username, room);

        socket.emit('onConnectRoom', { members : getRoomUsers(room) });
        io.sockets.in(room).emit('onNewMember', { username : username });
		socket.join(room);
	});
    
    socket.on('textMessage', function (data) {
    	var room = data.room;
        io.sockets.in(room).emit('onTextMessage', data);
    });

    socket.on('disconnect', function(data) {
        var user = getUserById(socket.conn.id);
        if (user != null) {
            for (var i in user.rooms) {
                var room = user.rooms[i];
                deleteUserFromRoom(user, room);
                io.sockets.in(room).emit('onDisconnectMember', {user : user.username});
            }
            deleteUser(user);
        }
    });
});

function deleteUserFromRoom(user, roomname) {
    var room = getRoomByName(roomname);
    var users = room.users;
    var index = -1;
    for (var i in users) {
        if (users[i].username == user.username) {
            index = i;
            break;
        }
    }
    room.users.splice(index, 1);
}

function addUserToRoom(roomname, username) {
    var room = getRoomByName(roomname);
    if (room == null) {
        room = createRoom(roomname);
        rooms.push(room);        
    }
    room.users.push({ username : username});
}

function getRoomUsers(roomname) {
    var room = getRoomByName(roomname);
    return room.users;
}

function getRoomByName(room) {
    for (var i in rooms) {
        if (rooms[i].name = room) {
            return rooms[i];
        }
    }
    return null;
}

function createRoom(room) {
    return {
        name : room,
        users : []
    };
}

function getUserById(id) {
    var index = -1;
    for (var i in users) {
        if (users[i].id == id) {
            index = i;
        }
    }
    return users[index];
}

function getUserByUserName(username) {
    var index = -1;
    for (var i in users) {
        if (users[i].username == username) {
            index = i;
        }
    }
    return users[index];
}

function addUser(id, username, room) {
    var user = getUserById(id);
    if (user == null) {
        user = { id : id, username : username, rooms : [] };
        user.rooms.push(room);
        users.push(user);
    } else  {
        addGroupToUser(room, user);
    }
}

function addRoomToUser(room, user) {
    for (var i in user.rooms) {
        if (user.rooms[i] == room) {
            return;
        }
    }
    user.rooms.push(room);
}

function deleteUser(user) {
    var index = -1;
     for (var i in users) {
        if (users[i].id == user.id) {
            index = i;
            break;
        }
     }
     users.splice(index,1);
}

http.listen(5001, function(){
  console.log('listening on *: 5001');
});