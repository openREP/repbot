const chai = require("chai");
const expect = chai.expect;
const mockery = require("mockery");

const MockI2cBus = require("./mocks/mock-i2c-bus");
let AstarBase;

const BOARD_ADDR = 10;

// Constants for testing secondary devices
const OUTX_L_G = 0x22;
const OUTX_H_G = 0x23;
const OUTY_L_G = 0x24;
const OUTY_H_G = 0x25;
const OUTZ_L_G = 0x26;
const OUTZ_H_G = 0x27;

const OUTX_L_XL = 0x22;
const OUTX_H_XL = 0x23;
const OUTY_L_XL = 0x24;
const OUTY_H_XL = 0x25;
const OUTZ_L_XL = 0x26;
const OUTZ_H_XL = 0x27;

const BAD_CONFIG_DUPLICATE_CHANNEL = {
    address: BOARD_ADDR,
    portMap: {
        "led-1": {
            port: "led-1",
            type: "output",
            channel: 0
        },
        "led-2": {
            port: "led-2",
            type: "output",
            channel: 0
        },
    },
    bufferStructure: [
        { portName: "led-1", direction: "out", dataType: "boolean" },
        { portName: "led-2", direction: "out", dataType: "boolean" },
    ]
};

const BAD_CONFIG_NONEXISTENT_CHANNEL = {
    address: BOARD_ADDR,
    portMap: {
        "led-1": {
            port: "led-1",
            type: "output",
            channel: 0
        },
        "led-2": {
            port: "led-2",
            type: "output",
            channel: 1
        },
    },
    bufferStructure: [
        { portName: "led-1", direction: "out", dataType: "boolean" },
        { portName: "led-3", direction: "out", dataType: "boolean" },
    ]
};

const LSM6_ADDR = 20;

const SECONDARY_DEVICE_CONFIG = {
    address: BOARD_ADDR,
    portMap: {
        "gyro": {
            port: "gyro",
            type: "gyro",
            channel: 0,
            device: {
                id: "lsm6"
            }
        },
        "accelerometer": {
            port: "accelerometer",
            type: "accelerometer",
            channel: 0,
            device: {
                id: "lsm6"
            }
        }
    },
    bufferStructure: [],
    secondaryDevices: {
        "lsm6": {
            type: "i2c",
            config: {
                address: LSM6_ADDR,
                operations: {
                    getGyro: (i2cInst) => {
                        const gX_L = i2cInst.readByteSync(LSM6_ADDR, OUTX_L_G);
                        const gX_H = i2cInst.readByteSync(LSM6_ADDR, OUTX_H_G);
                        const gY_L = i2cInst.readByteSync(LSM6_ADDR, OUTY_L_G);
                        const gY_H = i2cInst.readByteSync(LSM6_ADDR, OUTY_H_G);
                        const gZ_L = i2cInst.readByteSync(LSM6_ADDR, OUTZ_L_G);
                        const gZ_H = i2cInst.readByteSync(LSM6_ADDR, OUTZ_H_G);

                        return {

                            x: (gX_H << 8) | gX_L,
                            y: (gY_H << 8) | gY_L,
                            z: (gZ_H << 8) | gZ_L

                        };
                    },
                    getAccelerometer: (i2cInst) => {
                        const aX_L = i2cInst.readByteSync(LSM6_ADDR, OUTX_L_XL);
                        const aX_H = i2cInst.readByteSync(LSM6_ADDR, OUTX_H_XL);
                        const aY_L = i2cInst.readByteSync(LSM6_ADDR, OUTY_L_XL);
                        const aY_H = i2cInst.readByteSync(LSM6_ADDR, OUTY_H_XL);
                        const aZ_L = i2cInst.readByteSync(LSM6_ADDR, OUTZ_L_XL);
                        const aZ_H = i2cInst.readByteSync(LSM6_ADDR, OUTZ_H_XL);

                        return {

                            x: (aX_H << 8) | aX_L,
                            y: (aY_H << 8) | aY_L,
                            z: (aZ_H << 8) | aZ_L

                        };
                    }
                }
            }
        }
    }
}

const DEFAULT_CONFIG = {
    address: BOARD_ADDR,
    throwOnIncorrectPin: true,
    portMap: {
        "led-1": {
            port: "led-1",
            type: "output",
            channel: 0
        },
        "led-2": {
            port: "led-2",
            type: "output",
            channel: 1
        },
        "button-1": {
            port: "button-1",
            type: "input",
            channel: 2
        },
        "button-2": {
            port: "button-2",
            type: "input",
            channel: 3
        },
        "battery": {
            port: "battery",
            type: "analog",
            channel: 0
        },
        "motor-left": {
            port: "motor-left",
            type: "motor",
            channel: 0
        },
        "motor-right": {
            port: "motor-right",
            type: "motor",
            channel: 1
        },
        "servo-1": {
            port: "servo-1",
            type: "servo",
            channel: 0
        },
        "servo-2": {
            port: "servo-2",
            type: "servo",
            channel: 1
        },
        "encoder-left": {
            port: "encoder-left",
            type: "encoder",
            channel: 0,
            resetFlag: "encoder-left-reset"
        },
        "encoder-right": {
            port: "encoder-right",
            type: "encoder",
            channel: 1,
            resetFlag: "encoder-right-reset"
        }
    },
    bufferStructure: [
        { portName: "led-1", direction: "out", dataType: "boolean" },
        { portName: "led-2", direction: "out", dataType: "boolean" },
        { portName: "button-1", direction: "in", dataType: "boolean" },
        { portName: "button-2", direction: "in", dataType: "boolean" },
        { portName: "battery", direction: "in", dataType: "uint16" },
        { portName: "motor-left", direction: "out", dataType: "int16" },
        { portName: "motor-right", direction: "out", dataType: "int16" },
        { portName: "servo-1", direction: "out", dataType: "int16" },
        { portName: "servo-2", direction: "out", dataType: "int16" },
        { flagName: "encoder-left-reset", direction: "out", dataType: "boolean" },
        { flagName: "encoder-right-reset", direction: "out", dataType: "boolean" },
        { portName: "encoder-left", direction: "in", dataType: "int16" },
        { portName: "encoder-right", direction: "in", dataType: "int16" },
    ]
};


let board;

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
let testBuffer = [];
let secondaryTestBuffer = [];
const SECONDARY_BUFFER_SIZE = 255;

// Pre-populate the buffer with 0s
DEFAULT_CONFIG.bufferStructure.forEach((bufferItem) => {
    var size = typeSize(bufferItem.dataType);
    for (var i = 0; i < size; i++) {
        testBuffer.push(0);
    }
});

describe("A-Star I2C Base", () => {
    beforeEach(() => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false,
            useCleanCache: true
        });

        mockery.registerMock("i2c-bus", MockI2cBus);

        AstarBase = require("../src/devices/astar-i2c-base");
        board = new AstarBase(DEFAULT_CONFIG);

        // Reset the buffer
        for (var i = 0; i < testBuffer.length; i++) {
            testBuffer[i] = 0;
        }

        for (var i = 0; i < SECONDARY_BUFFER_SIZE; i++) {
            secondaryTestBuffer[i] = 0;
        }

        MockI2cBus.setBuffer(BOARD_ADDR, testBuffer.slice(0));
        MockI2cBus.setBuffer(LSM6_ADDR, secondaryTestBuffer);
    });

    afterEach(() => {
        board.shutdown();
        AstarBase = null;
        mockery.disable();
    });

    describe("constructor", () => {
        it("sets up the address correctly", () => {
            expect(board._address).to.equal(DEFAULT_CONFIG.address);
        });

        it("throws if a duplicate channel is found", () => {
            expect(() => new AstarBase(BAD_CONFIG_DUPLICATE_CHANNEL)).to.throw();
        });

        it("throws if an incorrect port mapping is found", () => {
            expect(() => new AstarBase(BAD_CONFIG_NONEXISTENT_CHANNEL)).to.throw();
        });
    })

    describe("digitalWrite", () => {
        it("writes to the correct buffer position", () => {
            board.digitalWrite(1, true);
            expect(MockI2cBus.getBuffer(BOARD_ADDR)[1]).to.equal(1);
        });

        it("throws if attempting to write to an invalid port", () => {
            expect(() => board.digitalWrite(15, true)).to.throw();
        });
    });

    describe("digitalRead", () => {
        it("reads from the correct buffer position", (done) => {
            testBuffer[3] = 1;
            MockI2cBus.setBuffer(BOARD_ADDR, testBuffer);

            setTimeout(() => {
                expect(board.digitalRead(3)).to.be.true;
                done();
            }, 50);
        });

        it("throws if attempting to read from an invalid port", () => {
            expect(() => board.digitalRead(1)).to.throw();
        });
    });

    describe("analogRead", () => {
        it("reads from the correct buffer position", (done) => {
            // byte offset 4 has the analog channel
            var testValue = 888;
            var byteA = (testValue >> 8) & 0xFF;
            var byteB = (testValue & 0xFF);
            testBuffer[4] = byteA;
            testBuffer[5] = byteB;
            MockI2cBus.setBuffer(BOARD_ADDR, testBuffer);

            setTimeout(() => {
                expect(board.analogRead(0)).to.equal(testValue);
                done();
            }, 50);
        });

        it("throws if attempting to read from an invalid port", () => {
            expect(() => board.analogRead(16)).to.throw();
        });
    });

    describe("servoWrite", () => {
        it("writes to the correct buffer position", () => {
            board.servoWrite(0, 90);
            // 6 and 7
            expect(MockI2cBus.getBuffer(BOARD_ADDR).slice(10,12)).to.deep.equal([0, 90]);
        });

        it("throws if attempting to write to an invalid port", () => {
            expect(() => board.servoWrite(6, 90)).to.throw();
        })
    });

    describe("motorWrite", () => {
        it("writes to the correct buffer position", () => {
            board.motorWrite(0, -200);
            // TODO implement test pls
        });
    });

    describe("encoders", () => {
        it("should get correct encoder values", (done) => {
            var testValue = -3000;
            var testValue2 = 3000;
            var lowByte = testValue & 0xFF;
            var highByte = (testValue >> 8) & 0xFF;

            var lowByte2 = testValue2 & 0xFF;
            var highByte2 = (testValue2 >> 8) & 0xFF;

            testBuffer[16] = highByte;
            testBuffer[17] = lowByte;
            testBuffer[18] = highByte2;
            testBuffer[19] = lowByte2;
            MockI2cBus.setBuffer(BOARD_ADDR, testBuffer);

            setTimeout(() => {
                expect(board.encoderRead(0)).to.equal(testValue);
                expect(board.encoderRead(1)).to.equal(testValue2);
                done();
            }, 50);
        });

        it("should set the appropriate flags to reset encoders", () => {
            board.encoderReset(0);
            expect(MockI2cBus.getBuffer(BOARD_ADDR)[14]).to.equal(1);
            expect(MockI2cBus.getBuffer(BOARD_ADDR)[15]).to.equal(0);
        });
    });

    describe("gyroRead", () => {
        it("should return appropriate values", (done) => {
            if (board) board.shutdown();
            board = new AstarBase(SECONDARY_DEVICE_CONFIG);
            var gyroX = 300;
            var gyroY = 2;
            var gyroZ = -200;

            var gX_H = (gyroX >> 8) & 0xFF;
            var gX_L = gyroX & 0xFF;
            var gY_H = (gyroY >> 8) & 0xFF;
            var gY_L = gyroY & 0xFF;
            var gZ_H = (gyroZ >> 8) & 0xFF;
            var gZ_L = gyroZ & 0xFF;

            secondaryTestBuffer[OUTX_L_G] = gX_L;
            secondaryTestBuffer[OUTX_H_G] = gX_H;
            secondaryTestBuffer[OUTY_L_G] = gY_L;
            secondaryTestBuffer[OUTY_H_G] = gY_H;
            secondaryTestBuffer[OUTZ_L_G] = gZ_L;
            secondaryTestBuffer[OUTZ_H_G] = gZ_H;
            MockI2cBus.setBuffer(LSM6_ADDR, secondaryTestBuffer);

            setTimeout(() => {
                var gyroValues = board.gyroRead(0);
                expect(gyroValues.x).to.equal(gyroX);
                expect(gyroValues.y).to.equal(gyroY);
                expect(gyroValues.z).to.equal(gyroZ);
                done();
            }, 50);
        });

        it("should throw if no gyro is configured", () => {
            expect(() => board.gyroRead(0)).to.throw();
        });
    });

    describe("accelerometerRead", () => {
        it("should return appropriate values", (done) => {
            if (board) board.shutdown();
            board = new AstarBase(SECONDARY_DEVICE_CONFIG);
            var accelX = 300;
            var accelY = 2;
            var accelZ = -200;

            var aX_H = (accelX >> 8) & 0xFF;
            var aX_L = accelX & 0xFF;
            var aY_H = (accelY >> 8) & 0xFF;
            var aY_L = accelY & 0xFF;
            var aZ_H = (accelZ >> 8) & 0xFF;
            var aZ_L = accelZ & 0xFF;

            secondaryTestBuffer[OUTX_L_XL] = aX_L;
            secondaryTestBuffer[OUTX_H_XL] = aX_H;
            secondaryTestBuffer[OUTY_L_XL] = aY_L;
            secondaryTestBuffer[OUTY_H_XL] = aY_H;
            secondaryTestBuffer[OUTZ_L_XL] = aZ_L;
            secondaryTestBuffer[OUTZ_H_XL] = aZ_H;
            MockI2cBus.setBuffer(LSM6_ADDR, secondaryTestBuffer);

            setTimeout(() => {
                var accelValues = board.accelerometerRead(0);
                expect(accelValues.x).to.equal(accelX);
                expect(accelValues.y).to.equal(accelY);
                expect(accelValues.z).to.equal(accelZ);
                done();
            }, 50);
        });

        it("should throw if no accelerometer is configured", () => {
            expect(() => board.accelerometerRead(0)).to.throw();
        });
    });
});