const PinModes = Object.freeze({
    INPUT: 0x00,
    OUTPUT: 0x01,
    ANALOG: 0x02,
    PWM: 0x03,
    SERVO: 0x04,
    PULLUP: 0x0B,
    ENCODER: 0xAA
});

module.exports = {
    MODES: PinModes
}
