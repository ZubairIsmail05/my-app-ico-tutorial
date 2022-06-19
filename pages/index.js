import { BigNumber, Contract, providers, utils } from "ethers";
import Head from "next/head";
import React, { useEffect, useRef, useState } from "react";
import Web3Modal from "web3modal";
import { NFT_CONTRACT_ABI, NFT_CONTRACT_ADDRESSS, TOKEN_CONTRACT_ABI, TOKEN_CONTRACT_ADDRESS, } from "../constants";
import styles from "../styles/Home.module.css";

export default function Home() {
  // Create BigNumber '0'
  const zero = BigNumber.from(0);
  // keeps track if user's wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // loading set to true when mining a transaction
  const [loading, setLoading] = useState(false);
  // keeps track of number of tokens that can be claimed
  const [tokensToBeClaimed, setTokensToBeClaimed] = useState(zero);
  // keeps track of numnber of Crypto Dev tokens owned by an address
  const [balanceOfCryptoDevTokens, setBalanceOfCryptoDevTokens] = useState(zero);
  // amount of tokens the user wants to mint
  const [tokenAmount, setTokenAmount] = useState(zero);
  // keeps track of how many tokens have been minted of the total supply(10000)
  const [tokensMinted, setTokensMinted] = useState(zero);
  // gets owner of contract through signed address
  const [isOwner, setIsOwner] = useState(false);
  // reference for web3Modal
  const web3ModalRef = useRef();

  // Gets Provider or Signer
  const getProviderOrSigner = async (needSigner = false) => {
    // Connect to Metamask
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);

    // if user is not connected to Rinkeby, throw error
    const { chainId } = await web3Provider.getNetwork();
    if (chainId !== 4) {
      window.alert("Please change to the Rinkeby Testnet.")
      throw new Error("Please change to the Rinkeby Testnet.")
    }

    if (needSigner) {
      const signer = web3Provider.getSigner();
      return signer;
    }

    return web3Provider;
  };

  // Connects wallet to MetaMask
  const connectWallet = async () => {
    try {
      // prompts user to connect wallet
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (err) {
      console.error(err);
    }
  };

  // checks balance of tokens that can be claimed by user
  const getTokensToBeClaimed = async () => {
    try {
      const provider = await getProviderOrSigner();

      // create instance of NFT Contract
      const nftContract = new Contract(NFT_CONTRACT_ADDRESSS, NFT_CONTRACT_ABI, provider);

      // create instance of Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);

      // signer needed to get address of current account
      const signer = await getProviderOrSigner(true);
      const address = signer.getAddress();
      // get number of NFTs held by user --> returns a BigNumber
      const balance = nftContract.balanceOf(address);
      if (balance === zero) {
        setTokensToBeClaimed(zero);
      } else {
        // keeps track of number of unclaimed tokens
        var amount = 0;
        // for each NFT check if tokens have been claimed
        // increase amount if tokens have not been claimed
        for (var i = 0; i < balance; i++) {
          const tokenId = await nftContract.tokenOfOwnerByIndex(address, i);
          const claimed = await tokenContract.tokenIdsClaimed(tokenId);
          if (!claimed) {
            amount++;
          }
        }
        setTokensToBeClaimed(BigNumber.from(amount));
      }
    } catch (err) {
      console.error(err);
      setTokensToBeClaimed(zero);
    }
  };

  // checks balance of Crypto Dev Tokens held by an address
  const getBalanceOfCryptoDevTokens = async () => {
    try {
      const provider = await getProviderOrSigner();
      // create instance of Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      // need signer to get address of account connected to MetaMask
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      // get number of tokens held by user --> returns a BigNumber
      const balance = await tokenContract.balanceOf(address);
      setBalanceOfCryptoDevTokens(balance);
    } catch (err) {
      console.error(err);
      setBalanceOfCryptoDevTokens(zero);
    }
  };

  // mints 'amount' of tokens to a given address
  const mintCryptoDevToken = async (amount) => {
    try {
      // need signer for 'write' transaction
      const signer = await getProviderOrSigner(true);
      // create instance of Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);
      // each token is 0.001 ether
      const value = 0.001 * amount;
      const tx = await tokenContract.mint(amount, {
        value: utils.parseEther(value.toString()),
      });
      setLoading(true);
      // wait for tx to be mined
      await tx.wait();
      setLoading(false);
      window.alert("Successfully minted Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  // allows user to claim Crypto Dev Tokens
  const claimCryptoDevTokens = async () => {
    try {
      // need signer for 'write' transaction
      const signer = await getProviderOrSigner(true);
      // create instance of Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);
      const tx = await tokenContract.claim();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      window.alert("Successfully claim Crypto Dev Tokens");
      await getBalanceOfCryptoDevTokens();
      await getTotalTokensMinted();
      await getTokensToBeClaimed();
    } catch (err) {
      console.error(err);
    }
  };

  // gets number of CD tokens that have been minted until now
  const getTotalTokensMinted = async () => {
    try {
      // get provider for 'read' transaction
      const provider = await getProviderOrSigner();
      // create instance of Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      // get all tokens that have been minted
      const _tokensMinted = await tokenContract.totalSupply();
      setTokensMinted(_tokensMinted);
    } catch (err) {
      console.error(err);
    }
  };

  // gets contract owner by connected address
  const getOwner = async () => {
    try {
      const provider = await getProviderOrSigner();
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, provider);
      // get owner of Token Contract
      const _owner = await tokenContract.getOwner();
      // need signer to get address of account currently connected to MetaMask
      const signer = await getProviderOrSigner(true);
      const address = await signer.getAddress();
      if (address.toLowerCase() === _owner.toLowerCase()) {
        setIsOwner(true);
      }
    } catch (err) {
      console.error(err.message);
    }
  };

  const withdrawCoins = async () => {
    try {
      // need signer for 'write' transaction
      const signer = await getProviderOrSigner(true);
      // create instance of Token Contract
      const tokenContract = new Contract(TOKEN_CONTRACT_ADDRESS, TOKEN_CONTRACT_ABI, signer);
      const tx = await tokenContract.withdraw();
      setLoading(true);
      await tx.wait();
      setLoading(false);
      await getOwner();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // if wallet is not connected, create new instance of Web3Modal and connect the MetaMask wallet
    if (!walletConnected) {
      web3ModalRef.current = new Web3Modal({
        network: "rinkeby",
        providerOptions: {},
        disableInjectedProvider: false,
      });
      connectWallet();
      getTotalTokensMinted();
      getBalanceOfCryptoDevTokens();
      getTokensToBeClaimed();
      withdrawCoins();
    }
  }, [walletConnected]);

  // returns button based on state of dapp
  const renderButton = () => {
    // if waiting, show load button
    if (loading) {
      return (
        <div>
          <button className={styles.button}>Loading...</button>
        </div>
      );
    }
    // if owner is connected, show withdraw coins
    if (walletConnected && isOwner) {
      return (
        <div>
          <button className={styles.button} onClick={withdrawCoins}>Withdraw Coins</button>
        </div>
      );
    }
    // if tokens to be claimed > 0, show claim button
    if (tokensToBeClaimed > 0) {
      return (
        <div>
          <div className={styles.description}>
            {tokensToBeClaimed * 10} Tokens can be claimed!
          </div>
          <button className={styles.button} onClick={claimCryptoDevTokens}>
            Claim Tokens
          </button>
        </div>
      );
    }
    // if user does not have any tokens to claim, show mint button
    return (
      <div style={{ display: "flex-col" }}>
        <div>
          <input
            type="number"
            placeholder="Amount of Tokens"
            // BigNumber.from converts 'e.target.value' to a BigNumber
            onChange={(e) => setTokenAmount(BigNumber.from(e.target.value))}
            className={styles.input}
          />
        </div>

        <button
          className={styles.button}
          disabled={!(tokenAmount > 0)}
          onClick={() => mintCryptoDevToken(tokenAmount)}
        >
          Mint Tokens
        </button>
      </div>
    );
  };

  return (
    <div>
      <Head>
        <title>Crypto Devs</title>
        <meta name="description" content="ICO-Dapp" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className={styles.main}>
        <div>
          <h1 className={styles.title}>Welcome to Crypto Devs ICO!</h1>
          <div className={styles.description}>
            You can claim or mint Crypto Dev tokens here
          </div>
          {walletConnected ? (
            <div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                You have minted {utils.formatEther(balanceOfCryptoDevTokens)} Crypto
                Dev Tokens
              </div>
              <div className={styles.description}>
                {/* Format Ether helps us in converting a BigNumber to string */}
                Overall {utils.formatEther(tokensMinted)}/10000 have been minted!!!
              </div>
              {renderButton()}
            </div>
          ) : (
            <button onClick={connectWallet} className={styles.button}>
              Connect your wallet
            </button>
          )}
        </div>
        <div>
          <img className={styles.image} src="./0.svg" />
        </div>
      </div>

      <footer className={styles.footer}>
        Made with &#10084; by Crypto Devs
      </footer>
    </div>
  );

}