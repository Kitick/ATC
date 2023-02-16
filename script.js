"use strict";

function loaded(){
    // Initalize
    Aircraft.html = document.getElementById("aircraft");
    Aircraft.tails = document.getElementById("tails");
    Camera.onresize();

    // Events for cameramovment
    window.onresize = event => {Camera.onresize(event);};
    window.onmousedown = event => {Camera.onmousedown(event);};
    window.onmouseup = event => {Camera.onmouseup(event);};
    window.onmousemove = event => {Camera.onmousemove(event);};
    window.onmousewheel = event => {Camera.onmousewheel(event);};
    window.onclick = event => {Camera.onclick(event);};
    //window.oncontextmenu = event => {event.preventDefault();};

    const callsigns = ["N2291C", "N495SP", "N292ED", "N752DW", "N328ME", "N670CS", "N421RW", "N40RF", "N37JA"];
    callsigns.forEach(callsign => {
        new Aircraft(callsign, undefined, undefined, undefined, undefined, undefined, false);
    });

    // Set voices for radio now that they are loaded
    window.speechSynthesis.onvoiceschanged = () => {
        Radio.voices = window.speechSynthesis.getVoices();

        for(let callsign in Aircraft.directory){
            Aircraft.directory[callsign].radio.randomVoice();
        }
    };

    Sim.start();
}

function calcDistance(x1, y1, x2, y2){
    const dx = (x2 - x1) ** 2;
    const dy = (y2 - y1) ** 2;
    let distance = (dx + dy) ** 0.5;
    distance /= 60;

    return distance;
}

function random(min, max, nearest = 1){
    min /= nearest;
    max /= nearest;

    let number = Math.floor(Math.random() * (max - min + 1) + min);
    number *= nearest;

    return number;
}

const atc = new Controller("Approach", 119.2).radio;