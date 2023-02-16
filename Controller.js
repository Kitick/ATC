class Controller{
    static stations = {};
    
    constructor(name, frequency = 119.2){
        this.name;
        this.radio = new Radio(name, message => {this.recieve(message);}, frequency);

        Controller.stations[frequency] = this;
    }

    recieve(message){
        const parts = message.split(", ");

        parts.forEach(element => {
            
        });
    }
}