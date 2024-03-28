import React, { useState } from "react";
import { useGame } from "./comBlockChain/GameContext";
import { useNavigate } from "react-router-dom"; // Assurez-vous d'importer useNavigate pour la navigation

const StartGamePage = () => {
  const [localGuestAddress, setLocalGuestAddress] = useState("");
  const { setGuestAddress } = useGame();
  let navigate = useNavigate();

  const handleAddressChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalGuestAddress(event.target.value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!localGuestAddress) {
      alert("Please enter a valid guest address.");
      return;
    }
    setGuestAddress(localGuestAddress);
    navigate("/place-boats"); // Naviguez vers PlaceBoats après la soumission
  };

  return (
    <div>
      <h1>Start a New Game</h1>
      <form onSubmit={handleSubmit}>
        <label>
          Guest Ethereum Address:
          <input
            type="text"
            value={localGuestAddress}
            onChange={handleAddressChange}
            placeholder="Enter guest's address"
          />
        </label>
        <button type="submit">Start Game</button>
      </form>
    </div>
  );
};

export default StartGamePage;
