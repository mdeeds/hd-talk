class PeerConnection {
  constructor(channelId) {
    this.channelId = channelId;
    this.peerId = peerId;
    this.peer = null;
    this.conn = null;
    this.otherId = undefined;
    this.onDataReceived = null;
    this.onConnectionError = null;
    this.onConnectionClose = null;

    this._initialize();
  }

  _join() {
    console.log('join');
    if (conn) { conn.close() };
    const channel = this.channelId;
    conn = peer.connect(channel);
    conn.on('open', function() {
      console.log('connection open');
        peerStatus.innerHTML += " connected";	
    });
    addConnHandlers();
  }

  _initialize() {
    this.peer = new Peer(id);
    this.peer.on('open', function(id) {
      console.log(`Peer open: ${id}`);
      if (id === this.channelId) {
        peerStatus.innerHTML = 'Server';
      } else {
        peerStatus.innerHTML = 'Client';
        otherId = this.channelId;
        this._join();
      }
    });
    this.peer.on('connection', function(c) {
      console.log(`Peer connection. other: ${c.peer}`);
      otherId = c.peer;
      peerStatus.innerHTML += " connected";
      conn = c;
      addConnHandlers();
    });
    this.peer.on('disconnected', function() {
      console.log('Peer disconnected');
    });
    this.peer.on('close', function() {
      console.log('Peer close');
    });
    this.peer.on('error', function(err) {
      console.log(`Peer error: ${err.message}`);
      console.log(err);
      
      if (!seenErrors.has(err.message)) {
        seenErrors.add(err.message);
        if (err.message = `ID "${getChannelId}" is taken`) {
          initialize(null);
        }
      }
    });
    this.peer.on('call', function(call) {
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

  connect(otherPeerId) {
    console.log('join');
    if (this.conn) {
      this.conn.close();
    }
    this.conn = this.peer.connect(otherPeerId);
    this.addConnHandlers();
  }

  call(otherPeerId, outgoingStream) {
    const call = this.peer.call(otherPeerId, outgoingStream);
    call.on('error', (err) => {
      console.log(`Call error: ${err.message}`);
    });
    return call;
  }

  addConnHandlers() {
    this.conn.on('data', function(data) {
      if (data.command === 'chat') {
        // TODO raise a 'chat' event.
      } else if (data.command === 'set') {
        // TODO: raise a 'set' event
      }
    });
    this.conn.on('close', function() {
      console.log('connection close');
    });
    this.conn.on('error', function(err) {
      console.log('connection error');
      console.log(err);
    });
  }
}