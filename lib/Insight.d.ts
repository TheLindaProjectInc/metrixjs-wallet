import Big from 'big.js';
import { INetworkInfo } from "./Network";
export declare class Insight {
    private baseURL;
    static forNetwork(network: INetworkInfo): Insight;
    private fetchApi;
    constructor(baseURL: string);
    static toSatoshi(amount: number | Big): number | Big;
    static fromSatoshi(amount: number | Big): number | Big;
    listUTXOs(address: string): Promise<Insight.IUTXO[]>;
    getInfo(address: string): Promise<Insight.IGetInfo>;
    sendRawTx(rawtx: string): Promise<Insight.ISendRawTxResult>;
    GetRawTx(tx: string): Promise<Insight.IGetRawTxResult>;
    contractCall(address: string, encodedData: string): Promise<Insight.IContractCall>;
    /**
     * Estimate the fee per KB of txdata, in satoshi. Returns -1 if no estimate is
     * available. It always return -1 for testnet.
     *
     * @param nblocks
     */
    estimateFee(nblocks?: number): Promise<any>;
    /**
     * Estimate the fee per byte of txdata, in satoshi. Returns -1 if no estimate is
     * available. It always return -1 for testnet.
     *
     * @param nblocks
     */
    estimateFeePerByte(nblocks?: number): Promise<any>;
    /**
     * Get single transaction's info
     * @param id
     */
    getTransactionInfo(id: string): Promise<Insight.IRawTransactionInfo>;
    /**
     * Get multiple Transaction info (paginated)
     * @param address
     * @param pageNum
     */
    getTransactions(address: string, pageNum?: number): Promise<Insight.IRawTransactions>;
}
export declare namespace Insight {
    type Foo = string;
    interface ISendRawTxResult {
        txid: string;
    }
    interface IGetRawTxResult {
        rawtx: string;
    }
    interface IUTXO {
        address: string;
        txid: string;
        vout: number;
        /**
         * Public key that controls this UXTO, as hex string.
         */
        scriptPubKey: string;
        amount: number;
        satoshis: number;
        isStake: boolean;
        height: number;
        confirmations: number;
        rawtx: string;
    }
    interface IExecutionResult {
        gasUsed: number;
        excepted: string;
        newAddress: string;
        output: string;
        codeDeposit: number;
        gasRefunded: number;
        depositSize: number;
        gasForDeposit: number;
    }
    interface ITransactionReceipt {
        blockHash: string;
        blockNumber: number;
        transactionHash: string;
        transactionIndex: number;
        from: string;
        to: string;
        cumulativeGasUsed: string;
        gasUsed: number;
        contractAddress: string;
        excepted: string;
        log: any[];
    }
    interface IContractCall {
        address: string;
        executionResult: any;
    }
    interface IGetInfo {
        addrStr: string;
        /**
         * balance of address in metrix
         */
        balance: number;
        /**
         * Balance of address in satoshi
         */
        balanceSat: number;
        totalReceived: number;
        totalReceivedSat: number;
        totalSet: number;
        totalSentSat: number;
        unconfirmedBalance: number;
        unconfirmedBalanceSat: number;
        unconfirmedTxApperances: number;
        txApperances: number;
        /**
         * List of transaction IDs
         */
        transactions: string[];
    }
    interface IVin {
        txid: string;
        addr: string;
    }
    interface IVout {
        value: string;
        scriptPubKey: IScriptPubKey;
    }
    interface IScriptPubKey {
        addresses: string[];
    }
    interface IRawTransactionInfo {
        txid: string;
        version: number;
        locktime: number;
        receipt: ITransactionReceipt[];
        vin: IVin[];
        vout: IVout[];
        confirmations: number;
        time: number;
        valueOut: number;
        valueIn: number;
        fees: number;
        blockhash: string;
        blockheight: number;
        isqrc20Transfer: boolean;
    }
    interface IRawTransactions {
        pagesTotal: number;
        txs: IRawTransactionInfo[];
    }
}
