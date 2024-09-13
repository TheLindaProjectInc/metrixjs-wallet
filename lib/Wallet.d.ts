import { ECPairInterface } from 'bitcoinjs-lib';
import { BIP32Interface } from "bip32";
import { INetworkInfo } from "./Network";
import { Insight } from "./Insight";
import { IUTXO, IContractSendTXOptions, ISendTxOptions, IContractCreateTXOptions } from "./tx";
import { IScryptParams } from "./scrypt";
export declare class Wallet {
    keyPair: ECPairInterface;
    network: INetworkInfo;
    address: string;
    private insight;
    constructor(keyPair: ECPairInterface, network: INetworkInfo);
    toWIF(): string;
    /**
     * Get basic information about the wallet address.
     */
    getInfo(): Promise<Insight.IGetInfo>;
    getUTXOs(): Promise<Insight.IUTXO[]>;
    /**
     * get transactions by wallet address
     * @param pageNum page number
     */
    getTransactions(pageNum?: number): Promise<Insight.IRawTransactions>;
    getTransactionInfo(id: string): Promise<Insight.IRawTransactionInfo>;
    /**
     * bip38 encrypted wip
     * @param passphrase
     * @param params scryptParams
     */
    toEncryptedPrivateKey(passphrase: string, scryptParams?: IScryptParams): string;
    /**
     * The network relay fee rate. (satoshi per byte)
     */
    feeRatePerByte(): Promise<number>;
    /**
     * Generate and sign a payment transaction.
     *
     * @param to The receiving address
     * @param amount The amount to transfer (in satoshi)
     * @param opts
     *
     * @returns The raw transaction as hexadecimal string
     */
    generateTx(to: string, amount: number, opts?: ISendTxOptions): Promise<string>;
    /**
     * Estimate the maximum value that could be sent from this wallet address.
     *
     * @param to The receiving address
     * @param opts
     *
     * @returns satoshi
     */
    sendEstimateMaxValue(to: string, opts?: ISendTxOptions): Promise<number>;
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
    send(to: string, amount: number, opts?: ISendTxOptions): Promise<Insight.ISendRawTxResult>;
    /**
     * Submit a signed raw transaction to the network.
     *
     * @param rawtx Hex encoded raw transaction data.
     */
    sendRawTx(rawtx: string): Promise<Insight.ISendRawTxResult>;
    /**
     * Generate a raw a send-to-contract transaction that invokes a contract's method.
     *
     * @param contractAddress
     * @param encodedData
     * @param opts
     */
    generateContractSendTx(contractAddress: string, encodedData: string, opts?: IContractSendTXOptions): Promise<string>;
    /**
     * Query a contract's method. It returns the result and logs of a simulated
     * execution of the contract's code.
     *
     * @param contractAddress Address of the contract in hexadecimal
     * @param encodedData The ABI encoded method call, and parameter values.
     * @param opts
     */
    contractCall(contractAddress: string, encodedData: string, opts?: IContractSendTXOptions): Promise<Insight.IContractCall>;
    /**
     * Create a send-to-contract transaction that invokes a contract's method.
     *
     * @param contractAddress Address of the contract in hexadecimal
     * @param encodedData The ABI encoded method call, and parameter values.
     * @param opts
     */
    contractSend(contractAddress: string, encodedData: string, opts?: IContractSendTXOptions): Promise<Insight.ISendRawTxResult>;
    /**
     * Estimate the maximum value that could be sent to a contract, substracting the amount reserved for gas.
     *
     * @param contractAddress Address of the contract in hexadecimal
     * @param encodedData The ABI encoded method call, and parameter values.
     * @param opts
     *
     * @returns satoshi
     */
    contractSendEstimateMaxValue(contractAddress: string, encodedData: string, opts?: IContractSendTXOptions): Promise<number>;
    /**
     * Massage UTXOs returned by the Insight API to UTXO format accepted by the
     * underlying metrixjs-lib.
     */
    getBitcoinjsUTXOs(): Promise<IUTXO[]>;
    /**
     * The BIP32 HDNode, which may be used to derive new key pairs
     */
    hdnode(): BIP32Interface;
    /**
     * Use BIP32 to derive child wallets from the current wallet's keypair.
     * @param n The index of the child wallet to derive.
     */
    deriveChildWallet(n?: number): Wallet;
    contractCreate(code: string, opts?: IContractCreateTXOptions): Promise<Insight.ISendRawTxResult>;
    generateCreateContractTx(code: string, opts?: IContractCreateTXOptions): Promise<string>;
}
