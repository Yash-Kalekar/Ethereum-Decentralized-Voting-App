import React, {useState,useEffect} from 'react';
import Web3Modal from "web3modal";
import { ethers } from 'ethers';
import {create as ipfsHttpClient } from "ipfs-http-client";
import axios from 'axios';
import { useRouter } from 'next/router';

//INTERNAL IMPORT
import {VotingAddress, VotingAddressABI} from './constants';

const fetchContract = (signerOrProvider) => new ethers.Contract(VotingAddress, VotingAddressABI, signerOrProvider);

export const VotingContext = React.createContext();

export const VotingProvider = ({children}) =>{
    const votingTitle = 'My First smart Contact App'
    const router = useRouter();
    const [currentAccount, setcurrentAccount] = useState("");
    const [candidateLength, setcandidateLength] = useState("");
    const pushCandidate = [];
    const candidateIndex =[];
    const [candidateArray, setcandidateArray] = useState(pushCandidate);

    //---END OF CANDIDATE DATA

    const [error, setError] = useState("");
    const highestVote =[];

    //-----VOTER SECTION-----

    const pushVoter =[];
    const [voterArray, setVoterArray] = useState(pushVoter);
    const [voterLength, setVoterLength] = useState('');
    const [voterAddress, setVoterAddress] = useState([]);

    //--CONNECTING METAMASK------

    const checkIfWalletIsConnected = async () => {
        if (typeof window !== "undefined" && window.ethereum) {
            try {
                const account = await window.ethereum.request({ method: "eth_accounts" });
                if (account.length) {
                    setcurrentAccount(account[0]);
                } else {
                    setError("Please install MetaMask & connect.");
                }
            } catch (err) {
                setError("Error connecting to MetaMask");
            }
        } else {
            setError("Please Install MetaMask");
        }
    };
    
    useEffect(() => {
        if (typeof window !== "undefined") {
          checkIfWalletIsConnected();
        }
      }, []);
    

    //-----CONNECT WALLET-------
    const connectWallet = async () => {
        if (!window.ethereum) return setError("Please Install MetaMask");
      
        try {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
      
          setcurrentAccount(accounts[0]); 
        } catch (error) {
          setError("Failed to connect MetaMask");
        }
      };
      

//----UPLOAD TO IPFS (FOR VOTER IMAGE)----
const uploadToIPFS = async (file) => {
  try {
      if (!file) {
          setError("File is missing!");
          return null;
      }

      const formData = new FormData();
      formData.append("file", file);

      const config = {
          headers: {
              "Content-Type": "multipart/form-data",
              pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
              pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
          },
      };

      console.log("Uploading to Pinata...");
      const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, config);
      console.log("Upload Response:", response.data);

      const url = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
      return url;
  } catch (error) {
      console.error("IPFS Upload Error:", error.response?.data || error.message);
      setError("Error Uploading File to IPFS");
      return null;
  }
};


//----UPLOAD TO IPFS (FOR CANDIDATE IMAGE)----
const uploadToIPFSCandidate = async (file) => {
  try {
    if (!file) {
      setError("File is missing!");
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      formData,
      {
        headers: {
          pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
          pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
          "Content-Type": "multipart/form-data",
        },
      }
    );

    const url = `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
    return url;
  } catch (error) {
    console.error("IPFS Upload Error:", error);
    setError("Error Uploading File to IPFS");
    return null;
  }
};


      //---CREATE VOTER
      const createVoter = async (formInput, file, router) => {
        try {
          const { name, address, position } = formInput;
      
          if (!name || !address || !position || !file) {
            return setError("Input Data is Missing");
          }
      
          // --- UPLOAD IMAGE TO IPFS ---
          const fileUrl = await uploadToIPFS(file);
          if (!fileUrl) return;
      
          // CONNECTING TO SMART CONTRACT
          const web3Modal = new Web3Modal();
          const connection = await web3Modal.connect();
          const provider = new ethers.providers.Web3Provider(connection);
          const signer = provider.getSigner();
          const contract = fetchContract(signer);
      
          // Upload voter details to IPFS
          const voterData = JSON.stringify({ name, address, position, image: fileUrl });
      
          const voterResponse = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            voterData,
            {
              headers: {
                pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
                pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
                "Content-Type": "application/json",
              },
            }
          );
      
          const voterUrl = `https://gateway.pinata.cloud/ipfs/${voterResponse.data.IpfsHash}`;
      
          // Store voter details in smart contract
          const voter = await contract.voterRight(address, name, voterUrl, fileUrl);
          await voter.wait();
      
          router.push("/voterList");
        } catch (error) {
          console.error("Error Creating Voter:", error);
          setError("Something Went Wrong Creating Voter!");
        }
      };
            
      //-----------GET VOTER DATA--------
      const getAllVoterData = async()=>{
          try{
            
            const web3Modal = new Web3Modal();
            const connection = await web3Modal.connect();
            const provider = new ethers.providers.Web3Provider(connection);
            const signer = provider.getSigner();
            const contract = fetchContract(signer);
  
            //VOTER LIST
            const voterListData = await contract.getVoterList();
            setVoterAddress(voterListData);
  
            voterListData.map(async(el)=>{
              const singleVoterData = await contract.getVoterdata(el);
              pushVoter.push(singleVoterData);
            });
  
            //VOTER LENGTH
            const voterList = await contract.getVoterLength();
            setVoterLength(voterList.toNumber());
          }
          catch (error) {
            setError();
          }
       };
      useEffect(()=>{
        getAllVoterData();
      }, []);

      //------GIVE VOTE------
      const giveVote = async(id) => {
        try {
          const voterAddress = id.address;
          const voterId = id.id;
          const web3Modal = new Web3Modal();
          const connection = await web3Modal.connect();
          const provider = new ethers.providers.Web3Provider(connection);
          const signer = provider.getSigner();
          const contract = fetchContract(signer);

          const voteredList = await contract.vote(voterAddress, voterId);

          
        } catch (error) {
          console.log(error);
          
        }
      };

      //-----------------------CANDIDATE SECTION---------------------------------
      const setCandidate = async (candidateForm, file, router) => {
        try {
          const { name, address, age } = candidateForm;
      
          if (!name || !address || !age || !file) {
            return setError("Input Data is Missing");
          }
      
          // --- UPLOAD IMAGE TO IPFS ---
          const fileUrl = await uploadToIPFSCandidate(file);
          if (!fileUrl) return;
      
          // CONNECTING TO SMART CONTRACT
          const web3Modal = new Web3Modal();
          const connection = await web3Modal.connect();
          const provider = new ethers.providers.Web3Provider(connection);
          const signer = provider.getSigner();
          const contract = fetchContract(signer);
      
          // Upload candidate details to IPFS
          const candidateData = JSON.stringify({ name, address, image: fileUrl, age });
      
          const candidateResponse = await axios.post(
            "https://api.pinata.cloud/pinning/pinJSONToIPFS",
            candidateData,
            {
              headers: {
                pinata_api_key: process.env.NEXT_PUBLIC_PINATA_API_KEY,
                pinata_secret_api_key: process.env.NEXT_PUBLIC_PINATA_SECRET_KEY,
                "Content-Type": "application/json",
              },
            }
          );
      
          const candidateUrl = `https://gateway.pinata.cloud/ipfs/${candidateResponse.data.IpfsHash}`;
      
          // Store candidate details in smart contract
          const candidate = await contract.setCandidate(address, age, name, fileUrl, candidateUrl);
          await candidate.wait();
      
          router.push("/");
        } catch (error) {
          console.error("Error Creating Candidate:", error);
          setError("Something Went Wrong Creating Candidate!");
        }
      };
            

      //---GET CANDIDATE DATA------
      const getNewCandidate = async()=>{
        try {
          //CONNECTING SMART CONTRACT
          const web3Modal = new Web3Modal();
          const connection = await web3Modal.connect();
          const provider = new ethers.providers.Web3Provider(connection);
          const signer = provider.getSigner();
          const contract = fetchContract(signer);

          //---ALL CANDIDATE----
          const allCandidate = await contract.getCandidate();
          console.log(allCandidate);

          allCandidate.map(async(el)=>{
            const singleCandidateData = await contract.getCandidatedata(el);

            pushCandidate.push(singleCandidateData);
            candidateIndex.push(singleCandidateData[2].toNumber());
          });

          //------CANDIDATE LENGTH----------
          const allCandidateLength = await contract.getCandidateLength();
          setCandidateLength(allCandidateLength.toNumber()); //Might have an error
          
        } catch (error) {
          
        }
      };

      useEffect(()=>{
        getNewCandidate()
      }, []);


    return (
        <VotingContext.Provider value={{ votingTitle, checkIfWalletIsConnected, connectWallet, uploadToIPFS, createVoter, getAllVoterData, giveVote, setCandidate, getNewCandidate, error, voterArray, voterLength, voterAddress, currentAccount, candidateLength, candidateArray, uploadToIPFSCandidate }}>
            {children}
        </VotingContext.Provider>
    );
};
