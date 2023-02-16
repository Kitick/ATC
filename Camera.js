"use strict";

class Sim{
    static fcount = 0;
    static ucount = 0;

    static fps;
    static ups;
    static warpScale;

    static updateInt;
    static drawInt;

    static start(fps = 10, ups = 10, warp = 1){
        this.stop();

        if(fps > ups){ // Drawing more frames than computed ones just wastes draw calls
            ups = fps;
        }

        this.fps = fps;
        this.ups = ups;
        this.warpScale = warp;

        this.updateInt = setInterval(() => {Aircraft.updateAll();}, 1000 / (ups * warp));
        this.drawInt = setInterval(() => {Aircraft.drawAll();}, 1000 / (fps * warp));
    }

    static stop(){
        clearInterval(this.updateInt);
        clearInterval(this.drawInt);
    }

    static warp(scale){
        this.start(this.fps, this.ups, scale);
    }
}

class Camera{
    static x = 0;
    static y = 0;
    
    static minz = 1.5 ** -3;
    static maxz = 1.5 ** 1;
    static z = 1.5 ** -2;

    static viewBuffer = 100;
    static leftBound;
    static rightBound;
    static bottomBound;
    static topBound;

    static xOffset;
    static yOffset;

    static mouseDown = [false, false, false];

    static mouseZoom = true;
    static clientX;
    static clientY;

    static drawPos(x, y){ // UI x,y from sim x,y
        x = (x - this.x) * this.z + this.xOffset;
        y = (y - this.y) * this.z + this.yOffset;

        return [x, y];
    }

    static simPos(x, y){ // sim x,y from UI x,y
        x = (x - this.xOffset) / this.z + this.x;
        y = (y - this.yOffset) / this.z + this.y;

        return [x, y];
    }

    static isOutOfBounds(x, y){
        return x < this.leftBound || x > this.rightBound || y < this.bottomBound || y > this.topBound;
    }

    static onclick(event){
        let xy = this.simPos(event.clientX, window.innerHeight - event.clientY);
        Aircraft.select(xy[0], xy[1]);
    }

    static onresize(event){
        this.leftBound = -this.viewBuffer;
        this.rightBound = window.innerWidth + this.viewBuffer;
        this.bottomBound = -this.viewBuffer;
        this.topBound = window.innerHeight + this.viewBuffer;

        this.xOffset = window.innerWidth / 2;
        this.yOffset = window.innerHeight / 2;

        Aircraft.drawAll();
    }

    static onmousedown(event){
        this.mouseDown[event.which - 1] = true;

        this.clientX = event.clientX;
        this.clientY = event.clientY;
    }
    static onmouseup(event){
        this.mouseDown[event.which - 1] = false;
    }

    static onmousemove(event){
        if(this.mouseDown[0] || this.mouseDown[1] || this.mouseDown[2]){

			let x = -(event.clientX - this.clientX) / this.z;
			let y = (event.clientY - this.clientY) / this.z;

            this.move(x, y);

            this.clientX = event.clientX;
            this.clientY = event.clientY;
		}
    }

    static onmousewheel(event){
        const scale = 1.5;
        let mod = scale;
		
        if(event.deltaY > 0){
			mod **= -1;
		}

        let z = this.z * mod;

        if(z < this.minz){
            z = this.minz;
        }
        else if(z > scale ** this.maxz){
            z = scale ** this.maxz;
        }

        if(z === this.z){
            return;
        }

        if(this.mouseZoom){
            let moveScale = 2 * (mod > 1 ? z : -this.z); // the 2 constant is based on the 1.5 scale factor

            let x = (event.clientX - this.xOffset) / moveScale;
            let y = -(event.clientY - this.yOffset) / moveScale;

            this.move(x, y, z);
        }
        else{
            this.move(undefined, undefined, z);
        }
    }

    static move(x = 0, y = 0, z = this.z){
        this.x += x;
        this.y += y;

        let zChange = this.z !== z;
        this.z = z;

        Aircraft.drawAll(zChange);
    }

    static setPos(x = this.x, y = this.y, z = this.z){
        this.move(x - this.x, y - this.y, z);
    }
}