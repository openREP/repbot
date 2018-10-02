const BaseDevice = require("./base-device");
//const i2c = require("i2c-bus");
const Constants = require("./constants");

const MODES = Constants.MODES;

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

        // TODO verify integrity of portmap and buffer structure

        // Optional properties
        var busNum = 1;
        if (config.busNum !== undefined) {
            busNum = config.busNum;
        }

        // Set up the i2c connection
        //this._i2c = i2c.openSync(busNum);
        this._address = config.address;

        this._portMap = undefined;
        this._bufferStruct = undefined;

        // Set up our internal structures needed to communicate over i2c
        this._internalDigitalPins = {};
        this._internalAnalogPins = {};
        this._internalPWMPins = {};
        this._internalEncoderValues = {};

        this._bufferMap = {}; // Map from portName to byte location

        this._configureDevice(config.portMap, config.bufferStructure);

        // Set up interval timer to fetch input values

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
            throw new Error("Attempting to write to an input pin");
        }
        const bufferOffset = bufferOffsetInfo.offset;
        const dataLength = typeSize(bufferOffsetInfo.type);

        // this._i2c.writeByteSync(this._address, bufferOffset, (value ? 1 : 0));

    }

    // === Private Helper Functions ===
    _verifyPortMap(portMap) {
        var digitalChannels = {};
        var analogChannels = {};
        var pwmChannels = {};
        var encoderChannels = {};

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
                    if (pwmChannels[portInfo.channel]) {
                        throw new Error("PWM channel " + portInfo.channel + " already defined");
                    }
                    pwmChannels[portInfo.channel] = true;
                    break;
                case "encoder":
                    if (encoderChannels[portInfo.channel]) {
                        throw new Error("Encoder channel " + portInfo.channel + " already defined");
                    }
                    encoderChannels[portInfo.channel] = true;
                    break;
            }
        });
    }

    _configureDevice(portMap, bufferStructure) {
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
                        this._internalPWMPins[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: 0
                        };
                        break;
                    case "encoder":
                        this._internalEncoderValues[portInfo.channel] = {
                            devicePin: data.portName,
                            mode: portInfo.type,
                            value: 0
                        };
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
        for (var logicalPin in this._internalPWMPins) {
            var storedPinInfo = this._internalPWMPins[logicalPin];
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
 }

 module.exports = AstarI2cBase;