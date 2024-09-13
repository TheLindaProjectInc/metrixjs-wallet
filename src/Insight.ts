import Big from 'big.js';

const fetch = require("node-fetch");
const fetchAbsolute = require('fetch-absolute');

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

    private fetchApi;

  constructor(private baseURL: string) {
    this.fetchApi = fetchAbsolute(fetch)(baseURL);
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
    const response = await this.fetchApi(`/address/${address}/utxo`);
    const res  = await response.json();
    let result: Insight.IUTXO[] = [];
    if(res.length > 0) {
      res.forEach((utxo: {transactionId: string; outputIndex: number; scriptPubKey: string; value: string; isStake: boolean; blockHeight: number; confirmations: number, rawtx: string }) => {
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
          rawtx: utxo.rawtx
          })
      });
      return result;
    }
    return result
  }

  public async getInfo(address: string): Promise<Insight.IGetInfo> {
    const response = await this.fetchApi(`/address/${address}`);
    const res = await response.json();

    const txresponse = await this.fetchApi(`/address/${address}/txs`);
    const txres = await txresponse.json();

    let result: Insight.IGetInfo = {} as Insight.IGetInfo;

    if(res) {
        let txlist: string[] = [];
        if(txres.transactions.length > 0) {
          txlist = [...txres.transactions]
        }

        result = {
          addrStr: address,
          balance: Insight.fromSatoshi(parseInt(res.balance, 10)) as number,
          balanceSat: parseInt(res.balance),
          totalReceived: Insight.fromSatoshi(parseInt(res.totalReceived, 10)) as number,
          totalReceivedSat: parseInt(res.totalReceived),
          totalSet: Insight.fromSatoshi(parseInt(res.totalSent, 10)) as number,
          totalSentSat: parseInt(res.totalSent),
          unconfirmedBalance: Insight.fromSatoshi(parseInt(res.unconfirmed, 10)) as number,
          unconfirmedBalanceSat: parseInt(res.unconfirmed),
          unconfirmedTxApperances: 0,
          txApperances: res.transactionCount,
          transactions: txlist}
          
      return result;
    }
    return result;
  }

  public async sendRawTx(rawtx: string): Promise<Insight.ISendRawTxResult> {
    const response = await this.fetchApi("/tx/send", { 
      method: 'post',
      body: JSON.stringify({ rawtx: rawtx }),
      headers: { "Content-Type": "application/json" }
    });
    const res = await response.json();
    if (res.status === 0) {
      return {txid: res.id}
    }
    return res
  }

  public async GetRawTx(tx: string): Promise<Insight.IGetRawTxResult> {
    const response = await this.fetchApi(`/raw-tx/${tx}`, { 
      method: 'get',
      headers: { "Content-Type": "application/json" }
    });
    const res = await response.json();
    console.log(res);
    if (res.status === 0) {
      return {rawtx: res.id}
    }
    return res
  }

  public async contractCall(
    address: string,
    encodedData: string,
  ): Promise<Insight.IContractCall> {
    // FIXME wow, what a weird API design... maybe we should just host the RPC
    // server, with limited API exposed.
    const response = await this.fetchApi(
      `/contract/${address}/call?data=${encodedData}`,
    )
    const res = response.json();

    return res
  }

  /**
   * Estimate the fee per KB of txdata, in satoshi. Returns -1 if no estimate is
   * available. It always return -1 for testnet.
   *
   * @param nblocks
   */
  public async estimateFee(nblocks: number = 6): Promise<any> {
    const response = await this.fetchApi(`/info`)
    const res = await response.json();


    const feeRate: number = res.feeRate;
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
    const response = await this.fetchApi(`/tx/${id}`);
    const res = await response.json();

    const blockresponse = await this.fetchApi(`/block/${res.blockHash}`);
    const block = blockresponse.json();

    let isqrc20 = false;
    let fee = 0;

    if(res.hasOwnProperty("mrc20TokenTransfers")) {
      isqrc20 = true;
    }

    if(res.isCoinstake === false) {
      fee = res.fees;
    } else {
      fee = 0;
    }

    let txVin: Insight.IVin[] = [];
    let txVout: Insight.IVout[] = [];

    res.inputs.forEach((vin: { prevTxId: any; address: any; }) => {
      txVin.push({
        txid: vin.prevTxId,
        addr: vin.address
      });
    });

    res.outputs.forEach((vout: { value: any; address: any; }) => {
      txVout.push({
        value: vout.value,
        scriptPubKey: { addresses: vout.address }
      });
    });

    let txReceipt: Insight.ITransactionReceipt[] = [];

    if (res.outputs[0].receipt) {
      let txindex = 0;
      let txReceiptTo = "";

      if(res.hasOwnProperty("mrc20TokenTransfers")) {
        if(res.mrc20TokenTransfers.length > 0) {
          txReceiptTo = res.mrc20TokenTransfers[0].to;
        }
      }
      
      block.transactions.forEach((tx: string, index: number) => {
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
    

    let result: Insight.IRawTransactionInfo = {
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
    const response = await this.fetchApi(`/address/${address}/txs-detail?pageSize=10&page=${pageNum}`);
    const result = await response.json();
    let pages = Math.ceil(result.totalCount / 10);
    let txList = [];

    if(result.transactions.length > 0) {
      for (let i = 0; i < result.transactions.length; i++) {
        let res = result.transactions[i];

        let isqrc20 = false;
        let fee = 0;
    
        if(res.hasOwnProperty("mrc20TokenTransfers")) {
          isqrc20 = true;
        }
    
        if(res.isCoinstake === false) {
          fee = res.fees;
        } else {
          fee = 0;
        }
    
        let txVin: Insight.IVin[] = [];
        let txVout: Insight.IVout[] = [];
    
        res.inputs.forEach((vin: { prevTxId: any; address: any; }) => {
          txVin.push({
            txid: vin.prevTxId,
            addr: vin.address
          });
        });
    
        res.outputs.forEach((vout: { value: any; address: any; }) => {
          txVout.push({
            value: vout.value,
            scriptPubKey: { addresses: vout.address }
          });
        });
    
        let txReceipt: Insight.ITransactionReceipt[] = [];
    
        if (res.outputs[0].receipt) {
          let txindex = 0;
          let txReceiptTo = "";
          
          if(res.hasOwnProperty("mrc20TokenTransfers")) {
            if(res.mrc20TokenTransfers.length > 0) {
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
        })
      }
    }

    return {pagesTotal: pages, txs: [...txList]} as Insight.IRawTransactions
  }
}

export namespace Insight {
  export type Foo = string

  export interface ISendRawTxResult {
    txid: string
  }

  export interface IGetRawTxResult {
    rawtx: string
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
    rawtx: string
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
