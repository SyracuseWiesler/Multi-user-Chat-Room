var express = require("express");
var path = require("path");
var bodyParser = require("body-parser");
var app = express();
var http = require("http").Server(app);

app.use(express.static(path.join(__dirname, "/view")));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var server = app.listen(8888, function(){
    console.log(myTime() + " Server has been launched");
});
var io = require("../../node_modules/socket.io")(server);
var rooms = {
/** should not create default room here, because no one physically connect, just leave schema here
    "Lounge1,timestamp": {  因为暂时没有好的办法在该channel的人都离开后彻底关闭，下次再有人连接这个room会重复绑定监听，所以给个timestamp
        guestDefaultId: 1,
        guestDefaultName: "Guest",
        guests: {
            "eric": {joinTime: new Date().getTime(), leaveTime: 0},  // leaveTime: 0 represents no leave, still there
        }
    },
    "Lounge2,timestamp": {
        guestDefaultId: 1,
        guestDefaultName: "Guest",
        guests: {
            "alex": {joinTime: new Date().getTime(), leaveTime: 0},  // leaveTime: 0 represents no leave, still there
        }
    }
*/
};
var guests = {
    /**this guests is an object for server uses to link socket Id with nickname and roomName*/
    /**
     "socketId": {
        nickname: "eric",
        roomName: "room,timestamp",
        socket: socket,  // store the socket of the specific client
    },
     */
};
// console.log(s.split(",").slice(0, s.split(",").length - 1).join(","));
// console.log(s.split(",").splice(s.split(",").length - 1, 1).join(","));
/**at the beginning to acquire available room list and the available users in the room to remind possible duplicate nicknames*/
app.get("/rooms", function(req, res){
    // var retRooms = {};
    // for (var key in rooms) {
    //     var keyPart = key.split(",").slice(0, key.split(",").length - 1).join(",");  // 返回一个不含timestamp和最后一个逗号的名字
    //     retRooms[keyPart] = {};
    //     retRooms[keyPart]["guestDefaultId"] = rooms[key]["guestDefaultId"];
    //     retRooms[keyPart]["guestDefaultName"] = rooms[key]["guestDefaultName"];
    //     retRooms[keyPart]["guests"] = {};
    //     for (var key1 in rooms[key]["guests"]) {
    //         retRooms[keyPart]["guests"][key1] = {};
    //     }
    // }
    console.log(myTime() + " retrieved rooms");
    res.json(rooms);
    // res.json(retRooms);
});
/**join an existing room*/
/**
 * /room/Lounge1/alex
 * or
 * /room/Lounge1/_    if you do not set up nickname and require a default generated one, just give an _ to hold the position
 * in the request, or else it will give an error
 * limit the user cannot use only _ for their nickname
 * */
app.get("/room/:roomName/:nickname", function(req, res){
    // res.json({roomName: req.params.roomName, nickname: req.params.nickname});
    var roomName = req.params.roomName;
    for(var key in rooms) {
        var keyPart = key.split(",").slice(0, key.split(",").length - 1).join(",");
        if (keyPart === roomName) {
            roomName = key;
            break;
        }
    }
    var room = rooms[roomName];
    var name = "";
    if (req.params.nickname === "_") {  // request a generated nickname
        name = room.guestDefaultName + room.guestDefaultId;
        room.guestDefaultId ++;
    } else {
        name = req.params.nickname;
    }
    room.guests[name] = {joinTime: new Date().getTime(), leaveTime: 0};
    // connection(io);  // existing connection does not need connection again
    res.json({state: 200, message: "successfully connected", roomName: roomName, nickname: name});
    // 为了方便client端监听，我们这里使用了真实的roomName也就是[roomName,timestamp]的形式
});
/**create then join a room*/
/** received object:
var obj = {
    roomName: "xxx",
    nickname: "xxx",
};
*/
app.post("/room", function(req, res){
    var nickname = "";
    var roomName = req.body.roomName + "," + new Date().getTime();
    if (req.body.nickname === "") {
        rooms[roomName] = {
            guestDefaultId: 2,
            guestDefaultName: "Guest",
            guests: {
                Guest1: {joinTime: new Date().getTime(), leaveTime: 0},
            }
        };
        nickname = "Guest1";
    } else {
        rooms[roomName] = {
            guestDefaultId: 1,
            guestDefaultName: "Guest",
        };
        rooms[roomName]["guests"] = {};
        rooms[roomName]["guests"][req.body.nickname] = {joinTime: new Date().getTime(), leaveTime: 0};
        nickname = req.body.nickname;
    }
    connection(io, roomName);
    res.send({state: 200, message: "successfully connected", roomName: roomName, nickname: nickname});
    // 同理，返回roomName,timestamp的真实名字
});
/**change user's nickname*/
/** received object:
 var obj = {
    roomName: "xxx",
    oldNickname: "xxx",
    newNickname: "xxx",
};
 */
app.put("/nickname", function(req, res){
    var roomName = req.body.roomName;
    /**change nickname in Object rooms*/
    // for(var key in rooms) {
    //     var keyPart = key.split(",").slice(0, key.split(",").length - 1).join(",");
    //     if (keyPart === roomName) {
    //         roomName = key;
    //         break;
    //     }
    // }
    var room = rooms[roomName];
    var nickname1 = req.body.newNickname;
    if (nickname1 !== "_") {
        room["guests"][req.body.newNickname] = room["guests"][req.body.oldNickname];
    } else {
        nickname1 = room.guestDefaultName + room.guestDefaultId ++;
        room["guests"][nickname1] = room["guests"][req.body.oldNickname];
    }
    room["guests"][req.body.oldNickname] = "";
    delete room["guests"][req.body.oldNickname];
    console.log(rooms);
    /**change nickname in Object guests*/
    // var socketId = req.body.socketId;
    var socketId = "";
    for (var id in guests) {
        if (guests[id]["nickname"] === req.body.oldNickname && guests[id]["roomName"] === roomName) {
            socketId = id;
            console.log(socketId);
        }
    }
    guests[socketId]["nickname"] = nickname1;
    var msg = {
        content: myTime() + " client " + req.body.oldNickname + " has successfully changed to " + nickname1,
        initial: false,
    };
    /**if you just want the man who change his name know the message that he changes name you can just send
     * guests[req.body.socketId]["socket"].emit(req.body.roomName, msg);
     * */
    /**I choose to notify every one in the room*/
    for (var sId in guests) {
        if (guests[sId]["roomName"] === req.body.roomName) {
            guests[sId]["socket"].emit(req.body.roomName, msg);
        }
    }
    res.json({state: 200, message: "nickname has been changed", nickname: nickname1, roomName: req.body.roomName});
});
app.get("/guests", function(req, res){
    var obj = {};
    for (var key in guests) {
        obj[key] = {};
        for (var key1 in guests[key]) {
            if (key1 !== "socket") {
                obj[key][key1] = guests[key][key1];
            } else {
                obj[key][key1] = guests[key][key1].id;
            }
        }
    }
    res.json(obj);
});
function myTime(){
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + " "
        + (d.getHours() < 10 ? "0" + d.getHours() : d.getHours()) + ":"
        + (d.getMinutes() < 10 ? "0" + d.getMinutes() : d.getMinutes()) +
        ":" + (d.getSeconds() < 10 ? "0" + d.getSeconds() : d.getSeconds());
}
function connection (io, channel) {
    io.on("connection", function(socket){
        socket.on(channel, function(msg){
            console.log(msg.roomName + "_" + msg.nickname + "_" + msg.content);
            if (msg.initial !== undefined) {  // At the beginning for a guest entering a chat room, set up socketID
                var nickname = msg.nickname;  // msg.roomName就是oldRoomName, channel 是 newRoomName
                var newNickname = msg.newNickname;
                if (newNickname === "_") {
                    /**needs to use the guestDefaultName + guestDefaultId*/
                    newNickname = rooms[channel].guestDefaultName + rooms[channel].guestDefaultId ++;
                    // rooms[channel]["guests"][newNickname] = {
                    //     joinTime: new Date().getTime(),
                    //     leaveTime: 0,
                    // };
                    // delete rooms[msg.roomName]["guests"][msg.nickname];  /**删除oldName在之前room的记录*/
                }
                console.log(channel);
                rooms[channel]["guests"][newNickname] = {
                    joinTime: new Date().getTime(),
                    leaveTime: 0,
                };
                if (msg.roomName !== channel && rooms[msg.roomName] !== undefined && rooms[msg.roomName]["guests"][msg.nickname] !== undefined) delete rooms[msg.roomName]["guests"][msg.nickname];  /**删除oldName在之前room的记录*/

                // if (nickname === "_") {
                //     /**needs to use the guestDefaultName + guestDefaultId*/
                //     nickname = rooms[msg.roomName].guestDefaultName + rooms[msg.roomName].guestDefaultId ++;
                //     rooms[msg.roomName]["guests"][nickname] = {
                //         joinTime: new Date().getTime(),
                //         leaveTime: 0,
                //     };
                // }
                for (var id in guests) {
                    if (guests[id].nickname === nickname && guests[id].roomName === msg.roomName) {
                        delete guests[id];
                        break;
                    }
                }
                guests[socket.id] = {  /**不能从一个新连接的客户端发来一个socket ID，客户端获取不到，必须在服务端获取*/
                    nickname: newNickname,  // nickname
                    roomName: channel,  // msg.roomName
                    socket: socket,
                };
            }
            io.emit(channel, msg);
        });
        socket.on("disconnect", function(){
            var socketId = socket.id;
            // 因为发现在断开连接时有打印两次信息的情况，有可能断开信息会传递好几次，所以先判断一下该guest还在不在rooms和guests里
            var nickname = guests[socketId] !== undefined ? guests[socketId].nickname : undefined;
            var roomName = guests[socketId] !== undefined ? guests[socketId].roomName : undefined;
            /**When one client disconnect from the room, send the message to other clients in this room*/
            var disconnectTime = myTime();
            for (var key in guests) {
                if (guests[key]["roomName"] === roomName) {
                    var sk = guests[key]["socket"];
                    var msg = {
                        content: disconnectTime + " " + nickname + " just left " + roomName.substring(0, roomName.lastIndexOf(",")),
                        initial: false,
                    };
                    sk.emit(roomName, msg);
                    // break;
                }
            }

            /**clear item in object guests*/
            if (guests[socket.id] !== undefined) {
                console.log("socket<" + socket.id + ">: " + guests[socket.id].nickname + " just left " + guests[socket.id].roomName);
                delete guests[socket.id];
            }
            /**clear item in object rooms*/
            if (nickname !== undefined) {
                delete rooms[roomName]["guests"][nickname];
                if (Object.keys(rooms[roomName]["guests"]).length === 0) {
                    delete rooms[roomName];
                    socket.disconnect(true);
                    socket.removeAllListeners(roomName);
                    console.log("No one in " + roomName + ", the chat room has been closed");
                } else {
                    console.log("The rest guests in " + roomName + ": ");
                    console.log(rooms[roomName]["guests"]);
                }
            }
        });
    });
}




