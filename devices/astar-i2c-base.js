const BaseDevice = require("./base-device");
const i2c = require("i2c-bus");

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

 // Provide the portmap from a child

 const VALID_DIGITAL_OUTPUTS = ["led-yellow", "led-red", "led-green"];
 const VALID_DIGITAL_OUTPUTS_MAP = {
     "led-yellow": {
         port: "led-yellow",
         type: "output"
     },
     "led-red": {
         port: "led-red",
         type: "output"
     },
     "led-green": {
         port: "led-green",
         type: "output"
     }
 };
 const VALID_DIGITAL_INPUTS = ["button-a", "button-b", "button-c"];
 const VALID_DIGITAL_INPUTS_MAP = {
     "buttons-a": {
         port: "button-a",
         type:
     }
 }

 const VALID_ANALOG_INPUTS = ["battery", "a0", "a1", "a2", "a3", "a4", "a5"]

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
        this._i2c = i2c.openSync(busNum);
        this._address = config.address;

        // Set up our internal structures needed to communicate over i2c

        // Set up interval timer to fetch input values

    }

    // TODO ZQ implement the pin registry getters

    configureDigitalPin(pin, mode) {
        // This is not used for now since we don't provide additional I/O
    }

    digitalWrite(pin, value) {
        // TODO Look up the map and write the appropriate value to the LEDs
    }
 }

 module.exports = AstarI2cBase;