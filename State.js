"use strict";

class State{ // Class used to factor out common code used for updating climbs, turns, and accelerations.
    constructor(inital, maxVelocity, accelTime = 3, min = undefined, max = undefined){ // defined as having a value, and a target. And the rate or "velocity" of the change to the target.
        this._value = inital;
        this._target = inital;
        this.min = min;
        this.max = max;

        this.v = 0;
        this.maxVelocity = maxVelocity;
        this.trueMaxVelocity = maxVelocity;

        this.a = 0;
        this.aTarget = 0;
        this.accelTime = accelTime;

        this.velocityFactor = 1; // sets aTarget as well
    }

    get velocityFactor(){return this._velocityFactor;}

    set velocityFactor(value){
        this._velocityFactor = value;
        this.maxVelocity = value * this.trueMaxVelocity;
        this.aTarget = this.maxVelocity / this.accelTime;
    }

    update(circular = false){ // Update the value closer to the target based on the change rate, scaled by the ups rate.
        const t = 1 / Sim.ups;
        let distance = this.target - this.value;

        // if circular and the diffrance is more than half the range, re calculate distanceTo in the other direction
        if(circular && Math.abs(distance) > 180){
            distance = -Math.sign(distance) * (360 - Math.abs(distance));
        }
        const absV = Math.abs(this.v);
        
        // if distanceTo is basically zero and velocity is basically zero, set to zero to avoid microupdates
        if(Math.abs(distance) < 2 * t && Math.abs(this.v) < 2 * t){
            this.value = this.target;
            this.v = 0;
            return 0;
        }

        // the limit distance is the distanceTo that it will travel until the velocity is 0 | this is a physical kinimatic
        // accelerate towards the target, unless within the limit, the go backwards
        // and the direction must match velocity
        const limitdistance = this.v ** 2 / (2 * this.aTarget);
        this.a = Math.sign(distance) * this.aTarget;
        if(Math.abs(distance) <= Math.abs(limitdistance) && Math.sign(distance) === Math.sign(this.v)){
            this.a = -this.a;
        }

        // if accelerating to v, and v is at max, set max and reset acceleration. If velocity is over max, accelerate the other way
        if(Math.sign(this.a) === Math.sign(this.v) && absV >= this.maxVelocity){
            if(Math.abs(this.maxVelocity - absV) < 2 * t){
                this.v = Math.sign(this.v) * this.maxVelocity;
                this.a = 0;
            }
            else{
                this.a = -this.a;
            }
        }

        // update value and v based on the physical kinimatics
        const deltaX = 0.5 * this.a * t ** 2 + this.v * t;
        const deltaV = this.a * t;

        this.value += deltaX;
        this.v += deltaV;
    }

    test(value){ // this is so that the readbacks can know if a request is even possible before trying to execute it
        // theres a lot of targets, basically it sets the value and uses the setter for target to check the min/max, then resets it back to what it was before
        let target = this.target;
        this.target = value;
        let newTarget = this.target;
        this.target = target;

        return newTarget;
    }

    get value(){return this._value;}
    get target(){return this._target;}

    set value(value){this._value = value;}
    set target(value){
        if(value < this.min){value = this.min;} else if(value > this.max){value = this.max;}

        this._target = value;
    }
}

class StateHDG extends State{ // Special version to account for the oddity headings add by being circular by definiton.
    constructor(inital, rate){
        super(inital, rate);
    }

    hdgCorrect(hdg){ // -INF < x < INF
        hdg %= 360; // -360 < x < 360
        hdg += 360; // 0 < x < 720
        hdg %= 360; // 0 <= x < 360
        if(hdg === 0){hdg = 360;} // 0 < x <= 360 // this is because heading 0 is represented as 360

        return hdg;
    }

    update(){ // update with circular set to true
        super.update(true);
    }

    get value(){return this._value;}
    get target(){return this._target;}

    set value(value){this._value = this.hdgCorrect(value);}
    set target(value){this._target = this.hdgCorrect(value);}
}