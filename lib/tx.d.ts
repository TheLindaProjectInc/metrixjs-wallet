import { ECPair } from "bitcoinjs-lib";
/**
 * Options for a payment transaction
 */
export interface ISendTxOptions {
    /**
     * Fee rate to pay for the raw transaction data (satoshi per byte). The
     * default value is the query result of the network's fee rate.
     */
    feeRate?: number;
}
export interface IContractSendTXOptions {
    /**
     * unit: satoshi
     */
    amount?: number;
    /**
     * unit: satoshi
     */
    gasLimit?: number;
    /**
     * unit: satoshi / gas
     */
    gasPrice?: number;
    /**
     * unit: satoshi / kilobyte
     */
    feeRate?: number;
}
export interface IContractCreateTXOptions {
    /**
     * unit: satoshi
     */
    gasLimit?: number;
    /**
     * unit: satoshi / gas
     */
    gasPrice?: number;
    /**
     * unit: satoshi / kilobyte
     */
    feeRate?: number;
}
export interface IUTXO {
    address: string;
    txid: string;
    hash: string;
    pos: number;
    /**
     * Public key that controls this UXTO, as hex string.
     */
    scriptPubKey: string;
    amount: number;
    value: number;
    isStake: boolean;
    confirmations: number;
}
export declare function estimatePubKeyHashTransactionMaxSend(utxos: IUTXO[], to: string, feeRate: number): number;
/**
 * Build a pay-to-pubkey-hash transaction
 *
 * @param keyPair
 * @param to
 * @param amount (unit: satoshi)
 * @param feeRate
 * @param utxoList
 */
export declare function buildPubKeyHashTransaction(utxos: IUTXO[], keyPair: ECPair, to: string, amount: number, feeRate: number): string;
/**
 * Build a create-contract transaction
 *
 * @param keyPair
 * @param code The contract byte code
 * @param feeRate Fee per byte of tx. (unit: satoshi)
 * @param utxoList
 * @returns the built tx
 */
export declare function buildCreateContractTransaction(utxos: IUTXO[], keyPair: ECPair, code: string, feeRate: number, opts?: IContractCreateTXOptions): string;
export declare function estimateSendToContractTransactionMaxValue(utxos: IUTXO[], keyPair: ECPair, contractAddress: string, encodedData: string, feeRate: number, opts?: IContractSendTXOptions): number;
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
export declare function buildSendToContractTransaction(utxos: IUTXO[], keyPair: ECPair, contractAddress: string, encodedData: string, feeRate: number, opts?: IContractSendTXOptions): string;
