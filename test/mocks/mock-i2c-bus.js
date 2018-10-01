
let BUFFER = [];

let BUFFERS = {};

class Bus {
    close(cb) {
        cb();
    }

    closeSync() {

    }

    readByte(addr, cmd, cb) {
        var buffer = BUFFERS[addr];
        cb(undefined, buffer[cmd]);
    }

    readByteSync(addr, cmd) {
        var buffer = BUFFERS[addr];
        return buffer[cmd];
    }

    readWord(addr, cmd, cb) {
        var buffer = BUFFERS[addr];
        var byteA = buffer[cmd];
        var byteB = buffer[cmd+1];
        var value = ((byteA << 8) | byteB) & 0xFFFF;
        cb(undefined, value);
    }

    writeByteSync(addr, cmd, value) {
        var buffer = BUFFERS[addr];
        buffer[cmd] = value;
    }

    writeWordSync(addr, cmd, value) {
        var buffer = BUFFERS[addr];
        buffer[cmd] = (value >> 8) & 0xFF;
        buffer[cmd+1] = value & 0xFF;
    }
}

const busInstance = new Bus();

module.exports = {
    openSync: () => {
        return busInstance;
    },
    open: () => {
        return busInstance;
    },

    setBuffer(addr, buf) {
        BUFFERS[addr] = buf;
    },
    getBuffer(addr) {
        return BUFFERS[addr].slice(0);
    },
    getAllBuffers() {
        return BUFFERS;
    }
}