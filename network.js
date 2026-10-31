export const Network = {
    myId: Math.random().toString(36).substr(2, 6),
    roomNum: 1,
    isHost: false,
    aiAuthority: false,
    peer: null,
    conns: [],
    hostConn: null,
    remotePlayers: {},
    scpTargetId: null,
    scpCooldown: 0,
    _lastSeenCoins: {},
    _lastSeenTime: {},
    _lastSeenHasStun: {},
    _lastSeenCooldown: {},
    _hostLastCoins: 0,
    _hostLastCheck: Date.now(),
    _lastPings: {},
    authTimeout: null,

    connect() {
        if (this.peer) this.peer.destroy();
        this.peer = new Peer('scp096-room-' + this.roomNum);
        this.peer.on('open', () => {
            this.isHost = true;
            this.aiAuthority = true;
            if (window.onNetworkReady) window.onNetworkReady(true);
        });
        this.peer.on('error', (err) => {
            if (err.type === 'unavailable-id') {
                this.peer.destroy();
                this.peer = new Peer(this.myId);
                this.peer.on('open', () => {
                    this.hostConn = this.peer.connect('scp096-room-' + this.roomNum, { reliable: true });
                    this.hostConn.on('open', () => {
                        this.isHost = false;
                        this.aiAuthority = false;
                        if (window.onNetworkReady) window.onNetworkReady(false);
                    });
                    this.hostConn.on('data', (data) => window.handleData(data, this.hostConn));
                    this.hostConn.on('close', () => this.startHostElection());
                    this.hostConn.on('error', () => this.startHostElection());
                });
            } else {
                this.roomNum++;
                this.connect();
            }
        });
        this.peer.on('connection', (conn) => {
            if (!this.isHost || this.conns.length >= 5) { conn.close(); return; }
            this.conns.push(conn);
            conn.latency = 9999;
            conn.on('data', (data) => window.handleData(data, conn));
            conn.on('close', () => {
                this.conns = this.conns.filter(c => c !== conn);
                if (this.remotePlayers[conn.peer]) {
                    window.window.scene.remove(this.remotePlayers[conn.peer].mesh);
                    if (this.remotePlayers[conn.peer].headMesh) window.window.scene.remove(this.remotePlayers[conn.peer].headMesh);
                    if (this.remotePlayers[conn.peer].bloodPool) window.window.scene.remove(this.remotePlayers[conn.peer].bloodPool);
                    delete this.remotePlayers[conn.peer];
                }
            });
            const pingInterval = setInterval(() => {
                if (conn.open) conn.send({ type: 'ping', t: Date.now() });
                else clearInterval(pingInterval);
            }, 2000);
        });
    },

    startHostElection() {
        if (this.isHost) return;
        console.warn('[net] Host disconnected - Electing new host...');
        this.aiAuthority = false;
        this.isHost = false;
        for (let id in this.remotePlayers) {
            window.window.scene.remove(this.remotePlayers[id].mesh);
            if (this.remotePlayers[id].headMesh) window.window.scene.remove(this.remotePlayers[id].headMesh);
            if (this.remotePlayers[id].bloodPool) window.window.scene.remove(this.remotePlayers[id].bloodPool);
        }
        this.remotePlayers = {};
        const myPing = this._lastPings && this._lastPings[this.myId] ? this._lastPings[this.myId] : 500;
        const waitTime = Math.min(3000, myPing * 2 + Math.random() * 250);
        setTimeout(() => { this.connect(); }, waitTime);
    },

    handleAuthLost() {
        if (!this.isHost || !this.aiAuthority) return;
        this.authTimeout = setTimeout(() => {
            if (this.conns.length > 0) {
                const bestConn = this.conns.reduce((prev, curr) => (prev.latency < curr.latency) ? prev : curr);
                const snapshot = {
                    pos: { x: window.scp.pos.x, z: window.scp.pos.z }, yaw: window.scp.yaw,
                    punchCooldown: window.window.scp._punchCooldown || 0, phase: window.Brain.phase,
                    phaseTimer: window.Brain.phaseTimer, windupDuration: window.Brain.windupDuration,
                    mem: window.Brain.mem, targetId: this.scpTargetId, walkTarget: window.Brain.walkTarget
                };
                bestConn.send({ type: 'transferAuth', snapshot });
                this.aiAuthority = false;
            }
        }, 300);
    },

    handleAuthRegained() {
        clearTimeout(this.authTimeout);
        if (!this.isHost || this.aiAuthority) return;
        this.broadcast({ type: 'reclaimAuth' });
        this.aiAuthority = true;
    },

    broadcast(data) {
        if (this.isHost) this.conns.forEach(c => c.send(data));
        else if (this.hostConn) this.hostConn.send(data);
    }
};

document.addEventListener('visibilitychange', () => {
    if (document.hidden) Network.handleAuthLost();
    else Network.handleAuthRegained();
});
window.addEventListener('blur', () => Network.handleAuthLost());
window.addEventListener('focus', () => Network.handleAuthRegained());
