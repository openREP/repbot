const EventEmitter = require("events");
const Util = require("./utils");

const DEVICE_TYPES = {
    "gravity-shield": "gravity-shield",
    "romi": "romi32u4"
};

/*
var config ={
    devices: {
        "deviceName": {
            type: "device type",
            deviceConfig: {

            },
            portMapping: {
                digital: [
                    {
                        channel: 0,
                        direction: "in/out",
                        deviceChannel: 0
                    }
                ],
                analog: [
                    {
                        channel: 0,
                        deviceChannel: 0
                    }
                ],
                pwm: [
                    {
                        channel: 0,
                        deviceChannel: 0,
                        type: "servo/motor"
                    }
                ],
                encoder: [
                    {
                        channel: 0,
                        deviceChannel: 0
                    }
                ],
                gyro: [
                    {
                        channel: 0,
                        deviceChannel: 0
                    }
                ],
                accelerometer: [
                    {
                        channel: 0,
                        deviceChannel: 0
                    }
                ]
            }
        }

    }
}
*/


class RepBot extends EventEmitter {
    constructor(config) {
        super();
        this._devices = {};
        this._digitalPorts = {};
        this._analogPorts = {};
        this._pwmPorts = {};
        this._encoderChannels = {};
        this._gyroChannels = {};
        this._accelerometerChannels = {};

        this._setupRobot(config);
    }

    digitalWrite(channel, value) {
        const chInfo = this._checkAndGetChannelInfo("digital", channel);
        const device = this._devices[chInfo.device];

        if (chInfo.direction !== "out") {
            throw new Error(`Attempting to write to an input port ${channel}`);
        }

        device.digitalWrite(chInfo.deviceChannel, !!value);
    }

    digitalRead(channel) {
        const chInfo = this._checkAndGetChannelInfo("digital", channel);
        const device = this._devices[chInfo.device];

        if (chInfo.direction !== "in") {
            throw new Error(`Attempting to read from an output port ${channel}`);
        }

        return device.digitalRead(chInfo.deviceChannel);
    }

    analogRead(channel) {
        const chInfo = this._checkAndGetChannelInfo("analog", channel);
        const device = this._devices[chInfo.device];

        return device.analogRead(chInfo.deviceChannel);
    }

    encoderRead(channel) {
        const chInfo = this._checkAndGetChannelInfo("encoder", channel);
        const device = this._devices[chInfo.device];

        return device.encoderRead(chInfo.deviceChannel);
    }

    encoderReset(channel) {
        const chInfo = this._checkAndGetChannelInfo("encoder", channel);
        const device = this._devices[chInfo.device];

        device.encoderReset(chInfo.deviceChannel);
    }

    gyroRead(channel) {
        const chInfo = this._checkAndGetChannelInfo("gyro", channel);
        const device = this._devices[chInfo.device];

        return device.gyroRead(chInfo.deviceChannel);
    }

    accelerometerRead(channel) {
        const chInfo = this._checkAndGetChannelInfo("accelerometer", channel);
        const device = this._devices[chInfo.device];

        return device.accelerometerRead(chInfo.deviceChannel);
    }

    /**
     *
     * @param {number} channel
     * @param {number} angle Angle to set the servo (0 - 180)
     */
    servoWrite(channel, angle) {
        const chInfo = this._checkAndGetChannelInfo("pwm", channel);
        const device = this._devices[chInfo.device];

        if (angle < 0) angle = 0;
        if (angle > 180) angle = 180;

        if (chInfo.type === "servo") {
            device.servoWrite(chInfo.deviceChannel, angle);
        }
    }

    /**
     *
     * @param {number} channel
     * @param {number} speed speed in percentage (-100 to 100)
     */
    motorWrite(channel, speed) {
        const chInfo = this._checkAndGetChannelInfo("pwm", channel);
        const device = this._devices[chInfo.device];

        if (speed < -100) speed = -100;
        if (speed > 100) speed = 100;

        if (chInfo.type === "motor") {
            device.motorWrite(chInfo.deviceChannel, speed);
        }
    }

    shutdown() {
        Object.keys(this._devices).forEach((deviceId) => {
            const device = this._devices[deviceId];
            device.shutdown();
        });
    }


    _checkAndGetChannelInfo(type, channel) {
        let channelInfo;
        switch (type) {
            case "digital": {
                channelInfo = this._digitalPorts[channel];
            } break;
            case "analog": {
                channelInfo = this._analogPorts[channel];
            } break;
            case "pwm": {
                channelInfo = this._pwmPorts[channel];
            } break;
            case "encoder": {
                channelInfo = this._encoderChannels[channel];
            } break;
            case "gyro": {
                channelInfo = this._gyroChannels[channel];
            } break;
            case "accelerometer": {
                channelInfo = this._accelerometerChannels[channel];
            } break;
        }

        if (!channelInfo) throw new Error(`Channel ${channel} of type ${type} was not registered`);

        return channelInfo;
    }

    _setupRobot(config) {
        // Setup the devices
        if (config.devices) {
            Object.keys(config.devices).forEach((deviceId) => {
                const deviceInfo = config.devices[deviceId];

                // figure out if this is a valid device type
                if (!DEVICE_TYPES[deviceInfo.type]) {
                    throw new Error(`Invalid device type specified: '${deviceInfo.type}'`);
                }

                // Now, set up the port mapping from robot port -> device port
                if (deviceInfo.portMappings) {
                    const portMappings = deviceInfo.portMappings;
                    if (portMappings.digital) {
                        portMappings.digital.forEach((digitalPortInfo) => {
                            // Sanity check
                            if (this._digitalPorts[digitalPortInfo.channel]) {
                                throw new Error(`Digital channel ${digitalPortInfo.channel} already defined`);
                            }
                            this._digitalPorts[digitalPortInfo.channel] = {
                                device: deviceId,
                                deviceChannel: digitalPortInfo.deviceChannel,
                                direction: digitalPortInfo.direction
                            };
                        });
                    }
                    if (portMappings.analog) {
                        portMappings.analog.forEach((analogPortInfo) => {
                            // Sanity check
                            if (this._analogPorts[analogPortInfo.channel]) {
                                throw new Error(`Analog channel ${analogPortInfo.channel} already defined`);
                            }
                            this._analogPorts[analogPortInfo.channel] = {
                                device: deviceId,
                                deviceChannel: analogPortInfo.deviceChannel
                            };
                        });
                    }
                    if (portMappings.pwm) {
                        portMappings.pwm.forEach((pwmPortInfo) => {
                            // Sanity check
                            if (this._pwmPorts[pwmPortInfo.channel]) {
                                throw new Error(`PWM channel ${pwmPortInfo.channel} already defined`);
                            }
                            this._pwmPorts[pwmPortInfo.channel] = {
                                device: deviceId,
                                deviceChannel: pwmPortInfo.deviceChannel,
                                type: pwmPortInfo.type
                            };
                        });
                    }
                    if (portMappings.encoder) {
                        portMappings.encoder.forEach((encoderPortInfo) => {
                            // Sanity check
                            if (this._encoderChannels[encoderPortInfo.channel]) {
                                throw new Error(`Encoder channel ${encoderPortInfo.channel} already defined`);
                            }
                            this._encoderChannels[encoderPortInfo.channel] = {
                                device: deviceId,
                                deviceChannel: encoderPortInfo.deviceChannel
                            };
                        });
                    }
                    if (portMappings.gyro) {
                        portMappings.gyro.forEach((gyroPortInfo) => {
                            // Sanity check
                            if (this._gyroChannels[gyroPortInfo.channel]) {
                                throw new Error(`Gyro channel ${gyroPortInfo.channel} already defined`);
                            }
                            this._gyroChannels[gyroPortInfo.channel] = {
                                device: deviceId,
                                deviceChannel: gyroPortInfo.deviceChannel
                            };
                        });
                    }
                    if (portMappings.accelerometer) {
                        portMappings.accelerometer.forEach((accelPortInfo) => {
                            // Sanity check
                            if (this._accelerometerChannels[accelPortInfo.channel]) {
                                throw new Error(`Accelerometer channel ${accelPortInfo.channel} already defined`);
                            }
                            this._accelerometerChannels[accelPortInfo.channel] = {
                                device: deviceId,
                                deviceChannel: accelPortInfo.deviceChannel
                            };
                        });
                    }
                }

                const DeviceImplementation = require("./devices/" + DEVICE_TYPES[deviceInfo.type]);
                const theDevice = new DeviceImplementation(deviceInfo.deviceConfig);
                this._devices[deviceId] = theDevice;
            });
        }
    }
}

module.exports = RepBot;