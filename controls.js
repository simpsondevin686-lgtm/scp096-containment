export const Controls = {
    isMobile: ('ontouchstart' in window) || (navigator.maxTouchPoints > 0),
    moveX: 0,
    moveY: 0,
    yaw: Math.PI,
    pitch: 0,
    flipOffset: 0,
    keys: {},
    joyId: null, joyOX: 0, joyOY: 0,
    lookId: null, lookLX: 0, lookLY: 0,
    onEyes: null,
    onThirdPerson: null,
    onBuy: null,
    onChat: null,
    onFire: null,

    init(canvas, playerObj) {
        this.player = playerObj;
        this.canvas = canvas;
        if (this.isMobile) this.setupMobile();
        else this.setupPC();
    },

    setupMobile() {
        const stickEl = document.getElementById('stick');
        const knobEl  = document.getElementById('knob');
        const JOY_RADIUS = 62;

        this.canvas.addEventListener('pointerdown', (e) => {
            if(e.clientX < innerWidth * 0.5 && e.clientY > innerHeight * 0.28){
                this.joyId = e.pointerId;
                this.joyOX = e.clientX; this.joyOY = e.clientY;
                stickEl.style.display = 'block';
                stickEl.style.left = this.joyOX + 'px';
                stickEl.style.top  = this.joyOY + 'px';
                knobEl.style.transform = 'translate(-50%,-50%)';
                this.moveX = 0; this.moveY = 0;
            } else {
                this.lookId = e.pointerId;
                this.lookLX = e.clientX; this.lookLY = e.clientY;
            }
            try { this.canvas.setPointerCapture(e.pointerId); } catch(_){}
        });

        window.addEventListener('pointermove', (e) => {
            if(e.pointerId === this.joyId){
                let dx = e.clientX - this.joyOX;
                let dy = e.clientY - this.joyOY;
                const len = Math.hypot(dx, dy);
                if(len > JOY_RADIUS){
                    dx = dx / len * JOY_RADIUS;
                    dy = dy / len * JOY_RADIUS;
                }
                knobEl.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                this.moveX = dx / JOY_RADIUS;
                this.moveY = -dy / JOY_RADIUS;
            } else if(e.pointerId === this.lookId){
                const dx = e.clientX - this.lookLX;
                const dy = e.clientY - this.lookLY;
                this.lookLX = e.clientX; this.lookLY = e.clientY;
                this.yaw -= dx * 0.0044;
                this.pitch -= dy * 0.0044;
                this.pitch = Math.max(-1.32, Math.min(1.32, this.pitch));
            }
        }, {passive:true});

        window.addEventListener('pointerup', (e) => {
            if(e.pointerId === this.joyId){ this.joyId = null; this.moveX = 0; this.moveY = 0; stickEl.style.display = 'none'; }
            if(e.pointerId === this.lookId){ this.lookId = null; }
        });

        window.addEventListener('pointercancel', (e) => {
            if(e.pointerId === this.joyId){ this.joyId = null; this.moveX = 0; this.moveY = 0; stickEl.style.display = 'none'; }
            if(e.pointerId === this.lookId){ this.lookId = null; }
        });
    },

    setupPC() {
        // Hide mobile controls
        const stick = document.getElementById('stick');
        if (stick) stick.style.display = 'none';
        
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space') {
                e.preventDefault();
                this.flipOffset = this.flipOffset === 0 ? Math.PI : 0;
                const lb = document.getElementById('lookback');
                if(lb) lb.classList.toggle('active', this.flipOffset !== 0);
            }
            if (e.code === 'KeyE' && this.onEyes) this.onEyes();
            if (e.code === 'KeyT' && this.onThirdPerson) this.onThirdPerson();
            if (e.code === 'KeyB' && this.onBuy) this.onBuy();
            if (e.code === 'KeyF' && this.onFire) this.onFire();
            if (e.code === 'KeyC' && this.onChat) this.onChat();
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        this.canvas.addEventListener('click', () => {
            if (document.pointerLockElement !== this.canvas) {
                this.canvas.requestPointerLock();
            }
        });

        document.addEventListener('mousemove', (e) => {
            if (document.pointerLockElement === this.canvas) {
                this.yaw -= e.movementX * 0.002;
                this.pitch -= e.movementY * 0.002;
                this.pitch = Math.max(-1.32, Math.min(1.32, this.pitch));
            }
        });
    },

    update() {
        if (!this.isMobile) {
            this.moveX = 0; this.moveY = 0;
            if (this.keys['KeyW'] || this.keys['ArrowUp'])    this.moveY += 1;
            if (this.keys['KeyS'] || this.keys['ArrowDown'])  this.moveY -= 1;
            if (this.keys['KeyA'] || this.keys['ArrowLeft'])  this.moveX -= 1;
            if (this.keys['KeyD'] || this.keys['ArrowRight']) this.moveX += 1;
        }
    }
};