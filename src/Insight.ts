import axios, { AxiosInstance } from "axios"
import Big from 'big.js';

import { INetworkInfo } from "./Network"
import { NetworkNames } from "./constants"

const INSIGHT_BASEURLS: { [key: string]: string } = {
  [NetworkNames.MAINNET]: "https://explorer.metrixcoin.com/api",
  [NetworkNames.TESTNET]: "https://testnet-explorer.metrixcoin.com/api",
  [NetworkNames.REGTEST]: "http://localhost:3001/api",
}

export class Insight {
  // public static mainnet(): Insight {
  //   return new Insight(MAINNET_API_BASEURL)
  // }

  // public static testnet(): Insight {
  //   return new Insight(TESTNET_API_BASEURL)
  // }

  public static forNetwork(network: INetworkInfo): Insight {
    const baseURL = INSIGHT_BASEURLS[network.name]
    if (baseURL == null) {
      throw new Error(`No Insight API defined for network: ${network.name}`)
    }

    return new Insight(baseURL)
  }

  private axios: AxiosInstance

  constructor(private baseURL: string) {
    this.axios = axios.create({
      baseURL,
      // don't throw on non-200 response
      // validateStatus: () => true,
    })
  }

  public static toSatoshi(amount: number | Big) {
    try {
        return (amount as Big).times(100000000);
    } catch (ex) {
        return Math.round(amount as number * 100000000);
    }
}

  public static fromSatoshi(amount: number | Big) {
      try {
          return (amount as Big).div(100000000);
      } catch (ex) {
          return Math.round(amount as number / 100000000);
      }
  }

  public async listUTXOs(address: string): Promise<Insight.IUTXO[]> {
    const res = await this.axios.get(`/address/${address}/utxo`)
    let result: Insight.IUTXO[] = [];
    if(res.data.length > 0) {
      res.data.forEach((utxo: {transactionId: string; outputIndex: number; scriptPubKey: string; value: string; isStake: boolean; blockHeight: number; confirmations: number }) => {
        result.push({
          address: address,
          txid: utxo.transactionId,
          vout: utxo.outputIndex,
      
          /**
           * Public key that controls this UXTO, as hex string.
           */
          scriptPubKey: utxo.scriptPubKey,
      
          amount: Insight.fromSatoshi(parseInt(utxo.value, 10)) as number,
          satoshis: parseInt(utxo.value, 10),
      
          isStake: utxo.isStake,
          height: utxo.blockHeight,
          confirmations: utxo.confirmations,
          })
      });
      return result;
    }
    return result
  }

  public async getInfo(address: string): Promise<Insight.IGetInfo> {
    const res = await this.axios.get(`/address/${address}`)

    const txres = await this.axios.get(`/address/${address}/txs`)

    let result: Insight.IGetInfo = {} as Insight.IGetInfo;

    if(res.data) {
        let txlist: string[] = [];
        if(txres.data.transactions.length > 0) {
          txlist = [...txres.data.transactions]
        }

        result = {
          addrStr: address,
          balance: Insight.fromSatoshi(parseInt(res.data.balance, 10)) as number,
          balanceSat: parseInt(res.data.balance),
          totalReceived: Insight.fromSatoshi(parseInt(res.data.totalReceived, 10)) as number,
          totalReceivedSat: parseInt(res.data.totalReceived),
          totalSet: Insight.fromSatoshi(parseInt(res.data.totalSent, 10)) as number,
          totalSentSat: parseInt(res.data.totalSent),
          unconfirmedBalance: Insight.fromSatoshi(parseInt(res.data.unconfirmed, 10)) as number,
          unconfirmedBalanceSat: parseInt(res.data.unconfirmed),
          unconfirmedTxApperances: 0,
          txApperances: res.data.transactionCount,
          transactions: txlist}
          
      return result;
    }
    return result;
  }

  public async sendRawTx(rawtx: string): Promise<Insight.ISendRawTxResult> {
    const res = await this.axios.post("/tx/send", {
      rawtx,
    })
    if (res.data.status === 0) {
      return {txid: res.data.id}
    }
    return res.data
  }

  public async contractCall(
    address: string,
    encodedData: string,
  ): Promise<Insight.IContractCall> {
    // FIXME wow, what a weird API design... maybe we should just host the RPC
    // server, with limited API exposed.
    const res = await this.axios.get(
      `/contract/${address}/call?data=${encodedData}`,
    )

    return res.data
  }

  /**
   * Estimate the fee per KB of txdata, in satoshi. Returns -1 if no estimate is
   * available. It always return -1 for testnet.
   *
   * @param nblocks
   */
  public async estimateFee(nblocks: number = 6): Promise<any> {
    //const res = await this.axios.get(`/utils/estimatefee?nbBlocks=${nblocks}`)
    const res = await this.axios.get(`/info`)

    const feeRate: number = res.data.feeRate;
    if (typeof feeRate !== "number" || feeRate < 0) {
      return -1
    }

    return Insight.toSatoshi(feeRate) as number;
  }

  /**
   * Estimate the fee per byte of txdata, in satoshi. Returns -1 if no estimate is
   * available. It always return -1 for testnet.
   *
   * @param nblocks
   */
  public async estimateFeePerByte(nblocks: number = 6): Promise<any> {
    const feeRate = await this.estimateFee()

    if (feeRate < 0) {
      return feeRate
    }

    return Math.ceil(feeRate / 1024)
  }

  /**
   * Get single transaction's info
   * @param id
   */
  public async getTransactionInfo(
    id: string,
  ): Promise<Insight.IRawTransactionInfo> {
    const res = await this.axios.get(`/tx/${id}`)

    const block = await this.axios.get(`/block/${res.data.blockHash}`)

    let isqrc20 = false;
    let fee = 0;

    if(res.data.hasOwnProperty("mrc20TokenTransfers")) {
      isqrc20 = true;
    }

    if(res.data.isCoinstake === false) {
      fee = res.data.fees;
    } else {
      fee = 0;
    }

    let txVin: Insight.IVin[] = [];
    let txVout: Insight.IVout[] = [];

    res.data.inputs.forEach((vin: { prevTxId: any; address: any; }) => {
      txVin.push({
        txid: vin.prevTxId,
        addr: vin.address
      });
    });

    res.data.outputs.forEach((vout: { value: any; scriptPubKey: any; }) => {
      txVout.push({
        value: vout.value,
        scriptPubKey: vout.scriptPubKey
      });
    });

    let txReceipt: Insight.ITransactionReceipt[] = [];

    if (res.data.outputs[0].receipt) {
      let txindex = 0;
      let txReceiptTo = "";

      if(res.data.outputs.mrc20TokenTransfers.length>0) {
        txReceiptTo = res.data.outputs.mrc20TokenTransfers[0].to;
      }
      
      block.data.transactions.forEach((tx: string, index: number) => {
        if (tx = res.data.hash) {
          txindex = index;
        }
      });

      txReceipt.push({
        blockHash: res.data.blockHash,
        blockNumber: res.data.blockHeight,
        contractAddress: res.data.outputs[0].receipt.contractAddress,
        cumulativeGasUsed: res.data.outputs[0].receipt.gasUsed,
        excepted: res.data.outputs[0].receipt.excepted,
        from: res.data.outputs[0].receipt.sender,
        to: txReceiptTo,
        gasUsed: res.data.outputs[0].receipt.gasUsed,
        log: res.data.outputs[0].receipt.logs,
        transactionHash: res.data.hash,
        transactionIndex: txindex,
      });
      }
    

    let result: Insight.IRawTransactionInfo = {
      txid: res.data.id,
      version: res.data.version,
      locktime: res.data.lockTime,
      receipt: txReceipt,
      vin: txVin,
      vout: txVout,
      confirmations: res.data.confirmations,
      time: res.data.timestamp,
      valueOut: res.data.outputValue,
      valueIn: res.data.inputValue,
      fees: fee,
      blockhash: res.data.blockHash,
      blockheight: res.data.blockHeight,
      isqrc20Transfer: isqrc20
    }

    return result;
  }

  /**
   * Get multiple Transaction info (paginated)
   * @param address
   * @param pageNum
   */
  public async getTransactions(
    address: string,
    pageNum: number = 0,
  ): Promise<Insight.IRawTransactions> {
    const result = await this.axios.get(`/address/${address}/txs?pageSize=10&page=${pageNum}`);
    
    let pages = 0;
    let txList = [];

    if(result.data.transactions.length > 0) {
      for (let i=0;i<result.data.transactions.length;i++){
        let currentTx = result.data.transactions[i];
        let tx = await this.getTransactionInfo(currentTx);
        if(tx) {
          txList.push(tx);
        }
      }
      pages = Math.ceil(result.data.totalCount / 10)
    }

    return {pagesTotal: pages, txs: [...txList]} as Insight.IRawTransactions
  }
}

export namespace Insight {
  export type Foo = string

  export interface ISendRawTxResult {
    txid: string
  }

  export interface IUTXO {
    address: string
    txid: string
    vout: number

    /**
     * Public key that controls this UXTO, as hex string.
     */
    scriptPubKey: string

    amount: number
    satoshis: number

    isStake: boolean
    height: number
    confirmations: number
  }

  export interface IExecutionResult {
    gasUsed: number
    excepted: string
    newAddress: string
    output: string
    codeDeposit: number
    gasRefunded: number
    depositSize: number
    gasForDeposit: number
  }

  export interface ITransactionReceipt {
    blockHash: string
    blockNumber: number
    transactionHash: string
    transactionIndex: number
    from: string
    to: string
    cumulativeGasUsed: string
    gasUsed: number
    contractAddress: string
    excepted: string
    log: any[]
  }

  export interface IContractCall {
    address: string
    executionResult: any
  }

  export interface IGetInfo {
    addrStr: string

    /**
     * balance of address in metrix
     */
    balance: number

    /**
     * Balance of address in satoshi
     */
    balanceSat: number

    totalReceived: number
    totalReceivedSat: number
    totalSet: number
    totalSentSat: number

    unconfirmedBalance: number
    unconfirmedBalanceSat: number

    unconfirmedTxApperances: number
    txApperances: number

    /**
     * List of transaction IDs
     */
    transactions: string[]
  }

  export interface IVin {
    txid: string
    addr: string
  }

  export interface IVout {
    value: string
    scriptPubKey: IScriptPubKey
  }

  export interface IScriptPubKey {
    addresses: string[]
  }

  export interface IRawTransactionInfo {
    txid: string
    version: number
    locktime: number
    receipt: ITransactionReceipt[]
    vin: IVin[]
    vout: IVout[]
    confirmations: number
    time: number
    valueOut: number 
    valueIn: number
    fees: number
    blockhash: string
    blockheight: number
    isqrc20Transfer: boolean
  }

  export interface IRawTransactions {
    pagesTotal: number
    txs: IRawTransactionInfo[]
  }
}
