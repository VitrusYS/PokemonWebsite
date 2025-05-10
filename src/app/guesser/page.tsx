// src/app/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';

// Helper functions and type definitions
interface PokemonType {
  name: string;
  url: string;
}

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: {
      "official-artwork"?: {
        front_default: string;
      };
    };
  };
  types: Array<{
    slot: number;
    type: PokemonType;
  }>;
}

interface TypeData {
  id: string; // Eindeutige ID für jeden Typ (z.B. 'type-normal')
  name: string;
  color: string;
  textColor?: string;
}

// Pokémon types with their standard colors and IDs - THESE REMAIN UNCHANGED
const POKEMON_TYPES: TypeData[] = [
  { id: 'type-normal', name: 'Normal', color: '#A8A77A', textColor: '#000000' },
  { id: 'type-fire', name: 'Fire', color: '#EE8130', textColor: '#FFFFFF' },
  { id: 'type-water', name: 'Water', color: '#6390F0', textColor: '#FFFFFF' },
  { id: 'type-electric', name: 'Electric', color: '#F7D02C', textColor: '#000000' },
  { id: 'type-grass', name: 'Grass', color: '#7AC74C', textColor: '#000000' },
  { id: 'type-ice', name: 'Ice', color: '#96D9D6', textColor: '#000000' },
  { id: 'type-fighting', name: 'Fighting', color: '#C22E28', textColor: '#FFFFFF' },
  { id: 'type-poison', name: 'Poison', color: '#A33EA1', textColor: '#FFFFFF' },
  { id: 'type-ground', name: 'Ground', color: '#E2BF65', textColor: '#000000' },
  { id: 'type-flying', name: 'Flying', color: '#A98FF3', textColor: '#000000' },
  { id: 'type-psychic', name: 'Psychic', color: '#F95587', textColor: '#FFFFFF' },
  { id: 'type-bug', name: 'Bug', color: '#A6B91A', textColor: '#000000' },
  { id: 'type-rock', name: 'Rock', color: '#B6A136', textColor: '#000000' },
  { id: 'type-ghost', name: 'Ghost', color: '#735797', textColor: '#FFFFFF' },
  { id: 'type-dragon', name: 'Dragon', color: '#6F35FC', textColor: '#FFFFFF' },
  { id: 'type-steel', name: 'Steel', color: '#B7B7CE', textColor: '#000000' },
  { id: 'type-dark', name: 'Dark', color: '#705746', textColor: '#FFFFFF' },
  { id: 'type-fairy', name: 'Fairy', color: '#D685AD', textColor: '#000000' },
];

const MAX_POKEMON_ID = 905; // Up to Gen 8 for more stable sprite results

// Enum for result states of a type chip after checking
enum TypeCheckResult {
  NONE,      // Not checked yet, or not selected
  CORRECT,   // Selected and is super effective
  INCORRECT, // Selected but is NOT super effective
  MISSED,    // Not selected but IS super effective
}

export default function PokemonGuesserPage() {
  const [currentPokemon, setCurrentPokemon] = useState<Pokemon | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [correctEffectiveness, setCorrectEffectiveness] = useState<Map<string, number>>(new Map());
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [typeCheckResults, setTypeCheckResults] = useState<Map<string, TypeCheckResult>>(new Map());
  const [showResults, setShowResults] = useState<boolean>(false);
  const [timeTaken, setTimeTaken] = useState<number>(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameWon, setGameWon] = useState<boolean>(false);


  const fetchTypeDetails = async (typeUrl: string): Promise<any> => {
    const response = await fetch(typeUrl);
    if (!response.ok) throw new Error(`Failed to fetch type details from ${typeUrl}`);
    return response.json();
  };

  const calculateEffectiveness = useCallback(async (pokemon: Pokemon) => {
    const defendingTypesDetails = await Promise.all(
        pokemon.types.map(pt => fetchTypeDetails(pt.type.url))
    );
    const calculatedEffectivenessMap = new Map<string, number>();
    for (const attackingType of POKEMON_TYPES) {
      let finalMultiplier = 1;
      for (const defendingTypeDetail of defendingTypesDetails) {
        let currentMultiplier = 1;
        if (defendingTypeDetail.damage_relations.double_damage_from.some((t: PokemonType) => t.name === attackingType.name.toLowerCase())) {
          currentMultiplier = 2;
        } else if (defendingTypeDetail.damage_relations.half_damage_from.some((t: PokemonType) => t.name === attackingType.name.toLowerCase())) {
          currentMultiplier = 0.5;
        } else if (defendingTypeDetail.damage_relations.no_damage_from.some((t: PokemonType) => t.name === attackingType.name.toLowerCase())) {
          currentMultiplier = 0;
        }
        finalMultiplier *= currentMultiplier;
      }
      calculatedEffectivenessMap.set(attackingType.name, finalMultiplier);
    }
    setCorrectEffectiveness(calculatedEffectivenessMap);
  }, []);

  const startNewGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedTypes(new Set());
    setTypeCheckResults(new Map());
    setShowResults(false);
    setGameWon(false);
    setStartTime(Date.now()); // Start timer

    let attempts = 0;
    while (attempts < 5) {
      try {
        const randomId = Math.floor(Math.random() * MAX_POKEMON_ID) + 1;
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
        if (!response.ok) {
          if (response.status === 404) {
            attempts++;
            continue;
          }
          throw new Error(`Pokémon not found (Status ${response.status})`);
        }
        const data: Pokemon = await response.json();
        const spriteUrl = data.sprites.other?.['official-artwork']?.front_default || data.sprites.front_default;
        if (!spriteUrl) {
          attempts++;
          console.warn(`Pokémon with ID ${randomId} (${data.name}) has no official artwork or default sprite. Trying next...`);
          continue;
        }
        data.sprites.front_default = spriteUrl;
        setCurrentPokemon(data);
        await calculateEffectiveness(data);
        setIsLoading(false);
        return;
      } catch (err) {
        console.error("Error fetching Pokémon:", err);
        attempts++;
      }
    }
    setError('Could not load a Pokémon after several attempts. Please try again later.');
    setIsLoading(false);
  }, [calculateEffectiveness]);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const handleTypeClick = (typeName: string) => {
    if (showResults) return; // Don't allow changes after checking

    setSelectedTypes(prevSelectedTypes => {
      const newSelectedTypes = new Set(prevSelectedTypes);
      if (newSelectedTypes.has(typeName)) {
        newSelectedTypes.delete(typeName);
      } else {
        newSelectedTypes.add(typeName);
      }
      return newSelectedTypes;
    });
  };

  const handleCheckAnswers = () => {
    if (startTime) {
      setTimeTaken((Date.now() - startTime) / 1000); // Time in seconds
    }
    const results = new Map<string, TypeCheckResult>();
    let allCorrectlySelected = true;
    let anySuperEffectiveMissed = false;

    POKEMON_TYPES.forEach(type => {
      const effectiveness = correctEffectiveness.get(type.name) || 1; // Default to 1 if not found
      const isSuperEffective = effectiveness >= 2;
      const isSelected = selectedTypes.has(type.name);

      if (isSelected) {
        if (isSuperEffective) {
          results.set(type.name, TypeCheckResult.CORRECT);
        } else {
          results.set(type.name, TypeCheckResult.INCORRECT);
          allCorrectlySelected = false; // Incorrect selection means not a perfect win
        }
      } else { // Not selected
        if (isSuperEffective) {
          results.set(type.name, TypeCheckResult.MISSED);
          allCorrectlySelected = false; // Missed a super effective type
          anySuperEffectiveMissed = true;
        } else {
          results.set(type.name, TypeCheckResult.NONE);
        }
      }
    });

    // Determine if the game is won
    // A win requires:
    // 1. All selected types must be super effective (allCorrectlySelected = true)
    // 2. No super effective types were missed (anySuperEffectiveMissed = false)
    // 3. If there are any super effective types for the current Pokemon, at least one must have been selected.
    //    If there are NO super effective types at all, selecting nothing is a win.
    let hasAnySuperEffectiveForCurrentPokemon = false;
    correctEffectiveness.forEach(multiplier => {
      if (multiplier >= 2) hasAnySuperEffectiveForCurrentPokemon = true;
    });

    if (allCorrectlySelected && !anySuperEffectiveMissed) {
      if (hasAnySuperEffectiveForCurrentPokemon) {
        // If there are super effective types, the user must have selected at least one.
        setGameWon(selectedTypes.size > 0);
      } else {
        // If there are NO super effective types, selecting nothing is also a win.
        setGameWon(true);
      }
    } else {
      setGameWon(false);
    }

    setTypeCheckResults(results);
    setShowResults(true);
  };

  const getPokemonTypeChip = (typeName: string) => {
    const typeInfo = POKEMON_TYPES.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    if (!typeInfo) return null;
    return (
        <span
            key={typeName}
            className="px-3 py-1 text-sm font-semibold rounded-full shadow-md"
            style={{ backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' }}
        >
        {typeInfo.name}
      </span>
    );
  };

  if (isLoading) {
    return (
        <main className="flex items-center justify-center min-h-screen bg-gray-900 text-yellow-400 p-4">
          <p className="text-2xl">Loading Pokémon Data...</p>
        </main>
    );
  }

  if (error) {
    return (
        <main className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-yellow-300 p-4">
          <p className="text-2xl mb-4">Error!</p>
          <p className="text-center mb-4">{error}</p>
          <button
              onClick={startNewGame}
              className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
          >
            Try Again
          </button>
        </main>
    );
  }

  return (
      <main className="min-h-screen bg-gray-900 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
        {/* This is the page-specific header/title area */}
        <header className="w-full max-w-3xl mb-6 md:mb-10 text-center bg-black text-yellow-500 p-6 rounded-b-lg shadow-lg">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Pokémon Type Effectiveness Guesser</h1>
          <p className="text-yellow-300 text-sm sm:text-base">Click on the types that are super effective (2x or 4x damage) against the displayed Pokémon!</p>
        </header>

        {/* Pokémon Display Area */}
        {currentPokemon && (
            <div className="bg-gray-800 border-2 border-yellow-500 p-6 rounded-xl shadow-2xl mb-8 w-full max-w-md flex flex-col items-center">
              <h2 className="text-3xl font-bold capitalize mb-4 text-yellow-400">{currentPokemon.name}</h2>
              <div className="relative group mb-4 w-48 h-48 sm:w-56 sm:h-56">
                <img
                    src={currentPokemon.sprites.front_default}
                    alt={currentPokemon.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = `https://placehold.co/224x224/374151/FFFF00?text=${currentPokemon.name}`; // Dark grey placeholder, yellow text
                      (e.currentTarget as HTMLImageElement).alt = `Placeholder image for ${currentPokemon.name}`;
                    }}
                />
              </div>
              <div className="flex space-x-2 mb-6">
                {currentPokemon.types.map(t => getPokemonTypeChip(t.type.name))}
              </div>
            </div>
        )}

        {/* Type Selection Grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 w-full max-w-3xl mb-8">
          {POKEMON_TYPES.map(type => {
            const isSelected = selectedTypes.has(type.name);
            let borderColor = 'border-transparent'; // Default
            if (showResults) {
              const result = typeCheckResults.get(type.name);
              if (result === TypeCheckResult.CORRECT) borderColor = 'border-green-500';
              else if (result === TypeCheckResult.INCORRECT) borderColor = 'border-red-500';
              else if (result === TypeCheckResult.MISSED) borderColor = 'border-yellow-500 animate-pulse';
            } else if (isSelected) {
              borderColor = 'border-yellow-500'; // Selected type border - Gold/Yellow
            }

            return (
                <button
                    key={type.id}
                    onClick={() => handleTypeClick(type.name)}
                    disabled={showResults && !gameWon}
                    className={`p-1 rounded-lg shadow-md hover:opacity-80 transition-all duration-150 ease-in-out border-4 ${borderColor} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-yellow-500`}
                    style={{ backgroundColor: type.color, color: type.textColor }} // Type-specific colors remain
                    title={type.name}
                >
                  <span className="block text-sm sm:text-base font-semibold">{type.name}</span>
                </button>
            );
          })}
        </div>

        {/* Action Button */}
        {!showResults && (
            <button
                onClick={handleCheckAnswers}
                className="bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold py-3 px-8 rounded-lg shadow-lg transition-colors text-lg mb-4"
            >
              Check Answers
            </button>
        )}

        {/* Results Display / New Game Button */}
        {showResults && (
            <div className="text-center w-full max-w-md">
              {gameWon ? (
                  <div className="bg-gray-800 border border-yellow-500 p-4 rounded-lg shadow-xl mb-4">
                    <h3 className="text-2xl font-bold text-yellow-500">Congratulations!</h3>
                    <p className="text-yellow-300">You guessed all super effective types correctly in {timeTaken.toFixed(1)} seconds!</p>
                  </div>
              ) : (
                  <div className="bg-gray-800 border border-yellow-500 p-4 rounded-lg shadow-xl mb-4">
                    <h3 className="text-2xl font-bold text-yellow-500">Not Quite!</h3>
                    <p className="text-yellow-300">
                      Green border: Correctly selected. Red border: Incorrectly selected. Yellow pulsing border: Missed super effective type.
                    </p>
                  </div>
              )}
              <button
                  onClick={startNewGame}
                  className="bg-gray-700 hover:bg-black text-yellow-500 font-bold py-3 px-8 rounded-lg shadow-lg transition-colors text-lg"
              >
                New Pokémon
              </button>
            </div>
        )}
      </main>
  );
}
