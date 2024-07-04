"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const scrypt_1 = require("./scrypt");
const chai_1 = require("chai");
describe("scrypt", () => {
    it("can hash data with scrypt", () => {
        const result = scrypt_1.scrypt("foobar", {
            // use bip38 for production
            // params: params.bip38,
            params: scrypt_1.params.noop,
            // progress: (status) => {
            //   console.log("status", status)
            // },
        });
        chai_1.assert.equal(result, "d6c18ddc68a3d6f6289cffcd36ef3b4ff3be32027bc1660701848a5e8d9d1d76");
    });
});
//# sourceMappingURL=scrypt.test.js.map