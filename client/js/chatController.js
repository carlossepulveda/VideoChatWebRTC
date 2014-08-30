window.mainUsername = new Date().getTime();
window.members = [];
window.socket = io.connect('http://192.168.1.5:5001');
window.mainRoom = "example";
window.myStream;

$('#username').html('<b>Usuario</b> : ' + mainUsername);
$('#chatname').html('<b>Chat</b> : ' + mainRoom);

window.myStream;
window.videoRTCController = new VideoRTCController();

socket.on('connect', function(){
    $('.memeber-container').remove();
    var userMedia = ( navigator.getUserMedia ||
                        navigator.webkitGetUserMedia ||
                        navigator.mozGetUserMedia ||
                        navigator.msGetUserMedia);

    var getUserMedia = userMedia.bind(navigator);    
    getUserMedia({audio: true, video: true}, start, function() {alert('Error');});
});


function start(stream) {
    myStream = stream;
    document.querySelector("#main-video").src = URL.createObjectURL(stream);

    socket.emit('room', {room : mainRoom, user : mainUsername});

    socket.on('onConnectRoom', function(data) {
        for (var i in data.members) {
            var user = data.members[i];
            if (user !== mainUsername) {
                members.push(user);
                showNewMember(user);
                videoRTCController.createOffer(user.username);
            }
        }
    });

    socket.on('onTextMessage', function(data) {
        console.log(data);
        var labelUser = data.user;
        if (data.user == mainUsername) {
            labelUser = 'ME';
        }
        $('#content').append('<div style="width:400px;height:20px;position:relative"><div style="float:left;margin-right: 11px;font-size:10px;line-height:19px;postion:absolute">' + labelUser + ' : </div><div>' + data.text + '</div></div>');
    });

    socket.on('onNewMember', function(data) {
        console.log('new member : ', data);
        var user = {username : data.username};
        members.push(user);
        showNewMember(user);
    });

    socket.on('onDisconnectMember', function(data) {
        console.log('onDisconnectMember');
        members.splice(data.user, 1);
        $('#m' + data.user).remove();
        $('#v' + data.user).remove();
        videoRTCController.memberDisconnect(data.user);
    });

    socket.on('disconnect',function() {
        $('.memeber-container').remove();
    });

    $('#send').click(function() {
        socket.emit('textMessage', {room : mainRoom, text : $('#field').val(), user : mainUsername});
        $('#field').val('');
    });

    function showNewMember(user) {
        if (user.username != mainUsername) {
            $('#m' + user.username).remove();
            $('.members-container').append('<div class="memeber-container" style="padding:5px" id="m' + user.username + '"><p><b>Conectado con</b> : ' + user.username + '</p></div>');
        }
        
    }
}
