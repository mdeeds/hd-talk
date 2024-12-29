
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
let localPeaks = null;
let dataLayer = null;

let peerConnection = null;

// Unique identifiers for the input and output devices
let selectedInputDevice = null;
let selectedOutputDevice = null;

let audioCtx = null;
// Audio nodes establishing the audio graph.

// TODO: We need to figure out how to set up appropriate monitoring of the input.
// inputSourceNode -> inputAnalyser
// inputSourceNode -> tapeDeckInput
// tapeDeckOutput -> localOutputNode
// peerSourceNode -> peerAnalyser
// peerSourceNode -> localOutputNode
// localOutputNode -> audioCtx.destination
// localOutputNode -> peerBroadcastNode
// inputSourceNode -> peerBroadcastNode
let inputAnalyser = null;
let inputSourceNode = null;
let peerAnalyser = null;
let peerSourceNode = null;
let localOutputNode = null;

function getChannelId() {
  return `HD938541-${document.getElementById('connectionId').value}`;
}

async function changeAudioOutput(deviceId) {
  if (!audioCtx || !localOutputNode) {
    console.error("AudioContext or localOutputNode not initialized.");
    return;
  }

  try {
    // Disconnect the master output from the current destination
    localOutputNode.disconnect();

    // Get the MediaStreamTrack for the new output device
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    });

    // Create a new MediaStreamDestinationNode for the selected device
    const destination = audioCtx.createMediaStreamDestination();

    // We need to cancel all of the *input* tracks.
    for (const track of stream.getAudioTracks()) {
      destination.stream.addTrack(track);
      // Stop the temporary stream (important to release the device)
      track.stop();
    }
    // Connect the master output to the new destination
    localOutputNode.connect(destination);
    stream.getTracks().forEach(t => t.stop());

    console.log(`Output device changed to: ${deviceId}`);
  } catch (error) {
    console.error("Error changing audio output:", error);
    // Optionally revert to the default destination or handle the error
    localOutputNode.connect(audioCtx.destination);
  }
  selectedOutputDevice = deviceId;
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
	
  peerConnection = new PeerConnection(getChannelId());
	
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
    changeAudioOutput(event.target.value);
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
  localOutputNode = audioCtx.createGain();
  localOutputNode.connect(audioCtx.destination);
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
          // Set the output device asynchronously.
          (async ()=>{ changeAudioOutput(device.deviceId); })();
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

