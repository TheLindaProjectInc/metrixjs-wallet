import { TransactionBuilder, script as BTCScript } from "bitcoinjs-lib"

import { bip32, ECPair, ECPairInterface, networks, payments, Psbt, Signer, SignerAsync } from "bitcoinjs-lib"

import { encode as encodeCScriptInt } from "bitcoinjs-lib/src/script_number"

import { BigNumber } from "bignumber.js"

import { Buffer } from "buffer"

import { OPS } from "./opcodes"

import * as bitcoin from "bitcoinjs-lib"

/**
 * Options for a payment transaction
 */
export interface ISendTxOptions {
  /**
   * Fee rate to pay for the raw transaction data (satoshi per byte). The
   * default value is the query result of the network's fee rate.
   */
  feeRate?: number
}

export interface IContractSendTXOptions {
  /**
   * unit: satoshi
   */
  amount?: number

  /**
   * unit: satoshi
   */
  gasLimit?: number

  /**
   * unit: satoshi / gas
   */
  gasPrice?: number

  /**
   * unit: satoshi / kilobyte
   */
  feeRate?: number
}

export interface IContractCreateTXOptions {
  /**
   * unit: satoshi
   */
  gasLimit?: number

  /**
   * unit: satoshi / gas
   */
  gasPrice?: number

  /**
   * unit: satoshi / kilobyte
   */
  feeRate?: number
}

export interface IUTXO {
  // This structure is slightly different from that returned by Insight API
  address: string
  txid: string
  hash: string // txid

  pos: number // vout (insight)

  /**
   * Public key that controls this UXTO, as hex string.
   */
  scriptPubKey: string

  amount: number
  value: number // satoshi (insight)

  isStake: boolean
  confirmations: number
}

function ensureAmountInteger(n: number) {
  if (!Number.isInteger(n)) {
    throw new Error(`Expect tx amount to be an integer, got: ${n}`)
  }
}

export function estimatePubKeyHashTransactionMaxSend(
  utxos: IUTXO[],
  to: string,
  feeRate: number,
) {
  let maxAmount = 0
  for (const utxo of utxos) {
    maxAmount += utxo.value
  }

  while (maxAmount > 0) {
    let inputs = selectTxs(utxos, maxAmount, feeRate);

    if (inputs != null) {
      return maxAmount
    }

    // step down by 0.01 metrix
    maxAmount = maxAmount - 1000000
  }

  return 0
}

/**
 * This is a function for selecting MRX utxos to build transactions
 * the transaction object takes at least 3 fields, value(satoshis) , confirmations and isStake
 *
 * @param [transaction] unspentTransactions
 * @param Number amount(unit: satoshis)
 * @param Number fee(unit: satoshis)
 * @returns [transaction]
 */
 function selectTxs(unspentTransactions: any, amount: number, fee: number) {
  //sort the utxo
  var matureList = []
  var immatureList = []
  for(var i = 0; i < unspentTransactions.length; i++) {
      if(unspentTransactions[i].confirmations >= 960 || unspentTransactions[i].isStake === false) {
          matureList[matureList.length] = unspentTransactions[i]
      }
      else {
          immatureList[immatureList.length] = unspentTransactions[i]
      }
  }
  matureList.sort(function(a, b) {return a.value - b.value})
  immatureList.sort(function(a, b) {return b.confirmations - a.confirmations})
  unspentTransactions = matureList.concat(immatureList)

  var value = new BigNumber(amount)
  var find = []
  var findTotal = new BigNumber(0)
  var feeTotal = new BigNumber(0);
  for (var i = 0; i < unspentTransactions.length; i++) {
      var tx = unspentTransactions[i]
      findTotal = findTotal.plus(tx.value)
      find[find.length] = tx
      feeTotal = feeTotal.plus(fee)
      if (findTotal.isGreaterThanOrEqualTo(value.plus(feeTotal))) break
  }
  if (value.isGreaterThan(findTotal)) {
      throw new Error('You do not have enough MRX to send')
  }
  return {inputs: find, feeTotal: feeTotal.toNumber()}
}

/**
 * Build a pay-to-pubkey-hash transaction
 *
 * @param keyPair
 * @param to
 * @param amount (unit: satoshi)
 * @param feeRate
 * @param utxoList
 */
export function buildPubKeyHashTransaction(
  utxos: IUTXO[],
  keyPair: ECPairInterface,
  to: string,
  amount: number,
  feeRate: number,
) {
  ensureAmountInteger(amount)

  const senderAddress = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network: keyPair.network}).address as string

  let {inputs, feeTotal: txfee} = selectTxs(utxos, amount, feeRate)

  if (inputs == null) {
    throw new Error("could not find UTXOs to build transaction")
  }

  //const txb = new TransactionBuilder(keyPair.network)
  const txb = new Psbt({network: keyPair.network})

  let vinSum = new BigNumber(0)
  for (const input of inputs) {
    txb.addInput({hash: input.hash, index: input.pos})
    vinSum = vinSum.plus(input.value)
  }

  if (vinSum.isEqualTo(new BigNumber(amount))) {
    amount = new BigNumber(amount).minus(txfee).toNumber();
  }

  txb.addOutput({script: Buffer.from(to, 'hex'), value: amount})

  const change = vinSum
    .minus(txfee)
    .minus(amount)
    .toNumber()
  if (change > 0) {
    txb.addOutput({script: Buffer.from(senderAddress, 'hex'), value: change})
  }

  for (let i = 0; i < inputs.length; i++) {
    let index = inputs[i].pos
    txb.signInput(index, keyPair)
    txb.validateSignaturesOfInput(index)
  }
  txb.finalizeAllInputs();
  return txb.extractTransaction().toHex()
}

/**
 * Build a create-contract transaction
 *
 * @param keyPair
 * @param code The contract byte code
 * @param feeRate Fee per byte of tx. (unit: satoshi)
 * @param utxoList
 * @returns the built tx
 */
export function buildCreateContractTransaction(
  utxos: IUTXO[],
  keyPair: ECPairInterface,
  code: string,
  feeRate: number,
  opts: IContractCreateTXOptions = {},
): string {
  const gasLimit = opts.gasLimit || defaultContractSendTxOptions.gasLimit
  const gasPrice = opts.gasPrice || defaultContractSendTxOptions.gasPrice
  const gasLimitFee = new BigNumber(gasLimit).times(gasPrice).toNumber()

  const createContractScript = BTCScript.compile([
    OPS.OP_4,
    encodeCScriptInt(gasLimit),
    encodeCScriptInt(gasPrice),
    Buffer.from(code, "hex"),
    OPS.OP_CREATE,
  ])

  const fromAddress = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey}).address as string
  const amount = 0
  const amountTotal = new BigNumber(amount).plus(gasLimitFee).toNumber();

  let {inputs, feeTotal: txfee} = selectTxs(utxos, amountTotal, feeRate);

  if (inputs == null) {
    throw new Error("could not find UTXOs to build transaction")
  }

  //const txb = new TransactionBuilder(keyPair.network)
  const txb = new Psbt({network: keyPair.network})

  let totalValue = new BigNumber(0)
  for (const input of inputs) {
    txb.addInput({hash: input.hash, index: input.pos})
    totalValue = totalValue.plus(input.value)
  }

  // create-contract output
  txb.addOutput({script: createContractScript, value: 0})

  const change = totalValue
    .minus(txfee)
    .minus(gasLimitFee)
    .toNumber()

  if (change > 0) {
    txb.addOutput({script: Buffer.from(fromAddress, 'hex'), value: change})
  }

  for (let i = 0; i < inputs.length; i++) {
    let index = inputs[i].pos
    txb.signInput(index, keyPair)
    txb.validateSignaturesOfInput(index)
  }
  txb.finalizeAllInputs();
  return txb.extractTransaction().toHex();
}

const defaultContractSendTxOptions = {
  gasLimit: 250000,
  gasPrice: 5000, // 5000 satoshi / gas
  amount: 0,

  // Wallet uses only one address. Can't really support senderAddress.
  // senderAddress
}

export function estimateSendToContractTransactionMaxValue(
  utxos: IUTXO[],
  keyPair: ECPairInterface,
  contractAddress: string,
  encodedData: string,
  feeRate: number,
  opts: IContractSendTXOptions = {},
): number {
  feeRate = Math.floor(feeRate)

  const gasLimit = opts.gasLimit || defaultContractSendTxOptions.gasLimit
  const gasPrice = opts.gasPrice || defaultContractSendTxOptions.gasPrice

  let amount = 0
  for (const utxo of utxos) {
    amount += utxo.value
  }

  amount -= gasLimit * gasPrice
  ensureAmountInteger(amount)

  const senderAddress = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey}).address as string

  // excess gas will refund in the coinstake tx of the mined block
  const gasLimitFee = new BigNumber(gasLimit).times(gasPrice).toNumber()

  const opcallScript = BTCScript.compile([
    OPS.OP_4,
    encodeCScriptInt(gasLimit),
    encodeCScriptInt(gasPrice),
    Buffer.from(encodedData, "hex"),
    Buffer.from(contractAddress, "hex"),
    OPS.OP_CALL,
  ])

  while (amount > 0) {
    let { inputs } = selectTxs(utxos, amount, feeRate);

    if (inputs != null) {
      return amount
    }

    amount -= 10000
  }

  return 0
}
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
export function buildSendToContractTransaction(
  utxos: IUTXO[],
  keyPair: ECPairInterface,
  contractAddress: string,
  encodedData: string,
  feeRate: number,
  opts: IContractSendTXOptions = {},
): string {
  // feeRate must be an integer number, or UTXO selection would always fail
  feeRate = Math.floor(feeRate)

  const gasLimit = opts.gasLimit || defaultContractSendTxOptions.gasLimit
  const gasPrice = opts.gasPrice || defaultContractSendTxOptions.gasPrice
  const amount = opts.amount || defaultContractSendTxOptions.amount

  ensureAmountInteger(amount)

  const senderAddress = bitcoin.payments.p2pkh({pubkey: keyPair.publicKey, network: keyPair.network}).address as string

  // excess gas will refund in the coinstake tx of the mined block
  const gasLimitFee = new BigNumber(gasLimit).times(gasPrice).toNumber()

  const opcallScript = BTCScript.compile([
    OPS.OP_4,
    encodeCScriptInt(gasLimit),
    encodeCScriptInt(gasPrice),
    Buffer.from(encodedData, "hex"),
    Buffer.from(contractAddress, "hex"),
    OPS.OP_CALL,
  ])
  const amountTotal = new BigNumber(amount).plus(gasLimitFee).toNumber();
  let {inputs, feeTotal: txfee} = selectTxs(utxos, amountTotal, feeRate);

  if (inputs == null) {
    throw new Error("could not find UTXOs to build transaction")
  }

  //const txb = new TransactionBuilder(keyPair.network)
  const txb = new Psbt({network: keyPair.network})

  // add inputs to txb
  let vinSum = new BigNumber(0)
  for (const input of inputs) {
    txb.addInput({hash: input.hash, index: input.pos})
    vinSum = vinSum.plus(input.value)
  }

  // send-to-contract output
  txb.addOutput({script: opcallScript, value: amount})

  // change output (in satoshi)
  const change = vinSum
    .minus(txfee)
    .minus(gasLimitFee)
    .minus(amount)
    .toNumber()
  if (change > 0) {
    txb.addOutput({script: Buffer.from(senderAddress, 'hex'), value: change})
  }

  for (let i = 0; i < inputs.length; i++) {
    let index = inputs[i].pos
    txb.signInput(index, keyPair)
    txb.validateSignaturesOfInput(index)
  }
  txb.finalizeAllInputs();
  return txb.extractTransaction().toHex();
}

// The prevalent network fee is 10 per KB. If set to 100 times of norm, assume error.
const MAX_FEE_RATE = Math.ceil((10 * 100 * 1e8) / 1024)

function checkFeeRate(feeRate: number) {
  if (feeRate > MAX_FEE_RATE) {
    throw new Error("Excessive tx fees, is set to 100 times of norm.")
  }
}
