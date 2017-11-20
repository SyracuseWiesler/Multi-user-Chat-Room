angular.module("myApp").factory("myFactory", ["$http", function($http){
    return {
        getRooms: function(){
            return $http({
                method: "GET",
                url: "/rooms"
            });
        },
        getRoom: function(roomName, nickname){
            nickname = nickname.replace(/\s/g, "") === "" ? "_" : nickname;
            return $http({
                method: "GET",
                url: "/room/" + roomName + "/" + nickname,
            });
        },
        createRoom: function(roomName, nickname){
            return $http({
                method: "POST",
                url: "/room",
                data: {
                    roomName: roomName,
                    nickname: nickname
                }
            });
        },
        changeNickname: function(roomName, oldNickname, newNickname, socketId){
            return $http({
                method: "PUT",
                url: "/nickname",
                data: {
                    roomName: roomName,
                    oldNickname: oldNickname,
                    newNickname: newNickname,
                    socketId: socketId,
                }
            });
        },
        myTime: function(){
            var d = new Date();
            return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " "
                + (d.getHours() < 10 ? "0" + d.getHours() : d.getHours()) + ":"
                + (d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()) +
                ":" + (d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds());
        },

    };
}]);