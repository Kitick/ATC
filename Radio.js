class Radio{
    static frequencies = {};
    static voices = window.speechSynthesis.getVoices();

    constructor(name, onRecieve = () => {}, frequency = 119.2, voice = undefined){
        this.name = name;
        this.frequency = frequency;
        this.onRecieve = onRecieve;

        this.randomVoice();

        this.speed = (this.voice === undefined || this.voice.localService ? 2:1);
    }

    get frequency(){return this._frequency;}
    set frequency(value){
        const frequencies = Radio.frequencies;

        delete frequencies[this.frequency]?.[this.name];

        this._frequency = value;
        
        if(frequencies[this.frequency] === undefined){
            frequencies[this.frequency] = {};
        }

        frequencies[this.frequency][this.name] = this;
    }

    randomVoice(){
        this.voice = Radio.voices[Math.floor(Math.random() * Radio.voices.length)];
    }

    transmit(message, action = () => {}){
        const original = message;
        message = this.format(message);

        // build the utterance and speak and log the message | note if the voice is localService it can be speed 2, otherwise its 1 | try the others on 2 and youll see why
        let utterance = new window.SpeechSynthesisUtterance(message);
        utterance.voice = this.voice;
        utterance.rate = this.speed;

        utterance.onstart = () => {console.log(this.frequency, original);};
        utterance.onend = action;

        window.speechSynthesis.speak(utterance);

        // Speak first so that the sender is read before the recievers readback
        const listeners = Radio.frequencies[this.frequency];
        for(let name in listeners){
            if(name === this.name){
                continue;
            }

            let radio = listeners[name];

            radio.onRecieve(original);
        }
    }

    format(string){
        string = this.numberCorrect(string);

        // list of all the phonetic replacments, will only replace capital letters blindly, sentences that start with a captical will get that letter replaced
        const replacments = {
            "\\.":"point", // "\\" because of regex
            "0":"zero", "1":"one", "2":"two", "3":"three", "4":"four", "5":"five", "6":"six", "7":"seven", "8":"eight", "9":"niner",
            "A":"alpha", "B":"bravo", "C":"charlie", "D":"delta", "E":"echo", "F":"foxtrot", "G":"golf", "H":"hotel", "I":"india", "J":"juliet",
            "K":"kilo", "L":"lima", "M":"mike", "N":"november", "O":"oscar", "P":"papa", "Q":"quebec", "R":"romeo", "S":"sierra", "T":"tango",
            "U":"uniform", "V":"victor", "W":"whisky", "X":"xray", "Y":"yankee", "Z":"zulu",
        };

        for(let character in replacments){
            string = string.replace(new RegExp(character, "g"), " " + replacments[character] + " ");
        }

        // clean up the text from double spaces and akward commas
        string = string.replace(/  +/g, " ");
        string = string.replace(/ ,/g, ",").trim();

        return string;
    }

    numberCorrect(string){ // this takes a number like 1500 and converts it to 1 thousand 5 hundred for readbacks. Also converts hdgs to always be 3 digits | bug currently if spd or alt is 1 or 2 digits
        string = string.split(" ");

        for(let i = 0, length = string.length; i < length; i++){
            // for each part or word, if it doesnt contain a digit or decimal, return
            let part = string[i].replace(/,/g, "");
            if(part.search(/\D/g) !== -1){
                continue;
            }

            // record if a comma was used, this is to clean up the readback text
            let comma = part !== string[i];
            part = Math.round(part).toString();

            if(part.length < 3){ // if the number is less than 3 digits add 0s to make it 3 digits
                part = "0".repeat(3 - part.length) + part;
            }
            else if(part.length > 3){ // otherwise parse the number into thousands and hundreds. Yes 1-0 Thousand is a correct readback
                // disregard the last 2 digits
                part = part.split("");
                part.pop();
                part.pop();

                const thousand = part.length - 2;
                part[thousand] += " thousand";

                // if its a 0 delete it, otherwise add hundred
                const hundred = part.length - 1;
                if(part[hundred] === "0"){
                    part.splice(hundred, 1);
                }
                else{
                    part[hundred] += " hundred";
                }

                part = part.join(" ");
            }

            string[i] = part + (comma ? ",":"");
        }

        string = string.join(" ");

        return string;
    }
}