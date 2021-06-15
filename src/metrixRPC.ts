import RpcClient, {IConfig} from "metrixd-rpc"

import {Network, NetworkNames} from "./Network"

export default class MetrixRPC {
  public rpc: RpcClient

  constructor(config?: IConfig) {
    this.rpc = new RpcClient(config)
  }

  public generate(nblocks: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.rpc.generate(1, (err, ret) => {
        if (err) {
          reject(err)
        }
        resolve(ret)
      })
    })
  }
}

export const rpcClient = new MetrixRPC({
  user: "user",
  pass: "pass",
  port: "33831",
  protocol: "http",
})

export async function generateBlock(network: Network) {
  // generate a block after creating contract
  if (network.info.name === NetworkNames.REGTEST) {
    await rpcClient.generate(1)
  }
}
