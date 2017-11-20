angular.module("myApp").controller("ctrlRoom", ["$scope", "myFactory", "$location", "$routeParams", "$interval", function($scope, myFactory, $location, $routeParams, $interval){
    var tools = myFactory;
    $scope.roomName = $routeParams.roomName;

    $scope.nickname = $routeParams.nickname;

    console.log($scope.roomName, $scope.nickname);
    $scope.rooms = {};
    $scope.validCommand = true;
    $scope.validNickname = true;
    $scope.commandLengthValid = true;
    $scope.$watch("message", function(newValue){
        if (/^(\/nick|\/join)\s/.test(newValue)) {
            /** client using command in correct way, do not forget the space between command and content*/
            $scope.validCommand = true;
            var cmdContent = newValue.substring(newValue.indexOf(" ") + 1, newValue.length);
            if (cmdContent === "_" && newValue.startsWith("/nick")) {
                /** client nickname cannot be only one _ */
                $scope.validNickname = false;
            } else {
                $scope.validNickname = true;
                if (cmdContent.length >= 16) {
                    $scope.commandLengthValid = false;
                } else {
                    $scope.commandLengthValid = true;
                }
            }
        } else if (newValue.startsWith("/")) {
            $scope.validCommand = false;
        } else {
            $scope.validCommand = true;
            $scope.validNickname = true;
            $scope.commandLengthValid = true;
        }
    });

    tools.getRooms().then(function(res){
        $scope.rooms = res.data;
    });
    $interval(function(){  // use $interval to refresh the loungelist each 5 seconds
        tools.getRooms().then(function(res){
            $scope.rooms = res.data;
        });
    }, 5000);

    var socket = io();
    $scope.socket = socket;
    $scope.message = "";

    $scope.contents = [];
/**The msg object we received through socket including socketId, roomName, nickname and content, the following is schema*/
/**
 var msg = {
    socketId: "",
    roomName: "",
    nickname: "",
    content: "",
};
 */
    $scope.socket.on($scope.roomName, function(msg){
        $scope.socket = socket;

        var content = msg.initial === undefined ? msg.time + " " + msg.nickname + ": " + msg.content : msg.content;
        $scope.contents.push(content);

        $scope.$apply();  // anything out of the context of angular.js need to use $scope.$apply to apply changes timely
        console.log(msg);
    });
    // $scope.$on('$destroy', function(){
    //     $scope.socket.emit('unlisten');
    //     $scope.socket.disconnect();  //have tried passing true too.
    // });
    // console.log(socket.id);
    $scope.send = function(e){
        if (e.type === "click" || e.type === "keydown" && e.altKey && e.keyCode === 83) {  // ALT + S
            if ($scope.message.startsWith("/nick ")) {
                var nickname = $scope.message.substring($scope.message.indexOf(" ") + 1, $scope.message.length);
                tools.changeNickname($scope.roomName, $scope.nickname, nickname, socket.id).then(function(res){
                    $scope.nickname = res.data.nickname;
                });
            } else if ($scope.message.startsWith("/join ")) {
                var roomName = $scope.message.substring($scope.message.indexOf(" ") + 1, $scope.message.length);
                var found = false;
                for (var key in $scope.rooms) {
                    console.log($scope.rooms);
                    var keyPart = key.substring(0, key.lastIndexOf(","));
                    if (keyPart === roomName) {
                        /**the chat room has already exists, the client need to join*/
                        found = true;
                        roomName = key;
                        var nickname1 = $scope.nickname;
                        console.log(nickname1);
                        /**这里有点问题，没有重名的实际上是guests里没有放入这个socket。而我们不用http来实现的实际上guests里的放入的是undefined作为socketId*/
                        if ($scope.rooms[roomName]["guests"][nickname1] !== undefined) {
                            // nickname1 = $scope.rooms[roomName].guestDefaultName + $scope.rooms[roomName].guestDefaultId ++;
                            // tools.changeNickname(roomName, $scope.nickname, "_", socket.id);
                            // nickname1 = $scope.rooms[roomName].guestDefaultName + $scope.rooms[roomName].guestDefaultId ++;
                            nickname1 = "_";
                        }

                        /** you could use HTTP request to to this change room, then get a new socket
                         *
                         * */
                        /**
                         tools.getRoom(roomName, nickname1).then(function(res){
                        console.log(res.data);
                        $location.url("/chatRoom/" + res.data.roomName + "/" + res.data.nickname);
                    });
                         */
                        var oldSocket = socket;  // save the old socket
                        socket = io();  // apply for a new socket
                        $scope.socket = socket;
                        var oldNickname = $scope.nickname;
                        $scope.nickname = nickname1 === "_" ? $scope.rooms[roomName].guestDefaultName + $scope.rooms[roomName].guestDefaultId : nickname1;
                        var oldRoomName = $scope.roomName;
                        $scope.roomName = roomName;
                        $scope.socket.on($scope.roomName, function(msg){
                            $scope.socket = socket;

                            var content = msg.initial === undefined ? msg.time + " " + msg.nickname + ": " + msg.content : msg.content;
                            $scope.contents.push(content);

                            $scope.$apply();  // anything out of the context of angular.js need to use $scope.$apply to apply changes timely
                            console.log(msg);
                        });
                        emitToRoom($scope.socket, tools.myTime() + " " + $scope.nickname + " joined Chat Room",oldRoomName, roomName, oldNickname, nickname1, false);
                        console.log(socket);  /**这里是undefined，不能从新连接的客户端获取socket.id, 必须发到服务端，服务端通过socket获取了id*/
                        oldSocket.disconnect();  // let the old socket disconnect, so the client will not hear from the old room
                        break;
                    }
                }
                if (! found) {
                    /**the Chat Room does not exists, the client need to create then join*/
                    /**同理我们也可以
                     * socket = io()申请新的io
                     * var oldSocket = socket保存旧的socket
                     * 然后监听新的roomName，但是我们还是要发送http请求让后台创建该room的信息，并且创建用户的信息
                     * 过于麻烦了，所以我直接用现成的http请求 post(/room) 来创建并加入这个room
                     * */
                    /**实际应用中，socket io可以捕捉到所有的用户操作，可以将他们转化为各种http请求，
                     * 实际是完全有能力替代http请求的，这一点上还有很大的提升空间，可以改变为进入聊天室后完全脱离http请求，
                     * 毕竟在登录和用户创建界面上，还是需要http请求来沟通server的
                     * */
                    socket.disconnect();  // 直接让oldSocket断开连接
                    tools.createRoom(roomName, $scope.nickname).then(function(res){
                        console.log(res.data);
                        $location.url("/chatRoom/" + res.data.roomName + "/" + res.data.nickname);
                    });
                }
            } else {
                /**the normal chat content*/
                emit(socket, $scope.message);
            }
            $scope.message = "";
        }
    };

    $scope.clear = function(){
        $scope.contents = [];
    };
/**The msg object we send through socket including socketId, roomName, nickname and content, the following is schema*/
/**
    var msg = {
        socketId: "",
        roomName: "",
        nickname: "",
        content: "",
        time: tools.myTime(), string type,
        initial: true/false,  // in app.js, client-connect directive, use for send the welcome message(true)/leaving message(false)
    };
*/
    function emit(socket, message){
        if (message !== ""){
            var msg = {
                socketId: socket.id,
                roomName: $scope.roomName,
                nickname: $scope.nickname,
                content: message,
                time: tools.myTime(),
            };
            socket.emit($scope.roomName, msg);
        }
    }
    function emitToRoom (socket, message, oldRoomName, newRoomName, oldNickname, newNickname, initial) {
        /**general chat room use initial = undefined or ignore, joined room use true, change room use false*/
        if (message !== ""){
            var msg = {
                socketId: socket.id,
                roomName: oldRoomName,
                nickname: oldNickname,
                content: message,
                time: tools.myTime(),
                initial: initial,
                newNickname: newNickname,
            };
            socket.emit(newRoomName, msg);
        }
    }

}]);


