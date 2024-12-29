class PeerConnection extends EventTarget {
  constructor(channelId) {
    this.channelId = channelId;
    this.peerId = null; // Initialize peerId as null
    this.peer = null;
    this.conn = null;
    this.otherId = undefined;
    this.onDataReceived = null;
    this.onConnectionError = null;
    this.onConnectionClose = null;

    this._initialize();
  }

  connect(otherPeerId) {
    console.log('Connecting to peer...');
    if (this.conn) {
      this.conn.close();
    }
    this.conn = this.peer.connect(otherPeerId);
    this._addConnHandlers();
  }

  call(otherPeerId, outgoingStream) {
    const call = this.peer.call(otherPeerId, outgoingStream);
    call.on('error', (err) => console.log(`Call error: ${err.message}`));
    return call;
  }

  _addConnHandlers() {
    this.conn.on('data', (data) => {
      if (data.command === 'chat') {
        // Handle chat data
      } else if (data.command === 'set') {
        // Handle set data
      }
    });

    this.conn.on('close', () => console.log('Connection closed'));
    this.conn.on('error', (err) => console.log('Connection error: ', err));
  }
  
  
  _initialize() {
    // Ensure that peerId is set properly
    this.peer = new Peer(this.channelId);
    this.peer.on('open', this._onPeerOpen.bind(this));
    this.peer.on('connection', this._onPeerConnection.bind(this));
    this.peer.on('disconnected', this._onPeerDisconnected.bind(this));
    this.peer.on('close', this._onPeerClose.bind(this));
    this.peer.on('error', this._onPeerError.bind(this));
    this.peer.on('call', this._onPeerCall.bind(this));
  }

  _onPeerOpen(id) {
    console.log(`Peer open: ${id}`);
    this.peerId = id; // Set peerId when the peer is opened
    if (this.channelId === this.peerId) {
      peerStatus.innerHTML = 'Server';
    } else {
      peerStatus.innerHTML = 'Client';
      this.otherId = this.channelId;
      this._join();
    }
  }

  _onPeerConnection(c) {
    console.log(`Peer connection. Other: ${c.peer}`);
    this.otherId = c.peer;
    peerStatus.innerHTML += " connected";
    this.conn = c;
    this._addConnHandlers();
  }

  _onPeerDisconnected() {
    console.log('Peer disconnected');
  }

  _onPeerClose() {
    console.log('Peer close');
  }

  _onPeerError(err) {
    console.log(`Peer error: ${err.message}`);
    if (err.message === `ID "${this.channelId}" is taken`) {
      // Handle error logic (e.g., re-initialize or retry connection)
      initialize(null);
    }
  }

  _onPeerCall(call) {
    console.log('Peer call (call received)');
    const outgoingStream = audioCtx.createMediaStreamDestination();
    inputSourceNode.connect(outgoingStream);
    const analyser = audioCtx.createAnalyser();
    inputSourceNode.connect(analyser);
    const canvas = document.getElementById('dupeSignal');
    const vu = new AudioVisualizer(canvas, analyser);
    vu.start();

    call.answer(outgoingStream.stream);
    call.on('stream', (incomingStream) => this._handleIncomingStream(incomingStream));
  }

  _handleIncomingStream(incomingStream) {
    console.log('Stream Received');
    if (peerSourceNode) {
      peerSourceNode.disconnect();
    }

    // Listen for stream events for better management
    incomingStream.addEventListener('active', () => console.log('incomingStream active'));
    incomingStream.addEventListener('addtrack', () => console.log('incomingStream addtrack'));
    incomingStream.addEventListener('inactive', () => console.log('incomingStream inactive'));
    incomingStream.addEventListener('removetrack', () => console.log('incomingStream removetrack'));

    // Properly handle stream and create media source node
    peerSourceNode = audioCtx.createMediaStreamSource(incomingStream);
    this.dispatchEvent(new CustomEvent('peerStreamEstablished',
    {
      detail: {
      peerSourceNode: peerSourceNode
      }
    }));
  }

  _join() {
    console.log('join');
    if (this.conn) {
      this.conn.close();
    }
    this.conn = this.peer.connect(this.channelId);
    this._addConnHandlers();
  }

}
