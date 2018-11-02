const BaseDevice = require("./base-device");
const Constants = require("./constants");

class DebugDevice extends BaseDevice {
    constructor(config) {
        super();

        // TODO we could pass in some functions to automatically
        // update variables?

    }

    digitalWrite(pin, value) {
        console.log(`digitalWrite(${pin}, ${value})`);
    }

    digitalRead(pin) {
        return false;
    }

    analogRead(pin) {
        return 0.0;
    }

    servoWrite(pin, degree) {
        console.log(`servoWrite(${pin}, ${degree})`);
    }

    motorWrite(channel, speed) {
        console.log(`motorWrite(${channel}, ${speed})`);
    }

    encoderRead(channel) {
        return 0;
    }

    encoderReset(channel) {
        console.log(`encoderReset(${channel})`);
    }

    gyroRead(channel) {
        return {
            x: 0,
            y: 0,
            z: 0
        }
    }

    accelerometerRead(channel) {
        return {
            x: 0,
            y: 0,
            z: 0
        }
    }

    shutdown() {
        console.log("shutdown()");
    }
}

module.exports = DebugDevice;