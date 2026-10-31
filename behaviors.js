// ─────────────────────────────────────────────────────────────
//  SCP-096 PHASE MACHINE (v2)
//  dormant → (1 frame of gaze) → windup (~30s) → scream (1.5s) → chase
//  Closing eyes NO LONGER pauses anything. If it catches you, you die.
// ─────────────────────────────────────────────────────────────
export const Brain = {
  phase: 'dormant',
  phaseTimer: 0,
  windupDuration: 30,
  standupDuration: 1.8,
  walkDuration: 25,
  walkTarget: { x: 0, z: 0 },
  punchTimer: 0,
  punchSide: 1,
  isTriggered: false,
  stunDuration: 15,
  getupDuration: 2.5,
  emo: { grief:0.65, fear:0, rage:0, attention:0, rageLock:0 },
  mem: { lastNoise:0, noisePos:{x:0,z:0}, cryPhase:0, dormantTime:0, nextWalkIn: 20 + Math.random()*15 },

  trigger(){
    if (this.phase !== 'dormant' && this.phase !== 'standup' && this.phase !== 'walking') return false;
    this.phase = 'standup';
    this.standupDuration = 4.0;
    this.phaseTimer = this.standupDuration;
    this.isTriggered = true;
    this.emo.rageLock = 1;
    this.emo.rage = 1;
    this.emo.fear = 1;
    this.emo.grief = 1;
    return true;
  },

  stun(){
    if (this.phase !== 'windup' && this.phase !== 'scream' && this.phase !== 'chase') return false;
    this.phase = 'stunned';
    this.stunDuration = 15;
    this.phaseTimer = 15;
    this.isTriggered = false;
    this.emo.rage = 0;
    this.emo.rageLock = 0;
    return true;
  },

  tick(dt){
    if (this.punchTimer > 0) this.punchTimer -= dt;
    if (this.phase === 'dormant'){
      this.mem.dormantTime += dt;
      if (this.mem.dormantTime >= this.mem.nextWalkIn){
        this.phase = 'standup';
        this.phaseTimer = this.standupDuration;
        this.walkTarget.x = (Math.random()-0.5)*13;
        this.walkTarget.z = (Math.random()-0.5)*13;
        return 'standupWarning';
      }
    } else if (this.phase === 'standup'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        if (this.isTriggered) {
          this.phase = 'windup';
          this.windupDuration = 15;
          this.phaseTimer = this.windupDuration;
          this.isTriggered = false;
          return 'windupStart';
        } else {
          this.phase = 'walking';
          this.phaseTimer = this.walkDuration + Math.random()*10;
          return 'walkingStart';
        }
      }
    } else if (this.phase === 'walking'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        this.phase = 'dormant';
        this.phaseTimer = 0;
        this.mem.dormantTime = 0;
        this.mem.nextWalkIn = 20 + Math.random()*15;
        return 'returnToDormant';
      }
    } else if (this.phase === 'windup'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        this.phase = 'scream';
        this.phaseTimer = 1.5;
        return 'megaScream';
      }
    } else if (this.phase === 'scream'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        this.phase = 'chase';
        return 'chaseStart';
      }
    } else if (this.phase === 'returning'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        this.phase = 'dormant';
        this.phaseTimer = 0;
        this.mem.dormantTime = 0;
        this.mem.nextWalkIn = 20 + Math.random()*15;
        return 'returnToDormant';
      }
    } else if (this.phase === 'stunned'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        this.phase = 'gettingUp';
        this.getupDuration = 2.5;
        this.phaseTimer = 2.5;
        return 'gettingUpStart';
      }
    } else if (this.phase === 'gettingUp'){
      this.phaseTimer -= dt;
      if (this.phaseTimer <= 0){
        this.phase = 'dormant';
        this.phaseTimer = 0;
        this.mem.dormantTime = 0;
        this.mem.nextWalkIn = 20 + Math.random()*15;
        return 'stunRecovered';
      }
    }
    return null;
  },

  sense(state, player, looking, eyesClosed, dt){
    const dx = player.pos.x - state.pos.x;
    const dz = player.pos.z - state.pos.z;
    const dist = Math.hypot(dx, dz);
    const speed = state._lastSpeed || 0;
    if (speed > 0.05 && dist < 14){
      this.mem.lastNoise = 0;
      this.mem.noisePos.x = player.pos.x;
      this.mem.noisePos.z = player.pos.z;
    } else this.mem.lastNoise += dt;
    return { dx, dz, dist, looking, eyesClosed };
  },

  label(){
    if (this.phase === 'dormant') return 'dormant';
    if (this.phase === 'standup') return 'STANDING UP';
    if (this.phase === 'walking') return 'WANDERING';
    if (this.phase === 'windup'){
      const pct = Math.round(100 * (1 - this.phaseTimer / this.windupDuration));
      return `PANICKING ${pct}%`;
    }
    if (this.phase === 'scream') return 'screaming';
    if (this.phase === 'retreat') return 'RETREATING';
    if (this.phase === 'returning') return 'RETURNING';
    if (this.phase === 'stunned') return 'STUNNED';
    if (this.phase === 'gettingUp') return 'RECOVERING';
    return 'rage';
  },

  pose(REST, t){
    const tgt = Object.assign({}, REST);
    this.mem.cryPhase += 0.05;

    // ─── DORMANT: curled, hands over face, sobbing ───
    if (this.phase === 'dormant'){
      const sob = Math.sin(this.mem.cryPhase * 3) * 0.5
                + Math.sin(this.mem.cryPhase * 1.1) * 0.5;
      tgt.pelvisY = 0.68;
      tgt.spineX  = 0.55;
      tgt.neckX   = 0.40;
      tgt.headX   = 0.15 + sob * 0.05;
      tgt.shLX = -0.70; tgt.shLZ =  0.50; tgt.elLX = -2.55;
      tgt.shRX = -0.70; tgt.shRZ = -0.50; tgt.elRX = -2.55;
      tgt.hiLX = -1.75; tgt.knLX = 2.30;
      tgt.hiRX = -1.75; tgt.knRX = 2.30;
      tgt.jaw  = 0.10 + Math.max(0, sob) * 0.15;
      return tgt;
    }

    if (this.phase === 'standup'){
      const p = 1 - Math.max(0, this.phaseTimer) / this.standupDuration;
      if (this.isTriggered) {
        const shiver = Math.sin(t * 40) * 0.1 * p;
        tgt.pelvisY = 0.68 + 0.62 * p + shiver;
        tgt.spineX  = 0.55 * (1 - p) - 0.15 * p;
        tgt.neckX   = 0.40 * (1 - p);
        tgt.headX   = 0.15 * (1 - p);
        tgt.headY   = Math.sin(t*50)*0.3*p;
        tgt.shLX = -0.70 * (1 - p) + shiver;
        tgt.shLZ =  0.50 * (1 - p);
        tgt.elLX = -2.55 * (1 - p);
        tgt.shRX = -0.70 * (1 - p) - shiver;
        tgt.shRZ = -0.50 * (1 - p);
        tgt.elRX = -2.55 * (1 - p);
        tgt.hiLX = -1.75 * (1 - p);
        tgt.knLX =  2.30 * (1 - p);
        tgt.hiRX = -1.75 * (1 - p);
        tgt.knRX =  2.30 * (1 - p);
        tgt.jaw  =  0.10 * (1 - p) + 0.8 * p;
        return tgt;
      }
      tgt.pelvisY = 0.68 + 0.62 * p;
      tgt.spineX  = 0.55 * (1 - p);
      tgt.neckX   = 0.40 * (1 - p);
      tgt.headX   = 0.15 * (1 - p);
      tgt.shLX = -0.70 * (1 - p);
      tgt.shLZ =  0.50 * (1 - p);
      tgt.elLX = -2.55 * (1 - p);
      tgt.shRX = -0.70 * (1 - p);
      tgt.shRZ = -0.50 * (1 - p);
      tgt.elRX = -2.55 * (1 - p);
      tgt.hiLX = -1.75 * (1 - p);
      tgt.knLX =  2.30 * (1 - p);
      tgt.hiRX = -1.75 * (1 - p);
      tgt.knRX =  2.30 * (1 - p);
      tgt.jaw  =  0.10 * (1 - p);
      return tgt;
    }

    if (this.phase === 'walking'){
      const tWalk = t * 3.0;
      tgt.pelvisY = 1.30 + Math.abs(Math.sin(tWalk*2))*0.025;
      tgt.spineX  = -0.05 + Math.sin(tWalk)*0.05;
      tgt.neckX   = 0.10;
      tgt.headX   = 0.05;
      tgt.headY   = Math.sin(tWalk*0.6)*0.30;
      tgt.shLX = Math.sin(tWalk)*0.40;
      tgt.shLZ = -0.05;
      tgt.elLX = -0.30 + Math.sin(tWalk)*0.15;
      tgt.shRX = -Math.sin(tWalk)*0.40;
      tgt.shRZ =  0.05;
      tgt.elRX = -0.30 - Math.sin(tWalk)*0.15;
      tgt.hiLX = Math.sin(tWalk)*0.55;
      tgt.knLX = Math.max(0, -Math.sin(tWalk))*0.80;
      tgt.hiRX = -Math.sin(tWalk)*0.55;
      tgt.knRX = Math.max(0, Math.sin(tWalk))*0.80;
      tgt.jaw = 0.12 + Math.sin(t*1.8)*0.04;
      return tgt;
    }

    // ─── WINDUP: Escalating severe panic, flailing, and screaming ───
    if (this.phase === 'windup'){
      const progress = 1 - this.phaseTimer / this.windupDuration;
      const intensity = 0.6 + progress * 1.2; // Scales from distressed to absolute panic
      
      // High-frequency rapid thrashing
      const panicX = Math.sin(t * 25) * 0.3 * intensity;
      const panicZ = Math.cos(t * 20) * 0.4 * intensity;

      // Body buckling and twisting
      tgt.pelvisY = 1.05 + Math.sin(t * 14) * 0.08 * intensity;
      tgt.spineX  = 0.3 + panicX;
      tgt.neckX   = -0.2 + Math.sin(t * 18) * 0.4 * intensity; 
      tgt.headX   = -0.3 + Math.cos(t * 22) * 0.3 * intensity;
      // Rapid, frantic head shaking
      tgt.headY   = Math.sin(t * 35) * 0.9 * intensity;

      // Violent arm flailing (reaching up, grabbing at its head, swinging wildly)
      tgt.shLX = -2.5 + Math.sin(t * 24) * 1.4 * intensity;
      tgt.shLZ =  1.2 + Math.cos(t * 19) * 0.9 * intensity;
      tgt.elLX = -1.5 + Math.sin(t * 30) * 1.6 * intensity;

      tgt.shRX = -2.5 + Math.cos(t * 26) * 1.4 * intensity;
      tgt.shRZ = -1.2 - Math.sin(t * 21) * 0.9 * intensity;
      tgt.elRX = -1.5 + Math.cos(t * 32) * 1.6 * intensity;

      // Legs buckling/stomping in pure panic
      tgt.hiLX = -1.0 + Math.sin(t * 16) * 0.6 * intensity; 
      tgt.knLX = 1.5 + Math.cos(t * 16) * 0.6 * intensity;
      tgt.hiRX = -1.0 + Math.cos(t * 17) * 0.6 * intensity; 
      tgt.knRX = 1.5 + Math.sin(t * 17) * 0.6 * intensity;

      // Jaw snapping wildly (hyperventilating/screaming)
      tgt.jaw = 1.0 + Math.sin(t * 45) * 0.5;
      return tgt;
    }

    // ─── SCREAM: peak moment (1.5s) — head back, arms flared, mouth max ───
    if (this.phase === 'scream'){
      tgt.pelvisY = 1.32;
      tgt.spineX  = -0.35;
      tgt.neckX   = -0.65;
      tgt.headX   = -0.35;
      tgt.shLX = -1.90; tgt.shLZ = -0.70; tgt.elLX = -0.10;
      tgt.shRX = -1.90; tgt.shRZ =  0.70; tgt.elRX = -0.10;
      tgt.hiLX = -0.30; tgt.knLX = 0.40;
      tgt.hiRX = -0.30; tgt.knRX = 0.40;
      tgt.jaw  = 1.25;
      return tgt;
    }

    // ─── RETREAT ───
    if (this.phase === 'retreat'){
      const tWalk = t * 4.0;
      tgt.pelvisY = 0.95 + Math.abs(Math.sin(tWalk))*0.025;
      tgt.spineX  = 0.50;
      tgt.neckX   = 0.40;
      tgt.headX   = 0.15;
      tgt.shLX = -0.70; tgt.shLZ = 0.50; tgt.elLX = -2.55;
      tgt.shRX = -0.70; tgt.shRZ = -0.50; tgt.elRX = -2.55;
      tgt.hiLX = Math.sin(tWalk)*0.4; tgt.knLX = Math.max(0, -Math.sin(tWalk))*0.8;
      tgt.hiRX = -Math.sin(tWalk)*0.4; tgt.knRX = Math.max(0, Math.sin(tWalk))*0.8;
      tgt.jaw  = 0.05;
      return tgt;
    }

    // ─── RETURNING (fast sprint home) ───
    if (this.phase === 'returning'){
      const tR = t * 18;
      tgt.pelvisY = 1.25 + Math.abs(Math.sin(tR))*0.12;
      tgt.spineX = -0.50 + Math.sin(tR*1.2)*0.15;
      tgt.neckX = -0.60;
      tgt.headX = -0.15;
      tgt.shLX = 1.7 + Math.sin(tR*1.1)*1.3; tgt.shLZ = -0.5;
      tgt.elLX = -1.0 + Math.sin(tR*1.5)*0.9;
      tgt.shRX = 1.7 + Math.cos(tR*1.1)*1.3; tgt.shRZ = 0.5;
      tgt.elRX = -1.0 + Math.cos(tR*1.5)*0.9;
      tgt.hiLX = Math.sin(tR)*1.3; tgt.knLX = Math.max(0,-Math.sin(tR))*2.0 + 0.2;
      tgt.hiRX = -Math.sin(tR)*1.3; tgt.knRX = Math.max(0, Math.sin(tR))*2.0 + 0.2;
      tgt.jaw = 0.7;
      return tgt;
    }

    // ─── STUNNED (shock → collapse → lying) ───
    if (this.phase === 'stunned'){
      const elapsed = this.stunDuration - Math.max(0, this.phaseTimer);
      if (elapsed < 1.5){
        const s = elapsed / 1.5;
        const conv = Math.sin(t * 60) * 0.15 * (1 - s * 0.5);
        tgt.pelvisY = 1.30 - s * 0.9 + conv * 0.2;
        tgt.spineX = conv * 1.5 - s * 0.8;
        tgt.neckX = Math.sin(t*70) * 0.3; tgt.headX = Math.cos(t*65) * 0.3;
        tgt.headY = Math.sin(t*80) * 0.5;
        tgt.shLX = -1.5 + conv*3; tgt.shLZ = 1.0; tgt.elLX = -1.0 + Math.sin(t*70);
        tgt.shRX = -1.5 - conv*3; tgt.shRZ = -1.0; tgt.elRX = -1.0 + Math.cos(t*75);
        tgt.hiLX = -0.3 + conv*2; tgt.knLX = 0.5;
        tgt.hiRX = -0.3 - conv*2; tgt.knRX = 0.5;
        tgt.jaw = 0.8 + Math.sin(t*50)*0.2;
        return tgt;
      }
      const tw = Math.sin(t * 6) * 0.03;
      tgt.pelvisY = 0.30;
      tgt.spineX = -1.5 + tw;
      tgt.neckX = 0.2; tgt.headX = 0.2; tgt.headY = 0.1 + tw*2;
      tgt.shLX = -0.6 + Math.sin(t*3)*0.05; tgt.shLZ = 1.2; tgt.elLX = -0.5;
      tgt.shRX = -0.6 + Math.cos(t*3)*0.05; tgt.shRZ = -1.2; tgt.elRX = -0.5;
      tgt.hiLX = -1.5; tgt.knLX = 0.2;
      tgt.hiRX = -1.5; tgt.knRX = 0.2;
      tgt.jaw = 0.4 + Math.sin(t*5)*0.05;
      return tgt;
    }

    // ─── GETTING UP ───
    if (this.phase === 'gettingUp'){
      const p = 1 - Math.max(0, this.phaseTimer) / this.getupDuration;
      tgt.pelvisY = 0.30 + (0.68 - 0.30) * p;
      tgt.spineX = -1.5 + (0.55 + 1.5) * p;
      tgt.neckX = 0.2 + (0.40 - 0.2) * p;
      tgt.headX = 0.2 + (0.15 - 0.2) * p;
      tgt.headY = 0.1 * (1 - p);
      tgt.shLX = -0.6 + (-0.70 + 0.6) * p; tgt.shLZ = 1.2 + (0.50 - 1.2) * p;
      tgt.elLX = -0.5 + (-2.55 + 0.5) * p;
      tgt.shRX = -0.6 + (-0.70 + 0.6) * p; tgt.shRZ = -1.2 + (-0.50 + 1.2) * p;
      tgt.elRX = -0.5 + (-2.55 + 0.5) * p;
      tgt.hiLX = -1.5 + (-1.75 + 1.5) * p; tgt.knLX = 0.2 + (2.30 - 0.2) * p;
      tgt.hiRX = -1.5 + (-1.75 + 1.5) * p; tgt.knRX = 0.2 + (2.30 - 0.2) * p;
      tgt.jaw = 0.4 + (0.1 - 0.4) * p;
      return tgt;
    }

    // ─── CONTROLLED ───
    if (this.phase === 'controlled'){
      tgt.pelvisY = 1.30; tgt.spineX = 0; tgt.neckX = 0; tgt.headX = 0;
      tgt.shLX = 0; tgt.shLZ = 0; tgt.elLX = 0;
      tgt.shRX = 0; tgt.shRZ = 0; tgt.elRX = 0;
      tgt.hiLX = 0; tgt.knLX = 0; tgt.hiRX = 0; tgt.knRX = 0;
      tgt.jaw = 0.1;
      return tgt;
    }

    // ─── CHASE ───
    tgt.pelvisY = 1.30 + Math.abs(Math.sin(t*11))*0.06;
    tgt.spineX  = -0.40;
    tgt.neckX   = 0.10;
    tgt.headX   = 0.00;
    tgt.headY   = 0.00;
    tgt.shLX    = 2.2 + Math.sin(t*25)*0.4;
    tgt.shLZ    = -0.2;
    tgt.elLX    = -0.5 + Math.cos(t*30)*0.3;
    tgt.shRX    = 2.2 + Math.cos(t*25)*0.4;
    tgt.shRZ    =  0.2;
    tgt.elRX    = -0.5 + Math.sin(t*30)*0.3;
    tgt.hiLX    =  Math.sin(t*11)*0.95;
    tgt.knLX    =  Math.max(0, -Math.sin(t*11))*1.45 + 0.14;
    tgt.hiRX    = -Math.sin(t*11)*0.95;
    tgt.knRX    =  Math.max(0,  Math.sin(t*11))*1.45 + 0.14;
    tgt.jaw     = 1.25 + Math.sin(t*25)*0.05;
    
    if (this.punchTimer > 0) {
      if (this.punchSide > 0) {
        tgt.shRX = -1.8; tgt.shRZ = 0.2; tgt.elRX = -0.1;
      } else {
        tgt.shLX = -1.8; tgt.shLZ = -0.2; tgt.elLX = -0.1;
      }
    }
    return tgt;
  },

  wantYaw(state, player){
    if (this.phase === 'dormant') return null;
    return Math.atan2(player.pos.x - state.pos.x, player.pos.z - state.pos.z);
  }
};
