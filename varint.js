const btc = require('bitcore-lib')

function writePrefixVarint(n) {
    // based on https://news.ycombinator.com/item?id=11263378

	if (n < (1 << 7)) {
		return [0b00000000 | n]
	}

	if (n < (1 << 14)) {
		return [0b10000000 | (n & 0b00111111), (n >> 6)]
	}

	if (n < (1 << 21)) {
		return [0b11000000 | (n & 0b00011111), (n >> 5) & 0xFF, (n >> 13)]
	}

	if (n < (1 << 28)) {
		return [0b11100000 | (n & 0b00001111), (n >> 4) & 0xFF,
			(n >> 12) & 0xFF, (n >> 20) & 0xFF]
	}

	if (n < (1 << 35)) {
		return [0b11110000 | (n & 0b00000111), (n >> 3) & 0xFF,
			(n >> 11) & 0xFF, (n >> 19) & 0xFF, (n >> 27) & 0xFF]
	}

	if (n < (1 << 42)) {
		return [0b11111000 | (n & 0b00000011), (n >> 2) & 0xFF,
			(n >> 10) & 0xFF, (n >> 18) & 0xFF, (n >> 26) & 0xFF,
			(n >> 34) & 0xFF]
	}

	if (n < (1 << 49)) {
		return [0b11111100 | (n & 0b00000001), (n >> 1) & 0xFF,
			(n >> 9) & 0xFF, (n >> 17) & 0xFF, (n >> 25) & 0xFF,
			(n >> 33) & 0xFF, (n >> 41) & 0xFF]
	}

	if (n < (1 << 56)) {
		return [0b11111110 | (n & 0b00000000), (n >> 0) & 0xFF,
			(n >> 8) & 0xFF, (n >> 16) & 0xFF, (n >> 24) & 0xFF,
			(n >> 32) & 0xFF, (n >> 40) & 0xFF, (n >> 48) & 0xFF]
	}

	throw new Err("number too big")
}

function writeBitcoinVarint(n) {
	return Array.from(new btc.encoding.Varint(n).toBuffer())
}

module.exports = {
    writePrefixVarint,
    writeBitcoinVarint
}
