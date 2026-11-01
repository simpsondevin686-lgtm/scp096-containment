import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

export const PlayerBody = {
    mesh: null, torso: null, belt: null, hips: null,
    legL: null, legR: null, armL: null, armR: null,
    walkPhase: 0, walkAmount: 0,

    init(scene) {
        this.mesh = new THREE.Group();
        scene.add(this.mesh);
        window.playerBody = this.mesh; // Bridge for death animations

        const pOrange = new THREE.MeshStandardMaterial({color:0xff6a1a, roughness:0.85, metalness:0.0});
        const pOrangeDark = new THREE.MeshStandardMaterial({color:0xc84a0a, roughness:0.9});
        const pSkin = new THREE.MeshStandardMaterial({color:0xd9a884, roughness:0.75});
        const pBoot = new THREE.MeshStandardMaterial({color:0x1a1a1a, roughness:0.7});

        this.torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.32, 6, 12), pOrange);
        this.torso.position.y = 1.20;
        this.mesh.add(this.torso);

        this.belt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.20, 0.07, 12), pOrangeDark);
        this.belt.position.y = 0.96;
        this.mesh.add(this.belt);

        this.hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.16, 5, 10), pOrange);
        this.hips.position.y = 0.88;
        this.mesh.add(this.hips);

        const buildLeg = (side) => {
            const hipG = new THREE.Group();
            hipG.position.set(side*0.10, 0.90, 0);
            this.mesh.add(hipG);
            const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.23, 5, 8), pOrange);
            thigh.position.y = -0.205; hipG.add(thigh);
            const kneeG = new THREE.Group();
            kneeG.position.y = -0.41; hipG.add(kneeG);
            const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.29, 5, 8), pOrange);
            shin.position.y = -0.22; kneeG.add(shin);
            const foot = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.08, 0.24), pBoot);
            foot.position.set(0, -0.45, -0.06); kneeG.add(foot);
            return { hipG, kneeG };
        };
        this.legL = buildLeg(-1);
        this.legR = buildLeg(1);

        const buildArm = (side) => {
            const shoulderG = new THREE.Group();
            shoulderG.position.set(side*0.25, 1.40, 0.1);
            shoulderG.rotation.z = side * 0.05;
            this.mesh.add(shoulderG);
            const cap = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), pOrange);
            shoulderG.add(cap);
            const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.16, 5, 8), pOrange);
            upper.position.y = -0.15; shoulderG.add(upper);
            const elbowG = new THREE.Group();
            elbowG.position.y = -0.30; shoulderG.add(elbowG);
            const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.15, 5, 8), pOrange);
            fore.position.y = -0.14; elbowG.add(fore);
            const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), pSkin);
            hand.scale.set(1, 1.3, 0.7);
            hand.position.y = -0.30; elbowG.add(hand);
            return { shoulderG, elbowG };
        };
        this.armL = buildArm(-1);
        this.armR = buildArm(1);
        
        // Bridges for animations.js
        window.pArmL = this.armL;
        window.pArmR = this.armR;
    },

    update(dt, player, eyesClosed, dead, deathAnimActive) {
        if (dead && deathAnimActive) return;
        
        const moveMag = dead ? 0 : Math.min(1, Math.hypot(window.Controls.moveX, window.Controls.moveY));
        const targetWalk = moveMag > 0.15 ? Math.min(1, moveMag * 2) : 0;
        this.walkAmount += (targetWalk - this.walkAmount) * (1 - Math.exp(-10 * dt));

        const prevPhase = this.walkPhase;
        if (this.walkAmount > 0.1){
            const speedScale = eyesClosed ? 0.6 : 1.0;
            this.walkPhase += dt * 7 * (0.6 + this.walkAmount * 0.4) * speedScale;
        }
        if (this.walkAmount > 0.3 && !dead){
            if (Math.floor(prevPhase / Math.PI) !== Math.floor(this.walkPhase / Math.PI)){
                if (window.playerStep) window.playerStep();
            }
        }

        if (eyesClosed || (window.Animations && window.Animations.isSuiciding)) {
            this.mesh.visible = false;
            return;
        }
        this.mesh.visible = true;

        const bX = Math.sin(window.Controls.yaw) * 0.4;
        const bZ = Math.cos(window.Controls.yaw) * 0.4;
        this.mesh.position.set(player.pos.x + bX, 0, player.pos.z + bZ);
        this.mesh.rotation.y = window.Controls.yaw;

        const swing    = Math.sin(this.walkPhase);
        const swingOpp = Math.sin(this.walkPhase + Math.PI);
        const cosP     = Math.cos(this.walkPhase);
        const cosOpp   = Math.cos(this.walkPhase + Math.PI);

        this.legL.hipG.rotation.x  = swing * 0.5 * this.walkAmount;
        this.legL.kneeG.rotation.x = -Math.max(0, cosP) * 0.9 * this.walkAmount;
        this.legR.hipG.rotation.x  = swingOpp * 0.5 * this.walkAmount;
        this.legR.kneeG.rotation.x = -Math.max(0, cosOpp) * 0.9 * this.walkAmount;

        this.armL.shoulderG.rotation.x = swingOpp * 0.35 * this.walkAmount;
        this.armR.shoulderG.rotation.x = swing * 0.35 * this.walkAmount;
        this.armL.elbowG.rotation.x = -0.12 - Math.max(0, swingOpp) * 0.3 * this.walkAmount;
        this.armR.elbowG.rotation.x = -0.12 - Math.max(0, swing) * 0.3 * this.walkAmount;

        const breathe = Math.sin(performance.now() * 0.0015) * 0.006;
        this.torso.position.y = 1.20 + breathe;
    },

    reset() {
        if(this.mesh){ this.mesh.rotation.set(0, 0, 0); this.mesh.visible = true; }
    }
};
