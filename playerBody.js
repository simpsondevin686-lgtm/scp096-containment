import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export class PlayerBody {
    constructor(scene, isLocal = false) {
        this.isLocal = isLocal;
        this.mesh = new THREE.Group();
        this.walkPhase = 0;
        this.walkAmount = 0;
        scene.add(this.mesh);
        
        if (this.isLocal) window.playerBody = this.mesh; // Bridge for local death animations

        const pOrange = new THREE.MeshStandardMaterial({color:0xff6a1a, roughness:0.85, metalness:0.0});
        const pOrangeDark = new THREE.MeshStandardMaterial({color:0xc84a0a, roughness:0.9});
        const pSkin = new THREE.MeshStandardMaterial({color:0xd9a884, roughness:0.75});
        const pBoot = new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.7});
        const pBlack = new THREE.MeshStandardMaterial({color:0x111111, roughness:0.6});

        this.hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.16, 5, 10), pOrange);
        this.hips.position.y = 0.88;
        this.mesh.add(this.hips);

        this.belt = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), pBlack);
        this.belt.position.y = 0.98;
        this.mesh.add(this.belt);

        this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.32, 6, 12), pOrange);
        this.torso.position.y = 1.20;
        this.mesh.add(this.torso);
        
        const zipper = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.3, 0.02), pBlack);
        zipper.position.set(0, 1.20, 0.19);
        this.mesh.add(zipper);

        this.neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1), pSkin);
        this.neck.position.y = 1.45;
        this.mesh.add(this.neck);

        this.head = new THREE.Group();
        this.head.position.y = 1.55;
        this.mesh.add(this.head);
        
        const face = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), pSkin);
        this.head.add(face);
        
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.155, 12, 12), pBlack);
        hair.scale.set(1, 0.6, 1);
        hair.position.y = 0.08;
        this.head.add(hair);

        const buildLeg = (side) => {
            const hipG = new THREE.Group();
            hipG.position.set(side*0.11, 0.85, 0);
            this.mesh.add(hipG);
            
            const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.22, 5, 8), pOrange);
            thigh.position.y = -0.18; hipG.add(thigh);
            
            const kneeG = new THREE.Group();
            kneeG.position.y = -0.38; hipG.add(kneeG);
            
            const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.28, 5, 8), pOrange);
            shin.position.y = -0.18; kneeG.add(shin);
            
            const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), pBoot);
            boot.position.set(0, -0.38, 0.05); kneeG.add(boot);
            return { hipG, kneeG };
        };
        this.legL = buildLeg(-1);
        this.legR = buildLeg(1);

        const buildArm = (side) => {
            const shoulderG = new THREE.Group();
            shoulderG.position.set(side*0.24, 1.38, 0.05);
            this.mesh.add(shoulderG);
            
            const shoulderPad = new THREE.Mesh(new THREE.SphereGeometry(0.08), pOrangeDark);
            shoulderG.add(shoulderPad);
            
            const bicep = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.15, 5, 8), pOrange);
            bicep.position.y = -0.14; shoulderG.add(bicep);
            
            const elbowG = new THREE.Group();
            elbowG.position.y = -0.28; shoulderG.add(elbowG);
            
            const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.15, 5, 8), pOrange);
            forearm.position.y = -0.12; elbowG.add(forearm);
            
            const hand = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.05), pSkin);
            hand.position.y = -0.28; elbowG.add(hand);
            
            return { shoulderG, elbowG };
        };
        this.armL = buildArm(-1);
        this.armR = buildArm(1);
        
        if (this.isLocal) {
            window.pArmL = this.armL;
            window.playerHead = this.head;
            window.pArmR = this.armR;
        }
    }

    update(dt, playerPos, yaw, moveX, moveY, eyesClosed, dead, deathAnimActive) {
        if (dead && deathAnimActive) return;
        
        const moveMag = dead ? 0 : Math.min(1, Math.hypot(moveX, moveY));
        const targetWalk = moveMag > 0.15 ? Math.min(1, moveMag * 2) : 0;
        this.walkAmount += (targetWalk - this.walkAmount) * (1 - Math.exp(-10 * dt));

        const prevPhase = this.walkPhase;
        if (this.walkAmount > 0.1){
            const speedScale = eyesClosed ? 0.6 : 1.0;
            this.walkPhase += dt * 8 * (0.6 + this.walkAmount * 0.4) * speedScale; 
        }
        if (this.walkAmount > 0.3 && !dead && this.isLocal){
            if (Math.floor(prevPhase / Math.PI) !== Math.floor(this.walkPhase / Math.PI)){
                if (window.playerStep) window.playerStep();
            }
        }

        if (eyesClosed || (this.isLocal && window.Animations && window.Animations.isSuiciding)) {
            this.mesh.visible = false;
            return;
        }
        this.mesh.visible = true;

        const bX = Math.sin(yaw) * 0.4;
        const bZ = Math.cos(yaw) * 0.4;
        this.mesh.position.set(playerPos.x + bX, 0, playerPos.z + bZ);
        this.mesh.rotation.y = yaw;

        const swing    = Math.sin(this.walkPhase);
        const swingOpp = Math.sin(this.walkPhase + Math.PI);
        const cosP     = Math.cos(this.walkPhase);
        const cosOpp   = Math.cos(this.walkPhase + Math.PI);

        this.legL.hipG.rotation.x  = swing * 0.6 * this.walkAmount;
        this.legL.kneeG.rotation.x = -Math.max(0, cosP) * 1.1 * this.walkAmount;
        this.legR.hipG.rotation.x  = swingOpp * 0.6 * this.walkAmount;
        this.legR.kneeG.rotation.x = -Math.max(0, cosOpp) * 1.1 * this.walkAmount;

        this.armL.shoulderG.rotation.x = swingOpp * 0.5 * this.walkAmount;
        this.armR.shoulderG.rotation.x = swing * 0.5 * this.walkAmount;
        this.armL.elbowG.rotation.x = -0.2 - Math.max(0, swingOpp) * 0.4 * this.walkAmount;
        this.armR.elbowG.rotation.x = -0.2 - Math.max(0, swing) * 0.4 * this.walkAmount;

        const breathe = Math.sin(performance.now() * 0.002) * 0.008;
        this.torso.position.y = 1.20 + breathe;
        this.head.rotation.x = Math.sin(this.walkPhase * 2) * 0.05 * this.walkAmount;
    }

    reset() {
        if(this.mesh){ this.mesh.rotation.set(0, 0, 0); this.mesh.visible = true; }
    }
}
