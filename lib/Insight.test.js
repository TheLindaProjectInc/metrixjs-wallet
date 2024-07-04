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
const chai_1 = require("chai");
const _1 = require("./");
describe("Insight", function () {
    return __awaiter(this, void 0, void 0, function* () {
        this.timeout(10000);
        const network = _1.networks.regtest;
        const insight = network.insight();
        it("estimates fee per byte", () => __awaiter(this, void 0, void 0, function* () {
            for (let i = 1; i <= 32; i++) {
                const feePerByte = yield insight.estimateFee(i);
                // It always return -1 for testnet.
                chai_1.assert.equal(feePerByte, -1);
            }
        }));
    });
});
//# sourceMappingURL=Insight.test.js.map