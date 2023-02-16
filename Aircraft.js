"use strict";

class Aircraft{ // Class used to build and manage each aircraft
    static directory = {};
    static directoryList = [];
    static memory = {};
    static html;
    static tails;

    static updateDirectoryList(){
        this.directoryList = [];

        for(let callsign in this.directory){
            this.directoryList.push(this.directory[callsign]);
        }
    }

    static select(x, y){
        const list = this.directoryList;
        let minAircraft = list[0];
        let minDistance = calcDistance(x, y, minAircraft.x, minAircraft.y);
        let isMinSelected = minAircraft.selected;

        list.forEach(aircraft => {
            const distance = calcDistance(x, y, aircraft.x, aircraft.y);

            if(distance < minDistance){
                minAircraft = aircraft;
                minDistance = distance;
                isMinSelected = aircraft.selected;
            }

            aircraft.selected = false;
        });

        if(minDistance < 1.5){
            minAircraft.selected = !isMinSelected;
        }
    }

    static getAircraft(targetCallsign){
        if(this.directory[targetCallsign] !== undefined){
            return this.directory[targetCallsign];
        }

        const list = this.directoryList;
        for(let i = 0, length = list.length; i < length; i++){
            const aircraft = list[i];
            if(aircraft.callsign.search(targetCallsign + "\\b") !== -1){
                return aircraft;
            }
        }
    };

    static updateAll(){
        this.directoryList.forEach(aircraft => {
            aircraft.proximity = 0;
            aircraft.update();
        });

        this.calcSeperation();

        Sim.ucount++;
    }

    static drawAll(deep){
        this.directoryList.forEach(aircraft => {
            aircraft.draw(deep);
        });

        Sim.fcount++;
    }

    static intercept(callsign, targetCallsign, round = 5){
        const plane = this.getAircraft(callsign);
        const target = this.getAircraft(targetCallsign);

        const dx = target.x - plane.x;
        const dy = target.y - plane.y;

        const acosN = target.gndspd * ((dy * Math.cos(target.hdgMath)) - (dx * Math.sin(target.hdgMath)));
        const acosD = plane.gndspd * (dx**2 + dy**2) ** 0.5;

        let hdg = Math.acos(acosN / acosD) - Math.atan2(dx, dy);

        hdg *= 180 / Math.PI;
        hdg = -hdg + 90;
        hdg = Math.round(hdg / round) * round;
        hdg = plane.hdgState.hdgCorrect(hdg);

        if(isNaN(hdg)){
            return "Intercept Not Possible";
        }

        let alt = plane.altState.target === target.alt;
        Controller.stations[119.2].radio.transmit(plane.shortCall + ", fly " + hdg + (alt ? "":", altitude " + Math.round(target.alt / 100) * 100));

        return hdg;
    }

    static calcSeperation(){
        const list = this.directoryList;
        const length = list.length;
        const t = 1 / Sim.ups;
        let memory = this.memory;

        for(let i = 0; i < length - 1; i++){
            const aircraft1 = list[i];
            const call1 = aircraft1.callsign;

            if(memory[call1] === undefined){memory[call1] = {};}

            for(let j = i + 1; j < length; j++){
                const aircraft2 = list[j];
                let last = memory[call1][aircraft2.callsign];

                const distance = calcDistance(aircraft1.x, aircraft1.y, aircraft2.x, aircraft2.y);
                const altDist = Math.abs(aircraft2.alt - aircraft1.alt);

                if(distance < 0.1 && altDist < 100){
                    aircraft1.remove();
                    aircraft2.remove();

                    this.calcSeperation();
                    return;
                }

                if(last === undefined){
                    last = {distance:distance, alt:altDist};
                    memory[call1][aircraft2.callsign] = last;
                }
                
                const deltaDistance = (distance - last.distance) / t;
                const deltaAlt = (altDist - last.alt) / t;

                last.distance = distance;
                last.alt = altDist;

                let prox = 0;

                if(distance < 3 && altDist < 990){ // should be 1000, gave a 10ft buffer due to the acceleration going slightly over
                    prox = 3;
                }
                else if(-deltaDistance * 30 > distance - 3 && -deltaAlt * 30 > altDist - 1000){ // if within 30 seconds of conflict
                    prox = 2;
                }
                else if(-deltaDistance * 60 > distance - 3 && -deltaAlt * 60 >= altDist - 1000){ // if within 60 seconds of conflict (>= so green turns on when exactly 1000')
                    prox = 1;
                }

                aircraft1.proximity = Math.max(prox, aircraft1.proximity);
                aircraft2.proximity = Math.max(prox, aircraft2.proximity);
            }
        }
    }

    constructor(callsign, x = random(-1000, 1000, 250), y = random(-1000, 1000, 250), alt = random(8000, 12000, 1000), hdg = random(10, 360, 30), spd = random(200, 250, 10), annouce = true){
        if(callsign.search(" ") === -1){
            this.callsign = callsign.toUpperCase();

            // N2291C → 91C
            const length = this.callsign.length;
            this.shortCall = this.callsign[length - 3] + this.callsign[length - 2] + this.callsign[length - 1];
        }
        else{
            this.shortCall = callsign.split(" ")[1];
            this.callsign = callsign.toLowerCase().split(" ").join("");
        }

        // assign random voice
        this.radio = new Radio(this.callsign, message => {this.recieve(message);});

        this.x = x;
        this.y = y;

        this.plan = "VFR";
        this.task = "VFR";

        // build states for alt, spd, and hdg
        this.altState = new State(alt, 1500 / 60, 5, 1000, 17000);
        this.spdState = new State(spd, 2, 3, 160, 250);
        this.hdgState = new StateHDG(hdg, 3, 3);

        // All the indevidual html componets of the plane, consisting of a body, a path line, status text, and a tail showing past positions | soon a seperation circle as well
        this.html = document.createElement("div");
        this.html.className = "aircraft";

        this.body = document.createElement("div");
        this.body.className = "body";

        this.line = document.createElement("div");
        this.line.className = "line";

        this.circle = document.createElement("div");
        this.circle.className = "circle";

        this.text = document.createElement("div");
        this.text.className = "text";

        this.tail = document.createElement("div");
        this.tail.id = this.callsign + "_tail";

        this.selected = false;
        this.proximity = 0;
        // the tail is special, it needs to be stored in a seperate place as it does not move with the plane once drawn
        // also by the nature of how it updates, the position, number, and delay needs to be recorded for future update cycles
        this.tailDelay = 0;
        this.tailNumber = 0;

        this.tailParts = [];
        for(let i = 0; i < 15; i++){
            let part = document.createElement("div");
            part.id = this.callsign + "_" + i;
            part.className = "tail";

            let element = {
                x:this.x, y:this.y,
                html:part,
            };

            this.tailParts.push(element);
            this.tail.appendChild(part);
        }

        // add parts to html
        this.html.appendChild(this.body);
        this.html.appendChild(this.line);
        this.html.appendChild(this.circle);
        this.html.appendChild(this.text);

        Aircraft.html.appendChild(this.html);
        Aircraft.tails.appendChild(this.tail);

        Aircraft.directory[this.callsign] = this;
        Aircraft.updateDirectoryList();

        this.draw(true);

        if(annouce){
            this.checkIn("approach");
        }
    }

    get alt(){return this.altState.value;}
    get spd(){return this.spdState.value;}
    get hdg(){return this.hdgState.value;}

    set alt(value){this.altState.target = value;}
    set spd(value){this.spdState.target = value;}
    set hdg(value){this.hdgState.target = value;}

    // This a rough estimate of the ground speed / airspeed diffrence given a specific altitude
    get gndspd(){return (1.05 * this.spd) + (3 * this.alt / 1000);}
    set gndspd(value){this.spd = (value - (3 * this.altState.target / 1000)) / 1.05;}

    // nautical headings and math bearings are fliped and offset by 90* | the same formula goes both ways
    get hdgMath(){
        let hdg = -this.hdg + 90;
        hdg *= Math.PI / 180;

        return hdg;
    }

    remove(annouce = true){
        this.html.remove();
        this.tail.remove();

        const callsign = this.callsign;

        delete Radio.frequencies[this.radio.frequency][this.callsign];
        delete Aircraft.directory[callsign];
        Aircraft.updateDirectoryList();
        Aircraft.memory = {};

        if(annouce){ // **Will fix for proper ATC class**
            Controller.stations[119.2].radio.transmit(callsign + ", radar contact lost");
        }
    }

    select(){
        Aircraft.select(this.x, this.y);
    }

    updatePlan(){
        const plan = this.plan;
        const task = this.task;

        if(plan === task){
            return;
        }

        if(task === "CheckIn"){
            this.checkIn("approach");
        }
        else if(plan === "VFR"){
            this.radio.transmit("approach, " + this.callsign + ", flying vfr");
        }
        else if(plan === "LAND"){
            this.radio.transmit("approach, " + this.callsign + ", requesting ils runway 36 at center field");
        }
    }

    checkIn(controller){
        let checkIn = controller + ", " + this.callsign + ", with you ";

        const value = Math.round(this.alt / 100) * 100;
        const target = Math.round(this.altState.target / 100) * 100;;

        if(value !== target){
            checkIn += "passing " + value + " for " + target;
        }
        else{
            checkIn += "at " + value;
        }

        this.radio.transmit(checkIn);
    }

    update(){
        this.altState.update();

        const spdDirection = Math.sign(this.spdState.v);
        const altDirection = Math.sign(this.altState.v);

        let factor = 1;
        if(spdDirection === altDirection){ // accelerating is harder while climbing and slowing down is harder while decending
            factor = 0.75;
        }
        else if(spdDirection !== 0 && altDirection !== 0){
            factor = 1.5;
        }

        this.spdState.velocityFactor = factor;

        this.spdState.update();
        this.hdgState.update();

        const t = 1 / Sim.ups; // scailed by the ups, so that faster or slower update ticks do not actually speed up or slow down the simulation, only makes it more or less accurate

        this.x += t * this.gndspd * Math.cos(this.hdgMath) / 60;
        this.y += t * this.gndspd * Math.sin(this.hdgMath) / 60;

        this.tailDelay += t;
    }

    draw(deep = false){
        // xy position that all html will be based on from the cameras perspective
        const pos = Camera.drawPos(this.x, this.y);
        const x = pos[0];
        const y = pos[1];

        // record the current position on a tail part, after a specifid number of seconds, and always reusing the same elements
        if(this.tailDelay >= 5){
            this.tailDelay = 0;

            const part = this.tailParts[this.tailNumber];
            part.x = this.x;
            part.y = this.y;

            this.tailNumber++;

            if(this.tailNumber === this.tailParts.length){
                this.tailNumber = 0;
            }
        }

        // constants for subsitution and precalculation
        const plane = this.html.style;
        const body = this.body.style;
        const line = this.line.style;
        const circle = this.circle;
        const text = this.text;

        const size = 20 * Camera.z;
        const border = 3 * Camera.z;

        const hdgCSS = this.hdg - 90;

        // if the sim map was resized in any way, window change or zoom, re calculate new sizes and offsets. this is under a conditional to save proformace
        if(deep){
            body.width = size + "px";
            body.height = size + "px";
            body.borderWidth = border + "px";

            const ring = 3 * 60 * Camera.z;
            circle.style.width = ring + "px";
            circle.style.height = ring + "px";

            const tailSize = size / 2;
            this.tailParts.forEach(part => {
                const style = part.html.style;
                style.width = tailSize + "px";
                style.height = tailSize + "px";
            });
        }

        // if the html of the plane were to be drawn outside the cameras view + a buffer, then stop rendering and hide the html for proformance
        if(Camera.isOutOfBounds(x, y)){
            this.html.hidden = true;
            this.tail.hidden = true;
            return;
        }
        else if(this.html.hidden){
            this.html.hidden = false;
            this.tail.hidden = false;
        }

        // position the plane as a whole block
        plane.left = x + "px";
        plane.bottom = y + "px";
        plane.transform = "rotate(" + hdgCSS + "deg)";
        plane.zIndex = this.alt;

        // color if selected

        if(this.selected){
            body.borderColor = "#FFFF00";
            line.background = "#FFFF00";
        }
        else{
            body.borderColor = "";
            line.background = "";
        }

        // line represents when the plane will be at the end in one minuet
        line.width = this.gndspd * Camera.z + "px";

        // change the altitude text if decending/maintaining/climbing
        const altTexts = ["↓", "=", "↑"];
        const altText = altTexts[Math.sign(Math.round(this.altState.v / 5)) + 1]; // x = [-1, 0, 1] → x = [0, 1, 2]

        let data = this.callsign + "\n";
        data += Math.round(this.alt / 100) + altText + Math.round(this.altState.target / 100) + "\n";
        data += Math.round(this.gndspd);

        // Change the color of the rings based on other plane proximity (from updateAll)
        let hide = false;
        if(this.proximity === 0){
            hide = true;
        }
        else{
            const colors = ["#00C000", "#FFFF00", "#FF0000"]; // green, yellow, red
            circle.style.borderColor = colors[this.proximity - 1];
        }

        if(circle.hidden !== hide){
            circle.hidden = hide;
        }
    
        // if the text has not changed dont render it again
        if(text.innerText !== data){
            text.innerText = data;
        }

        // position the text box always above the plane, regardless of hdg
        text.style.left = 5 * size * Math.sin(this.hdgMath) + "px";
        text.style.bottom = 5 * size * Math.cos(this.hdgMath) + "px";
        text.style.transform = "translate(-50%, 50%) rotate(" + -hdgCSS + "deg)";

        // update positions for each tail part
        this.tailParts.forEach(part => {
            const style = part.html.style;
            const pos = Camera.drawPos(part.x, part.y);

            style.left = pos[0] + "px";
            style.bottom = pos[1] + "px";
        });
    }

    recieve(message){
        let parts = message.split(", ");
        let targetCallsign = parts[0].toUpperCase();

        // return if instruction is not for this aircraft
        if(this.callsign.search(targetCallsign + "\\b") === -1){ // its a search as to allow someone to use the full, shorted, or even just one letter of the callsign
            return; // Note, if multiple aircraft fit the search, all will exectue the instruction
        }

        let readback = "";
        let actions = {};

        const hdgCommands = ["fly", "turn"];
        const altCommands = ["altitude", "climb", "descend"];
        const spdCommands = ["speed", "slow"];
        const stateCommands = hdgCommands.concat(altCommands).concat(spdCommands);

        // Pick out each command in the request, witch might have a combination of them in any order
        for(let i = 1, length = parts.length; i < length; i++){
            const part = parts[i].split(" ");
            const command = part[0];
            let target = part[part.length - 1];

            readback += ", ";

            if(command === "say"){
                let systemCode = "";
                if(target === "heading"){
                    systemCode = "hdg";
                }
                else if(target === "altitude"){
                    systemCode = "alt";
                }
                else if(target === "speed"){
                    systemCode = "spd";
                }
                else{
                    readback += "confirm " + target + "?";
                    continue;
                }

                const system = this[systemCode+"State"];
                const distance = system.target - system.value;
                const direction = Math.sign(distance);

                let value = Math.round(system.value);

                if(direction === 0){
                    readback += target + " " + value;
                }
                else{
                    if(systemCode === "alt"){
                        value = Math.round(this.alt / 100) * 100;
                    }

                    readback += "passing " + value + " for " + system.target;
                }
            }
            else if(command === "contact" || command === "monitor"){
                target = parseFloat(target);

                const controller = part.slice(1, part.length - 2).join(" ");
                actions.frequency = target;
                actions.checkIn = command === "contact" ? controller : "";

                readback += command + " " + controller + " on " + target;
            }
            else if(stateCommands.indexOf(command) !== -1){
                target = Math.round(target);

                let systemCode = "";
                let responses = [];

                if(hdgCommands.indexOf(command) !== -1){
                    systemCode = "hdg";
                    responses = ["turn left", "maintain", "turn right"];
                }
                else if(altCommands.indexOf(command) !== -1){
                    systemCode = "alt";
                    responses = ["descend and maintain", "maintain", "climb and maintain"];
                }
                else if(spdCommands.indexOf(command) !== -1){
                    systemCode = "spd";
                    responses = ["decrease to", "maintain", "increase to"];
                }

                const system = this[systemCode+"State"];
                const possibleTarget = system.test(target);
                const distance = possibleTarget - system.value;
                let direction = Math.sign(distance);

                if(systemCode === "hdg" && Math.abs(distance) > 180){
                    direction = -direction;
                }

                const response = responses[direction + 1];
                
                if(possibleTarget !== target){
                    readback += "unable " + target + ", will ";
                }

                readback += response + " " + possibleTarget;
                actions[systemCode] = possibleTarget;

                continue;
            }
            else{
                readback += "confirm " + command + "?";
            }
        }

        // readback = ", ..." → "..."
        readback = readback.split("");
        readback.shift();
        readback.shift();
        readback = readback.join("");

        readback += ", " + this.shortCall;

        const callback = () => {
            if(actions.hdg !== undefined){
                this.hdg = actions.hdg;
            }
            if(actions.alt !== undefined){
                this.alt = actions.alt;
            }
            if(actions.spd !== undefined){
                this.spd = actions.spd;
            }
            if(actions.frequency !== undefined){
                this.radio.frequency = actions.frequency;
                
                if(actions.checkIn !== ""){
                    this.checkIn(actions.checkIn);
                }
            }
        };

        // Set the new targets after the response is done being readback
        this.radio.transmit(readback, callback); // this semi simulates the delay between the command being recieved and it being done
    }
}