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
const time_1 = require("./time");
const metrixRPC_1 = require("./metrixRPC");
describe("Contract", () => {
    const network = _1.networks.regtest;
    const wifPrivateKey = "cMbgxCJrTYUqgcmiC1berh5DFrtY1KeU4PXZ6NZxgenniF1mXCRk";
    const wallet = network.fromWIF(wifPrivateKey);
    before(() => __awaiter(void 0, void 0, void 0, function* () {
        // Avoid insight API 400 error
        yield time_1.sleep(1000);
    }));
    let txid;
    it("creates a contract", function () {
        return __awaiter(this, void 0, void 0, function* () {
            this.timeout(10000);
            // tslint:disable:max-line-length
            const code = "608060405234801561001057600080fd5b506040516020806101a08339810180604052810190808051906020019092919050505080600081905550506101568061004a6000396000f30060806040526004361061004c576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff16806360fe47b1146100515780636d4ce63c1461007e575b600080fd5b34801561005d57600080fd5b5061007c600480360381019080803590602001909291905050506100a9565b005b34801561008a57600080fd5b50610093610121565b6040518082815260200191505060405180910390f35b807f61ec51fdd1350b55fc6e153e60509e993f8dcb537fe4318c45a573243d96cab433600054604051808373ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff1681526020018281526020019250505060405180910390a28060008190555050565b600080549050905600a165627a7a7230582046690add90673a282f8c66726ec3e7803a56ddb8c9b7ec6a844b0b447c005d8b00290000000000000000000000000000000000000000000000000000000000000064";
            // tslint:enable:max-line-length
            const tx = yield wallet.contractCreate(code);
            txid = tx.txid;
            chai_1.assert.isNotEmpty(txid);
            yield metrixRPC_1.generateBlock(network);
        });
    });
    let contractAddress;
    it("gets transaction info", function () {
        return __awaiter(this, void 0, void 0, function* () {
            this.timeout(10000);
            const insight = network.insight();
            const info = yield insight.getTransactionInfo(txid);
            chai_1.assert.equal(info.txid, txid);
            const receipt = info.receipt[0];
            chai_1.assert.equal(receipt.to, "0000000000000000000000000000000000000000");
            chai_1.assert.equal(receipt.excepted, "None");
            contractAddress = receipt.contractAddress;
            chai_1.assert.isNotEmpty(contractAddress);
        });
    });
    it("invokes contractCall", function () {
        return __awaiter(this, void 0, void 0, function* () {
            this.timeout(10000);
            // get
            const encodedData = "6d4ce63c";
            const result = yield wallet.contractCall(contractAddress, encodedData);
            const executionResult = result.executionResult;
            chai_1.assert.equal(executionResult.output, "0000000000000000000000000000000000000000000000000000000000000064");
        });
    });
    it("invokes contractSend", function () {
        return __awaiter(this, void 0, void 0, function* () {
            this.timeout(10000);
            const encodedData = "60fe47b10000000000000000000000000000000000000000000000000000000000000001";
            const tx = yield wallet.contractSend(contractAddress, encodedData);
            yield metrixRPC_1.generateBlock(network);
            yield time_1.sleep(1000);
            const result = yield wallet.contractCall(contractAddress, "6d4ce63c");
            const executionResult = result.executionResult;
            chai_1.assert.equal(executionResult.output, "0000000000000000000000000000000000000000000000000000000000000001");
        });
    });
});
//# sourceMappingURL=contract.test.js.map