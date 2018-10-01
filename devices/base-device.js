const EventEmitter = require("events");

class BaseDevice extends EventEmitter {
    constructor() {
        super();

        this._ready = false;
    }

    get ready() {
        return this._ready;
    }

    /**
     * Returns an array of all pins defined on the device
     * Each value in the array is an object:
     * {
     *      mode: Number, <current mode of pin>,
     *      channel: Number <channel identifier. i.e. for a digital pin 4, this will be 4>
     *      value: Number, <current value of pin. 0/1 for digital, 0-1023 for analog>
     *      analogChannel: Number <127 for digital pins, actual pin number for analog>
     *      state: Number, <for input pins, 1 = pullup enabled, 0 otherwise>
     * }
     */
    get allPins() {
        throw new Error("Call to abstract allPins");
    }

    /**
     * Returns an array of digital pins
     */
    get digitalPins() {
        throw new Error("Call to abstract digitalPins");
    }

    /**
     * Returns an array of analog pins
     */
    get analogPins() {
        throw new Error("Call to abstract analogPins");
    }

    /**
     * Returns an array of PWM pins
     */
    get pwmPins() {
        throw new Error("Call to abstract pwmPins");
    }

    /**
     * Configure a digital pin 
     * @param {Number} pin 
     * @param {Number} mode 
     */
    configureDigitalPin(pin, mode) {
        throw new Error("Call to abstract configureDigitalPin");
    }

    digitalWrite(pin, value) {
        throw new Error("Call to abstract digitalWrite");
    }

    digitalRead(pin) {
        throw new Error("Call to abstract digitalRead");
    }

    registerDigitalReadCallback(pin, callback) {
        throw new Error("Call to abstract registerDigitalReadCallback");
    }

    // 0 -1023
    analogRead(pin) {
        throw new Error("Call to abstract analogRead");
    }

    registerAnalogReadCallback(pin, callback) {
        throw new Error("Call to abstract registerAnalogReadCallback");
    }

    configurePWMPin(pin, mode) {
        throw new Error("Call to abstract configurePWMPin");
    }

    //0 - 255
    analogWrite(pin, value) {
        throw new Error("Call to abstract analogWrite");
    }

    // 0 - 180
    servoWrite(pin, degree) {
        throw new Error("Call to abstract servoWrite");
    }

    // Set up servo with specific min/max pulse
    servoConfig(pin, min, max) {
        throw new Error("Call to abstract servoConfig");
    }
}

module.exports = BaseDevice;