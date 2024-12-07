
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
let localPeaks = null;
let dataLayer = null;

function getChannelId() {
  return `HD938541-${document.getElementById('connectionId').value}`;
}

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

  
  dataLayer = new DataLayer(getChannelId());
  
	const workArea = document.getElementById('workArea');
	const magicCanvas = new MagicCanvas(workArea, dataLayer);

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
		
	localPeaks = new SamplesAndPeaks();

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
	
	await audioCtx.audioWorklet.addModule('worklet-recorder.js');
	const worklet = new AudioWorkletNode(audioCtx, 'worklet-recorder');
	inputSourceNode.connect(worklet);
	worklet.port.onmessage = (event) => { 
		localPeaks.appendArray(event.data.samples);
	};
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

