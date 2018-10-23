const chai = require("chai");
const expect = chai.expect;
const mockery = require("mockery");

const MockI2cBus = require("./mocks/mock-i2c-bus");

// Placeholder for the RepBot module
let RepBot;

let TEST_BUFFER = [];
let LSM6_BUFFER = [];

const ASTAR_ADDRESS = 0x20;
const LSM6_ADDR = 0x6B;

const UNKNOWN_DEVICE_CONFIG = {
    devices: {
        "unknown": {
            type: "nonexistent"
        }
    }
};

const DUPLICATE_CHANNELS = {
    devices: {
        "romi": {
            type: "romi",
            deviceConfig: {
                address: ASTAR_ADDRESS
            },
            portMappings: {
                digital: [
                    {
                        channel: 0,
                        deviceChannel: 0,
                        direction: "out"
                    },
                    {
                        channel: 0,
                        deviceChannel: 1,
                        direction: "out"
                    },
                ]
            }
        }
    }
};

// Used for testing only
const ASTAR_ROBOT_PORTS = {
    "digital": {
        0: {
            device: "romi",
            deviceChannel: 0,
            direction: "out"
        },
        1: {
            device: "romi",
            deviceChannel: 1,
            direction: "out"
        },
        2: {
            device: "romi",
            deviceChannel: 3,
            direction: "in"
        },
        3: {
            device: "romi",
            deviceChannel: 4,
            direction: "in"
        }
    },
    "analog": {
        0: {
            device: "romi",
            deviceChannel: 0
        },
        1: {
            device: "romi",
            deviceChannel: 1
        }
    }
};

const ASTAR_ROBOT = {
    devices: {
        "romi": {
            type: "romi",
            deviceConfig: {
                address: ASTAR_ADDRESS
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

let robot;

describe("RepBot", () => {
    beforeEach(() => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false,
            useCleanCache: true
        });
        mockery.registerMock("i2c-bus", MockI2cBus);

        for (var i = 0; i < 255; i++) {
            TEST_BUFFER[i] = 0;
            LSM6_BUFFER[i] = 0;
        }

        MockI2cBus.setBuffer(ASTAR_ADDRESS, TEST_BUFFER.slice(0));
        MockI2cBus.setBuffer(LSM6_ADDR, LSM6_BUFFER.slice(0));

        RepBot = require("../src/main");
    });

    afterEach(() => {
        if (robot) {
            robot.shutdown();
            RepBot = null;
            mockery.disable();
        }
    });

    describe("constructor", () => {
        it("should successfully set up the robot", () => {
            robot = new RepBot(ASTAR_ROBOT);

            // Match the port setups
            expect(robot._digitalPorts).to.deep.equal(ASTAR_ROBOT_PORTS["digital"]);
            expect(robot._analogPorts).to.deep.equal(ASTAR_ROBOT_PORTS["analog"]);
        });

        it("should throw if presented with an unknown device", () => {
            expect(() => { robot = new RepBot(UNKNOWN_DEVICE_CONFIG)}).to.throw();
        });

        it("should throw if presented with duplicate channels", () => {
            expect(() => { robot = new RepBot(DUPLICATE_CHANNELS)}).to.throw();
        });
    });

    describe("Digital Ports", () => {
        beforeEach(() => {
            robot = new RepBot(ASTAR_ROBOT);
        });

        it("writes to the appropriate digital ports", () => {
            robot.digitalWrite(0, true);
            expect(MockI2cBus.getBuffer(ASTAR_ADDRESS)[0]).to.equal(1);
            expect(MockI2cBus.getBuffer(ASTAR_ADDRESS)[1]).to.equal(0);
        });

        it("throws if attempting to write to an invalid port", () => {
            expect(() => robot.digitalWrite(3, true)).to.throw();
        });

        it("reads the correct values from the appropriate port", (done) => {
            TEST_BUFFER[3] = 1;
            MockI2cBus.setBuffer(ASTAR_ADDRESS, TEST_BUFFER);

            setTimeout(() => {
                expect(robot.digitalRead(2)).to.be.true;
                expect(robot.digitalRead(3)).to.be.false;
                done();
            }, 50);
        });
    });

    describe("Analog Ports", () => {
        beforeEach(() => {
            robot = new RepBot(ASTAR_ROBOT);
        });

        it("throws if attempting to read from an invalid port", () => {
            expect(() => robot.analogRead(10)).to.throw();
        });

        it("reads the correct values from the appropriate port", (done) => {
            var testValue = 888;
            var byteA = (testValue >> 8) & 0xFF;
            var byteB = (testValue & 0xFF);
            TEST_BUFFER[8] = byteA;
            TEST_BUFFER[9] = byteB;
            MockI2cBus.setBuffer(ASTAR_ADDRESS, TEST_BUFFER);

            setTimeout(() => {
                expect(robot.analogRead(0)).to.equal(testValue);
                done();
            }, 50);
        });
    });

    describe("PWM Ports", () => {
        beforeEach(() => {
            robot = new RepBot(ASTAR_ROBOT);
        });

        it("writes to the appropriate pwm port", () => {
            robot.motorWrite(0, 50);
            expect(MockI2cBus.getBuffer(ASTAR_ADDRESS).slice(20, 22)).to.deep.equal([0, 150]);
        })
    });
})