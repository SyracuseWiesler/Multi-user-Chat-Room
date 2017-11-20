angular.module("myApp").controller("ctrlWel", ["$scope", "myFactory", "$location", function($scope, myFactory, $location){
    var tools = myFactory;
    $scope.atJoin = true;
    $scope.nicknameValid = true;
    $scope.nicknameValid2 = true;
    $scope.roomNameValid = true;
    $scope.rooms = {};
    $scope.nickname = "";
    $scope.myRoomName = "";
    $scope.selectedRoomName = "";
    tools.getRooms().then(function(res){
        $scope.rooms = processRooms(res.data);
        console.log($scope.rooms);
        $scope.length = Object.keys($scope.rooms).length;
        if ($scope.length === 0) $scope.atJoin = false;
        $scope.selectedRoomName = Object.keys($scope.rooms)[0];
    });
    function processRooms (rooms) {
        for (var key in rooms) {
            var obj = rooms[key];
            var keyPart = key.substring(0, key.lastIndexOf(","));
            rooms[key] = "";
            delete rooms[key];
            rooms[keyPart] = obj;
        }
        return rooms;
    }
    $scope.$watch("nickname", function(newValue){  // duplicate nickname
        if ($scope.rooms[$scope.selectedRoomName] !== undefined && $scope.rooms[$scope.selectedRoomName]["guests"][newValue] !== undefined) {
            $scope.nicknameValid = false;
        } else {
            $scope.nicknameValid = true;
        }
        if ($scope.nickname === "_") {
            $scope.nicknameValid2 = false;
        } else {
            $scope.nicknameValid2  = true;
        }
    });
    $scope.$watch("myRoomName", function(newValue){  // duplicate roomName
        if ($scope.rooms[newValue] !== undefined) {
            $scope.roomNameValid = false;
        } else {
            $scope.roomNameValid = true;
        }
    });
    $scope.join = function(){
        // console.log($scope.selectedRoomName, $scope.nickname);
        tools.getRoom($scope.selectedRoomName, $scope.nickname).then(function(res){
            console.log(res.data);
            $location.url("/chatRoom/" + res.data.roomName + "/" + res.data.nickname);
        });
    };
    $scope.create = function(){
        // console.log($scope.myRoomName, $scope.nickname);
        tools.createRoom($scope.myRoomName, $scope.nickname).then(function(res){
            $location.url("/chatRoom/" + res.data.roomName + "/" + res.data.nickname);
        });
    };
}]);
