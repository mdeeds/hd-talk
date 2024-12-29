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

// IO for all communications with remote peer.
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
  return new Promise(async (resolve, reject) => {
    try {
      // Disconnect the master output from the current destination
      localOutputNode.disconnect();
      // Get the MediaStreamTrack for the new output device
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: deviceId },
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
      reject(error);
    }
    selectedOutputDevice = deviceId;
    resolve();
  });
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
      // TODO: this needs to change to structured data. 
      // E.g. { type: 'message' text: message }
      peerConnection.sendMessage(message);
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

	outputList.addEventListener('change', async (event) => {
    await changeAudioOutput(event.target.value);
	});

	callButton.addEventListener('click', async () => {
		const outgoingStreamDestination = audioCtx.createMediaStreamDestination();
		inputSourceNode.connect(outgoingStreamDestination);
		const analyser = audioCtx.createAnalyser();
		inputSourceNode.connect(analyser);
		const canvas = document.getElementById('dupeSignal');
		const vu = new AudioVisualizer(canvas, analyser);
		vu.start();
    
    peerSourceNode = await peerConnection.call(audioCtx, outgoingStreamDestination);
    peerSourceNode = audioCtx.createMediaStreamSource(incomingStream);
    peerSourceNode.connect(peerAnalyser);
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
async function enumerateDevices() {
	console.log('Scanning...');
	audioCtx = new AudioContext();
  localOutputNode = audioCtx.createGain();
  localOutputNode.connect(audioCtx.destination);
  await navigator.mediaDevices.getUserMedia({
	  audio: {
		  echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          latencyHint: 'low'
		  },
		  video: false });
      
  const devices = await navigator.mediaDevices.enumerateDevices()
  console.log('Enumerating...');
  const inputDevices = devices.filter(device => device.kind === 'audioinput');
  const outputDevices = devices.filter(device => device.kind === 'audiooutput');

  // Clear existing lists
  inputList.innerHTML = '';
  outputList.innerHTML = '';

  // Create input device radio buttons
  for (const device of inputDevices) {
    console.log(`input: ${device.label}`);
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
  }

  // Create output device radio buttons
  for (const device of outputDevices) {
    console.log(`output: ${device.label}`);
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
      await changeAudioOutput(device.deviceId);
    }
  }
}

