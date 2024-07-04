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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Wallet = void 0;
const bip38 = __importStar(require("bip38"));
const wif = __importStar(require("wif"));
const ecc = __importStar(require("@bitcoinerlab/secp256k1"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bip32_1 = __importDefault(require("bip32"));
const Insight_1 = require("./Insight");
const tx_1 = require("./tx");
const scrypt_1 = require("./scrypt");
/**
 * The default relay fee rate (per byte) if network doesn't cannot estimate how much to use.
 *
 * This value will be used for testnet.
 */
const defaultTxFeePerByte = Math.ceil((10 * 1e8) / 1024);
const bip32 = bip32_1.default(ecc);
class Wallet {
    constructor(keyPair, network) {
        this.keyPair = keyPair;
        this.network = network;
        this.address = bitcoin.payments.p2pkh({ pubkey: keyPair.publicKey, network: network }).address;
        this.insight = Insight_1.Insight.forNetwork(network);
    }
    toWIF() {
        return this.keyPair.toWIF();
    }
    /**
     * Get basic information about the wallet address.
     */
    getInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.insight.getInfo(this.address);
        });
    }
    getUTXOs() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.insight.listUTXOs(this.address);
        });
    }
    /**
     * get transactions by wallet address
     * @param pageNum page number
     */
    getTransactions(pageNum) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.insight.getTransactions(this.address, pageNum);
        });
    }
    getTransactionInfo(id) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.insight.getTransactionInfo(id);
        });
    }
    /**
     * bip38 encrypted wip
     * @param passphrase
     * @param params scryptParams
     */
    toEncryptedPrivateKey(passphrase, scryptParams = scrypt_1.params.bip38) {
        const { privateKey, compressed } = wif.decode(this.toWIF());
        return bip38.encrypt(privateKey, compressed, passphrase, undefined, scryptParams);
    }
    /**
     * The network relay fee rate. (satoshi per byte)
     */
    feeRatePerByte() {
        return __awaiter(this, void 0, void 0, function* () {
            const feeRate = yield this.insight.estimateFeePerByte();
            if (feeRate === -1) {
                return defaultTxFeePerByte;
            }
            return feeRate;
        });
    }
    /**
     * Generate and sign a payment transaction.
     *
     * @param to The receiving address
     * @param amount The amount to transfer (in satoshi)
     * @param opts
     *
     * @returns The raw transaction as hexadecimal string
     */
    generateTx(to, amount, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield this.getBitcoinjsUTXOs();
            const feeRate = Math.ceil(opts.feeRate || (yield this.feeRatePerByte()));
            return tx_1.buildPubKeyHashTransaction(utxos, this.keyPair, to, amount, feeRate);
        });
    }
    /**
     * Estimate the maximum value that could be sent from this wallet address.
     *
     * @param to The receiving address
     * @param opts
     *
     * @returns satoshi
     */
    sendEstimateMaxValue(to, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield this.getBitcoinjsUTXOs();
            const feeRate = Math.ceil(opts.feeRate || (yield this.feeRatePerByte()));
            return tx_1.estimatePubKeyHashTransactionMaxSend(utxos, to, feeRate);
        });
    }
    /**
     * Send payment to a receiving address. The transaction is signed locally
     * using the wallet's private key, and the raw transaction submitted to a
     * remote API (without revealing the wallet's secret).
     *
     * @param to The receiving address
     * @param amount The amount to transfer (in satoshi)
     * @param opts
     * @return The raw transaction as hexadecimal string
     */
    send(to, amount, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawtx = yield this.generateTx(to, amount, opts);
            return this.sendRawTx(rawtx);
        });
    }
    /**
     * Submit a signed raw transaction to the network.
     *
     * @param rawtx Hex encoded raw transaction data.
     */
    sendRawTx(rawtx) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.insight.sendRawTx(rawtx);
        });
    }
    /**
     * Generate a raw a send-to-contract transaction that invokes a contract's method.
     *
     * @param contractAddress
     * @param encodedData
     * @param opts
     */
    generateContractSendTx(contractAddress, encodedData, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield this.getBitcoinjsUTXOs();
            const feeRate = Math.ceil(opts.feeRate || (yield this.feeRatePerByte()));
            // TODO: estimate the precise gasLimit
            return tx_1.buildSendToContractTransaction(utxos, this.keyPair, contractAddress, encodedData, feeRate, opts);
        });
    }
    /**
     * Query a contract's method. It returns the result and logs of a simulated
     * execution of the contract's code.
     *
     * @param contractAddress Address of the contract in hexadecimal
     * @param encodedData The ABI encoded method call, and parameter values.
     * @param opts
     */
    contractCall(contractAddress, encodedData, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.insight.contractCall(contractAddress, encodedData);
        });
    }
    /**
     * Create a send-to-contract transaction that invokes a contract's method.
     *
     * @param contractAddress Address of the contract in hexadecimal
     * @param encodedData The ABI encoded method call, and parameter values.
     * @param opts
     */
    contractSend(contractAddress, encodedData, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawTx = yield this.generateContractSendTx(contractAddress, encodedData, opts);
            return this.sendRawTx(rawTx);
        });
    }
    /**
     * Estimate the maximum value that could be sent to a contract, substracting the amount reserved for gas.
     *
     * @param contractAddress Address of the contract in hexadecimal
     * @param encodedData The ABI encoded method call, and parameter values.
     * @param opts
     *
     * @returns satoshi
     */
    contractSendEstimateMaxValue(contractAddress, encodedData, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield this.getBitcoinjsUTXOs();
            const feeRate = Math.ceil(opts.feeRate || (yield this.feeRatePerByte()));
            // TODO: estimate the precise gasLimit
            return tx_1.estimateSendToContractTransactionMaxValue(utxos, this.keyPair, contractAddress, encodedData, feeRate, opts);
        });
    }
    /**
     * Massage UTXOs returned by the Insight API to UTXO format accepted by the
     * underlying metrixjs-lib.
     */
    getBitcoinjsUTXOs() {
        return __awaiter(this, void 0, void 0, function* () {
            const uxtos = yield this.getUTXOs();
            // FIXME: Generating another raw tx before the previous tx had be mined
            // could cause overlapping UXTOs to be used.
            // FIXME: make the two compatible...
            // massage UXTO to format accepted by bitcoinjs
            const bitcoinjsUTXOs = uxtos.map((uxto) => (Object.assign(Object.assign({}, uxto), { pos: uxto.vout, value: uxto.satoshis, hash: uxto.txid }))).filter((utxo) => utxo.confirmations >= 960 || !utxo.isStake);
            return bitcoinjsUTXOs;
        });
    }
    /**
     * The BIP32 HDNode, which may be used to derive new key pairs
     */
    hdnode() {
        const seed = this.keyPair.publicKey;
        const hdnode = bip32.fromSeed(seed, this.network);
        return hdnode;
    }
    /**
     * Use BIP32 to derive child wallets from the current wallet's keypair.
     * @param n The index of the child wallet to derive.
     */
    deriveChildWallet(n = 0) {
        const childKeyWIF = this.hdnode().deriveHardened(n).toWIF();
        return new Wallet(bitcoin.ECPair.fromWIF(childKeyWIF), this.network);
    }
    contractCreate(code, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const rawTx = yield this.generateCreateContractTx(code, opts);
            return this.sendRawTx(rawTx);
        });
    }
    generateCreateContractTx(code, opts = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const utxos = yield this.getBitcoinjsUTXOs();
            const feeRate = Math.ceil(opts.feeRate || (yield this.feeRatePerByte()));
            // TODO: estimate the precise gasLimit
            return tx_1.buildCreateContractTransaction(utxos, this.keyPair, code, feeRate, opts);
        });
    }
}
exports.Wallet = Wallet;
//# sourceMappingURL=Wallet.js.map