const { networks, generateMnemonic, Insight } = require("metrixjs-wallet");

async function main() {
  const network = networks.testnet;
  const mnemonic = generateMnemonic();
  const password = "covfefe";

  //const wallet = network.fromMnemonic(mnemonic, password);
  const wallet = network.fromPrivateKey("myprivkeystring");

  //console.log("mnemonic:", mnemonic);
  console.log("public address:", wallet.address);
  console.log("private key (WIF):", wallet.toWIF());

  alert(`generated a random ${wallet.address}`);
  
  const info = await wallet.getInfo();
  console.log("GetInfo:", info);
}
// main().catch(err => console.log(err));

window.addEventListener("load", main)