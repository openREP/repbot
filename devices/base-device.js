const EventEmitter = require("events");

/**
 * @typedef {Object} PinInformation
 * @property {Number} mode The current mode of the pin (see constants)
 * @property {Number} channel The channel identifier for a particular class of pin
 * @property {Number} value Current value of the pin. 0/1 for digital, 0-1023 for analog
 * @property {Number} analogChannel Actual analog IO pin number (set to 127 for non-analog pins)
 * @property {Number} state Represents the state of the pullup resistor. 1=enabled, 0=not enabled
 */

/**
 * Base REPBot device
 * 
 * This class provides the list of methods and properties that
 * more specialized devices should implement
 * @class
 * @abstract
 */
class BaseDevice extends EventEmitter {
    constructor() {
        super();

        this._ready = false;
    }

    /**
     * Returns if the device is ready or not
     * @property
     * @return {boolean}
     */
    get ready() {
        return this._ready;
    }

    /**
     * Returns an array of all pins defined on the device
     * @property
     * @return {PinInformation[]} List of all pins on this device
     */
    get allPins() {
        throw new Error("Call to abstract allPins");
    }

    /**
     * Returns an array of digital pins
     * @property
     * @return {PinInformation[]}
     */
    get digitalPins() {
        throw new Error("Call to abstract digitalPins");
    }

    /**
     * Returns an array of analog pins
     * @property
     * @return {PinInformation[]}
     */
    get analogPins() {
        throw new Error("Call to abstract analogPins");
    }

    /**
     * Returns an array of PWM pins
     * @property
     * @return {PinInformation[]}
     */
    get pwmPins() {
        throw new Error("Call to abstract pwmPins");
    }

    /**
     * Configure a digital pin 
     * @param {Number} pin Pin to configure
     * @param {Number} mode Pin mode (INPUT, OUTPUT, PULLUP) to set
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