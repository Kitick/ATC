Introduction

This an air traffic control simulator I am building to try my hand at autonomous controlling algorithms, as the current ones you can use commercially on flight sims are... to say lightly, pretty bad in terms of phraseology, capabilities, and overall usability.
This means that you can have "aircraft", "airports" and "controllers" all active and the controllers will direct the flow of air traffic to airports.
This project in its current state is by no means good yet, there's not even a good UI. All user inputs are through the console as of now. One plus, as far as my testing has gone, everything that is implemented works exactly as intended.
This project is mainly for fun, and all code was written by and tested by yours truly. Any math was derived for this application, or standard formulas were used.


Features

NOTE: Airports are a huge part of this project, however none of it has been implemented to priorize the Aircraft and Controller functionality and stability.

All graphics are drawn with HTML DIV elements, however I plan on changing this to a SVG approach for proformance and scalability reasons.
The turns and altitude changes are all physics driven, so they actually execute the turn/climb with acceleration and velocity. The ground speed also changes with airspeed and altitude.

All text is parsed and read out in correct aviation terminoligy and phonetics.
Text-to-speach is used to read out all messages, if you do not wish to hear them reading messages out, turn down or mute your volume, I plan on having a setting in the future.
The voices of aircraft is randomized and stays with the aircraft across messages and frequences. Currently however, the voices stoped randomizing and stay on the defualt voice. I have not had time to fully figure out why.
Transmitions are done over a simulated Radio, and so, only one transmition per frequency at a time. As real radios. There are currently multiple frequences, but only one is usuable.

The map is also scaled so they move at a realistic rate based on the represented distance.
The line ahead of each aircraft is called the "lead indecator". This displays where the plane will be in one minuete
The Grey dots behind represent the path that the plane has flown in past couple minuets
The UI is draggable by holding click, and it is also zoomable. You can also click on an aircraft to select it, but currently no functionality for that exists.

There are seperation rings that are displayed if it calculates a conflict is going to happen in a specific amount of time.
- Green for general awarness, or conflict within one minuete
- Yellow for imminate conflicts within 30 seconds
- Red for conflicts violating standard IFR seperation. (3nm lateral, 1000' vertical)
- Aircraft can actually collide if you manage to get them close enough.


Examples

The atc is a global variable for the controllers radio, this is only for testing and will not be the permanate way of doing this.
Keep in mind the aircraft are randomly positioned every refresh.

NOTE: To use these commands open the developer console (F12, console tab, and no im not going to give you a virus) and paste these in and hit enter. All output is also in that console window.
NOTE: Turn down the volume of your system, the text-to-speech could be loud.

Have the aircraft on screen execute turns, climbs, speed changes, change frequencies, etc.
	- atc.transmit("N2291C, turn heading 270, descend and maintain 5000");
	- atc.transmit("N495SP, speed 200, climb 25000"); // They can also deny requests if what you ask them to do something their plane cannot do.
	- atc.transmit("2ED, fly heading 180"); // The callsign can even be a shorter varient. Typically the last 3 characters are used.

Any number of instructions can be sent in any order, seperated by a comma. (as long as the callsign is first).
Even if an instructions ends up invalid for whatever reason, any instructions that are valid are executed. Denoted by a correct readback.
They also can say whatever you want as long as the key word is first and the value is last. "turn left heading 045", "turn 225".
Note turns and climbs will always be read back correctly, regardless of what you wrote. So if you said climb 5000', but they are actually at 8000', they will readback decsend.
I plan on fixing turns in the edge case where you actually do want them to turn left/right agaisnt the shorter path.

Frequencies are a little special as to allow multi-word frequecies.
	- atc.transmit("N2291C, contact approach on 119.2"); // this is the frequency you control, so they will contact you again
	- atc.transmit("N292ED, contact reno tower on 118.7"); // this is the tower frequency, since they actually switch, you cannot respond to them again on the current frequency.
	- atc.transmit("5SP, monitor ground on 121.9"); // this is the ground frequency, since you said monitor, they will switch but not broadcast a check in message.

	You can still hear them contact on other frequencies due to there being only one controller object used. Though you will not be able to respond to them unless you change the controlling frequency.
	- atc.frequency = 118.7; // The console will indicate the frequency the message was transmitted on.

It can even calculate an intercept course based on some trig that works rather well:
	- Aircraft.intercept("N2291C", "N495SP"); // This will auto transmit the heading to intercept and match altitude
	- Aircraft.intercept("5SP", "91C", 1); // You can also use shorter callsigns, and the 1 denotes the smallest heading allowed. Default is 5

You can also modulate time, by changing the simulation settings and frame rates.
- The update speed is how many times per second it will simulate. Higher values are more accurate.
- The frame speed is how many times per second it will draw the current values to the screen. Higher values are smoother.

	- Sim.stop(); // Stops the simulation
	- Sim.start(); // restarts simulation with new parameters. Frame rate (FPS), update rate (UPS), and a artifical warp. This is a scalar, so a 2 will simulate at twice real time.
	- Sim.start(10, 10, 5);


Tehcnical bits

The "Aircraft" class that contains everything related to the aircraft and how they behave. It contains all the code for the speration rings, drawing, radio parsing, and runs its own update cycles prompted by the simulation.
The "Controller" class contains the in progress methods of having a controller issue instructions to Aircraft
The "Airport" class is not implemented in this version

The "Camera" class contains all the code to allow the scales and motion to display correctly.
The "Sim" class contains the code to control the simulation. It calls the update loops for Aircraft
"script" is the driver of the program, it includes initilaztion for Camera, and provides the default aircraft.

The "Radio" class handles all the simulated radio communication and frequency changes. All aircraft and controllers have a radio.
The one expection is Aircraft and Controller have their own parsing functions. I plan on improving this coupling in the future.
The "State" is a special class for Aircraft to handle the position and velocity states of the speed, turns, and climbs.