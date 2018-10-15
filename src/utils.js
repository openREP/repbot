function mapValues(x, inMin, inMax, outMin, outMax) {
    return (x - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
}

module.exports = {
    mapValues: mapValues
};