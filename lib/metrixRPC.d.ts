import RpcClient, { IConfig } from "metrixd-rpc";
import { Network } from "./Network";
export default class MetrixRPC {
    rpc: RpcClient;
    constructor(config?: IConfig);
    generate(nblocks: number): Promise<any>;
}
export declare const rpcClient: MetrixRPC;
export declare function generateBlock(network: Network): Promise<void>;
