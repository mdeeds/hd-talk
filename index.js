
let peer = null;
let conn = null;
let peerStatus;
let otherId = undefined;
let callButton;
let seenErrors;
let messagesDiv;
let messageInput;
let sendMessageButton;
let inputList;
let outputList;
let scanButton;
let selectedInputDevice = null;
let selectedOutputDevice = null;
let audioCtx = null;
let inputAnalyser = null;
let inputSourceNode = null;
let peerAnalyser = null;
let peerSourceNode = null;

function init() {
	peerStatus = document.getElementById('status');
	callButton = document.getElementById('call');
	seenErrors = new Set();
	messagesDiv = document.getElementById('messages');
	messageInput = document.getElementById('messageInput');
	sendMessageButton = document.getElementById('sendMessageButton');
	inputList = document.getElementById('input-list');
	outputList = document.getElementById('output-list');
	scanButton = document.getElementById('scan');
	initialize(getChannelId());
	
	 sendMessageButton.addEventListener('click', () => {
	  const message = messageInput.value;
	  if (message) {
		conn.send(message);
		addMessageToChat(message, 'You');
		messageInput.value = '';
	  }
	});
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

	callButton.addEventListener('click', () => {
		const outgoingStream = audioCtx.createMediaStreamDestination();
		inputSourceNode.connect(outgoingStream);
		const analyser = audioCtx.createAnalyser();
		inputSourceNode.connect(analyser);
		const canvas = document.getElementById('dupeSignal');
		const vu = new AudioVisualizer(canvas, analyser);
		vu.start();
		
		const call = peer.call(otherId, outgoingStream.stream);
		call.on('error', (err) => { 
		  console.log(`Call error: ${err.message}`);
		});
		call.on('stream', (incomingStream) => {
			// Ungodly hack to actually get the audio to flow
			const a = new Audio();
			a.muted = true;
			a.srcObject = incomingStream;
			a.addEventListener('canplaythrough', () => { console.log('ready to flow'); });
			// End ungodly hack.
			console.log('Call stream');
		  if (!!peerSourceNode) {
			  peerSourceNode.disconnect();
		  }
		  peerSourceNode = audioCtx.createMediaStreamSource(incomingStream);
		  peerSourceNode.connect(peerAnalyser);
		});
	});

	const workArea = document.getElementById('workArea');
	const magicCanvas = new MagicCanvas(workArea);

	const editButton = document.getElementById('editLyrics');
	editButton.addEventListener('click', () => {
		  const popup = window.open('popup.html', 'Popup', 'width=400,height=200');
	});
	window.addEventListener('message', (event) => {
		const data = event.data;
			switch (data.command) {
				case 'updateLyrics':
  				console.log('New Lyrics:\n' + data.text);
				magicCanvas.replaceText(data.text);
				break;
			}
		});
	
}

function getChannelId() {
  return `HD938541-${document.getElementById('connectionId').value}`;
}


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
	peer.on('call', function(call) {
		console.log('Peer call (call recieved)');
		const outgoingStream = audioCtx.createMediaStreamDestination();
		inputSourceNode.connect(outgoingStream);
		const analyser = audioCtx.createAnalyser();
		inputSourceNode.connect(analyser);
		const canvas = document.getElementById('dupeSignal');
		const vu = new AudioVisualizer(canvas, analyser);
		vu.start();
		call.answer(outgoingStream.stream);
		call.on('stream', function(incomingStream) {
			// Ungodly hack to actually get the audio to flow
			const a = new Audio();
			a.muted = true;
			a.srcObject = incomingStream;
			a.addEventListener('canplaythrough', () => { console.log('ready to flow'); });
			// End ungodly hack.
			console.log('Stream Recieved');
			if (!!peerSourceNode) {
				peerSourceNode.disconnect();
			}
			incomingStream.addEventListener('active', () => { console.log('incomingStream active'); });
			incomingStream.addEventListener('addtrack', () => { console.log('incomingStream addtrack'); });
			incomingStream.addEventListener('inactive', () => { console.log('incomingStream inactive'); });
			incomingStream.addEventListener('removetrack', () => { console.log('incomingStream removetrack'); });
			peerSourceNode = audioCtx.createMediaStreamSource(incomingStream);
			peerSourceNode.connect(peerAnalyser);
		});
		
	});
}

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
 
function addMessageToChat(message, sender) {
  const messageElement = document.createElement('div');
  messageElement.textContent = `${sender}: ${message}`;   

  messagesDiv.appendChild(messageElement);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}
 

async function setInput(id) {
  selectedInputDevice = id;
      const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: id,
		  echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latencyHint: 'low'
      }
    });

	if (!inputAnalyser) {
		inputAnalyser = audioCtx.createAnalyser();
		const vuCanvas = document.getElementById('inputSignal');
		const vu = new AudioVisualizer(vuCanvas, inputAnalyser);
		vu.start();
	}
	if (!peerAnalyser) {
		peerAnalyser = audioCtx.createAnalyser();
		const vuCanvas = document.getElementById('peerSignal');
		const vu = new AudioVisualizer(vuCanvas, peerAnalyser);
		vu.start();
	}
	if (!!inputSourceNode) {
		inputSourceNode.disconnect();
	}
    inputSourceNode = audioCtx.createMediaStreamSource(stream);
    inputSourceNode.connect(inputAnalyser);
}

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
		  setInput(device.deviceId);
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

