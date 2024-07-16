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
exports.networks = exports.Network = exports.networksInfo = exports.NetworkNames = void 0;
const ecc = __importStar(require("@bitcoinerlab/secp256k1"));
const bip38 = __importStar(require("bip38"));
const bip39 = __importStar(require("bip39"));
const wifEncoder = __importStar(require("wif"));
const bs58 = __importStar(require("bs58check"));
const bitcoin = __importStar(require("bitcoinjs-lib"));
const bip32_1 = require("bip32");
const Wallet_1 = require("./Wallet");
const Insight_1 = require("./Insight");
const index_1 = require("./index");
const scrypt_1 = require("./scrypt");
const constants_1 = require("./constants");
var constants_2 = require("./constants");
Object.defineProperty(exports, "NetworkNames", { enumerable: true, get: function () { return constants_2.NetworkNames; } });
const bip32 = bip32_1.BIP32Factory(ecc);
exports.networksInfo = {
    [constants_1.NetworkNames.MAINNET]: {
        name: constants_1.NetworkNames.MAINNET,
        messagePrefix: '\x17Metrix Signed Message:\n',
        bech32: "mc",
        bip32: { public: 0x0488b21e, private: 0x0488ade4 },
        pubKeyHash: 0x32,
        scriptHash: 0x55,
        wif: 0x99,
    },
    [constants_1.NetworkNames.TESTNET]: {
        name: constants_1.NetworkNames.TESTNET,
        messagePrefix: '\x17Metrix Signed Message:\n',
        bech32: 'tm',
        bip32: { public: 0x043587cf, private: 0x04358394 },
        pubKeyHash: 0x6e,
        scriptHash: 0xbb,
        wif: 0xef,
    },
    [constants_1.NetworkNames.REGTEST]: {
        name: constants_1.NetworkNames.REGTEST,
        messagePrefix: '\x17Metrix Signed Message:\n',
        bech32: "tb",
        bip32: { public: 70617039, private: 70615956 },
        pubKeyHash: 120,
        scriptHash: 110,
        wif: 239,
    },
};
class Network {
    constructor(info) {
        this.info = info;
    }
    /**
     * Restore a HD-wallet address from mnemonic & password
     *
     * @param mnemonic
     * @param password
     *
     */
    fromMnemonic(mnemonic, password) {
        // if (bip39.validateMnemonic(mnemonic) == false) return false
        const seedHex = bip39.mnemonicToSeedSync(mnemonic, password);
        const hdNode = bip32.fromSeed(seedHex, this.info);
        const account = hdNode
            .deriveHardened(88)
            .deriveHardened(0)
            .deriveHardened(0);
        const keyPair = bitcoin.ECPair.fromWIF(account.toWIF(), this.info);
        return new Wallet_1.Wallet(keyPair, this.info);
    }
    /**
     * constructs a wallet from bip38 encrypted private key
     * @param encrypted private key string
     * @param passhprase password
     * @param scryptParams scryptParams
     */
    fromEncryptedPrivateKey(encrypted, passhprase, scryptParams = scrypt_1.params.bip38) {
        const { privateKey, compressed } = bip38.decrypt(encrypted, passhprase, undefined, scryptParams);
        const decoded = wifEncoder.encode(this.info.wif, privateKey, compressed);
        return this.fromWIF(decoded);
    }
    /**
     * Restore 10 wallet addresses exported from METRIX's mobile clients. These
     * wallets are 10 sequential addresses rooted at the HD-wallet path
     * `m/88'/0'/0'` `m/88'/0'/1'` `m/88'/0'/2'`, and so on.
     *
     * @param mnemonic
     * @param network
     */
    fromMobile(mnemonic) {
        const seedHex = bip39.mnemonicToSeedSync(mnemonic);
        const hdNode = bip32.fromSeed(seedHex, this.info);
        const account = hdNode.deriveHardened(88).deriveHardened(0);
        const wallets = [];
        for (let i = 0; i < 10; i++) {
            const hdnode = account.deriveHardened(i);
            const wallet = new Wallet_1.Wallet(bitcoin.ECPair.fromWIF(hdnode.toWIF()), this.info);
            wallets.push(wallet);
        }
        return wallets;
    }
    /**
     * Restore wallet from private key specified in WIF format:
     *
     * See: https://en.bitcoin.it/wiki/Wallet_import_format
     *
     * @param wif
     */
    fromWIF(wif) {
        if (!index_1.validatePrivateKey(wif)) {
            throw new Error("wif is invalid, it does not satisfy ECDSA");
        }
        const keyPair = bitcoin.ECPair.fromWIF(wif, this.info);
        return new Wallet_1.Wallet(keyPair, this.info);
    }
    /**
     * Alias for `fromWIF`
     * @param wif
     */
    fromPrivateKey(wif) {
        return this.fromWIF(wif);
    }
    insight() {
        return Insight_1.Insight.forNetwork(this.info);
    }
    hexToBase58(input) {
        const buf = Buffer.from(input, "hex");
        return bs58.encode(buf);
    }
    base58ToHex(input) {
        const buf = bs58.decode(input);
        return buf.toString("hex");
    }
}
exports.Network = Network;
const mainnet = new Network(exports.networksInfo[constants_1.NetworkNames.MAINNET]);
const testnet = new Network(exports.networksInfo[constants_1.NetworkNames.TESTNET]);
const regtest = new Network(exports.networksInfo[constants_1.NetworkNames.REGTEST]);
exports.networks = {
    mainnet,
    testnet,
    regtest,
};
//# sourceMappingURL=Network.js.map