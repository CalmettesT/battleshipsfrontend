import { useEffect, useState } from "react";
import { useBot } from "./BotOpponent";
import "./PlayGame.css";
import { Game } from "./components/Game";
import { useGame } from "./comBlockChain/GameContext";
import { useNavigate } from "react-router-dom";
import {
  Answer,
  Boat,
  BoatType,
  Coord,
  Damage,
  Presence,
  createEmptyGrid,
  toString,
} from "./model/Battleship";
import { getBoatAtCoord, placeBoat } from "./utils/grid";

export default function PlayGame({
  myBoats,
}: {
  myBoats: Map<BoatType, Boat>;
}) {
  ////////////////
  const navigate = useNavigate();
  const { verifyCurrentPlayer, gameStarted, verifyPlayer2, verifyPlayer1, getHistoryOfAttacks, verifyIfGameWon, verifyIfGameStarted } = useGame();
  const [acurrentPlayer, setaCurrentPlayer] = useState<string>("");
  const [host, setHost] = useState<string>("");
  const [guest, setGuest] = useState<string>("");
  const [attackHistory, setAttackHistory] = useState<Coord[]>([]);
  const [isGameWon, setIsGameWon] = useState<boolean>(false);
  const [isGameStart, setIsGameStart] = useState<boolean>(false);

  const fetchCurrentPlayer = async () => {
    const player = await verifyCurrentPlayer();
    setaCurrentPlayer(player);
    
  };

  const fetchIsGameStarted = async () => {
    const gamestate = await verifyIfGameStarted();
    setIsGameStart(gamestate);
    console.log(isGameStart);
  }
////////////////////////////////////////////////////////faire demain en propre/////////////////////////////////////////////////////
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchIsGameStarted();
    }, 1000); // Exécute fetchIsGameStarted toutes les 1 000 millisecondes (1 seconde)
  
    return () => clearInterval(intervalId); // Nettoyage de l'intervalle lors du démontage du composant
  }, []); // Les crochets vides indiquent que cet effet ne s'exécute qu'une fois, après le premier rendu.
  

  useEffect(() => {
    fetchCurrentPlayer();
    verifyPlayer2().then((result) => {
      setGuest(result || "");
    });
    verifyPlayer1().then((result) => {
      setHost(result || "");
    });

    fetchIsGameStarted();

    console.log(acurrentPlayer);
  }, [gameStarted]);
  
  ////////////////
  const [gameOver, setGameOver] = useState(false);
  const [nbSunks, setNbSunks] = useState(0);

  const myName = "remy";
  const players = ["remy", "bob"];
  const [currentPlayer, setCurrentPlayer] = useState(0);

  const [opponentSpeech, setOpponentSpeech] = useState("waiting...");
  const [showAnswerButtons, setShowAnswerButtons] = useState(false);

  const [myGrid, setMyGrid] = useState(createEmptyGrid(Presence.WATER));
  useEffect(() => {
    const grid = createEmptyGrid(Presence.WATER);
    for (const [type, boat] of myBoats.entries()) {
      placeBoat(grid, type, boat);
    }
    setMyGrid(grid);
  }, []);

  const [theirKnownGrid, setTheirKnownGrid] = useState(createEmptyGrid(null));
  const [attackCell, setAttackCell] = useState<Coord | null>(null);
  const [oppAttackCell, setOppAttackCell] = useState<Coord | null>(null);

  const { answer, attack } = useBot(onAttack, onAnswer);

  // Fonction pour mettre à jour l'historique des attaques depuis le smart contract
  const updateAttackHistory = async () => {
  console.log("Fetching attack history...");
  const history = await getHistoryOfAttacks(acurrentPlayer);
  

  const convertedHistory = history.map((item) => {
    return { row: item.x, column: item.y, status: item.status };
  });
  
  setAttackHistory(convertedHistory);
  console.log("Attack history fetched and converted:", convertedHistory);
};


  // Fonction pour vérifier si la partie est gagnée
  const updateGameWonStatus = async () => {
    console.log("verifying if the game is won...");
    const gameWon = await verifyIfGameWon();
    setIsGameWon(gameWon);
    console.log("Game won status:", gameWon);
  };

  useEffect(() => {
    if (gameStarted) {
      updateAttackHistory();
      updateGameWonStatus();
    }
  }, [acurrentPlayer, gameStarted]);

  function isMyTurn() {
    return players[currentPlayer] === myName;
  }

  function togglePlayer() {
    setCurrentPlayer((currentPlayer + 1) % players.length);
  }

  function onAttack(coord: Coord) {
    setOppAttackCell(coord);
    setOpponentSpeech(toString(coord) + "?");
    setShowAnswerButtons(true);
    updateAttackHistory();
  }
  function onAnswer(answer: Answer) {
    setOpponentSpeech(
      toString(answer.coord) +
        " : " +
        answer.damage +
        (answer.sunk ? ", SUNK!" : "")
    );
    setOppAttackCell(null);
    theirKnownGrid[answer.coord.row][answer.coord.column].presence =
      answer.damage == Damage.HIT ? Presence.BOAT : Presence.WATER;
    theirKnownGrid[answer.coord.row][answer.coord.column].damage = Damage.HIT;
    if (answer.sunk) {
      setNbSunks(nbSunks + 1);
      if (nbSunks === 4) {
        setGameOver(true);
        setOpponentSpeech("Game over... you win!");
      }
    }
    setTheirKnownGrid([...theirKnownGrid]);
    if (answer.damage === Damage.NONE) {
      togglePlayer();
    }

    updateGameWonStatus();
    fetchCurrentPlayer();
  }

  return (
    <>
      <div>
        <span>Current player: {acurrentPlayer}</span>
      </div>
      <div>
        <span>
          {/* {players.find((p) => p !== myName)} : {opponentSpeech} */}
          {host} : {opponentSpeech}
        </span>
      </div>
      {isGameStart ? (
        <>
      <Game
        myGrid={myGrid}
        otherGrid={theirKnownGrid}
        onClick={(coord) => {
          if (gameOver || !isMyTurn()) {
            return;
          }
          setAttackCell(coord);
          attack(coord);
          setOpponentSpeech("thinking...");
        }}
        focus={attackCell}
      />
      {!gameOver && !isMyTurn() && showAnswerButtons && (
        <div>
          <button
            onClick={() => {
              answer({
                coord: oppAttackCell!,
                damage: Damage.NONE,
                sunk: false,
              });
              myGrid[oppAttackCell!.row][oppAttackCell!.column].damage =
                Damage.NONE;
              setMyGrid([...myGrid]);
              togglePlayer();
              setOpponentSpeech("waiting...");
              setShowAnswerButtons(false);
            }}
          >
            Manqué
          </button>
          <button
            onClick={() => {
              answer({
                coord: oppAttackCell!,
                damage: Damage.HIT,
                sunk: false,
              });
              myGrid[oppAttackCell!.row][oppAttackCell!.column].damage =
                Damage.HIT;
              setMyGrid([...myGrid]);
              setShowAnswerButtons(false);
            }}
          >
            Touché
          </button>
          <button
            onClick={() => {
              answer({
                coord: oppAttackCell!,
                damage: Damage.HIT,
                sunk: true,
              });
              const { boat } = getBoatAtCoord(myBoats, oppAttackCell!)!;
              boat.sunk = true;
              setMyGrid([...myGrid]);
              setShowAnswerButtons(false);
              if (Object.values(myBoats).every((boat) => boat.sunk)) {
                setGameOver(true);
                setOpponentSpeech("Game over... you lose!");
              }
            }}
          >
            Coulé
          </button>
        </div>
      )}
    </>
      ) : (
        "Waiting for game to start..."
      )}
    </>
  );
}
