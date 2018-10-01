const BaseDevice = require("./base-device");
const Constants = require("./constants");
const Board = require("firmata");

const MODES = Constants.MODES;

// Port maps for this particular device
const DIGITAL_PORT_MAP = [2, 3, 4, 5, 6, 7];
const INVERSE_DIGITAL_PORT_MAP = { 2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5};
const ANALOG_PORT_MAP = [0, 1, 2, 3, 4, 5];
const PWM_PORT_MAP = [9, 10, 11, 13];

class GravityShield extends BaseDevice {
    constructor(config) {
        super();

        // Read the config
        if (!config) {
            throw new Error("No configuration provided");
        }
        if (!config.port) {
            throw new Error("No serialport provided");
        }

        // Generate the internal state keeping
        this._internalDigitalPins = {};
        DIGITAL_PORT_MAP.forEach((actualPin ,idx) => {
            this._internalDigitalPins[idx] = {
                devicePin: actualPin,
                mode: MODES.OUTPUT,
                value: false
            };
        });

        this._internalAnalogPins = {};
        ANALOG_PORT_MAP.forEach((actualPin, idx) => {
            this._internalAnalogPins[idx] = {
                devicePin: actualPin,
                mode: MODES.ANALOG,
                value: 0
            }
        });

        this._board = new Board(config.port, () => {
            this._ready = true;
            this.emit("ready");

            // Set up the Servo pins
            PWM_PORT_MAP.forEach((actualPin) => {
                this._board.pinMode(actualPin, MODES.SERVO);
            });

            // Set up the callbacks for all pins
            DIGITAL_PORT_MAP.forEach((actualPin, idx) => {
                this._board.digitalRead(actualPin, this._handlePinUpdate.bind(this, MODES.INPUT, idx));
                // By default, turn off reporting
                this._board.reportDigitalPin(actualPin, 0);
            });
            
            ANALOG_PORT_MAP.forEach((actualPin) => {
                this._board.analogRead(actualPin, this._handlePinUpdate.bind(this, MODES.ANALOG, actualPin));
            });
        });
    }

    // === Implement superclass methods ===
    get allPins() {
        return this.digitalPins.concat(this.pwmPins, this.analogPins);
    }

    get digitalPins() {
        return this._generateDigitalPinInfo();
    }

    get analogPins() {
        return this._generateAnalogPinInfo();
    }

    get pwmPins() {
        return this._generatePWMPinInfo();
    }

    configureDigitalPin(pin, mode) {
        this._ensureReady();

        const digitalPinInfo = this._internalDigitalPins[pin];
        if (!digitalPinInfo) {
            throw new Error("Invalid digital pin: " + pin);
        }
        if ([MODES.INPUT, MODES.OUTPUT, MODES.PULLUP].indexOf(mode) === -1) {
            throw new Error("Invalid mode provided");
        }

        if (mode === MODES.INPUT || mode === MODES.PULLUP) {
            this._board.reportDigitalPin(digitalPinInfo.devicePin, 1);
        }
        else {
            this._board.reportDigitalPin(digitalPinInfo.actualPin, 0);
        }

        this._board.pinMode(digitalPinInfo.devicePin, mode);
    }

    digitalWrite(pin, value) {
        this._ensureReady();

        const digitalPinInfo = this._internalDigitalPins[pin];
        if (!digitalPinInfo) {
            throw new Error("Invalid digital pin: " + pin);
        }

        const outVal = (!!value) ? 1 : 0;
        this._board.digitalWrite(digitalPinInfo.actualPin, outVal);
    }

    digitalRead(pin) {
        this._ensureReady();

        const digitalPinInfo = this._internalDigitalPins[pin];
        if (!digitalPinInfo) {
            throw new Error("Invalid digital pin: " + pin);
        }

        return digitalPinInfo.value;
    }

    analogRead(pin) {
        this._ensureReady();

        const analogPinInfo = this._internalAnalogPins[pin];
        if (!analogPinInfo) {
            throw new Error("Invalid analog pin: " + pin);
        }

        return analogPinInfo.value;
    }

    configurePWMPin(pin, mode) {
        this._ensureReady();
        // do nothing
    }

    analogWrite(pin, value) {
        this._ensureReady();
        // do nothing
    }

    servoWrite(pin, degree) {
        this._ensureReady();

        if (pin < 0 || pin >= PWM_PORT_MAP.length) {
            throw new Error("Invalid PWM port: " + pin);
        }

        this._board.servoWrite(PWM_PORT_MAP[pin], degree);
    }

    servoConfig(pin, min, max) {
        this._ensureReady();

        if (pin < 0 || pin >= PWM_PORT_MAP.length) {
            throw new Error("Invalid PWM port: " + pin);
        }

        this._board.servoConfig(PWM_PORT_MAP[pin], min, max);
    }

    // === Internal helper methods ===
    _ensureReady() {
        if (!this._ready) {
            throw new Error("Device not ready");
        }
    }

    _handlePinUpdate(type, pin, value) {
        if (type === MODES.INPUT) {
            // Make sure that this is actually a properly configured input pin
            var logicalPin = INVERSE_DIGITAL_PORT_MAP[pin];
            if (logicalPin === undefined) return;

            var digitalPinInfo = this._internalDigitalPins[logicalPin];
            if (!digitalPinInfo) return;

            if (digitalPinInfo.mode === MODES.INPUT || digitalPinInfo.mode === MODES.PULLUP) {
                digitalPinInfo.value = (value === this._board.HIGH);
            }
        }
        else if (type === MODES.ANALOG) {
            var analogPinInfo = this._internalAnalogPins[pin];
            analogPinInfo.value = value;
        }
    }

    _generateDigitalPinInfo() {
        const result = [];
        for (var logicalPin in this._internalDigitalPins) {
            var storedPinInfo = this._internalDigitalPins[logicalPin];
            var outPinInfo = {
                mode: storedPinInfo.mode,
                channel: parseInt(logicalPin, 10),
                value: !!storedPinInfo.value,
                analogChannel: 127,
                state: (storedPinInfo.mode === MODES.PULLUP) ? 1 : 0
            };
            result.push(outPinInfo);
        }

        return result;
    }

    _generateAnalogPinInfo() {
        const result = [];
        for (var logicalPin in this._internalAnalogPins) {
            var storedPinInfo = this._internalAnalogPins[logicalPin];
            var outPinInfo = {
                mode: MODES.ANALOG,
                channel: parseInt(logicalPin, 10),
                value: storedPinInfo.value,
                analogChannel: storedPinInfo.devicePin,
                state: 0
            };
            result.push(outPinInfo);
        }

        return result;
    }

    _generatePWMPinInfo() {
        const result = [];
        PWM_PORT_MAP.forEach((actualPin, idx) => {
            var outPinInfo = {
                mode: MODES.SERVO,
                channel: idx,
                value: -1,
                analogChannel: 127,
                state: 0
            };
            result.push(outPinInfo);
        });

        return result;
    }
}

module.exports = GravityShield;