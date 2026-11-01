export const CustomAnimations = {
    currentAnim: null,
    time: 0,
    library: {
        pressButton: [
            { t: 0.0, bone: 'armR', x: 0, z: 0 },
            { t: 0.5, bone: 'armR', x: -1.5, z: 0.2 }, // Reach out
            { t: 1.5, bone: 'armR', x: -1.5, z: 0.2 }, // Hold against button
            { t: 2.0, bone: 'armR', x: 0, z: 0 }       // Pull back
        ]
    },
    play(name) {
        if (!this.library[name]) return;
        this.currentAnim = name;
        this.time = 0;
    },
    stop() {
        this.currentAnim = null;
        this.time = 0;
    },
    update(dt, body) {
        if (!this.currentAnim) return false;
        this.time += dt;
        const anim = this.library[this.currentAnim];
        let prevFrame = anim[0];
        let nextFrame = anim[anim.length - 1];
        
        for (let i = 0; i < anim.length; i++) {
            if (anim[i].t <= this.time) prevFrame = anim[i];
            if (anim[i].t > this.time) { nextFrame = anim[i]; break; }
        }
        if (this.time > nextFrame.t) { this.stop(); return false; }
        
        const progress = (this.time - prevFrame.t) / (nextFrame.t - prevFrame.t || 1);
        if (prevFrame.bone === nextFrame.bone) {
            const bone = this.getBone(body, prevFrame.bone);
            if (bone) {
                bone.rotation.x = prevFrame.x + (nextFrame.x - prevFrame.x) * progress;
                bone.rotation.z = prevFrame.z + (nextFrame.z - prevFrame.z) * progress;
            }
        }
        return true;
    },
    getBone(body, name) {
        if (name === 'armL') return body.armL.shoulderG;
        if (name === 'armR') return body.armR.shoulderG;
        if (name === 'legL') return body.legL.hipG;
        if (name === 'legR') return body.legR.hipG;
        if (name === 'head') return body.head;
        return null;
    }
};
