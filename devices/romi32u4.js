const AstarI2cBase = require("./astar-i2c-base");

const LSM6_ADDR = 0x6B;

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

const G_DPS_245 = 0x0;
const G_DPS_500 = 0x1;
const G_DPS_1000 = 0x2;
const G_DPS_2000 = 0x3;

const XL_G_2 = 0x0;
const XL_G_16 = 0x1;
const XL_G_4 = 0x2;
const XL_G_8 = 0x3;

const GYRO_DPS_MAP = {
    0: 245,
    1: 500,
    2: 1000,
    3: 2000
};

const ACCEL_G_MAP = {
    0: 2,
    1: 16,
    2: 4,
    3: 8
};

function scaleXYZ(rawValues, range) {
    const xRatio = rawValues.x / 0x7FFF;
    const yRatio = rawValues.y / 0x7FFF;
    const zRatio = rawValues.z / 0x7FFF;

    if (xRatio < -1) xRatio = 1;
    if (xRatio > 1) xRatio = 1;
    if (yRatio < -1) yRatio = 1;
    if (yRatio > 1) yRatio = 1;
    if (zRatio < -1) zRatio = 1;
    if (zRatio > 1) zRatio = 1;

    return {
        x: xRatio * range,
        y: yRatio * range,
        z: zRatio * range
    };
}

function generateSecondaryDevice(gyroDps, accelG) {
    return {
        "lsm6": {
            type: "i2c",
            config: {
                address: LSM6_ADDR,
                operations: {
                    init: (i2cInst) => {
                        // Set up the gains for accelerometer and gyro
                        // Run startup sequence
                        // (From application note)
                        // for accelerometer:

                        // - write CTRL9_XL = 38h // Acc X,Y,Z axes enabled
                        // - write CTRL1_XL = 60h // Acc = 416Hz (High performance)

                        // For gyro
                        // - write CTRL10_C = 38h // Gyro X, Y, Z axes enabled
                        // - write CTRL2_G = 60h // Gyro = 416Hz (High performance)

                        // Start Accelerometer in high performance mode with selected scale
                        i2cInst.writeByteSync(LSM6_ADDR, CTRL9_XL, 0x38);
                        i2cInst.writeByteSync(LSM6_ADDR, CTRL1_XL, (0x60 | accelG));

                        // Start gyro in high performance mode with selected scale
                        i2cInst.writeByteSync(LSM6_ADDR, CTRL10_C, 0x38);
                        i2cInst.writeByteSync(LSM6_ADDR, CTRL2_G, (0x60 | gyroDps));
                    },
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


const PORTMAP = {
    "led-yellow": {
        port: "led-yellow",
        type: "output",
        channel: 0
    },
    "led-red": {
        port: "led-red",
        type: "output",
        channel: 1
    },
    "led-green": {
        port: "led-green",
        type: "output",
        channel: 2
    },
    "button-a": {
        port: "button-a",
        type: "input",
        channel: 3
    },
    "button-b": {
        port: "button-b",
        type: "input",
        channel: 4
    },
    "button-c": {
        port: "button-c",
        type: "input",
        channel: 5
    },
    "a0": {
        port: "a0",
        type: "analog",
        channel: 0
    },
    "a1": {
        port: "a1",
        type: "analog",
        channel: 1
    },
    "a2": {
        port: "a2",
        type: "analog",
        channel: 2
    },
    "a3": {
        port: "a3",
        type: "analog",
        channel: 3
    },
    "a4": {
        port: "a4",
        type: "analog",
        channel: 4
    },
    "a5": {
        port: "a5",
        type: "analog",
        channel: 5
    },
    "motor-left": {
        port: "motor-left",
        type: "pwm",
        channel: 0
    },
    "motor-right": {
        port: "motor-right",
        type: "pwm",
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
    },
    "battery": {
        port: "battery",
        type: "battery",
        channel: 0
    },
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
};

const BUFFER_STRUCTURE = [
    { portName: "led-yellow", direction: "out", dataType: "boolean" },
    { portName: "led-red", direction: "out", dataType: "boolean" },
    { portName: "led-green", direction: "out", dataType: "boolean" },
    { portName: "button-a", direction: "in", dataType: "boolean" },
    { portName: "button-b", direction: "in", dataType: "boolean" },
    { portName: "button-c", direction: "in", dataType: "boolean" },
    { portName: "battery", direction: "in", dataType: "uint16" },
    { portName: "a0", direction: "in", dataType: "uint16" },
    { portName: "a1", direction: "in", dataType: "uint16" },
    { portName: "a2", direction: "in", dataType: "uint16" },
    { portName: "a3", direction: "in", dataType: "uint16" },
    { portName: "a4", direction: "in", dataType: "uint16" },
    { portName: "a5", direction: "in", dataType: "uint16" },
    { portName: "motor-left", direction: "out", dataType: "int16" },
    { portName: "motor-right", direction: "out", dataType: "int16" },
    { flagName: "encoder-left-reset", direction: "out", dataType: "boolean" },
    { flagName: "encoder-right-reset", direction: "out", dataType: "boolean" },
    { portName: "encoder-left", direction: "in", dataType: "int16" },
    { portName: "encoder-right", direction: "in", dataType: "int16" }
];

class Romi32u4 extends AstarI2cBase {
    constructor(config) {
        var gyroDps = G_DPS_245;
        var accelG = XL_G_2;

        switch(config.gyroDps) {
            case 245:
                gyroDps = G_DPS_245;
                break;
            case 500:
                gyroDps = G_DPS_500;
                break;
            case 1000:
                gyroDps = G_DPS_1000;
                break;
            case 2000:
                gyroDps = G_DPS_2000;
                break;
            default:
                gyroDps = G_DPS_245;
        }

        switch(config.accelG) {
            case 2:
                accelG = XL_G_2;
                break;
            case 4:
                accelG = XL_G_4;
                break;
            case 8:
                accelG = XL_G_8;
                break;
            case 16:
                accelG = XL_G_16;
                break;
            default:
                accelG = XL_G_2;
        }
        // Set up the portmap and buffer structure
        config.portMap = PORTMAP;
        config.bufferStructure = BUFFER_STRUCTURE;
        config.secondaryDevices = generateSecondaryDevice(gyroDps, accelG);

        super(config);

        this._gyroDps = gyroDps;
        this._accelG = accelG;
    }

    get gyroRange() {
        return GYRO_DPS_MAP[this._gyroDps];
    }

    get accelerometerRange() {
        return ACCEL_G_MAP[this._accelG];
    }

    /**
     * Get gyro readings
     * @param {Number} channel
     * @return Scaled values (in degrees per second) according to the gyroRange setting
     */
    gyroRead(channel) {
        return scaleXYZ(super.gyroRead(channel), this.gyroRange);
    }

    accelerometerRead(channel) {
        return scaleXYZ(super.accelerometerRead(channel), this.accelerometerRange);
    }
}



module.exports = Romi32u4;