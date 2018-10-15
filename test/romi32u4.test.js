const chai = require("chai");
const expect = chai.expect;
const mockery = require("mockery");

const MockI2cBus = require("./mocks/mock-i2c-bus");
let Romi32u4;

const BOARD_ADDR = 0x20;
const LSM6_ADDR = 0x6B;

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

const CTRL1_XL = 0x10;
const CTRL9_XL = 0x18;
const CTRL10_C = 0x19;
const CTRL2_G = 0x11;

let testBuffer = [];
let lsm6Buffer = [];

let board;

describe("Romi32u4", () => {
    beforeEach(() => {
        mockery.enable({
            warnOnReplace: false,
            warnOnUnregistered: false,
            useCleanCache: true
        });
        mockery.registerMock("i2c-bus", MockI2cBus);

        for (var i = 0; i < 100; i++) {
            testBuffer[i] = 0;
        }

        for (var i = 0; i < 255; i++) {
            lsm6Buffer[i] = 0;
        }

        MockI2cBus.setBuffer(BOARD_ADDR, testBuffer.slice(0));
        MockI2cBus.setBuffer(LSM6_ADDR, lsm6Buffer.slice(0));


        Romi32u4 = require("../src/devices/romi32u4");
        board = new Romi32u4({
            address: BOARD_ADDR
        });


    });

    afterEach(() => {
        board.shutdown();
        Romi32u4 = null;
        mockery.disable();
    });

    describe("constructor", () => {
        it("sets up the address correctly", () => {
            expect(board._address).to.equal(BOARD_ADDR);
        });

        it("writes the correct startup bits to the LSM6", () => {
            if (board) board.shutdown();
            board = new Romi32u4({
                address: BOARD_ADDR,
                gyroDps: 1000,
                accelG: 4
            });

            expect(MockI2cBus.getBuffer(LSM6_ADDR)[CTRL9_XL]).to.equal(0x38);
            expect(MockI2cBus.getBuffer(LSM6_ADDR)[CTRL1_XL]).to.equal(0x60 | 0x2);
            expect(MockI2cBus.getBuffer(LSM6_ADDR)[CTRL10_C]).to.equal(0x38);
            expect(MockI2cBus.getBuffer(LSM6_ADDR)[CTRL2_G]).to.equal(0x60 | 0x2);
        });
    });

    describe("accelerometer", () => {
        it("should return scaled results", (done) => {
            // 1.5g out of a 2g limit
            const aXRaw = Math.round(0x7FFF * 0.75);
            const rawH = (aXRaw >> 8) & 0xFF;
            const rawL = aXRaw & 0xFF;

            lsm6Buffer[OUTX_H_XL] = rawH;
            lsm6Buffer[OUTX_L_XL] = rawL;

            MockI2cBus.setBuffer(LSM6_ADDR, lsm6Buffer);

            setTimeout(() => {
                expect(board.accelerometerRead(0).x).to.be.approximately(1.5, 0.0001);
                done();
            }, 50);
        });
    });

    describe("gyro", () => {
        it("should return scaled results", (done) => {
            // 183.75 dps
            const gXRaw = Math.round(0x7FFF * 0.75);
            const rawH = (gXRaw >> 8) & 0xFF;
            const rawL = gXRaw & 0xFF;

            lsm6Buffer[OUTX_H_G] = rawH;
            lsm6Buffer[OUTX_L_G] = rawL;

            MockI2cBus.setBuffer(LSM6_ADDR, lsm6Buffer);

            setTimeout(() => {
                expect(board.gyroRead(0).x).to.be.approximately(183.75, 0.01);
                done();
            }, 50);
        });
    });
});