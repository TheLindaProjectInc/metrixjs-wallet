"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildSendToContractTransaction = exports.estimateSendToContractTransactionMaxValue = exports.buildCreateContractTransaction = exports.buildPubKeyHashTransaction = exports.estimatePubKeyHashTransactionMaxSend = void 0;
const bitcoinjs_lib_1 = require("bitcoinjs-lib");
const script_number_1 = require("bitcoinjs-lib/src/script_number");
const bignumber_js_1 = require("bignumber.js");
const buffer_1 = require("buffer");
const opcodes_1 = require("./opcodes");
const bitcoin = __importStar(require("bitcoinjs-lib"));
function ensureAmountInteger(n) {
    if (!Number.isInteger(n)) {
        throw new Error(`Expect tx amount to be an integer, got: ${n}`);
    }
}
function estimatePubKeyHashTransactionMaxSend(utxos, to, feeRate) {
    let maxAmount = 0;
    for (const utxo of utxos) {
        maxAmount += utxo.value;
    }
    while (maxAmount > 0) {
        let inputs = selectTxs(utxos, maxAmount, feeRate);
        if (inputs != null) {
            return maxAmount;
        }
        // step down by 0.01 metrix
        maxAmount = maxAmount - 1000000;
    }
    return 0;
}
exports.estimatePubKeyHashTransactionMaxSend = estimatePubKeyHashTransactionMaxSend;
/**
 * This is a function for selecting MRX utxos to build transactions
 * the transaction object takes at least 3 fields, value(satoshis) , confirmations and isStake
 *
 * @param [transaction] unspentTransactions
 * @param Number amount(unit: satoshis)
 * @param Number fee(unit: satoshis)
 * @returns [transaction]
 */
function selectTxs(unspentTransactions, amount, fee) {
    //sort the utxo
    var matureList = [];
    var immatureList = [];
    for (var i = 0; i < unspentTransactions.length; i++) {
        if (unspentTransactions[i].confirmations >= 960 || unspentTransactions[i].isStake === false) {
            matureList[matureList.length] = unspentTransactions[i];
        }
        else {
            immatureList[immatureList.length] = unspentTransactions[i];
        }
    }
    matureList.sort(function (a, b) { return a.value - b.value; });
    immatureList.sort(function (a, b) { return b.confirmations - a.confirmations; });
    unspentTransactions = matureList.concat(immatureList);
    var value = new bignumber_js_1.BigNumber(amount);
    var find = [];
    var findTotal = new bignumber_js_1.BigNumber(0);
    var feeTotal = new bignumber_js_1.BigNumber(0);
    for (var i = 0; i < unspentTransactions.length; i++) {
        var tx = unspentTransactions[i];
        findTotal = findTotal.plus(tx.value);
        find[find.length] = tx;
        feeTotal = feeTotal.plus(fee);
        if (findTotal.isGreaterThanOrEqualTo(value.plus(feeTotal)))
            break;
    }
    if (value.isGreaterThan(findTotal)) {
        throw new Error('You do not have enough MRX to send');
    }
    return { inputs: find, feeTotal: feeTotal.toNumber() };
}
/**
 * Build a pay-to-pubkey-hash transaction
 *
 * @param keyPair
 * @param to
 * @param amount (unit: satoshi)
 * @param feeRate
 * @param utxoList
 */
function buildPubKeyHashTransaction(utxos, keyPair, to, amount, feeRate) {
    ensureAmountInteger(amount);
    const senderAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: keyPair.network }).address;
    let { inputs, feeTotal: txfee } = selectTxs(utxos, amount, feeRate);
    if (inputs == null) {
        throw new Error("could not find UTXOs to build transaction");
    }
    const txb = new bitcoinjs_lib_1.TransactionBuilder(keyPair.network);
    let vinSum = new bignumber_js_1.BigNumber(0);
    for (const input of inputs) {
        txb.addInput(input.hash, input.pos);
        vinSum = vinSum.plus(input.value);
    }
    if (vinSum.isEqualTo(new bignumber_js_1.BigNumber(amount))) {
        amount = new bignumber_js_1.BigNumber(amount).minus(txfee).toNumber();
    }
    txb.addOutput(to, amount);
    const change = vinSum
        .minus(txfee)
        .minus(amount)
        .toNumber();
    if (change > 0) {
        txb.addOutput(senderAddress, change);
    }
    for (let i = 0; i < inputs.length; i++) {
        txb.sign(i, keyPair);
    }
    return txb.build().toHex();
}
exports.buildPubKeyHashTransaction = buildPubKeyHashTransaction;
/**
 * Build a create-contract transaction
 *
 * @param keyPair
 * @param code The contract byte code
 * @param feeRate Fee per byte of tx. (unit: satoshi)
 * @param utxoList
 * @returns the built tx
 */
function buildCreateContractTransaction(utxos, keyPair, code, feeRate, opts = {}) {
    const gasLimit = opts.gasLimit || defaultContractSendTxOptions.gasLimit;
    const gasPrice = opts.gasPrice || defaultContractSendTxOptions.gasPrice;
    const gasLimitFee = new bignumber_js_1.BigNumber(gasLimit).times(gasPrice).toNumber();
    const createContractScript = bitcoinjs_lib_1.script.compile([
        opcodes_1.OPS.OP_4,
        script_number_1.encode(gasLimit),
        script_number_1.encode(gasPrice),
        buffer_1.Buffer.from(code, "hex"),
        opcodes_1.OPS.OP_CREATE,
    ]);
    const fromAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
    const amount = 0;
    const amountTotal = new bignumber_js_1.BigNumber(amount).plus(gasLimitFee).toNumber();
    let { inputs, feeTotal: txfee } = selectTxs(utxos, amountTotal, feeRate);
    if (inputs == null) {
        throw new Error("could not find UTXOs to build transaction");
    }
    const txb = new bitcoinjs_lib_1.TransactionBuilder(keyPair.network);
    let totalValue = new bignumber_js_1.BigNumber(0);
    for (const input of inputs) {
        txb.addInput(input.hash, input.pos);
        totalValue = totalValue.plus(input.value);
    }
    // create-contract output
    txb.addOutput(createContractScript, 0);
    const change = totalValue
        .minus(txfee)
        .minus(gasLimitFee)
        .toNumber();
    if (change > 0) {
        txb.addOutput(fromAddress, change);
    }
    for (let i = 0; i < inputs.length; i++) {
        txb.sign(i, keyPair);
    }
    return txb.build().toHex();
}
exports.buildCreateContractTransaction = buildCreateContractTransaction;
const defaultContractSendTxOptions = {
    gasLimit: 250000,
    gasPrice: 5000,
    amount: 0,
    // Wallet uses only one address. Can't really support senderAddress.
    // senderAddress
};
function estimateSendToContractTransactionMaxValue(utxos, keyPair, contractAddress, encodedData, feeRate, opts = {}) {
    feeRate = Math.floor(feeRate);
    const gasLimit = opts.gasLimit || defaultContractSendTxOptions.gasLimit;
    const gasPrice = opts.gasPrice || defaultContractSendTxOptions.gasPrice;
    let amount = 0;
    for (const utxo of utxos) {
        amount += utxo.value;
    }
    amount -= gasLimit * gasPrice;
    ensureAmountInteger(amount);
    const senderAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey }).address;
    // excess gas will refund in the coinstake tx of the mined block
    const gasLimitFee = new bignumber_js_1.BigNumber(gasLimit).times(gasPrice).toNumber();
    const opcallScript = bitcoinjs_lib_1.script.compile([
        opcodes_1.OPS.OP_4,
        script_number_1.encode(gasLimit),
        script_number_1.encode(gasPrice),
        buffer_1.Buffer.from(encodedData, "hex"),
        buffer_1.Buffer.from(contractAddress, "hex"),
        opcodes_1.OPS.OP_CALL,
    ]);
    while (amount > 0) {
        let { inputs } = selectTxs(utxos, amount, feeRate);
        if (inputs != null) {
            return amount;
        }
        amount -= 10000;
    }
    return 0;
}
exports.estimateSendToContractTransactionMaxValue = estimateSendToContractTransactionMaxValue;
/**
 * Build a send-to-contract transaction
 *
 * @param keyPair
 * @param contractAddress
 * @param encodedData
 * @param feeRate Fee per byte of tx. (unit: satoshi / byte)
 * @param utxoList
 * @returns the built tx
 */
function buildSendToContractTransaction(utxos, keyPair, contractAddress, encodedData, feeRate, opts = {}) {
    // feeRate must be an integer number, or UTXO selection would always fail
    feeRate = Math.floor(feeRate);
    const gasLimit = opts.gasLimit || defaultContractSendTxOptions.gasLimit;
    const gasPrice = opts.gasPrice || defaultContractSendTxOptions.gasPrice;
    const amount = opts.amount || defaultContractSendTxOptions.amount;
    ensureAmountInteger(amount);
    const senderAddress = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: keyPair.network }).address;
    // excess gas will refund in the coinstake tx of the mined block
    const gasLimitFee = new bignumber_js_1.BigNumber(gasLimit).times(gasPrice).toNumber();
    const opcallScript = bitcoinjs_lib_1.script.compile([
        opcodes_1.OPS.OP_4,
        script_number_1.encode(gasLimit),
        script_number_1.encode(gasPrice),
        buffer_1.Buffer.from(encodedData, "hex"),
        buffer_1.Buffer.from(contractAddress, "hex"),
        opcodes_1.OPS.OP_CALL,
    ]);
    const amountTotal = new bignumber_js_1.BigNumber(amount).plus(gasLimitFee).toNumber();
    let { inputs, feeTotal: txfee } = selectTxs(utxos, amountTotal, feeRate);
    if (inputs == null) {
        throw new Error("could not find UTXOs to build transaction");
    }
    const txb = new bitcoinjs_lib_1.TransactionBuilder(keyPair.network);
    // add inputs to txb
    let vinSum = new bignumber_js_1.BigNumber(0);
    for (const input of inputs) {
        txb.addInput(input.hash, input.pos);
        vinSum = vinSum.plus(input.value);
    }
    // send-to-contract output
    txb.addOutput(opcallScript, amount);
    // change output (in satoshi)
    const change = vinSum
        .minus(txfee)
        .minus(gasLimitFee)
        .minus(amount)
        .toNumber();
    if (change > 0) {
        txb.addOutput(senderAddress, change);
    }
    for (let i = 0; i < inputs.length; i++) {
        txb.sign(i, keyPair);
    }
    return txb.build().toHex();
}
exports.buildSendToContractTransaction = buildSendToContractTransaction;
// The prevalent network fee is 10 per KB. If set to 100 times of norm, assume error.
const MAX_FEE_RATE = Math.ceil((10 * 100 * 1e8) / 1024);
function checkFeeRate(feeRate) {
    if (feeRate > MAX_FEE_RATE) {
        throw new Error("Excessive tx fees, is set to 100 times of norm.");
    }
}
//# sourceMappingURL=tx.js.map