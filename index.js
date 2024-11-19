
let peer = null;
let conn = null;
const peerStatus = document.getElementById('status');
let otherId = undefined;

// For a peer ID workaround
let lastPeerId = null;

function getChannelId() {
  return `HD938541-${document.getElementById('connectionId').value}`;
}

const seenErrors = new Set();

function addConnHandlers() {
	conn.on('data', function(data) {
		addMessageToChat(data, 'Peer');
	});
	conn.on('close', function() {
		console.log('connection close');
	});
	conn.on('error', function(err) {
		console.log('connection error');
		console.log(err);
	});
}

function initialize(id) {
	peer = new Peer(id);
	peer.on('open', function(id) {
		console.log(`Peer open: ${id}`);
		if (id == getChannelId()) {
		  peerStatus.innerHTML = 'Server';
		} else {
		  peerStatus.innerHTML = 'Client';
		  otherId = getChannelId();
		  join();
		}
	});
	peer.on('connection', function(c) {
		console.log(`Peer connection. other: ${c.peer}`);
		otherId = c.peer;
		peerStatus.innerHTML += " connected";
		conn = c;
		addConnHandlers();
	});
	peer.on('disconnected', function() {
		console.log('Peer disconnected');
	});
	peer.on('close', function() {
		console.log('Peer close');
	});
	peer.on('error', function(err) {
		console.log(`Peer error: ${err.message}`);
		console.log(err);
		
		if (!seenErrors.has(err.message)) {
			seenErrors.add(err.message);
			if (err.message = `ID "${getChannelId}" is taken`) {
				initialize(null);
			}
		}
	});
	peer.on('call', function(mediaConnection) {
		console.log('Peer call');
		
		navigator.mediaDevices.getUserMedia({
			audio: {
				 deviceId: selectedInputDevice,
				  echoCancellation: false,
				  noiseSuppression: false,
				  autoGainControl: false,
    			  latencyHint: 'low'
			}
		})
		.then(stream => { 
		    console.log('Answering');
  		    mediaConnection.answer(stream);
			mediaConnection.on('stream', function(remoteStream) {
				console.log('Media connection stream');
  			    const sourceNode = audioCtx.createMediaStreamSource(
				  remoteStream);
			    sourceNode.connect(audioCtx.destination);
			});
		});
	});
}

initialize(getChannelId());

function join() {
	console.log('join');
	if (conn) { conn.close() };
	const channel = getChannelId();
	conn = peer.connect(channel);
	conn.on('open', function() {
		console.log('connection open');
	    peerStatus.innerHTML += " connected";	
	});
	addConnHandlers();
}


const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendMessageButton   
 = document.getElementById('sendMessageButton');
 
 
function addMessageToChat(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.textContent = `${sender}: ${message}`;   

  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
 
 sendMessageButton.addEventListener('click', () => {
  const message = messageInput.value;
  if (message) {
    conn.send(message);
    addMessageToChat(message, 'You');
    messageInput.value = '';
  }
});


const inputList = document.getElementById('input-list');
const outputList = document.getElementById('output-list');
const scanButton = document.getElementById('scan');

let selectedInputDevice = null;
let selectedOutputDevice = null;

let audioCtx = null;

// Function to enumerate audio devices
function enumerateDevices() {
	console.log('Scanning...');
	audioCtx = new AudioContext();
  navigator.mediaDevices.getUserMedia({
	  audio: {
		  echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latencyHint: 'low'
		  },
		  video: false })
    .then(() => {
      navigator.mediaDevices.enumerateDevices()
        .then(devices => {
		console.log('Enumerating...');
      const inputDevices = devices.filter(device => device.kind === 'audioinput');
      const outputDevices = devices.filter(device => device.kind === 'audiooutput');

      // Clear existing lists
      inputList.innerHTML = '';
      outputList.innerHTML = '';

      // Create input device radio buttons
      inputDevices.forEach(device => {
		  console.log(`input: ${device.name}`);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'inputDevice';
        radio.value = device.deviceId;
        radio.id = `inputDevice_${device.deviceId}`;

        const label = document.createElement('label');
        label.htmlFor = `inputDevice_${device.deviceId}`;
        label.textContent = device.label || device.deviceId;

        inputList.appendChild(radio);
        inputList.appendChild(label);
        inputList.appendChild(document.createElement('br'));

        // Set the first input device as selected by default
        if (!selectedInputDevice) {
          radio.checked = true;
          selectedInputDevice = device.deviceId;
        }
      });

      // Create output device radio buttons
      outputDevices.forEach(device => {
		  console.log(`output: ${device.name}`);
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'outputDevice';
        radio.value = device.deviceId;
        radio.id = `outputDevice_${device.deviceId}`;

        const label = document.createElement('label');
        label.htmlFor = `outputDevice_${device.deviceId}`;
        label.textContent = device.label || device.deviceId;

        outputList.appendChild(radio);
        outputList.appendChild(label);
        outputList.appendChild(document.createElement('br'));

        // Set the first output device as selected by default
        if (!selectedOutputDevice) {
          radio.checked = true;
          selectedOutputDevice = device.deviceId;
        }
      });
    })
        .catch(error => {
          console.error('Error enumerating devices:', error);
        });
    })
    .catch(error => {
      console.error('Error accessing microphone:', error);
    });
}

// Event listeners for scan buttons
scanButton.addEventListener('click', () => {
  enumerateDevices();
});

// Event listeners for radio button changes
inputList.addEventListener('change', (event) => {
  selectedInputDevice = event.target.value;
  // Update audio input here, using the selected device ID
});

outputList.addEventListener('change', (event) => {
  selectedOutputDevice = event.target.value;
  // Update audio output here, using the selected device ID
});

// Initial device scan
enumerateDevices();

const callButton = document.getElementById('call');

callButton.addEventListener('click', () => {
  navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: selectedInputDevice,
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      latencyHint: 'low'
    }
  })
  .then(stream => {
	const call = peer.call(otherId, stream);
	call.on('error', (err) => { 
	  console.log(`Call error: ${err.message}`);
	});
	call.on('stream', (incomingStream) => {
		console.log('Call stream');
      // Connect the remote stream to the destination node
      const sourceNode = audioCtx.createMediaStreamSource(incomingStream);
      sourceNode.connect(audioCtx.destination);
	});
  });
});

let animationId = null;

function displayFFT(deviceId, canvas) {
	cancelAnimationFrame(animationId);
  navigator.mediaDevices.getUserMedia({
    audio: {
      deviceId: deviceId
    }
  })
  .then(stream => {
    const audioContext = new AudioContext();
    const sourceNode = audioContext.createMediaStreamSource(stream);
    const analyserNode = audioContext.createAnalyser();   


    sourceNode.connect(analyserNode);

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const   
 draw = () => {
      animationId = requestAnimationFrame(draw);
      analyserNode.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;
      const context = canvas.getContext('2d');

      context.fillStyle = 'rgb(200, 200, 200)';
      context.fillRect(0, 0, width, height);

      context.lineWidth = 2;
      context.strokeStyle = 'rgb(0, 0, 255)';

      context.beginPath();
      context.moveTo(0, height / 2);
      for (let i = 0; i < bufferLength; i++) {
        const value = dataArray[i];
        const x = map(i, 0, bufferLength - 1, 0, width);
        const y = map(value, 0, 255, height, 0);
        context.lineTo(x, y);
      }
      context.stroke();
    };

    draw();
  })
  .catch(err => {
    console.error('Error accessing microphone:', err);
  });
}