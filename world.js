import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export const World = {
  ROOM: 18, WALL_H: 7, CORRIDOR_HALF_W: 2.5, WALL_GAP_HALF_W: 2.0, WALL_GAP_H: 3.5,
  DOOR_BASE_Y: 1.6, DOOR_OPEN_Y: 5.1, WALL_GAP_TRIGGER_TIME: 5.0, TILE_LEN: 16,
  CORRIDOR_SEG_COUNT: 20, ANTE_W: 8, ANTE_H: 4, ANTE_DEPTH: 8.4, ANTE_CX: 0, ANTE_CZ: -13,
  room: null, door: null, wallGapPanelL: null, wallGapPanelR: null,
  doorState: 'closed', wallGapState: 'closed',
  pathTiles: [], playerTileIdx: 0, corridorSegs: [], corridorFill: null,
  mainLight: null, doorLight: null,

  init(scene) {
    this.room = new THREE.Group();
    scene.add(this.room);
    
    function concreteTexture(){
      const c = document.createElement('canvas'); c.width = c.height = 256;
      const x = c.getContext('2d');
      x.fillStyle = '#767b7f'; x.fillRect(0,0,256,256);
      for(let i=0;i<11000;i++){
        const v = 80 + (Math.random()*110|0);
        x.fillStyle = `rgba(${v},${v},${v},${Math.random()*0.28})`;
        x.fillRect(Math.random()*256, Math.random()*256, 1+Math.random()*2.5, 1+Math.random()*2.5);
      }
      for(let i=0;i<16;i++){
        const gx = Math.random()*256, gy = Math.random()*256, r = 18+Math.random()*55;
        const g = x.createRadialGradient(gx,gy,0,gx,gy,r);
        g.addColorStop(0,'rgba(35,38,40,0.30)');
        g.addColorStop(1,'rgba(35,38,40,0)');
        x.fillStyle = g; x.beginPath(); x.arc(gx,gy,r,0,7); x.fill();
      }
      const t = new THREE.CanvasTexture(c);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.anisotropy = 4;
      return t;
    }
    const concTex = concreteTexture();
    concTex.repeat.set(4,4);
    const matFloor = new THREE.MeshStandardMaterial({map:concTex, color:0x8a9095, roughness:0.96, metalness:0.02});
    const matWall  = new THREE.MeshStandardMaterial({map:concTex, color:0x6d7377, roughness:1.0, metalness:0.0});
    const matCeil  = new THREE.MeshStandardMaterial({color:0x40464a, roughness:1.0});
    const matMetal = new THREE.MeshStandardMaterial({color:0x4c5359, roughness:0.5, metalness:0.75});
    const matGlass = new THREE.MeshStandardMaterial({color:0x0a2030, roughness:0.15, metalness:0.3, transparent:true, opacity:0.55, emissive:0x04202a, emissiveIntensity:0.6});

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(this.ROOM, this.ROOM), matFloor);
    floor.rotation.x = -Math.PI/2; this.room.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(this.ROOM, this.ROOM), matCeil);
    ceil.rotation.x = Math.PI/2; ceil.position.y = this.WALL_H; this.room.add(ceil);

    const wall = (w,h,d,x,y,z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), matWall); m.position.set(x,y,z); this.room.add(m); return m; };
    wall(7.0, this.WALL_H, 0.4, -5.5, this.WALL_H/2, this.ROOM/2);
    wall(7.0, this.WALL_H, 0.4,  5.5, this.WALL_H/2, this.ROOM/2);
    wall(4.0, this.WALL_H - this.WALL_GAP_H, 0.4, 0, (this.WALL_GAP_H + this.WALL_H)/2, this.ROOM/2);
    
    this.wallGapPanelL = new THREE.Mesh(new THREE.BoxGeometry(this.WALL_GAP_HALF_W, this.WALL_GAP_H, 0.35), matMetal);
    this.wallGapPanelL.position.set(-this.WALL_GAP_HALF_W/2, this.WALL_GAP_H/2, this.ROOM/2 + 0.01);
    this.room.add(this.wallGapPanelL);
    this.wallGapPanelR = new THREE.Mesh(new THREE.BoxGeometry(this.WALL_GAP_HALF_W, this.WALL_GAP_H, 0.35), matMetal);
    this.wallGapPanelR.position.set(this.WALL_GAP_HALF_W/2, this.WALL_GAP_H/2, this.ROOM/2 + 0.01);
    this.room.add(this.wallGapPanelR);

    const corridorBulbMat = new THREE.MeshBasicMaterial({color:0xff3020});
    for (let i = 0; i < this.CORRIDOR_SEG_COUNT; i++){
      const seg = new THREE.Group();
      const obsMat = new THREE.MeshStandardMaterial({color:0xff5500, roughness:0.6, emissive:0x441100, emissiveIntensity:0.5});
      const obs = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.5, 1.2), obsMat);
      obs.position.set(0, 0.75, this.TILE_LEN/2);
      seg.add(obs);
      seg.userData.obstacle = obs;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(this.CORRIDOR_HALF_W*2, this.TILE_LEN), matFloor);
      fl.rotation.x = -Math.PI/2; fl.position.set(0, 0.02, this.TILE_LEN/2); seg.add(fl);
      const cl = new THREE.Mesh(new THREE.PlaneGeometry(this.CORRIDOR_HALF_W*2, this.TILE_LEN), matCeil);
      cl.rotation.x = Math.PI/2; cl.position.set(0, this.WALL_H, this.TILE_LEN/2); seg.add(cl);
      const wL = new THREE.Mesh(new THREE.BoxGeometry(0.4, this.WALL_H, this.TILE_LEN), matWall);
      wL.position.set(-this.CORRIDOR_HALF_W, this.WALL_H/2, this.TILE_LEN/2); seg.add(wL);
      const wR = new THREE.Mesh(new THREE.BoxGeometry(0.4, this.WALL_H, this.TILE_LEN), matWall);
      wR.position.set(this.CORRIDOR_HALF_W, this.WALL_H/2, this.TILE_LEN/2); seg.add(wR);
      for (let b = 0; b < 2; b++){
        const bulb = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.06, 0.4), corridorBulbMat);
        bulb.position.set(0, this.WALL_H - 0.06, this.TILE_LEN * (b + 0.5) / 2); seg.add(bulb);
      }
      const capL = new THREE.Mesh(new THREE.BoxGeometry(4, this.WALL_H, 0.4), matWall);
      capL.position.set(-1.25, this.WALL_H/2, -1.25); capL.rotation.y = Math.PI/4; capL.visible = false; seg.add(capL);
      const capR = new THREE.Mesh(new THREE.BoxGeometry(4, this.WALL_H, 0.4), matWall);
      capR.position.set(1.25, this.WALL_H/2, -1.25); capR.rotation.y = 3*Math.PI/4; capR.visible = false; seg.add(capR);
      seg.userData.capL = capL; seg.userData.capR = capR;
      this.room.add(seg); this.corridorSegs.push(seg);
    }
    this.initPath();
    this.corridorFill = new THREE.PointLight(0xff2020, 22, 22, 2); this.corridorFill.visible = false; scene.add(this.corridorFill);

    wall(0.4, this.WALL_H, this.ROOM, -this.ROOM/2, this.WALL_H/2, 0);
    wall(0.4, this.WALL_H, this.ROOM,  this.ROOM/2, this.WALL_H/2, 0);
    wall(7.8, this.WALL_H, 0.4, -5.1, this.WALL_H/2, -this.ROOM/2);
    wall(7.8, this.WALL_H, 0.4,  5.1, this.WALL_H/2, -this.ROOM/2);
    wall(2.4, 3.8, 0.4, 0, 5.1, -this.ROOM/2);

    this.door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.2, 0.35), matMetal);
    this.door.position.set(0, 1.6, -this.ROOM/2); this.room.add(this.door);
    for(const side of [-1, 1]){
      const zTrim = -this.ROOM/2 + side * 0.24;
      for(const s of [-1,1]){
        const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 3.4, 0.1), matMetal);
        f.position.set(s*1.28, 1.7, zTrim); this.room.add(f);
      }
      const topTrim = new THREE.Mesh(new THREE.BoxGeometry(2.72, 0.16, 0.1), matMetal);
      topTrim.position.set(0, 3.36, zTrim); this.room.add(topTrim);
    }
    for(const side of [-1, 1]){
      const zStripe = -this.ROOM/2 + side * 0.28;
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 0.05), new THREE.MeshStandardMaterial({color:0xb8a020, roughness:0.8, emissive:0x2a2400, emissiveIntensity:0.5}));
      stripe.position.set(0, 3.0, zStripe); this.room.add(stripe);
    }

    const matAnteFloor = new THREE.MeshStandardMaterial({color:0x3a1010, roughness:0.92, metalness:0.05});
    const matAnteWall  = new THREE.MeshStandardMaterial({color:0x551515, roughness:0.95, metalness:0.0});
    const matAnteCeil  = new THREE.MeshStandardMaterial({color:0x1a0808, roughness:1.0});
    const anteFloor = new THREE.Mesh(new THREE.PlaneGeometry(this.ANTE_W, this.ANTE_DEPTH), matAnteFloor);
    anteFloor.rotation.x = -Math.PI/2; anteFloor.position.set(this.ANTE_CX, 0.01, this.ANTE_CZ); this.room.add(anteFloor);
    const anteCeil = new THREE.Mesh(new THREE.PlaneGeometry(this.ANTE_W, this.ANTE_DEPTH), matAnteCeil);
    anteCeil.rotation.x = Math.PI/2; anteCeil.position.set(this.ANTE_CX, this.ANTE_H, this.ANTE_CZ); this.room.add(anteCeil);
    const awL = new THREE.Mesh(new THREE.BoxGeometry(0.4, this.ANTE_H, this.ANTE_DEPTH), matAnteWall);
    awL.position.set(-this.ANTE_W/2, this.ANTE_H/2, this.ANTE_CZ); this.room.add(awL);
    const awR = new THREE.Mesh(new THREE.BoxGeometry(0.4, this.ANTE_H, this.ANTE_DEPTH), matAnteWall);
    awR.position.set( this.ANTE_W/2, this.ANTE_H/2, this.ANTE_CZ); this.room.add(awR);
    const awB = new THREE.Mesh(new THREE.BoxGeometry(this.ANTE_W, this.ANTE_H, 0.4), matAnteWall);
    awB.position.set(this.ANTE_CX, this.ANTE_H/2, -17); this.room.add(awB);
    const redBulbMat = new THREE.MeshStandardMaterial({color:0xff3030, emissive:0xff1a1a, emissiveIntensity:3.0});
    const redBulb1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4), redBulbMat);
    redBulb1.position.set(-1.5, this.ANTE_H - 0.06, -11.5); this.room.add(redBulb1);
    const redBulb2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.4), redBulbMat);
    redBulb2.position.set( 1.5, this.ANTE_H - 0.06, -15.5); this.room.add(redBulb2);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8), matGlass);
    win.rotation.y = Math.PI/2; win.position.set(-this.ROOM/2 + 0.21, 3.4, 0); this.room.add(win);
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 3.5), matMetal);
    winFrame.position.set(-this.ROOM/2 + 0.18, 3.4, 0); this.room.add(winFrame);
    const fixture = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, 1.1), matMetal);
    fixture.position.set(0, this.WALL_H - 0.12, 0); this.room.add(fixture);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.06, 0.85), new THREE.MeshStandardMaterial({color:0xfff3d0, emissive:0xfff0c0, emissiveIntensity:2.2}));
    bulb.position.set(0, this.WALL_H - 0.24, 0); this.room.add(bulb);
    for(let i=0;i<3;i++){
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.07,this.ROOM-1,8), matMetal);
      p.rotation.z = Math.PI/2; p.position.set(0, this.WALL_H - 0.4 - i*0.16, -this.ROOM/2 + 1.6 + i*0.5); this.room.add(p);
    }
    const ambient = new THREE.AmbientLight(0x556070, 0.55); scene.add(ambient);
    this.mainLight = new THREE.PointLight(0xfff0cc, 42, 26, 2);
    this.mainLight.position.set(0, this.WALL_H - 0.6, 0); scene.add(this.mainLight);
    this.doorLight = new THREE.PointLight(0xff2a1a, 0, 12, 2);
    this.doorLight.position.set(0, 3.6, -this.ROOM/2 + 1.2); scene.add(this.doorLight);
    const anteLight1 = new THREE.PointLight(0xff1a1a, 38, 14, 2);
    anteLight1.position.set(-1.5, this.ANTE_H - 0.4, -11.5); scene.add(anteLight1);
    const anteLight2 = new THREE.PointLight(0xff1a1a, 32, 14, 2);
    anteLight2.position.set(1.5, this.ANTE_H - 0.4, -15.5); scene.add(anteLight2);
    const anteSpill = new THREE.PointLight(0xff2020, 14, 8, 2);
    anteSpill.position.set(0, 2.5, -10); scene.add(anteSpill);
  },

  update(dt, player, Brain) {
    if (this.doorState === 'closed') {
      const distToDoor = Math.hypot(player.pos.x, player.pos.z - (-this.ROOM/2));
      if (player.pos.z < -this.ROOM/2 - 0.4 && distToDoor < 3.0) {
        this.doorState = 'opening';
        if (window.mechSound) window.mechSound();
      }
    }
    if (this.doorState === 'opening') {
      this.door.position.y = Math.min(this.door.position.y + 4.5 * dt, this.DOOR_OPEN_Y);
      if (this.door.position.y >= this.DOOR_OPEN_Y) { this.door.position.y = this.DOOR_OPEN_Y; this.doorState = 'open'; }
    }
    if (this.doorState === 'open' && player.pos.z > -this.ROOM/2 + 1.0) {
      this.doorState = 'closing';
      if (window.mechSound) window.mechSound();
    }
    if (this.doorState === 'closing') {
      this.door.position.y = Math.max(this.door.position.y - 4.5 * dt, this.DOOR_BASE_Y);
      if (this.door.position.y <= this.DOOR_BASE_Y) {
        this.door.position.y = this.DOOR_BASE_Y; this.doorState = 'locked';
        if (window.lockSound) window.lockSound();
      }
    }

    if (this.wallGapState === 'closed' && Brain.phase === 'windup' && Brain.phaseTimer <= this.WALL_GAP_TRIGGER_TIME && Brain.phaseTimer > 0) {
      this.wallGapState = 'opening';
      if (window.mechSound) window.mechSound();
    }
    if (this.wallGapState === 'opening') {
      this.wallGapPanelL.position.x = Math.max(-3, this.wallGapPanelL.position.x - 3 * dt);
      this.wallGapPanelR.position.x = Math.min(3, this.wallGapPanelR.position.x + 3 * dt);
      if (this.wallGapPanelL.position.x <= -3 && this.wallGapPanelR.position.x >= 3) this.wallGapState = 'open';
    } else if (this.wallGapState === 'closing') {
      this.wallGapPanelL.position.x = Math.min(-1, this.wallGapPanelL.position.x + 3 * dt);
      this.wallGapPanelR.position.x = Math.max(1, this.wallGapPanelR.position.x - 3 * dt);
      if (this.wallGapPanelL.position.x >= -1 && this.wallGapPanelR.position.x <= 1) {
        this.wallGapState = 'closed';
        if (window.lockSound) window.lockSound();
      }
    }
    if (this.wallGapState === 'open' && Brain.phase === 'dormant' && window.scp.pos.z < this.ROOM/2 - 1) {
      this.wallGapState = 'closing';
    }
    this.updateCorridor(player);
  },

  initPath() {
    this.pathTiles.length = 0;
    this.pathTiles.push(this.makeTile(0, this.ROOM/2 + this.TILE_LEN/2, 0, 1, false, null));
    for (let i = 0; i < 7; i++) this.generateNextTile();
    this.playerTileIdx = 0;
  },
  makeTile(cx, cz, dirX, dirZ, isTurn, turnDir, len, isArc) { return { cx, cz, dirX, dirZ, yaw: Math.atan2(dirX, dirZ), isTurn, turnDir, len: len || this.TILE_LEN, isArc: !!isArc }; },
  generateArc(last, ndx, ndz) {
    const R = 6.5, N = 8, LL = last.len || this.TILE_LEN;
    const Px = last.cx + last.dirX * LL / 2, Pz = last.cz + last.dirZ * LL / 2;
    const Cx = Px + R * ndx, Cz = Pz + R * ndz;
    const aS = Math.atan2(-ndz, -ndx), aE = Math.atan2(last.dirZ, last.dirX);
    let da = aE - aS;
    if (da > Math.PI) da -= 2*Math.PI;
    if (da < -Math.PI) da += 2*Math.PI;
    for (let i = 0; i < N; i++){
      const a0 = aS + da * i / N, a1 = aS + da * (i + 1) / N;
      const p0x = Cx + R * Math.cos(a0), p0z = Cz + R * Math.sin(a0);
      const p1x = Cx + R * Math.cos(a1), p1z = Cz + R * Math.sin(a1);
      const mx = (p0x + p1x) / 2, mz = (p0z + p1z) / 2;
      const pdx = p1x - p0x, pdz = p1z - p0z;
      const pLen = Math.hypot(pdx, pdz);
      this.pathTiles.push(this.makeTile(mx, mz, pdx/pLen, pdz/pLen, false, null, pLen, true));
    }
  },
  generateNextTile() {
    const last = this.pathTiles[this.pathTiles.length - 1];
    let ndx = last.dirX, ndz = last.dirZ, isTurn = false, turnDir = null;
    if (this.pathTiles.length >= 5){
      const r = Math.random();
      if (r < 0.35) { const t = {x: last.dirZ, z: -last.dirX}; ndx = t.x; ndz = t.z; isTurn = true; turnDir = 'L'; }
      else if (r < 0.7) { const t = {x: -last.dirZ, z: last.dirX}; ndx = t.x; ndz = t.z; isTurn = true; turnDir = 'R'; }
    }
    if (isTurn) { this.generateArc(last, ndx, ndz); return; }
    const LL = last.len || this.TILE_LEN;
    const jx = last.cx + last.dirX * LL / 2, jz = last.cz + last.dirZ * LL / 2;
    this.pathTiles.push(this.makeTile(jx + ndx*this.TILE_LEN/2, jz + ndz*this.TILE_LEN/2, ndx, ndz, isTurn, turnDir));
  },
  findNearestTile(x, z, fromIdx) {
    let bestIdx = fromIdx, bestD = Infinity;
    const start = Math.max(0, fromIdx - 20), end = Math.min(this.pathTiles.length, fromIdx + 50);
    for (let i = start; i < end; i++){
      const t = this.pathTiles[i], dx = x - t.cx, dz = z - t.cz, d = dx*dx + dz*dz;
      if (d < bestD){ bestD = d; bestIdx = i; }
    }
    return bestIdx;
  },
  clampToCorridor(pos) {
    // Obstacle collision
    for (let i = 0; i < this.CORRIDOR_SEG_COUNT; i++) {
      const seg = this.corridorSegs[i];
      if (seg.visible && seg.userData.obstacle && seg.userData.obstacle.visible) {
          const obsPos = new THREE.Vector3();
          seg.userData.obstacle.getWorldPosition(obsPos);
          const dx = pos.x - obsPos.x;
          const dz = pos.z - obsPos.z;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.9) {
              const pushX = dx / (dist || 1);
              const pushZ = dz / (dist || 1);
              pos.x = obsPos.x + pushX * 0.9;
              pos.z = obsPos.z + pushZ * 0.9;
          }
      }
    }

    if (!this.pathTiles.length) return;
    let bestIdx = this.findNearestTile(pos.x, pos.z, this.playerTileIdx);
    const t = this.pathTiles[bestIdx], dx = pos.x - t.cx, dz = pos.z - t.cz;
    const along = dx * t.dirX + dz * t.dirZ, across = -dx * t.dirZ + dz * t.dirX;
    const maxA = this.CORRIDOR_HALF_W - 0.4, maxL = (t.len || this.TILE_LEN)/2 + 0.5;
    if (Math.abs(across) <= maxA && Math.abs(along) <= maxL) return;
    for (const di of [-2,-1,1,2]){
      const ni = bestIdx + di;
      if (ni < 0 || ni >= this.pathTiles.length) continue;
      const nt = this.pathTiles[ni], ndx = pos.x - nt.cx, ndz = pos.z - nt.cz;
      const nA = -ndx * nt.dirZ + ndz * nt.dirX, nL = ndx * nt.dirX + ndz * nt.dirZ;
      const nMaxL = (nt.len || this.TILE_LEN)/2 + 0.5;
      if (Math.abs(nA) <= maxA && Math.abs(nL) <= nMaxL) return;
    }
    const clA = Math.max(-maxA, Math.min(maxA, across)), clL = Math.max(-(t.len||this.TILE_LEN)/2, Math.min((t.len||this.TILE_LEN)/2, along));
    pos.x = t.cx + t.dirX * clL + (-t.dirZ) * clA; pos.z = t.cz + t.dirZ * clL + (t.dirX) * clA;
    const dxS = pos.x - t.cx, dzS = pos.z - t.cz;
    if (dxS*dxS + dzS*dzS > 400) { pos.x = t.cx; pos.z = t.cz; }
  },
  updateCorridor(player) {
    this.playerTileIdx = this.findNearestTile(player.pos.x, player.pos.z, this.playerTileIdx);
    while (this.pathTiles.length < this.playerTileIdx + 16) this.generateNextTile();
    for (let i = 0; i < this.CORRIDOR_SEG_COUNT; i++) {
      const tileIdx = this.playerTileIdx - 1 + i, seg = this.corridorSegs[i];
      if (tileIdx >= 0 && tileIdx < this.pathTiles.length) {
        if (seg.userData.tileIdx !== tileIdx) {
            seg.userData.tileIdx = tileIdx;
            // Only spawn 25% of the time
            seg.userData.obstacle.visible = (Math.random() > 0.75); 
            // Push them towards the left or right walls, leaving the middle clear
            const side = Math.random() > 0.5 ? 1 : -1;
            seg.userData.obstacle.position.x = side * (this.CORRIDOR_HALF_W - 0.8);
            seg.userData.obstacle.position.z = this.TILE_LEN/2 + (Math.random() - 0.5) * 6.0;
        }
        const t = this.pathTiles[tileIdx], tLen = t.len || this.TILE_LEN;
        seg.visible = true;
        seg.position.set(t.cx - t.dirX * tLen/2, 0, t.cz - t.dirZ * tLen/2);
        seg.rotation.y = t.yaw;
        seg.scale.set(1, 1, tLen / this.TILE_LEN * (t.isArc ? 1.7 : 1));
        seg.userData.capL.visible = t.isTurn && t.turnDir === 'L';
        seg.userData.capR.visible = t.isTurn && t.turnDir === 'R';
      } else { seg.visible = false; }
    }
    if (player.pos.z > this.ROOM/2 - 0.5) {
      this.corridorFill.position.set(player.pos.x, this.WALL_H - 1.5, player.pos.z);
      this.corridorFill.visible = true;
    } else { this.corridorFill.visible = false; }
  }
};
