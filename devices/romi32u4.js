const AstarI2cBase = require("./astar-i2c-base");

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
    "battery": {
        port: "battery",
        type: "analog",
        channel: 6
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
        channel: 0
    },
    "encoder-right": {
        port: "encoder-right",
        type: "encoder",
        channel: 1
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
        // Set up the portmap and buffer structure
        config.portMap = PORTMAP;
        config.bufferStructure = BUFFER_STRUCTURE;

        super(config);
    }
}

module.exports = Romi32u4;