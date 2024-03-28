// App.tsx
import React, { useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import StartGamePage from './StartGamePage';
import PlaceBoats from './PlaceBoats';
import PlayGame from './PlayGame';
import { GameProvider } from './comBlockChain/GameContext';
import { Boat, BoatType } from "./model/Battleship";

const App = () => {
  const [myBoats, setMyBoats] = useState<Map<BoatType, Boat>>(new Map());
  const navigate = useNavigate();

  const handleBoatsPlacementDone = (boats: Map<BoatType, Boat>) => {
    setMyBoats(boats);
    navigate('/play-game'); 
  };

  return (
    <GameProvider>
      <Routes>
        <Route path="/" element={<StartGamePage />} />
        <Route path="/place-boats" element={<PlaceBoats onDone={handleBoatsPlacementDone}/>} />
        <Route path="/play-game" element={<PlayGame myBoats={myBoats}/>} />
      </Routes>
    </GameProvider>
  );
};

export default App;
