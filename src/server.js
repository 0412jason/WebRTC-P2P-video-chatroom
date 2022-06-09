const fs = require('fs')
const express = require('express');
const path = require('path');

const app = express();

const options = {
    key: fs.readFileSync(path.join(__dirname, '../src/server.key')),
    cert: fs.readFileSync(path.join(__dirname, '../src/server.crt')),
}

const https = require('https').createServer(options, app);
const io = require('socket.io')(https);

let connectedUsers = [];
let dic = {};

io.on('connection', socket => {
    socket.currentID = socket.id;
    console.log('connect : ', socket.currentID);
    connectedUsers.push(socket.currentID);
    dic[socket.currentID] = socket.id;

    socket.on('disconnect', () => {
        console.log('disconnect : ', socket.currentID);
        connectedUsers = connectedUsers.filter(user => user !== socket.currentID)
        delete dic[socket.currentID];
        socket.broadcast.emit('update-user-list', { userIds: connectedUsers })
    })

    socket.on('mediaOffer', data => {
        socket.to(dic[data.to]).emit('mediaOffer', {
            from: data.from,
            offer: data.offer
        });
    });

    socket.on('mediaAnswer', data => {
        socket.to(dic[data.to]).emit('mediaAnswer', {
            from: data.from,
            answer: data.answer
        });
    });

    socket.on('iceCandidate', data => {
        socket.to(dic[data.to]).emit('remotePeerIceCandidate', {
            candidate: data.candidate
        })
    })

    socket.on('requestUserList', () => {
        socket.emit('update-user-list', { userIds: connectedUsers });
        socket.broadcast.emit('update-user-list', { userIds: connectedUsers });
    });
    socket.on('setID', data => {
        console.log('setID', data.currentID, data.newID);
        for (var i in connectedUsers) {
            if (connectedUsers[i] === data.currentID) {
                connectedUsers[i] = data.newID;
            }
        }
        socket.currentID = data.newID;
        dic[data.newID] = socket.id;
        delete dic[data.currentID];
        socket.emit('update-user-list', { userIds: connectedUsers });
        socket.broadcast.emit('update-user-list', { userIds: connectedUsers });
    });
});

https.listen(3000, () => {
    console.log('listening on *:3000');
});
