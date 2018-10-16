const RepBot = require("../src/main");

const ROMI_I2C_ADDRESS = 0x14;

const ROMI_ROBOT = {
    devices: {
        "romi": {
            type: "romi",
            deviceConfig: {
                address: ROMI_I2C_ADDRESS
            },
            portMappings: {
                digital: [
                    {
                        channel: 0,
                        deviceChannel: 0,
                        direction: "out"
                    },
                    {
                        channel: 1,
                        deviceChannel: 1,
                        direction: "out"
                    },
                    {
                        channel: 2,
                        deviceChannel: 3,
                        direction: "in"
                    },
                    {
                        channel: 3,
                        deviceChannel: 4,
                        direction: "in"
                    }
                ],
                analog: [
                    {
                        channel: 0,
                        deviceChannel: 0
                    },
                    {
                        channel: 1,
                        deviceChannel: 1
                    }
                ],
                pwm: [
                    {
                        channel: 0,
                        deviceChannel: 0,
                        type: "motor"
                    },
                    {
                        channel: 1,
                        deviceChannel: 1,
                        type: "motor"
                    }
                ],
                encoder: [
                    {
                        channel: 0,
                        deviceChannel: 0
                    },
                    {
                        channel: 1,
                        deviceChannel: 1
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
};

const theRobot = new RepBot(ROMI_ROBOT);

let buttonAStatus = false;

setInterval(() => {
    let buttonAReading = theRobot.digitalRead(2);
    if (buttonAReading != buttonAStatus) {
        buttonAStatus = buttonAReading;
        console.log("Button A state changed to " + buttonAReading);
    }
}, 100);