import React, { createContext, useState, useContext, useEffect } from "react";
import { ethers } from "ethers";
import { Boat, BoatType } from "../model/Battleship";
import BattleShipAbi from "../BatailleNavale.json";

interface GameState {
  myBoats: Map<BoatType, Boat>;
  setMyBoats: React.Dispatch<React.SetStateAction<Map<BoatType, Boat>>>;
  provider: ethers.JsonRpcProvider | null;
  contract: ethers.Contract | null;
  startGame: () => Promise<void>;
  verifyIfGameStarted: () => Promise<boolean>;
  verifyCurrentPlayer: () => Promise<string>;
  gameStarted: boolean;
  verifyPlayer1: () => Promise<string>;
  verifyPlayer2: () => Promise<string>;
  attack: (x: number, y: number, status: number) => Promise<void>;
  getHistoryOfAttacks: (player: string) => Promise<{ x: number; y: number; status: number }[]>;
  verifyIfGameWon: () => Promise<boolean>;
  guestAddress: string;
  setGuestAddress: React.Dispatch<React.SetStateAction<string>>;
}

const GameContext = createContext<GameState | undefined>(undefined);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [myBoats, setMyBoats] = useState<Map<BoatType, Boat>>(new Map());
  const [provider, setProvider] = useState<ethers.JsonRpcProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [guestAddress, setGuestAddress] = useState("");
  const [gameState, setGameState] = useState("PasCommencee"); // Utilisez "PasCommencee", "EnCours", ou "Terminee"


  // Se connecte au fournisseur Ethereum lorsque le composant est monté
  useEffect(() => {
    const initializeProvider = async () => {
      let signer = null;

      let provider;
      if ((window as any).ethereum == null) {
        console.log("no provider! quit...");
        return;
      }
      console.log("provider", (window as any).ethereum);

      provider = new ethers.BrowserProvider((window as any).ethereum);

      console.log("signer", signer);
      const network = await provider.getNetwork();

      console.log("Provider initialized:", provider);
      console.log(network);

      // Deploy the contract after the provider is ready
      signer = await provider.getSigner();

      console.log("Signer address:", await signer.getAddress());
      const contract = await deployNewBattleShip(signer);
      setContract(contract);
    };

    initializeProvider();
  }, []);

  async function deployNewBattleShip(signer: ethers.Signer) {
    // Utilisation de ContractFactory pour créer une nouvelle instance de contrat basée sur l'ABI et le bytecode
    const factory = new ethers.ContractFactory(
      BattleShipAbi.abi,
      BattleShipAbi.bytecode,
      signer
    );
  
    // Création de la transaction de déploiement avec une adresse spécifique (ici comme exemple)
    const deployTransaction = await factory.getDeployTransaction(
      signer
      ,
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8"
    );
  
    // Envoi de la transaction de déploiement par le signer
    const deployedContract = await signer.sendTransaction(deployTransaction);
    // Attente de la confirmation de la transaction
    const receipt = await deployedContract.wait();
  
    // Récupération de l'adresse du contrat déployé à partir de la réception de la transaction
    const contractAddress = receipt ? receipt.contractAddress : null;
    console.log("Battleship contract deployed at address:", contractAddress);
  
    // Création d'une nouvelle instance du contrat avec l'adresse déployée et le signer
    const deployedInstance = new ethers.Contract(
      contractAddress as string,
      BattleShipAbi.abi,
      signer
    );
  
    return deployedInstance; // Retourne l'instance du contrat déployé
  }
  

  const startGame = async () => {
    if (contract) {
      try {

        const EtatGame = await contract.etatPartie();
        console.log("avant commence",EtatGame);

        const tx = await contract.commencerPartie();
        await tx.wait(); // Attendre que la transaction soit confirmée


        const EtatGame2 = await contract.etatPartie();
        console.log("apres commence",EtatGame2);



        setGameState("EnCours"); // Mettre à jour l'état du jeu comme étant en cours
      } catch (error) {
        console.error("Erreur lors du démarrage du jeu :", error);
      }
    } else {
      console.error("Contrat non chargé");
    }
  };

  const verifyIfGameStarted = async () => {
    if (!contract) {
      console.error("Contrat non chargé");
      return false;
    }
  
    try {
      const etatPartie = await contract.etatPartie();
      // Assurez-vous que la comparaison avec un BigNumber est correcte
      if (etatPartie==0) {
        setGameState("PasCommencee");
        return false;
      } else if (etatPartie==1) {
        setGameState("EnCours");
        return true;
      } else if (etatPartie==2) {
        setGameState("Terminee");
        return true;
      } else {
        // Gérer un état inattendu (ne devrait normalement pas arriver)
        console.error(`État de partie inconnu: ${etatPartie.toString()}`);
        return false; // Retournez false par défaut
      }
    } catch (error) {
      console.error("Impossible de vérifier si la partie a commencé :", error);
      return false;
    }
  };
  
  

  const verifyCurrentPlayer = async () => {
    if (contract) {
      try {
        const currentPlayer = await contract.getJoueurCourant();
        return currentPlayer;
      } catch (error) {
        console.error("Failed to verify current player:", error);
      }
    } else {
      console.error("Contract not loaded");
    }
  };

  const verifyPlayer1 = async () => {
    if (contract) {
      try {
        // Accès au premier joueur dans le tableau des joueurs du contrat
        const player1Address = await contract.joueurs(0);
        return player1Address.adr; // 'adr' est la propriété contenant l'adresse du joueur
      } catch (error) {
        console.error("Erreur lors de la vérification du joueur 1 :", error);
      }
    } else {
      console.error("Contrat non chargé");
    }
  };
  
  const verifyPlayer2 = async () => {
    if (contract) {
      try {
        // Accès au deuxième joueur dans le tableau des joueurs du contrat
        const player2Address = await contract.joueurs(1);
        return player2Address.adr; // 'adr' est la propriété contenant l'adresse du joueur
      } catch (error) {
        console.error("Erreur lors de la vérification du joueur 2 :", error);
      }
    } else {
      console.error("Contrat non chargé");
    }
  };

  const attack = async (x: number, y: number, status: number) => {
    if (contract) {
      try {
        const tx = await contract.attaquer(x, y, status);
        await tx.wait(); // Attendre que la transaction soit minée
      } catch (error) {
        console.error("Failed to make an attack:", error);
      }
    } else {
      console.error("Contract not loaded");
    }
  };

  const resolvePlayerIndex = async (playerAddress: string): Promise<number> => {
    if (!contract) {
      console.error("Contrat non chargé");
      throw new Error("Contrat non chargé");
    }
  
    try {
      // Récupérer les adresses des deux joueurs du contrat
      const player1Address = await contract.joueurs(0);
      const player2Address = await contract.joueurs(1);
  
      // Comparer l'adresse fournie avec celles des joueurs pour déterminer l'index
      if (playerAddress.toLowerCase() === player1Address.adr.toLowerCase()) {
        return 0; // L'adresse correspond au premier joueur
      } else if (playerAddress.toLowerCase() === player2Address.adr.toLowerCase()) {
        return 1; // L'adresse correspond au deuxième joueur
      } else {
        throw new Error("Adresse du joueur non trouvée parmi les participants");
      }
    } catch (error) {
      console.error("Erreur lors de la résolution de l'index du joueur :", error);
      throw error; // Propager l'erreur pour un traitement ultérieur
    }
  };

  
  const getHistoryOfAttacks = async (playerAddress: string) => {
    if (!contract) {
      console.error("Contrat non chargé");
      return [];
    }
  
    try {
      // Supposons que vous avez une fonction ou une logique pour obtenir l'index du joueur
      // en fonction de son adresse. Ceci est un placeholder pour cette logique.
      const playerIndex = await resolvePlayerIndex(playerAddress);
  
      const attacks = await contract.historiqueAttaques(playerIndex);
      return attacks.map((attack: any) => ({
        x: attack.x,
        y: attack.y,
        status: attack.etat,
      }));
    } catch (error) {
      console.error("Erreur lors de la récupération de l'historique des attaques :", error);
      return [];
    }
  };
  

  const verifyIfGameWon = async () => {
    if (!contract) {
      console.error("Contrat non chargé");
      return false;
    }
  
    try {
      // Supposons que la nouvelle fonction s'appelle `estPartieTerminee`
      const isGameOver = await contract.estPartieTerminee();
      return isGameOver;
    } catch (error) {
      console.error("Erreur lors de la vérification si le jeu est gagné :", error);
      return false;
    }
  };
  

  return (
    <GameContext.Provider
      value={{
        myBoats,
        setMyBoats,
        provider,
        contract,
        startGame,
        verifyIfGameStarted,
        verifyCurrentPlayer,
        gameStarted,
        verifyPlayer1,
        verifyPlayer2,
        attack,
        getHistoryOfAttacks,
        verifyIfGameWon,
        guestAddress, 
        setGuestAddress
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
