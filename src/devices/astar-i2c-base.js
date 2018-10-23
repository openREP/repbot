const BaseDevice = require("./base-device");
const Constants = require("./constants");
const i2c = require("i2c-bus");
const Util = require("../utils");

const MODES = Constants.MODES;

function wordToUint(word) {
    return word & 0xFFFF;
}

function wordToInt(word) {
    var byteA = (word >> 8) & 0xFF;
    var byteB = (word & 0xFF);
    var sign = byteA & (1 << 7);
    var x = (((byteA & 0xFF) << 8) | (byteB & 0xFF));
    if (sign) {
        return 0xFFFF0000 | x;
    }
    return x;
}

/**
 * A-Star based device
 *
 * This represents a Pololu A-Star based robot controller device
 * (examples include the robot controller LV/SV or the Romi32u4)
 * that is connected to the Raspberry Pi via I2C.
 *
 * This device requires that the appropriate firmware with the
 * correct data structure is uploaded to the controller.
 */

 function typeSize(type) {
     switch (type) {
         case "boolean":
         case "char":
         case "byte":
         case "uint8":
         case "int8":
            return 1;
        case "uint16":
        case "int16":
            return 2;
     }

     throw new Error("Invalid type provided: '" + type + "'");
 }

 class AstarI2cBase extends BaseDevice {
    constructor(config) {
        super();

        if (!config) {
            throw new Error("No configuration provided");
        }
        if (!config.address) {
            throw new Error("No I2C address provided");
        }
        if (!config.portMap) {
            throw new Error("No port map provided");
        }
        if (!config.bufferStructure) {
            throw new Error("No buffer structure provided");
        }

        // Optional properties
        var busNum = 1;
        if (config.busNum !== undefined) {
            busNum = config.busNum;
        }

        // Incorrect pin handling
        this._throwOnIncorrectPin = !!config.throwOnIncorrectPin;

        // Set up the i2c connection
        this._i2c = i2c.openSync(busNum);
        this._address = config.address;

        this._portMap = undefined;
        this._bufferStruct = undefined;
        this._secondaryDevices = undefined;

        // Set up our internal structures needed to communicate over i2c
        this._internalDigitalPins = {};
        this._internalAnalogPins = {};
        this._internalServoPins = {};
        this._internalMotorChannels = {};
        this._internalEncoderValues = {};

        this._internalGyroChannels = {};
        this._internalAccelerometerChannels = {};

        this._hasBatterySupport = false;
        this._batteryReadingMV = -1;

        this._bufferMap = {}; // Map from portName to byte location

        this._configureDevice(config.portMap, config.bufferStructure, config.secondaryDevices);

        // If there are secondary devices, run their init operations if available
        if (config.secondaryDevices) {
            Object.keys(config.secondaryDevices).forEach((deviceId) => {
                const device = config.secondaryDevices[deviceId];
                if (device.config && device.config.operations && device.config.operations.init) {
                    device.config.operations.init(this._i2c);
                }
            });
        }

        // Set up interval timer to fetch input values
        this._inputTimer = setInterval(() => {
            Object.keys(this._internalDigitalPins).forEach((port) => {
                if (this._internalDigitalPins[port].mode === "input") {
                    this._internalDigitalRead(port);
                }
            });

            Object.keys(this._internalAnalogPins).forEach((port) => {
                this._internalAnalogRead(port);
            });

            Object.keys(this._internalEncoderValues).forEach((channel) => {
                this._internalEncoderRead(channel);
            });

            Object.keys(this._secondaryDevices).forEach((deviceId) => {
                this._internalSecondaryDeviceRead(deviceId, this._secondaryDevices[deviceId]);
            });

            if (this._hasBatterySupport) {
                this._internalBatteryRead();
            }
        }, 20);

    }

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

    get encoderChannels() {
        return this._generateEncoderInfo();
    }

    get gyroChannels() {
        return this._generateGyroInfo();
    }

    get accelerometerChannels() {
        return this._generateAccelerometerInfo();
    }

    get batteryMV() {
        return this._batteryReadingMV;
    }

    configureDigitalPin(pin, mode) {
        // This is not used for now since we don't provide additional I/O
    }

    digitalWrite(pin, value) {
        const digitalPinInfo = this._internalDigitalPins[pin];
        if (!digitalPinInfo) {
            throw new Error("Invalid digital pin: " + pin);
        }

        // Find the appropriate offset to write to
        var portName = digitalPinInfo.devicePin;
        var bufferOffsetInfo = this._bufferMap[portName];

        if (!bufferOffsetInfo) {
            throw new Error("Port name '" + portName + "' not found in buffer map");
        }

        if (bufferOffsetInfo.direction !== "out") {
            if (this._throwOnIncorrectPin) {
                throw new Error("Attempting to write to an input pin");
            }
            return;
        }

        const bufferOffset = bufferOffsetInfo.offset;
        const dataLength = typeSize(bufferOffsetInfo.type);

        this._safeWriteByteSync(this._address, bufferOffset, (value ? 1 : 0));
    }

    digitalRead(pin) {
        // The expectation is that we'll already have the data stored in _internalDigitalPins
        const pinInfo = this._internalDigitalPins[pin];
        if (!pinInfo) {
            throw new Error("Invalid digital port specified: " + pin);
        }

        if (pinInfo.mode !== "input") {
            if (this._throwOnIncorrectPin) {
                throw new Error("Attempting to read from an input pin");
            }
            return;
        }

        return pinInfo.value;
    }

    analogRead(pin) {
        const pinInfo = this._internalAnalogPins[pin];
        if (!pinInfo) {
            throw new Error("Invalid analog port specified: " + pin);
        }

        return pinInfo.value;
    }

    servoWrite(pin, degree) {
        const servoPinInfo = this._internalServoPins[pin];
        if (!servoPinInfo) {
            throw new Error("Invalid PWM pin: " + pin);
        }

        const portName = servoPinInfo.devicePin;
        const bufferOffsetInfo = this._bufferMap[portName];

        if (!bufferOffsetInfo) {
            throw new Error("Port name '" + portName + "' not found in buffer map");
        }

        const bufferOffset = bufferOffsetInfo.offset;
        this._safeWriteWordSync(this._address, bufferOffset, degree);
    }

    motorWrite(channel, speed) {
        const motorChInfo = this._internalMotorChannels[channel];
        if (!motorChInfo) {
            throw new Error("Invalid Motor channel: " + channel);
        }

        if (speed < -100) speed = -100;
        if (speed > 100) speed = 100;

        let outputMin = -100;
        let outputMax = 100;

        if (motorChInfo.outputScale) {
            if (motorChInfo.outputScale.min !== undefined) {
                outputMin = motorChInfo.outputScale.min;
            }
            if (motorChInfo.outputScale.max !== undefined) {
                outputMax = motorChInfo.outputScale.max;
            }
        }

        const portName = motorChInfo.devicePin;
        const bufferOffsetInfo = this._bufferMap[portName];

        if (!bufferOffsetInfo) {
            throw new Error("Port name '" + portName + "' not found in buffer map");
        }

        const actualSpeed = Util.mapValues(speed, -100, 100, outputMin, outputMax);

        const bufferOffset = bufferOffsetInfo.offset;
        this._safeWriteWordSync(this._address, bufferOffset, (actualSpeed & 0xFFFF));
    }

    encoderRead(channel) {
        const pinInfo = this._internalEncoderValues[channel];
        if (!pinInfo) {
            throw new Error("Invalid encoder port specified");
        }

        return pinInfo.value;
    }

    encoderReset(channel) {
        const pinInfo = this._internalEncoderValues[channel];
        if (!pinInfo) {
            throw new Error("Invalid encoder port specified");
        }

        const flagName = pinInfo.resetFlag;
        const bufferOffsetInfo = this._bufferMap[flagName];

        if (!bufferOffsetInfo) {
            throw new Error("Flag name '" + flagName + "' not found in buffer map");
        }

        const bufferOffset = bufferOffsetInfo.offset;
        this._safeWriteByteSync(this._address, bufferOffset, 1);
    }

    gyroRead(channel) {
        const chInfo = this._internalGyroChannels[channel];
        if (!chInfo) {
            throw new Error("Invalid gyro channel specified");
        }

        return chInfo;
    }

    accelerometerRead(channel) {
        const chInfo = this._internalAccelerometerChannels[channel];
        if (!chInfo) {
            throw new Error("Invalid accelerometer channel specified");
        }

        return chInfo;
    }

    shutdown() {
        clearInterval(this._inputTimer);
    }

    // === Private Helper Functions ===
    _internalSecondaryDeviceRead(deviceId, deviceInfo) {
        // This handles secondary device data (right now accelerometer/gyro over i2c)
        if (deviceInfo.config.operations) {
            const deviceOps = deviceInfo.config.operations;
            if (deviceOps.getGyro) {
                const gVals = deviceOps.getGyro(this._i2c);

                // assume channel 0
                // TODO we really should have a secondary device id -> channel map
                this._internalGyroChannels[0] = {
                    x: gVals.x !== null ? wordToInt(gVals.x) : null,
                    y: gVals.y !== null ? wordToInt(gVals.y) : null,
                    z: gVals.z !== null ? wordToInt(gVals.z) : null,
                };

            }

            if (deviceOps.getAccelerometer) {
                const aVals = deviceOps.getAccelerometer(this._i2c);

                this._internalAccelerometerChannels[0] = {
                    x: aVals.x !== null ? wordToInt(aVals.x) : null,
                    y: aVals.y !== null ? wordToInt(aVals.y) : null,
                    z: aVals.z !== null ? wordToInt(aVals.z) : null,
                };

            }
        }
    }

    _internalDigitalRead(pin) {
        const digitalPinInfo = this._internalDigitalPins[pin];
        if (!digitalPinInfo) {
            throw new Error("Invalid digital pin: " + pin);
        }

        var portName = digitalPinInfo.devicePin;
        var bufferOffsetInfo = this._bufferMap[portName];

        if (!bufferOffsetInfo) {
            throw new Error("Port name '" + portName + "' not found in buffer map");
        }

        if (bufferOffsetInfo.direction !== "in") {
            if (this._throwOnIncorrectPin) {
                throw new Error("Attempting to read from an output pin");
            }
            return;
        }

        const bufferOffset = bufferOffsetInfo.offset;
        this._i2c.readByte(this._address, bufferOffset, (err, val) => {
            if (!err) {
                this._internalDigitalPins[pin].value = !!val;
            }
        });
    }

    _internalAnalogRead(pin) {
        const analogPinInfo = this._internalAnalogPins[pin];
        if (!analogPinInfo) {
            throw new error("Invalid analog pin: " + pin);
        }

        var portName = analogPinInfo.devicePin;
        var bufferOffsetInfo = this._bufferMap[portName];

        // Assume Big Endian
        if (!bufferOffsetInfo) {
            throw new Error("Port name '" + portName + "' not found in buffer map");
        }

        const bufferOffset = bufferOffsetInfo.offset;
        this._i2c.readWord(this._address, bufferOffset, (err, val) => {
            // Depending on type
            if (bufferOffsetInfo.dataType === "int16") {
                this._internalAnalogPins[pin].value = wordToInt(val);
            }
            else {
                this._internalAnalogPins[pin].value = wordToUint(val);
            }

        });
    }

    _internalBatteryRead() {
        const bufferOffsetInfo = this._bufferMap["battery"];
        if (!bufferOffsetInfo) {
            throw new Error("No battery support");
        }

        const bufferOffset = bufferOffsetInfo.offset;
        this._i2c.readWord(this._address, bufferOffset, (err, val) => {
            this._batteryReadingMV = wordToUint(val);
        });
    }

    _internalEncoderRead(channel) {
        const encoderInfo = this._internalEncoderValues[channel];
        if (!encoderInfo) {
            throw new Error("Invalid encoder channel: " + channel);
        }

        const portName = encoderInfo.devicePin;
        const bufferOffsetInfo = this._bufferMap[portName];

        if (!bufferOffsetInfo) {
            throw new Error("Port name '" + portName + "' not found in buffer map");
        }

        const bufferOffset = bufferOffsetInfo.offset;
        this._i2c.readWord(this._address, bufferOffset, (err, val) => {
            this._internalEncoderValues[channel].value = wordToInt(val);
        });
    }

    _verifyPortMap(portMap) {
        var digitalChannels = {};
        var analogChannels = {};
        var servoChannels = {};
        var motorChannels = {};
        var encoderChannels = {};
        var gyroChannels = {};
        var accelerometerChannels = {};
        var batteryChannels = {};

        Object.keys(portMap).forEach((portName) => {
            var portInfo = portMap[portName];

            switch (portInfo.type) {
                case "output":
                case "input":
                    if (digitalChannels[portInfo.channel]) {
                        throw new Error("Digital channel " + portInfo.channel + " already defined");
                    }
                    digitalChannels[portInfo.channel] = true;
                    break;
                case "analog":
                    if (analogChannels[portInfo.channel]) {
                        throw new Error("Analog channel " + portInfo.channel + " already defined");
                    }
                    analogChannels[portInfo.channel] = true;
                    break;
                case "pwm":
                case "servo":
                    if (servoChannels[portInfo.channel]) {
                        throw new Error("PWM channel " + portInfo.channel + " already defined");
                    }
                    servoChannels[portInfo.channel] = true;
                    break;
                case "motor":
                    if (motorChannels[portInfo.channel]) {
                        throw new Error("Motor channel " + portInfo.channel + " already defined");
                    }
                    motorChannels[portInfo.channel] = true;
                    break;
                case "encoder":
                    if (encoderChannels[portInfo.channel]) {
                        throw new Error("Encoder channel " + portInfo.channel + " already defined");
                    }
                    if (!portInfo.resetFlag) {
                        throw new Error("Encoder channel " + portInfo.channel + " has no reset flag specified");
                    }
                    encoderChannels[portInfo.channel] = true;
                    break;
                case "gyro":
                    if (gyroChannels[portInfo.channel]) {
                        throw new Error("Gyro channel " + portInfo.channel + " already defined");
                    }
                    if (portInfo.device) {
                        // Verify that this device ID is specified
                        if (!this._secondaryDevices[portInfo.device.id]) {
                            throw new Error("Secondary device " + portInfo.device.id + " not specified");
                        }
                    }
                    gyroChannels[portInfo.channel] = true;
                    break;
                case "accelerometer":
                    if (accelerometerChannels[portInfo.channel]) {
                        throw new Error("Accelerometer channel " + portInfo.channel + " already defined");
                    }
                    if (portInfo.device) {
                        // Verify that this device ID is specified
                        if (!this._secondaryDevices[portInfo.device.id]) {
                            throw new Error("Secondary device " + portInfo.device.id + " not specified");
                        }
                    }
                    accelerometerChannels[portInfo.channel] = true;
                    break;
                case "battery":
                    if (batteryChannels[portInfo.channel]) {
                        throw new Error("Battery channel " + portInfo.channel + " already defined");
                    }
                    batteryChannels[portInfo.channel] = true;
                    break;
            }
        });
    }

    _configureDevice(portMap, bufferStructure, secondaryDevices) {
        this._secondaryDevices = secondaryDevices || {};
        this._verifyPortMap(portMap);

        this._portMap = portMap;

        // Now loop through everything in the bufferStructure
        var bufferSize = 0;
        bufferStructure.forEach((data, idx) => {
            if (data.portName) {
                // Verify that this port was defined in the portmap
                var portInfo = portMap[data.portName];
                if (!portInfo) {
                    throw new Error("Invalid portName specified: " + data.portName);
                }

                switch (portInfo.type) {
                    case "output":
                    case "input":
                        this._internalDigitalPins[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: false
                        };
                        break;
                    case "analog":
                        this._internalAnalogPins[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: 0
                        };
                        break;
                    case "pwm":
                    case "servo":
                        this._internalServoPins[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: 0
                        };
                        break;
                    case "motor":
                        this._internalMotorChannels[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: 0,
                            outputScale: portInfo.outputScale || {} 
                        };
                        break;
                    case "encoder":
                        this._internalEncoderValues[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: 0,
                            resetFlag: portInfo.resetFlag
                        };
                        break;
                    case "battery":
                        this._hasBatterySupport = true;
                        break;
                }

                this._bufferMap[data.portName] = {
                    offset: bufferSize,
                    direction: data.direction,
                    type: data.dataType
                };
                bufferSize += typeSize(data.dataType);
            }
            else if (data.flagName) {
                this._bufferMap[data.flagName] = {
                    offset: bufferSize,
                    direction: data.direction,
                    type: data.dataType
                };
                bufferSize += typeSize(data.dataType)
            }
        });

        // Handle Secondary Devices
        // Gyro and accelerometers are secondary
        Object.keys(portMap).forEach((portName) => {
            const portInfo = portMap[portName];
            if (portInfo.type === "gyro") {
                if (portInfo.device) {
                    this._internalGyroChannels[portInfo.channel] = {
                        x: null,
                        y: null,
                        z: null
                    };

                }
            }
            else if (portInfo.type === "accelerometer") {
                if (portInfo.device) {
                    this._internalAccelerometerChannels[portInfo.channel] = {
                        x: null,
                        y: null,
                        z: null
                    }
                }
            }
        });
    }

    _generateDigitalPinInfo() {
        const result = [];
        for (var logicalPin in this._internalDigitalPins) {
            var storedPinInfo = this._internalDigitalPins[logicalPin];
            var outPinInfo = {
                mode: (storedPinInfo.mode === "output") ? MODES.OUTPUT : MODES.INPUT,
                channel: parseInt(logicalPin, 10),
                value: !!storedPinInfo.value,
                analogChannel: 127,
                state: 0
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
                analogChannel: parseInt(logicalPin, 10),
                state: 0
            };
            result.push(outPinInfo);
        }
        return result;
    }

    _generatePWMPinInfo() {
        const result = [];
        for (var logicalPin in this._internalServoPins) {
            var storedPinInfo = this._internalServoPins[logicalPin];
            var outPinInfo = {
                mode: MODES.SERVO,
                channel: parseInt(logicalPin, 10),
                value: -1,
                analogChannel: 127,
                state: 0
            };
            result.push(outPinInfo);
        }
        return result;
    }

    _generateEncoderInfo() {
        const result = [];
        for (var encoderChannel in this._internalEncoderValues) {
            const encoderInfo = this._internalEncoderValues[encoderChannel];
            const outEncoderValues = {
                channel: parseInt(encoderChannel, 10),
                value: encoderInfo.value
            };
            result.push(outEncoderValues);
        }
        return result;
    }

    _generateGyroInfo() {
        const result = [];
        for (var channel in this._internalGyroChannels) {

            const gyroValues = this._internalGyroChannels[channel];

            const gyroChannelInfo = {
                channel: parseInt(channel, 10),
                x: gyroValues.x,
                y: gyroValues.y,
                z: gyrlValues.z
            }
            result.push(gyroChannelInfo);

        }
        return result;
    }

    _generateAccelerometerInfo() {
        const result = [];

        for (var channel in this._internalAccelerometerChannels) {
            const accelValues = this._internalAccelerometerChannels[channel];

            const accelChannelInfo = {
                channel: parseInt(channel, 10),
                x: accelValues.x,
                y: accelValues.y,
                z: accelValues.z
            }
            result.push(accelChannelInfo);
        }

        return result;
    }

    _safeWriteByteSync(address, offset, data) {
        try {
            this._i2c.writeByteSync(address, offset, data);
        }
        catch (e) {
            console.error("I2C Error: ", e);
        }
    }

    _safeWriteWordSync(address, offset, data) {
        try {
            this._i2c.writeWordSync(address, offset, data);
        }
        catch (e) {
            console.error("I2C Error: ", e);
        }
    }
 }

 module.exports = AstarI2cBase;