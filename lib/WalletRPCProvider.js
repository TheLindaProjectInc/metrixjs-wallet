"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletRPCProvider = void 0;
class WalletRPCProvider {
    constructor(wallet) {
        this.wallet = wallet;
    }
    rawCall(method, params = [], opts = {}) {
        const [contractAddress, encodedData, 
        // these are optionals
        amount, gasLimit, gasPrice,] = params;
        // The underlying metrixjs-wallet API expects gasPrice and amount to be specified in sat
        const gasPriceInSatoshi = Math.floor((gasPrice || 0.00005000) * 1e8);
        const amountInSatoshi = Math.floor((amount || 0) * 1e8);
        opts = Object.assign(Object.assign({}, opts), { amount: amountInSatoshi, gasLimit: gasLimit || 250000, gasPrice: gasPriceInSatoshi });
        switch (method.toLowerCase()) {
            case "sendtocontract":
                return this.wallet.contractSend(contractAddress, encodedData, opts);
            case "callcontract":
                return this.wallet.contractCall(contractAddress, encodedData, opts);
            default:
                throw new Error("Unknow method call");
        }
    }
}
exports.WalletRPCProvider = WalletRPCProvider;
//# sourceMappingURL=WalletRPCProvider.js.map