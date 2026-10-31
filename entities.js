import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { Brain } from './behaviors.js';
import { Network } from './network.js';
import { World } from './world.js';

export const Entities = {
    scpVisual: null, root: null, head: null, headHit: null,
    scp: { state: 'dormant', pos: new THREE.Vector3(-5.2, 0, -6.2), _punchCooldown: 0, yaw: 0.6, gaze: 0, freezeTimer: 0, calmTimer: 0 },
    armL: null, armR: null, legL: null, legR: null, pelvis: null, spine: null, neck: null, jaw: null,
    REST: { pelvisY:1.30, spineX:0, neckX:0, neckY:0, neckZ:0, headX:0, headY:0, shLX:0, shLZ:0, elLX:0, shRX:0, shRZ:0, elRX:0, hiLX:0, knLX:0, hiRX:0, knRX:0, jaw:0 },
    cur: null,

    init(scene) {
        this.cur = Object.assign({}, this.REST);
        const skinMat  = new THREE.MeshStandardMaterial({color:0xe4dbcd, roughness:0.72, metalness:0.0});
        const darkMat  = new THREE.MeshStandardMaterial({color:0x080606, roughness:0.35});
        const mouthMat = new THREE.MeshStandardMaterial({color:0x1a0206, roughness:0.6});

        const capsule = (r, len, mat, seg=10) => new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, seg), mat);

        this.scpVisual = new THREE.Group();
        this.root      = new THREE.Group();
        this.root.add(this.scpVisual);
        scene.add(this.root);

        this.pelvis = new THREE.Group();
        this.pelvis.position.y = 1.30;
        this.scpVisual.add(this.pelvis);
        this.pelvis.add(capsule(0.10, 0.14, skinMat));

        this.spine = new THREE.Group();
        this.pelvis.add(this.spine);
        const torso = capsule(0.12, 0.62, skinMat, 14);
        torso.position.y = 0.38;
        this.spine.add(torso);

        for(let i=0;i<4;i++){
          const rib = capsule(0.125, 0.03, skinMat, 10);
          rib.scale.set(1, 1, 0.75);
          rib.position.y = 0.16 + i*0.15;
          this.spine.add(rib);
        }

        this.neck = new THREE.Group();
        this.neck.position.y = 0.72;
        this.spine.add(this.neck);
        const neckMesh = capsule(0.06, 0.15, skinMat);
        neckMesh.position.y = 0.05;
        this.neck.add(neckMesh);

        this.head = new THREE.Group();
        this.head.position.y = 0.23;
        this.neck.add(this.head);

        const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 22, 18), skinMat);
        skull.scale.set(0.8, 1.25, 0.95);
        this.head.add(skull);

        const brow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 8, 0, Math.PI*2, 0, 0.7), skinMat);
        brow.scale.set(1.02, 0.5, 0.95);
        brow.position.set(0, 0.055, 0.02);
        brow.rotation.x = -0.35;
        this.head.add(brow);

        for(const s of [-1,1]){
          const socket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 10), darkMat);
          socket.scale.set(1, 0.85, 0.7);
          socket.position.set(s*0.055, 0.012, 0.10);
          this.head.add(socket);
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), new THREE.MeshStandardMaterial({color:0xffffff, roughness:0.1, metalness:0.0}));
          eye.position.set(s*0.055, 0.012, 0.12);
          this.head.add(eye);
        }

        const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), skinMat);
        nose.scale.set(0.6, 1.1, 1.2);
        nose.position.set(0, -0.02, 0.12);
        this.head.add(nose);

        const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.08), mouthMat);
        cavity.position.set(0, -0.09, 0.10);
        this.head.add(cavity);

        this.jaw = new THREE.Group();
        this.jaw.position.set(0, -0.08, 0.03);
        this.head.add(this.jaw);
        const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.12), skinMat);
        jawMesh.position.set(0, -0.03, 0.06);
        this.jaw.add(jawMesh);

        const chin = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skinMat);
        chin.scale.set(1.1, 0.8, 1.0);
        chin.position.set(0, -0.05, 0.10);
        this.jaw.add(chin);

        this.headHit = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.18), new THREE.MeshBasicMaterial({visible:false}));
        this.headHit.position.set(0, -0.01, 0.10);
        this.headHit.userData.hit = true;
        this.head.add(this.headHit);

        const buildArm = (side) => {
          const shoulder = new THREE.Group();
          shoulder.position.set(side * 0.18, 0.60, 0);
          this.spine.add(shoulder);
          const upper = capsule(0.06, 0.50, skinMat);
          upper.position.y = -0.30; shoulder.add(upper);
          const elbow = new THREE.Group();
          elbow.position.y = -0.62; shoulder.add(elbow);
          const fore = capsule(0.05, 0.50, skinMat);
          fore.position.y = -0.30; elbow.add(fore);
          const wrist = new THREE.Group();
          wrist.position.y = -0.62; elbow.add(wrist);
          const hand = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), skinMat);
          hand.scale.set(1.0, 1.8, 0.6);
          hand.position.y = -0.12; wrist.add(hand);
          for(let i=0;i<4;i++){
            const f = capsule(0.018, 0.20, skinMat, 6);
            f.position.set((i-1.5)*0.04, -0.30, 0.008);
            f.rotation.x = (i-1.5)*0.05;
            wrist.add(f);
          }
          const thumb = capsule(0.02, 0.12, skinMat, 6);
          thumb.position.set(side * 0.07, -0.22, 0.02);
          thumb.rotation.z = side * 0.7; wrist.add(thumb);
          return {shoulder, elbow, wrist};
        };
        this.armL = buildArm(-1);
        this.armR = buildArm( 1);

        const buildLeg = (side) => {
          const hip = new THREE.Group();
          hip.position.set(side * 0.10, -0.05, 0);
          this.pelvis.add(hip);
          const thigh = capsule(0.075, 0.50, skinMat);
          thigh.position.y = -0.30; hip.add(thigh);
          const knee = new THREE.Group();
          knee.position.y = -0.65; hip.add(knee);
          const shin = capsule(0.06, 0.48, skinMat);
          shin.position.y = -0.30; knee.add(shin);
          const ankle = new THREE.Group();
          ankle.position.y = -0.64; knee.add(ankle);
          const foot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.28), skinMat);
          foot.position.set(0, -0.03, 0.06); ankle.add(foot);
          return {hip, knee, ankle};
        };
        this.legL = buildLeg(-1);
        this.legR = buildLeg( 1);

        this.root.position.copy(this.scp.pos);
        this.root.rotation.y = this.scp.yaw;
        window.scp = this.scp;
    },
    updatePose(dt, t) {
        const tg = Brain.pose(this.REST, t);
        let rate = 6;
        if ((Brain.phase === 'chase' || Brain.phase === 'retreat') && !window.eyesClosed) rate = 15;
        const k = 1 - Math.exp(-rate * dt);
        for(const key in this.cur) this.cur[key] += (tg[key] - this.cur[key]) * k;

        this.pelvis.position.y = this.cur.pelvisY;
        this.spine.rotation.x  = this.cur.spineX;
        this.neck.rotation.set(this.cur.neckX, this.cur.neckY, this.cur.neckZ);
        this.head.rotation.set(this.cur.headX, this.cur.headY, 0);
        this.jaw.rotation.x    = this.cur.jaw;

        this.armL.shoulder.rotation.set(this.cur.shLX, 0, this.cur.shLZ);
        this.armL.elbow.rotation.x = this.cur.elLX;
        this.armR.shoulder.rotation.set(this.cur.shRX, 0, this.cur.shRZ);
        this.armR.elbow.rotation.x = this.cur.elRX;

        this.legL.hip.rotation.x  = this.cur.hiLX;
        this.legL.knee.rotation.x = this.cur.knLX;
        this.legR.hip.rotation.x  = this.cur.hiRX;
        this.legR.knee.rotation.x = this.cur.knRX;
        this.root.updateMatrixWorld(true);
    },

    updateAI(dt, t, player, camera, raycaster) {
        if (window.dead && Brain.phase !== 'returning') return;

        if (window.scpControlState) {
            let targetX = player.pos.x, targetZ = player.pos.z;
            let cYaw = window.Controls ? window.Controls.yaw : 0;
            if (window.scpControllerId !== Network.myId && Network.remotePlayers[window.scpControllerId]) {
                targetX = Network.remotePlayers[window.scpControllerId].mesh.position.x;
                targetZ = Network.remotePlayers[window.scpControllerId].mesh.position.z;
                cYaw = Network.remotePlayers[window.scpControllerId].data.yaw || 0;
            }

            if (window.scpControlState === 'gettingUp') {
                if (Brain.tick(dt) === 'returnToDormant' || Brain.phase === 'walking') {
                    window.scpControlState = 'walkingToPlayer';
                }
            } else if (window.scpControlState === 'walkingToPlayer') {
                Brain.phase = 'walking';
                const dx = targetX - this.scp.pos.x;
                const dz = targetZ - this.scp.pos.z;
                const dist = Math.hypot(dx, dz);
                if (dist > 2.0) {
                    const dir = new THREE.Vector3(dx, 0, dz).normalize();
                    this.scp.pos.addScaledVector(dir, 5.0 * dt);
                    this.scp.yaw = Math.atan2(dx, dz);
                } else {
                    window.scpControlState = 'following';
                    Brain.phase = 'controlled';
                }
            } else if (window.scpControlState === 'following') {
                const offX = targetX + Math.cos(cYaw) * 1.5;
                const offZ = targetZ - Math.sin(cYaw) * 1.5;
                const dx = offX - this.scp.pos.x;
                const dz = offZ - this.scp.pos.z;
                const dist = Math.hypot(dx, dz);
                if (dist > 0.5) {
                    Brain.phase = 'walking'; // Trigger walking animation
                    const dir = new THREE.Vector3(dx, 0, dz).normalize();
                    this.scp.pos.addScaledVector(dir, 5.0 * dt);
                } else {
                    Brain.phase = 'controlled'; // Stand still when close
                }
                this.scp.yaw = cYaw + Math.PI; // Force him to face the same way as the player model
            }
            this.root.position.copy(this.scp.pos);
            this.root.rotation.y = this.scp.yaw;
            return; // Skip normal AI
        }

        let targetPos = player.pos;
        if (Network.scpTargetId && Network.scpTargetId !== Network.myId && Network.remotePlayers[Network.scpTargetId]) {
            targetPos = Network.remotePlayers[Network.scpTargetId].mesh.position;
        }
        if (Network.scpCooldown > 0) Network.scpCooldown -= dt;
        const dx = targetPos.x - this.scp.pos.x;
        const dz = targetPos.z - this.scp.pos.z;
        const horizDist = Math.hypot(dx, dz);
        
        this.head.getWorldPosition(window._headPos);
        const CENTER = new THREE.Vector2(0, 0);

        let looking = false;
        if(!window.eyesClosed){
            camera.updateMatrixWorld();
            raycaster.setFromCamera(CENTER, camera);
            const faceHits = raycaster.intersectObject(this.headHit, false);
            if(faceHits.length && faceHits[0].distance < 34){
                const roomHits = raycaster.intersectObject(World.room, true);
                const wallBlocked = roomHits.length > 0 && roomHits[0].distance < faceHits[0].distance;
                const armHits = raycaster.intersectObjects([this.armL.shoulder, this.armR.shoulder], true);
                if(!wallBlocked && (!armHits.length || armHits[0].distance > faceHits[0].distance)) looking = true;
            }
            if(!looking){
                const proj = window._headPos.clone().project(camera);
                const d = camera.position.distanceTo(window._headPos);
                if(Math.abs(proj.x) < 0.32 && Math.abs(proj.y) < 0.32 && proj.z < 1 && d < 30) {
                    const dirToHead = window._headPos.clone().sub(camera.position).normalize();
                    raycaster.set(camera.position, dirToHead);
                    raycaster.far = d;
                    const wallHits = raycaster.intersectObjects(World.room.children, true);
                    if(wallHits.length === 0 || wallHits[0].object === this.headHit) {
                        const armHits = raycaster.intersectObjects([this.armL.shoulder, this.armR.shoulder], true);
                        if(!armHits.length || armHits[0].distance > d) looking = true;
                    }
                }
            }
        }

        if ((Brain.phase === 'dormant' || Brain.phase === 'walking') && looking && !Network.scpTargetId && Network.scpCooldown <= 0){
            if (Brain.trigger()){
                Network.scpTargetId = Network.myId;
                Network.broadcast({ type: 'trigger', id: Network.myId });
                window.yellsTimer = 0.8 + Math.random() * 0.7;
            }
        }

        if (Network.aiAuthority) {
            const ev = Brain.tick(dt);
            if (ev === 'megaScream') { window.gradualScream.stop(); window.screamMega(); Network.broadcast({ type: 'megaScream' }); }
            else if (ev === 'windupStart') { window.gradualScream.start(); Network.broadcast({ type: 'windupStart' }); }
            else if (ev === 'chaseStart') { Network.broadcast({ type: 'chaseStart' }); }
            else if (ev === 'standupWarning') { window.showWarning("He's standing up."); Network.broadcast({ type: 'standupWarning' }); }
            else if (ev === 'gettingUpStart') { Network.broadcast({ type: 'gettingUpStart' }); }
            else if (ev === 'stunRecovered') { Network.broadcast({ type: 'stunRecovered' }); }

            this.scp._lastSpeed = this.scp._lastSpeed || 0;
            let senseTarget = player;
            if (Network.scpTargetId && Network.scpTargetId !== Network.myId && Network.remotePlayers[Network.scpTargetId]) {
                senseTarget = { pos: Network.remotePlayers[Network.scpTargetId].mesh.position };
            }
            Brain.sense(this.scp, senseTarget, looking, window.eyesClosed, dt);

            if (Brain.phase !== 'dormant' && Brain.phase !== 'retreat' && Brain.phase !== 'walking' && Brain.phase !== 'standup' && Brain.phase !== 'stunned' && Brain.phase !== 'gettingUp') {
                let wantYaw = Math.atan2(targetPos.x - this.scp.pos.x, targetPos.z - this.scp.pos.z);
                const turnRate = Brain.phase === 'chase' ? 6 : 1.8;
                this.scp.yaw += window.shortAngle(this.scp.yaw, wantYaw) * (1 - Math.exp(-turnRate * dt));
            }

            const isChasing = Brain.phase === 'chase';
            if (isChasing){
                if (!this.scp._punchCooldown) this.scp._punchCooldown = 0;
                if (this.scp._punchCooldown > 0) this.scp._punchCooldown -= dt;
                if (this.scp._punchCooldown <= 0) {
                    let punched = false;
                    if (Network.scpTargetId !== Network.myId && !window.dead && this.scp.pos.distanceTo(player.pos) < 2.0) {
                        this.scp._punchCooldown = 1.5; Brain.punchTimer = 0.4; Brain.punchSide = Math.random() > 0.5 ? 1 : -1;
                        let kx = player.pos.x - this.scp.pos.x, kz = player.pos.z - this.scp.pos.z, len = Math.hypot(kx, kz) || 1;
                        window.knockbackVel.set((kx/len)*18, 0, (kz/len)*18);
                        Network.broadcast({ type: 'punchHit', targetId: Network.myId, vx: (kx/len)*18, vz: (kz/len)*18 });
                        punched = true;
                    }
                    if (!punched) {
                        for (let id in Network.remotePlayers) {
                            if (id === Network.scpTargetId) continue;
                            let rp = Network.remotePlayers[id];
                            if (!rp.mesh || rp.data.dead) continue;
                            if (this.scp.pos.distanceTo(rp.mesh.position) < 2.0) {
                                this.scp._punchCooldown = 1.5; Brain.punchTimer = 0.4; Brain.punchSide = Math.random() > 0.5 ? 1 : -1;
                                let kx = rp.mesh.position.x - this.scp.pos.x, kz = rp.mesh.position.z - this.scp.pos.z, len = Math.hypot(kx, kz) || 1;
                                Network.broadcast({ type: 'punchHit', targetId: id, vx: (kx/len)*18, vz: (kz/len)*18 });
                                break;
                            }
                        }
                    }
                }

                let tx = targetPos.x, tz = targetPos.z, canKill = true;
                if (this.scp.pos.z > World.ROOM/2 - 0.5 || targetPos.z > World.ROOM/2 - 0.5) {
                   if (this.scp.pos.z < World.ROOM/2 - 0.5) { tx = 0; tz = World.ROOM/2 + 1; }
                   else if (targetPos.z < World.ROOM/2 - 0.5) { tx = 0; tz = World.ROOM/2 + 1; this.scp.tileIdx = 0; }
                   else {
                      if (this.scp.tileIdx === undefined) {
                         let minD = Infinity;
                         for (let i = 0; i < World.pathTiles.length; i++) {
                            const d = Math.hypot(this.scp.pos.x - World.pathTiles[i].cx, this.scp.pos.z - World.pathTiles[i].cz);
                            if (d < minD) { minD = d; this.scp.tileIdx = i; }
                         }
                      }
                      const pIdx = World.findNearestTile(targetPos.x, targetPos.z, World.playerTileIdx);
                      if (Math.abs(this.scp.tileIdx - pIdx) > 1) canKill = false;
                      if (this.scp.tileIdx < pIdx) {
                         if (this.scp.tileIdx + 1 < World.pathTiles.length) {
                             const nt = World.pathTiles[this.scp.tileIdx + 1]; tx = nt.cx; tz = nt.cz;
                             if (Math.hypot(this.scp.pos.x - nt.cx, this.scp.pos.z - nt.cz) < 2.5) this.scp.tileIdx++;
                         } else { tx = targetPos.x; tz = targetPos.z; }
                      } else if (this.scp.tileIdx > pIdx) {
                         if (this.scp.tileIdx - 1 >= 0) {
                             const nt = World.pathTiles[this.scp.tileIdx - 1]; tx = nt.cx; tz = nt.cz;
                             if (Math.hypot(this.scp.pos.x - nt.cx, this.scp.pos.z - nt.cz) < 2.5) this.scp.tileIdx--;
                         } else { tx = targetPos.x; tz = targetPos.z; }
                      } else { tx = targetPos.x; tz = targetPos.z; }
                   }
                } else {
                   this.scp.tileIdx = undefined;
                   if (targetPos.z < -World.ROOM/2 + 0.5 && this.scp.pos.z > -World.ROOM/2 - 0.5 && Math.abs(this.scp.pos.x) > 0.5) { tx = 0; tz = -World.ROOM/2 - 0.5; }
                }

                const tdx = tx - this.scp.pos.x, tdz = tz - this.scp.pos.z;
                window._dir.set(tdx, 0, tdz).normalize();
                const chSpeed = (this.scp.pos.z > World.ROOM/2 - 0.5 || targetPos.z > World.ROOM/2 - 0.5) ? window.CHASE_SPEED_SCP : 6.5;
                this.scp.pos.addScaledVector(window._dir, chSpeed * dt);
                this.scp._lastSpeed = chSpeed;
                window.stepTimer -= dt;
                if (window.stepTimer <= 0){ window.stepSound(); window.stepTimer = 0.16; }
                if (horizDist < 1.65 && canKill) {
                    if (Network.scpTargetId === Network.myId) { window.killPlayer(); Network.broadcast({ type: 'killTarget', id: Network.myId }); Network.scpCooldown = 5.0; Network.scpTargetId = null; }
                    else if (Network.scpTargetId) { Network.broadcast({ type: 'killTarget', id: Network.scpTargetId }); Network.scpTargetId = null; Brain.phase = 'returning'; Brain.phaseTimer = 15; Network.scpCooldown = 5.0; }
                    else window.killPlayer();
                }
            } else if (Brain.phase === 'retreat') {
                const rx = -7.5, rz = -7.5, dxR = rx - this.scp.pos.x, dzR = rz - this.scp.pos.z;
                if (Math.hypot(dxR, dzR) > 0.5) {
                    window._dir.set(dxR, 0, dzR).normalize(); this.scp.pos.addScaledVector(window._dir, 2.5 * dt); this.scp._lastSpeed = 2.5;
                    window.stepTimer -= dt; if (window.stepTimer <= 0){ window.stepSound(); window.stepTimer = 0.3; }
                    let wy = Math.atan2(dxR, dzR); this.scp.yaw += window.shortAngle(this.scp.yaw, wy) * (1 - Math.exp(-4 * dt));
                } else { Brain.phase = 'dormant'; Brain.phaseTimer = 0; Brain.mem.dormantTime = 0; Brain.mem.nextWalkIn = 20 + Math.random()*15; this.scp.yaw = Math.atan2(-1, -1); }
            } else if (Brain.phase === 'walking') {
                const wx = Brain.walkTarget.x, wz = Brain.walkTarget.z, dxW = wx - this.scp.pos.x, dzW = wz - this.scp.pos.z;
                if (Math.hypot(dxW, dzW) > 0.6) {
                    window._dir.set(dxW, 0, dzW).normalize(); this.scp.pos.addScaledVector(window._dir, 1.5 * dt); this.scp._lastSpeed = 1.5;
                    window.stepTimer -= dt; if (window.stepTimer <= 0){ window.stepSound(); window.stepTimer = 0.55; }
                    let wy = Math.atan2(dxW, dzW); this.scp.yaw += window.shortAngle(this.scp.yaw, wy) * (1 - Math.exp(-3 * dt));
                } else { Brain.walkTarget.x = (Math.random() - 0.5) * 13; Brain.walkTarget.z = (Math.random() - 0.5) * 13; }
            } else if (Brain.phase === 'returning') {
                if (this.scp.returnTileIdx === undefined) this.scp.returnTileIdx = World.findNearestTile(this.scp.pos.x, this.scp.pos.z, 0);
                if (this.scp.returnTileIdx > 0) {
                    const t = World.pathTiles[this.scp.returnTileIdx], tLL = t.len || World.TILE_LEN;
                    const jx = t.cx - t.dirX * tLL / 2, jz = t.cz - t.dirZ * tLL / 2;
                    const dxH = jx - this.scp.pos.x, dzH = jz - this.scp.pos.z;
                    if (Math.hypot(dxH, dzH) > 0.4) {
                        window._dir.set(dxH, 0, dzH).normalize(); this.scp.pos.addScaledVector(window._dir, window.RETURN_SPEED * dt); this.scp._lastSpeed = window.RETURN_SPEED;
                        window.stepTimer -= dt; if (window.stepTimer <= 0){ window.stepSound(); window.stepTimer = 0.08; }
                        let wy = Math.atan2(dxH, dzH); this.scp.yaw += window.shortAngle(this.scp.yaw, wy) * (1 - Math.exp(-8 * dt));
                    } else this.scp.returnTileIdx--;
                } else {
                    const homeX = -5.2, homeZ = -6.2, dxH = homeX - this.scp.pos.x, dzH = homeZ - this.scp.pos.z;
                    if (Math.hypot(dxH, dzH) > 0.6) {
                        window._dir.set(dxH, 0, dzH).normalize(); this.scp.pos.addScaledVector(window._dir, window.RETURN_SPEED * dt); this.scp._lastSpeed = window.RETURN_SPEED;
                        window.stepTimer -= dt; if (window.stepTimer <= 0){ window.stepSound(); window.stepTimer = 0.08; }
                        let wy = Math.atan2(dxH, dzH); this.scp.yaw += window.shortAngle(this.scp.yaw, wy) * (1 - Math.exp(-8 * dt));
                    } else {
                        this.scp.pos.set(homeX, 0, homeZ); this.root.position.copy(this.scp.pos); this.root.rotation.y = this.scp.yaw;
                        Brain.phase = 'dormant'; Brain.phaseTimer = 0; Brain.mem.dormantTime = 0; Brain.mem.nextWalkIn = 20 + Math.random()*15;
                        Network.scpCooldown = 5.0; World.wallGapState = 'closing'; this.scp.returnTileIdx = undefined;
                    }
                }
            } else this.scp._lastSpeed *= 0.85;

            if (Brain.phase === 'chase' || Brain.phase === 'returning') {
                if (this.scp.pos.z > World.ROOM/2 + 0.5) World.clampToCorridor(this.scp.pos);
                else if (this.scp.pos.z > World.ROOM/2 - 0.5) this.scp.pos.x = Math.max(-World.WALL_GAP_HALF_W + 0.5, Math.min(World.WALL_GAP_HALF_W - 0.5, this.scp.pos.x));
                else if (Brain.phase === 'chase' && this.scp.pos.z < -World.ROOM/2 + 0.5) {
                    if (this.scp.pos.z > -World.ROOM/2 - 0.7) this.scp.pos.x = Math.max(-1.1, Math.min(1.1, this.scp.pos.x));
                    else this.scp.pos.x = Math.max(-World.ANTE_W/2 + 0.6, Math.min(World.ANTE_W/2 - 0.6, this.scp.pos.x));
                    this.scp.pos.z = Math.max(-17 + 0.6, this.scp.pos.z);
                } else {
                    this.scp.pos.x = Math.max(-World.ROOM/2 + 1.0, Math.min(World.ROOM/2 - 1.0, this.scp.pos.x));
                    this.scp.pos.z = Math.max(-World.ROOM/2 + 1.0, this.scp.pos.z);
                }
            } else {
                this.scp.pos.x = Math.max(-World.ROOM/2 + 1.0, Math.min(World.ROOM/2 - 1.0, this.scp.pos.x));
                this.scp.pos.z = Math.max(-World.ROOM/2 + 1.0, Math.min(World.ROOM/2 - 1.0, this.scp.pos.z));
            }
            this.root.position.copy(this.scp.pos);
            this.root.rotation.y = this.scp.yaw;
        }
    }
};
