angular.module("myApp", ["ngRoute", "ngAnimate"]).config(function($routeProvider){
    $routeProvider.when("/", {
        templateUrl: "welcome.html",
        controller: "ctrlWel",
    }).when("/chatRoom/:roomName/:nickname", {
        templateUrl: "chatRoom.html",
        controller: "ctrlRoom"
    }).otherwise({
        redirectTo: "/"
    })
}).directive("pageHeightWatch", function(){
    return {
        restrict: "A",
        scope: false,
        link: function(scope, element, attrs){
            var eHeight = element.height();
            var documentHeight = angular.element(document).find("html")[0].clientHeight;
            if (eHeight < documentHeight) {
                element.css("height", documentHeight + "px");
            }
            element.find(".send").on("click", function(){
                element.find("textarea").focus();
            });
        }
    }
}).directive("contentPlayer", function(){
    return {
        restrict: "A",
        scope: false,
        link: function(scope, element, attrs){
            scope.$watch("content", function(newVal){
                if (newVal !== "") {
                    var p = angular.element("<p></p>");
                    p.html(newVal);
                    element.append(p);
                }
            }, false);
        },
    };
}).directive("carouselPlay", function(){
    return {
        restrict: "A",
        scope: false,
        link: function(scope, element, attrs){
            element.carousel({
                interval: 3000,
                pause: false,
            })
        }
    }
}).directive("clientConnect", ["myFactory", function(myFactory){
    /**
     * Most important directive, used for initializing connection and send welcome word to every one for a new guest
     * This one performs as a complement to HTTP request, to set up the {socketId: {nickname: "eric", roomName: "room"}}
     * */
    return {
        restrict: "A",
        scope: false,
        link: function(scope, element, attrs){
            function emit(socket, message){
                if (message !== ""){
                    var msg = {
                        socketId: socket.id,  /**the socket right now is connected after chatRoom.html DOM is ready */
                        roomName: scope.roomName,
                        nickname: scope.nickname,
                        newNickname: scope.nickname,
                        content: message,
                        time: myFactory.myTime(),
                        initial: true,
                    };
                    socket.emit(scope.roomName, msg);
                }
            }
            angular.element(document).ready(function(){
                emit(scope.socket, myFactory.myTime() + " " +scope.nickname + " joined Chat Room");
                console.log(scope.socket);
            });
            // angular.element(window).load(function(){
            //     emit(scope.socket, myFactory.myTime() + " " +scope.nickname + " joined the room");
            // });
            // angular.element.off("load");

        }
    };
}]);