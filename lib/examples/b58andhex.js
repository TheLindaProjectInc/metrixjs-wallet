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
const Network_1 = require("../Network");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const network = Network_1.networks.mainnet;
        const wallet = network.fromMnemonic("hold struggle ready lonely august napkin enforce retire pipe where avoid drip");
        console.log(wallet.address);
        console.log(network.base58ToHex(wallet.address));
        console.log(network.hexToBase58(network.base58ToHex(wallet.address)));
    });
}
main().catch((err) => console.log("err", err));
//# sourceMappingURL=b58andhex.js.map