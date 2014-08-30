function VideoRTCController() {

    var that = this;
    var connection = false;
    var peerConfig =   {iceServers: [] };
    var othersSDPs = [];
    var othersCandidates = [];
    var connections = [];

    this.createOffer = function(username) {
        if (username != window.mainUsername) {
            if( typeof(RTCPeerConnection) === 'function') {
                peerConnection = new RTCPeerConnection(peerConfig);
            } else if( typeof(webkitRTCPeerConnection) === 'function') {
                peerConnection = new webkitRTCPeerConnection(peerConfig);
            }

            peerConnection.addStream(myStream);
            connections[username] = peerConnection;

            peerConnection.onaddstream = function(e) {
                $('#other-video-holder').hide();
                $('#other-video').show();
                var video = document.querySelector('#other-video');
                video.src = URL.createObjectURL(e.stream);
            };

            peerConnection.onicecandidate = function(icecandidate) {
                window.socket.emit('sendIceCandidateToUser', {username : window.mainUsername, to : username, room : mainRoom, payload : icecandidate});
            };

            peerConnection.createOffer(function(SDP){
                peerConnection.setLocalDescription(SDP);                
                window.socket.emit('sendOfferToUser', {username : window.mainUsername, to : username, room : mainRoom, payload : SDP});
            });
        }
    };

    this.memberDisconnect = function(username) {
        $('#other-video-holder').show();
        $('#other-video').hide();
    }

    var createAnswer = function(otherSDP, username) {
        if( typeof(RTCPeerConnection) === 'function') {
            peerConnection = new RTCPeerConnection(peerConfig);
        } else if( typeof(webkitRTCPeerConnection) === 'function') {
            peerConnection = new webkitRTCPeerConnection(peerConfig);
        }

        peerConnection.addStream(myStream);
        connections[username] = peerConnection;

        peerConnection.setRemoteDescription(createRTCSessionDescription(otherSDP));

        peerConnection.onaddstream = function(e) {
            $('#other-video-holder').hide();
            $('#other-video').show();
            var video = document.querySelector('#other-video');
            video.src = URL.createObjectURL(e.stream);
        };

        peerConnection.onicecandidate = function(icecandidate) {
            window.socket.emit('sendIceCandidateToUser', {username : window.mainUsername, to : username, room : mainRoom, payload : icecandidate});
        };

        peerConnection.createAnswer(function(SDP){
            peerConnection.setLocalDescription(SDP);
            for (var i = 0; i < othersCandidates.length; i++) {
                if (othersCandidates[i].candidate) {
                    peerConnection.addIceCandidate(createRTCIceCandidate(othersCandidates[i].candidate));
                }
            }
            
            window.socket.emit('sendAnswerToUser', {username : window.mainUsername, to : username, room : mainRoom, payload : SDP});
        });
    };

    var createRTCSessionDescription = function(sdp){
        if( typeof(RTCSessionDescription) === 'function') {
            return new RTCSessionDescription(sdp);
        } else if( typeof(webkitRTCSessionDescription) === 'function') {
            return new webkitRTCSessionDescription(sdp);
        }
    };

    var handshakeDone = function(otherSDP, username){
        var peerConnection = connections[username];
        peerConnection.setRemoteDescription(createRTCSessionDescription(otherSDP));
        for (var i = 0; i < othersCandidates.length; i++) {
            if (othersCandidates[i].candidate) {
                peerConnection.addIceCandidate(createRTCIceCandidate(othersCandidates[i].candidate));
            }
        }
    };

    var createRTCIceCandidate = function(candidate){
        if( typeof(webkitRTCIceCandidate) === 'function') {
            return new webkitRTCIceCandidate(candidate);
        } else if( typeof(RTCIceCandidate) === 'function') {
            return new RTCIceCandidate(candidate);
        }
    }

    var setIceCandidates = function(iceCandidate, username) {
        var peerConnection = connections[username];
        // push icecandidate to array if no SDP of other guys is available
        if(!othersSDPs[username]) {
            othersCandidates.push(iceCandidate);
        }

        // add icecandidates immediately if not Firefox & if remoteDescription is set
        if(othersSDPs.length > 0 && iceCandidate.candidate && iceCandidate.candidate !== null ) {
            var candidate = createRTCIceCandidate(iceCandidate.candidate);
            try {
                peerConnection.addIceCandidate(candidate, function(){}, function(e){console.error(e, iceCandidate, peerConnection)});   
            } catch(e){console.error(e);}
        }
    };

    //came offer
    window.socket.on('sendOfferToUser', function(data) {
        if (data.user != window.mainUsername) {
            addSDP(data.payload, data.from);
            createAnswer(othersSDPs[data.from], data.from);
        }
    });

    //came answer
    window.socket.on('sendAnswerToUser', function(data) {
        if (data.user != window.mainUsername) {
            addSDP(data.payload, data.from);
            handshakeDone(othersSDPs[data.from], data.from);
        }
    });

    window.socket.on('sendIceCandidateToUser', function(data) {
        setIceCandidates(data.payload, data.from);
    });

    function addSDP(sdp, username) {
        othersSDPs[username] = sdp;
        othersSDPs.length ++;
    }

    function removeSDP(username) {
        othersSDPs.splice(username, 1);
    }
}
