// Creating the peer
const peer = new RTCPeerConnection({
    iceServers: [
        {
            urls: "stun:stun.stunprotocol.org"
        }
    ]
});

// Connecting to socket
const socket = io('https://localhost:3000');

const onSocketConnected = async () => {
    const constraints = {
        audio: true,
        video: true
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    document.querySelector('#localVideo').srcObject = stream;
    stream.getTracks().forEach(track => peer.addTrack(track, stream));
}

let callButton = document.querySelector('#call');

// Handle call button
callButton.addEventListener('click', async () => {
    const localPeerOffer = await peer.createOffer();
    await peer.setLocalDescription(new RTCSessionDescription(localPeerOffer));

    sendMediaOffer(localPeerOffer);
});

// Create media offer
socket.on('mediaOffer', async (data) => {
    await peer.setRemoteDescription(new RTCSessionDescription(data.offer));
    const peerAnswer = await peer.createAnswer();
    await peer.setLocalDescription(new RTCSessionDescription(peerAnswer));

    sendMediaAnswer(peerAnswer, data);
});

// Create media answer
socket.on('mediaAnswer', async (data) => {
    await peer.setRemoteDescription(new RTCSessionDescription(data.answer));
});

// ICE layer
peer.onicecandidate = (event) => {
    sendIceCandidate(event);
}

socket.on('remotePeerIceCandidate', async (data) => {
    try {
        const candidate = new RTCIceCandidate(data.candidate);
        await peer.addIceCandidate(candidate);
    } catch (error) {
        // Handle error, this will be rejected very often
        console.log(error);
    }
})

peer.addEventListener('track', (event) => {
    const [stream] = event.streams;
    document.querySelector('#remoteVideo').srcObject = stream;
})

let selectedUser;

const sendMediaAnswer = (peerAnswer, data) => {
    socket.emit('mediaAnswer', {
        answer: peerAnswer,
        from: socket.currentID,
        to: data.from
    })
    callID = document.querySelector('#callID');
    callID.textContent = 'Call : ' + data.from;
    console.log('Answer sent');

}

const sendMediaOffer = (localPeerOffer) => {
    socket.emit('mediaOffer', {
        offer: localPeerOffer,
        from: socket.currentID,
        to: selectedUser
    });
    callID = document.querySelector('#callID');
    callID.textContent = 'Call : ' + selectedUser;
    console.log('Offer sent');
};

const sendIceCandidate = (event) => {
    socket.emit('iceCandidate', {
        to: selectedUser,
        candidate: event.candidate,
    });
}

const onUpdateUserList = ({ userIds }) => {
    const usersList = document.querySelector('#usersList');
    const myID = document.querySelector('#myID');
    const usersToDisplay = userIds.filter(id => id !== socket.currentID);

    usersList.innerHTML = '';
    myID.textContent = 'Me : ' + socket.currentID;

    usersToDisplay.forEach(user => {
        const userItem = document.createElement('div');
        userItem.innerHTML = user;
        userItem.className = 'user-item';
        userItem.addEventListener('click', () => {
            const userElements = document.querySelectorAll('.user-item');
            userElements.forEach((element) => {
                element.classList.remove('user-item--touched');
            })
            userItem.classList.add('user-item--touched');
            selectedUser = user;
        });
        usersList.appendChild(userItem);
    });
};
socket.on('update-user-list', onUpdateUserList);

const handleSocketConnected = () => {
    socket.currentID = socket.id;
    onSocketConnected();
    socket.emit('requestUserList');
};

socket.on('connect', handleSocketConnected);

const setID = (currentID, newID) => {
    socket.emit('setID', { currentID, newID });
};

let setButton = document.querySelector('#setID');

// Handle set button
setButton.addEventListener('click', async () => {
    currentID = socket.currentID;
    newID = document.querySelector('#newID').value;
    console.log('setID : ', currentID, ' -> ', newID);
    socket.currentID = newID;
    const myID = document.querySelector('#myID');
    myID.textContent = 'Me : ' + socket.currentID;
    setID(currentID, newID);
});