"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Insight = void 0;
const fetch = require("node-fetch");
const fetchAbsolute = require('fetch-absolute');
const constants_1 = require("./constants");
const INSIGHT_BASEURLS = {
    [constants_1.NetworkNames.MAINNET]: "https://explorer.metrixcoin.com/api",
    [constants_1.NetworkNames.TESTNET]: "https://testnet-explorer.metrixcoin.com/api",
    [constants_1.NetworkNames.REGTEST]: "http://localhost:3001/api",
};
class Insight {
    constructor(baseURL) {
        this.baseURL = baseURL;
        this.fetchApi = fetchAbsolute(fetch)(baseURL);
    }
    // public static mainnet(): Insight {
    //   return new Insight(MAINNET_API_BASEURL)
    // }
    // public static testnet(): Insight {
    //   return new Insight(TESTNET_API_BASEURL)
    // }
    static forNetwork(network) {
        const baseURL = INSIGHT_BASEURLS[network.name];
        if (baseURL == null) {
            throw new Error(`No Insight API defined for network: ${network.name}`);
        }
        return new Insight(baseURL);
    }
    static toSatoshi(amount) {
        try {
            return amount.times(100000000);
        }
        catch (ex) {
            return Math.round(amount * 100000000);
        }
    }
    static fromSatoshi(amount) {
        try {
            return amount.div(100000000);
        }
        catch (ex) {
            return Math.round(amount / 100000000);
        }
    }
    listUTXOs(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi(`/address/${address}/utxo`);
            const res = yield response.json();
            let result = [];
            if (res.length > 0) {
                res.forEach((utxo) => {
                    result.push({
                        address: address,
                        txid: utxo.transactionId,
                        vout: utxo.outputIndex,
                        /**
                         * Public key that controls this UXTO, as hex string.
                         */
                        scriptPubKey: utxo.scriptPubKey,
                        amount: Insight.fromSatoshi(parseInt(utxo.value, 10)),
                        satoshis: parseInt(utxo.value, 10),
                        isStake: utxo.isStake,
                        height: utxo.blockHeight,
                        confirmations: utxo.confirmations,
                        rawtx: utxo.rawtx
                    });
                });
                return result;
            }
            return result;
        });
    }
    getInfo(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi(`/address/${address}`);
            const res = yield response.json();
            const txresponse = yield this.fetchApi(`/address/${address}/txs`);
            const txres = yield txresponse.json();
            let result = {};
            if (res) {
                let txlist = [];
                if (txres.transactions.length > 0) {
                    txlist = [...txres.transactions];
                }
                result = {
                    addrStr: address,
                    balance: Insight.fromSatoshi(parseInt(res.balance, 10)),
                    balanceSat: parseInt(res.balance),
                    totalReceived: Insight.fromSatoshi(parseInt(res.totalReceived, 10)),
                    totalReceivedSat: parseInt(res.totalReceived),
                    totalSet: Insight.fromSatoshi(parseInt(res.totalSent, 10)),
                    totalSentSat: parseInt(res.totalSent),
                    unconfirmedBalance: Insight.fromSatoshi(parseInt(res.unconfirmed, 10)),
                    unconfirmedBalanceSat: parseInt(res.unconfirmed),
                    unconfirmedTxApperances: 0,
                    txApperances: res.transactionCount,
                    transactions: txlist
                };
                return result;
            }
            return result;
        });
    }
    sendRawTx(rawtx) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi("/tx/send", {
                method: 'post',
                body: JSON.stringify({ rawtx: rawtx }),
                headers: { "Content-Type": "application/json" }
            });
            const res = yield response.json();
            if (res.status === 0) {
                return { txid: res.id };
            }
            return res;
        });
    }
    GetRawTx(tx) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi(`/raw-tx/${tx}`, {
                method: 'get',
                headers: { "Content-Type": "application/json" }
            });
            const res = yield response.json();
            console.log(res);
            if (res.status === 0) {
                return { rawtx: res.id };
            }
            return res;
        });
    }
    contractCall(address, encodedData) {
        return __awaiter(this, void 0, void 0, function* () {
            // FIXME wow, what a weird API design... maybe we should just host the RPC
            // server, with limited API exposed.
            const response = yield this.fetchApi(`/contract/${address}/call?data=${encodedData}`);
            const res = response.json();
            return res;
        });
    }
    /**
     * Estimate the fee per KB of txdata, in satoshi. Returns -1 if no estimate is
     * available. It always return -1 for testnet.
     *
     * @param nblocks
     */
    estimateFee(nblocks = 6) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi(`/info`);
            const res = yield response.json();
            const feeRate = res.feeRate;
            if (typeof feeRate !== "number" || feeRate < 0) {
                return -1;
            }
            return Insight.toSatoshi(feeRate);
        });
    }
    /**
     * Estimate the fee per byte of txdata, in satoshi. Returns -1 if no estimate is
     * available. It always return -1 for testnet.
     *
     * @param nblocks
     */
    estimateFeePerByte(nblocks = 6) {
        return __awaiter(this, void 0, void 0, function* () {
            const feeRate = yield this.estimateFee();
            if (feeRate < 0) {
                return feeRate;
            }
            return Math.ceil(feeRate / 1024);
        });
    }
    /**
     * Get single transaction's info
     * @param id
     */
    getTransactionInfo(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi(`/tx/${id}`);
            const res = yield response.json();
            const blockresponse = yield this.fetchApi(`/block/${res.blockHash}`);
            const block = blockresponse.json();
            let isqrc20 = false;
            let fee = 0;
            if (res.hasOwnProperty("mrc20TokenTransfers")) {
                isqrc20 = true;
            }
            if (res.isCoinstake === false) {
                fee = res.fees;
            }
            else {
                fee = 0;
            }
            let txVin = [];
            let txVout = [];
            res.inputs.forEach((vin) => {
                txVin.push({
                    txid: vin.prevTxId,
                    addr: vin.address
                });
            });
            res.outputs.forEach((vout) => {
                txVout.push({
                    value: vout.value,
                    scriptPubKey: { addresses: vout.address }
                });
            });
            let txReceipt = [];
            if (res.outputs[0].receipt) {
                let txindex = 0;
                let txReceiptTo = "";
                if (res.hasOwnProperty("mrc20TokenTransfers")) {
                    if (res.mrc20TokenTransfers.length > 0) {
                        txReceiptTo = res.mrc20TokenTransfers[0].to;
                    }
                }
                block.transactions.forEach((tx, index) => {
                    if (tx = res.hash) {
                        txindex = index;
                    }
                });
                txReceipt.push({
                    blockHash: res.blockHash,
                    blockNumber: res.blockHeight,
                    contractAddress: res.outputs[0].receipt.contractAddress,
                    cumulativeGasUsed: res.outputs[0].receipt.gasUsed,
                    excepted: res.outputs[0].receipt.excepted,
                    from: res.outputs[0].receipt.sender,
                    to: txReceiptTo,
                    gasUsed: res.outputs[0].receipt.gasUsed,
                    log: res.outputs[0].receipt.logs,
                    transactionHash: res.hash,
                    transactionIndex: txindex,
                });
            }
            let result = {
                txid: res.id,
                version: res.version,
                locktime: res.lockTime,
                receipt: txReceipt,
                vin: txVin,
                vout: txVout,
                confirmations: res.confirmations,
                time: res.timestamp,
                valueOut: res.outputValue,
                valueIn: res.inputValue,
                fees: fee,
                blockhash: res.blockHash,
                blockheight: res.blockHeight,
                isqrc20Transfer: isqrc20
            };
            return result;
        });
    }
    /**
     * Get multiple Transaction info (paginated)
     * @param address
     * @param pageNum
     */
    getTransactions(address, pageNum = 0) {
        return __awaiter(this, void 0, void 0, function* () {
            const response = yield this.fetchApi(`/address/${address}/txs-detail?pageSize=10&page=${pageNum}`);
            const result = yield response.json();
            let pages = Math.ceil(result.totalCount / 10);
            let txList = [];
            if (result.transactions.length > 0) {
                for (let i = 0; i < result.transactions.length; i++) {
                    let res = result.transactions[i];
                    let isqrc20 = false;
                    let fee = 0;
                    if (res.hasOwnProperty("mrc20TokenTransfers")) {
                        isqrc20 = true;
                    }
                    if (res.isCoinstake === false) {
                        fee = res.fees;
                    }
                    else {
                        fee = 0;
                    }
                    let txVin = [];
                    let txVout = [];
                    res.inputs.forEach((vin) => {
                        txVin.push({
                            txid: vin.prevTxId,
                            addr: vin.address
                        });
                    });
                    res.outputs.forEach((vout) => {
                        txVout.push({
                            value: vout.value,
                            scriptPubKey: { addresses: vout.address }
                        });
                    });
                    let txReceipt = [];
                    if (res.outputs[0].receipt) {
                        let txindex = 0;
                        let txReceiptTo = "";
                        if (res.hasOwnProperty("mrc20TokenTransfers")) {
                            if (res.mrc20TokenTransfers.length > 0) {
                                txReceiptTo = res.mrc20TokenTransfers[0].to;
                            }
                        }
                        txReceipt.push({
                            blockHash: res.blockHash,
                            blockNumber: res.blockHeight,
                            contractAddress: res.outputs[0].receipt.contractAddress,
                            cumulativeGasUsed: res.outputs[0].receipt.gasUsed,
                            excepted: res.outputs[0].receipt.excepted,
                            from: res.outputs[0].receipt.sender,
                            to: txReceiptTo,
                            gasUsed: res.outputs[0].receipt.gasUsed,
                            log: res.outputs[0].receipt.logs,
                            transactionHash: res.hash,
                            transactionIndex: res.outputIndex,
                        });
                    }
                    txList.push({
                        txid: res.id,
                        version: res.version,
                        locktime: res.lockTime,
                        receipt: txReceipt,
                        vin: txVin,
                        vout: txVout,
                        confirmations: res.confirmations,
                        time: res.timestamp,
                        valueOut: res.outputValue,
                        valueIn: res.inputValue,
                        fees: fee,
                        blockhash: res.blockHash,
                        blockheight: res.blockHeight,
                        isqrc20Transfer: isqrc20
                    });
                }
            }
            return { pagesTotal: pages, txs: [...txList] };
        });
    }
}
exports.Insight = Insight;
//# sourceMappingURL=Insight.js.map