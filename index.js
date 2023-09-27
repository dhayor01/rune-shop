const btc = require('bitcore-lib')
const { writePrefixVarint, writeBitcoinVarint } = require('./varint')
const prompt = require("prompt-sync")({ sigint: true });

async function main() {
	console.log("Enter your funding private key in WIF format. Press enter to generate one.")
	const fundingWif = prompt("> ") || undefined
	const fundingPrivateKey = new btc.PrivateKey(fundingWif)
	const fundingPublicKey = fundingPrivateKey.toPublicKey();
	const fundingAddress = fundingPublicKey.toAddress();
	if (!fundingWif) {
		console.log("Generating a new funding private key... (write this down)")
		console.log("Funding Key: " + fundingPrivateKey.toString())
	}
	console.log("Funding Address: " + fundingAddress.toString())

	console.log("Enter your rune private key in WIF format. Press enter to generate one.")
	console.log("Note: This has to be different from your funding key.")
	const runeWif = prompt("> ") || undefined
	const runePrivateKey = new btc.PrivateKey(runeWif)
	const runePublicKey = runePrivateKey.toPublicKey();
	const runeAddress = runePublicKey.toAddress();
	if (!runeWif) {
		console.log("Generating a new rune private key... (write this down)")
		console.log("Write this down:")
		console.log("Rune Key: " + runePrivateKey.toString())
	}
	console.log("Rune Address: " + runeAddress.toString())

	console.log("Querying your funding balance...")
	const url = `https://blockchain.info/unspent?active=${fundingAddress}`
	const response = await fetch(url);
	const json = await response.json()
	const utxos = json.unspent_outputs.map(output => {
		return {
			txid: output.tx_hash_big_endian,
			vout: output.tx_output_n,
			script: output.script,
			satoshis: output.value
		}
	})
	const balance = utxos.reduce((sum, utxo) => sum + utxo.satoshis, 0)
	console.log(`Your funding balance is ${balance} across ${utxos.length} outputs.`)

	console.log("Enter a symbol")
	let symbol = prompt("> ") || undefined
	if (!symbol) {
		console.log("No symbol entered.")
		return
	}
	symbol = symbol.toUpperCase()
	console.log('Your symbol:', symbol)

	console.log("Enter a max supply")
	let maxSupply = prompt("> ") || undefined
	if (!maxSupply) {
		console.log("No max supply entered.")
		return
	}
	maxSupply = parseInt(maxSupply)
	console.log('Your supply:', maxSupply)

	console.log("Choose a symbol encoding: b26 (default) or b27")
	let symbolEncoding = prompt("> ") || undefined
	if (!symbolEncoding) {
		symbolEncoding = 'b26'
	}
	if (symbolEncoding !== 'b26' && symbolEncoding !== 'b27') {
		console.error("Invalid symbol encoding.")
		return
	}
	if (symbol.startsWith('A') && symbolEncoding === 'b26') {
		console.error("Symbol cannot start with A in b26 for now.")
		return;
	}

	console.log("Choose a varint encoding: prefix (default) or bitcoin")
	let varintEncoding = prompt("> ") || undefined
	if (!varintEncoding) {
		varintEncoding = 'prefix'
	}
	if (varintEncoding !== 'prefix' && varintEncoding !== 'bitcoin') {
		console.error("Invalid varint encoding.")
		return;
	}

	console.log("Building transaction...")

	let write_varint = null
	if (varintEncoding === 'prefix') {
		write_varint = writePrefixVarint
	} else {
		write_varint = writeBitcoinVarint
	}

	const satPerByte = 13;
	const estimatedTxBytes = 256;
	const fee = satPerByte * estimatedTxBytes;
	const btcPrice = 27000;
	const feeDollar = fee * btcPrice / 100000000
	console.log('Fee in satoshis', fee)
	console.log('Fee in dollars at $27k BTC price', feeDollar)

	let script = btc.Script.fromASM('OP_RETURN')
	script._addBuffer(Buffer.from('R', 'utf8'))

	let transfer = []
	transfer = transfer.concat(write_varint(0))
	transfer = transfer.concat(write_varint(1))
	transfer = transfer.concat(write_varint(maxSupply))
	script._addBuffer(Buffer.from(transfer))

	let issuance = []
	let symbolEncoded = 0
	let multiplier = 1;
	for (let i = 0; i < symbol.length; i++) {
		symbolEncoded += (symbol.charCodeAt(symbol.length - i - 1) - "A".charCodeAt()) * multiplier
		if (symbolEncoding === 'b26') {
			multiplier *= 26
		} else {
			multiplier *= 27
		}
	}
	issuance = issuance.concat(write_varint(symbolEncoded))
	issuance = issuance.concat(write_varint(0)) // decimals
	script._addBuffer(Buffer.from(issuance))

	const tx = new btc.Transaction()
	tx.from(utxos)
	tx.fee(fee)
	tx.addOutput(new btc.Transaction.Output({
		script,
		satoshis: 0
	}))
	tx.to(runeAddress, btc.Transaction.DUST_AMOUNT)
	tx.change(fundingAddress)
	tx.sign(fundingPrivateKey)

	console.log("Transaction id:", tx.id)
	console.log("Transaction hex:", tx.toString())

	console.log("Copy the transaction hex and broadcast it to the network.")
	console.log("You can broadcast it at https://www.blockchain.com/explorer/assets/btc/broadcast-transaction")
}

main()
