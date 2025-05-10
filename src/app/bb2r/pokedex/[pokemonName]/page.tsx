// src/app/bb2r/pokedex/[pokemonName]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { POKEMON_TYPES, TypeData } from '@/lib/pokemonTypes'; // Your shared types definition

// Interface for the data structure in your blazeblack2_redux_pokemon_data.json
interface BB2RPokemon {
    id: number;
    name: string; // This is the lowercase API name, good for URLs
    displayName: string; // Name for display
    stats: {
        hp: number;
        attack: number;
        defense: number;
        "special-attack": number;
        "special-defense": number;
        speed: number;
    };
    sprites: {
        default: string | null; // URL to the sprite (animated GIF preferred)
        shiny: string | null;
    };
    height: number; // in decimetres
    weight: number; // in hectograms
    changes_bb2r: { // Indicates what was changed from vanilla for this Romhack
        stats_changed?: boolean;
        abilities_changed?: boolean;
        types_changed?: boolean;
        evolution_changed?: boolean; // Placeholder for future
        moves_changed?: boolean;     // Placeholder for future
    };
    final_abilities: string[]; // The abilities this Pokemon has in BB2R
    final_types: string[];    // The types this Pokemon has in BB2R
    // Placeholder for full evolution data if you add it to the JSON
    // evolution_chain_bb2r?: any; // Or a more specific type
    // Placeholder for learnset
    // learnset_bb2r?: any[];
    // Placeholder for encounter locations
    // encounter_locations_bb2r?: string[];
}


interface PokemonPageProps {
    params: {
        pokemonName: string;
    };
}

// --- Helper Functions (can be moved to a shared utils file later) ---
const formatPokemonId = (id: number): string => `#${String(id).padStart(4, '0')}`;

const getTypeChipStyle = (typeName: string): React.CSSProperties => {
    const typeInfo = POKEMON_TYPES.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return typeInfo
        ? { backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' }
        : { backgroundColor: '#777', color: '#fff' };
};

const MAX_STAT_VALUE = 255;
const MAX_POKEMON_ID_FOR_NAV = 649; // Max ID in Gen 5 (BB2R specific might be different if it adds more)

const getStatColor = (base_stat: number): string => {
    if (base_stat < 50) return '#c0392b';
    if (base_stat < 80) return '#f39c12';
    if (base_stat < 110) return '#27ae60';
    return '#2980b9';
};

// --- Main Component ---
export default function BB2RPokemonDetailPage({ params }: PokemonPageProps) {
    const { pokemonName: currentPokemonIdentifier } = params;
    const [pokemonData, setPokemonData] = useState<BB2RPokemon | null>(null);
    const [animatedStats, setAnimatedStats] = useState<Array<{stat: {name: string}, base_stat: number, current_width?: string, current_color?: string}>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // For prev/next navigation - this would need a way to get the full list of BB2R pokemon names/ids
    // For now, these will be disabled or use a simplified logic if we only have the current pokemon's data.
    const [prevPokemonLink, setPrevPokemonLink] = useState<{name: string, displayName: string, id: number} | null>(null);
    const [nextPokemonLink, setNextPokemonLink] = useState<{name: string, displayName: string, id: number} | null>(null);

    const fetchBB2RPokemon = useCallback(async (identifier: string) => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch the entire JSON data file
            const response = await fetch('/data/blazeblack2_redux_pokemon_data.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch BB2R Pokémon data file. Status: ${response.status}`);
            }
            const allPokemonData: BB2RPokemon[] = await response.json();

            // Find the specific Pokémon by name or ID
            const foundPokemon = allPokemonData.find(
                p => p.name.toLowerCase() === identifier.toLowerCase() ||
                    String(p.id) === identifier
            );

            if (!foundPokemon) {
                throw new Error(`Pokémon "${identifier}" not found in BB2R data.`);
            }
            setPokemonData(foundPokemon);

            // Prepare stats for animation
            const initialStats = foundPokemon.stats ? Object.entries(foundPokemon.stats).map(([name, value]) => ({
                stat: { name },
                base_stat: value,
                current_width: '0%',
                current_color: '#EF4444' // Start red
            })) : [];
            setAnimatedStats(initialStats);

            setTimeout(() => {
                if (foundPokemon.stats) {
                    setAnimatedStats(Object.entries(foundPokemon.stats).map(([name, value]) => ({
                        stat: { name },
                        base_stat: value,
                        current_width: `${Math.min((value / MAX_STAT_VALUE) * 100, 100)}%`,
                        current_color: getStatColor(value)
                    })));
                }
            }, 100);

            // Setup Prev/Next (simple version based on current ID within the loaded list)
            const currentIndex = allPokemonData.findIndex(p => p.id === foundPokemon.id);
            if (currentIndex > 0) {
                const prev = allPokemonData[currentIndex - 1];
                setPrevPokemonLink({id: prev.id, name: prev.name, displayName: prev.displayName});
            } else {
                setPrevPokemonLink(null);
            }
            if (currentIndex < allPokemonData.length - 1) {
                const next = allPokemonData[currentIndex + 1];
                setNextPokemonLink({id: next.id, name: next.name, displayName: next.displayName});
            } else {
                setNextPokemonLink(null);
            }


        } catch (err: unknown) {
            let message = "An unknown error occurred.";
            if (err instanceof Error) message = err.message;
            setError(message);
            console.error("Error in fetchBB2RPokemon:", err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentPokemonIdentifier) {
            fetchBB2RPokemon(currentPokemonIdentifier as string);
        }
    }, [currentPokemonIdentifier, fetchBB2RPokemon]);

    // --- Loading and Error States ---
    if (isLoading) {
        return (
            <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4">
                <p className="text-2xl animate-pulse">Loading BB2R Pokémon data for {currentPokemonIdentifier}...</p>
            </main>
        );
    }
    if (error) return (
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-red-500 p-4">
            <p className="text-2xl mb-4">Error!</p>
            <p className="text-center mb-4">{error}</p>
            <Link href="/bb2r/pokedex" className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">
                Back to BB2R Pokédex List
            </Link>
        </main>
    );
    if (!pokemonData) {
        return (
            <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4">
                <p className="text-2xl mb-4">Pokémon <span className="font-mono">{currentPokemonIdentifier}</span> not found in BB2R data.</p>
                <Link href="/bb2r/pokedex" className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">
                    Back to BB2R Pokédex List
                </Link>
            </main>
        );
    }

    // --- Main Render ---
    const regularAbilities = pokemonData.final_abilities.slice(0, 2).filter(ab => ab); // Assuming first two are regular
    const hiddenAbility = pokemonData.final_abilities.length > 2 ? pokemonData.final_abilities[2] :
        (pokemonData.final_abilities.length === 2 && !POKEMON_TYPES.find(t => t.name.toLowerCase() === pokemonData.final_abilities[1]?.toLowerCase())) ? pokemonData.final_abilities[1] : null; // Heuristic for hidden

    return (
        <main className="min-h-[calc(100vh-80px)] bg-gray-800 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
            {/* Navigation and Main Title */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-6">
                {prevPokemonLink ? (
                    <Link href={`/bb2r/pokedex/${prevPokemonLink.name}`} className="text-yellow-400 hover:text-yellow-200 transition-colors py-2 px-4 bg-gray-700 rounded-lg shadow hover:shadow-md flex items-center text-sm sm:text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        <span className="ml-2 capitalize">{prevPokemonLink.displayName} ({formatPokemonId(prevPokemonLink.id)})</span>
                    </Link>
                ) : <div className="w-1/3 opacity-0 pointer-events-none md:w-auto"></div>} {/* Adjusted placeholder width */}

                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold capitalize text-center text-yellow-400 mx-2">
                    {pokemonData.displayName} <span className="text-xl md:text-2xl text-gray-400">{formatPokemonId(pokemonData.id)}</span>
                </h1>

                {nextPokemonLink ? (
                    <Link href={`/bb2r/pokedex/${nextPokemonLink.name}`} className="text-yellow-400 hover:text-yellow-200 transition-colors py-2 px-4 bg-gray-700 rounded-lg shadow hover:shadow-md flex items-center text-sm sm:text-base">
                        <span className="mr-2 capitalize">{nextPokemonLink.displayName} ({formatPokemonId(nextPokemonLink.id)})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </Link>
                ) : <div className="w-1/3 opacity-0 pointer-events-none md:w-auto"></div>} {/* Adjusted placeholder width */}
            </div>

            {/* Main Content Grid */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Left Column: Image, Types, Abilities */}
                <div className="md:col-span-1 bg-gray-700 p-6 rounded-xl shadow-xl flex flex-col items-center">
                    {pokemonData.sprites.default ? (
                        <Image
                            src={pokemonData.sprites.default}
                            alt={pokemonData.displayName}
                            width={192} // Increased size for main image
                            height={192}
                            className="object-contain mb-4 image-pixelated" // Added image-pixelated
                            unoptimized // Good for GIFs
                            priority
                        />
                    ) : (
                        <div className="w-48 h-48 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 mb-4">No Sprite</div>
                    )}
                    <div className="flex space-x-2 mb-4">
                        {pokemonData.final_types.map((typeName) => (
                            <span key={typeName} className="px-4 py-1.5 text-base font-bold rounded-full shadow-md" style={getTypeChipStyle(typeName)}>
                {typeName.toUpperCase()}
              </span>
                        ))}
                    </div>
                    {/* Changes Indicator */}
                    {Object.keys(pokemonData.changes_bb2r).length > 0 && (
                        <div className="mb-4 w-full text-center">
                <span className="px-3 py-1 text-xs font-semibold text-black bg-yellow-400 rounded-full">
                    BB2R Modified
                </span>
                            <ul className="text-xs text-gray-300 mt-1 list-disc list-inside">
                                {pokemonData.changes_bb2r.stats_changed && <li>Stats Changed</li>}
                                {pokemonData.changes_bb2r.types_changed && <li>Type Changed</li>}
                                {pokemonData.changes_bb2r.abilities_changed && <li>Abilities Changed</li>}
                                {/* Add more change indicators here */}
                            </ul>
                        </div>
                    )}
                    <div className="w-full text-left mt-2 bg-gray-600/50 p-3 rounded-lg">
                        <h3 className="text-xl font-semibold text-yellow-400 mb-2 text-center border-b border-gray-500 pb-1">Abilities</h3>
                        <div className={`grid ${hiddenAbility ? 'grid-cols-2' : 'grid-cols-1'} gap-x-4 place-items-center`}>
                            <div className={`${hiddenAbility ? '' : 'col-span-2 text-center'}`}>
                                {regularAbilities.map((abilityName) => (
                                    <p key={abilityName} className={`capitalize text-gray-200 py-0.5 hover:text-yellow-300 cursor-pointer transition-colors`} title={`Ability: ${abilityName.replace('-', ' ')}`}>
                                        {abilityName.replace('-', ' ')}
                                    </p>
                                ))}
                            </div>
                            {hiddenAbility && (
                                <div className="text-center">
                                    <p className={`capitalize text-yellow-400 py-0.5 italic hover:text-yellow-200 cursor-pointer transition-colors`} title={`Hidden Ability: ${hiddenAbility.replace('-', ' ')}`}>
                                        {hiddenAbility.replace('-', ' ')}
                                    </p>
                                    <p className="text-xs text-gray-400">(Hidden)</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Stats */}
                <div className="md:col-span-2 bg-gray-700 p-6 rounded-xl shadow-xl">
                    <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Base Stats</h3>
                    {animatedStats.map(({ stat, base_stat, current_width, current_color }) => (
                        <div key={stat.name} className="mb-3.5">
                            <div className="flex justify-between text-gray-200 capitalize mb-1 text-sm font-medium">
                                <span>{stat.name.replace('-', ' ')}</span>
                                <span>{base_stat}</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-6 p-0.5 shadow-inner">
                                <div
                                    className="h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold text-white"
                                    style={{
                                        width: current_width || '0%',
                                        backgroundColor: current_color || '#EF4444',
                                        transitionProperty: 'width, background-color',
                                        transitionDuration: '1.5s',
                                        transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)',
                                        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                                    }}
                                >
                                </div>
                            </div>
                        </div>
                    ))}
                    <div className="mt-5 pt-3 border-t border-gray-600 flex justify-between font-bold text-lg">
                        <span className="text-yellow-400">Total:</span>
                        <span className="text-gray-100">{Object.values(pokemonData.stats).reduce((sum, value) => sum + value, 0)}</span>
                    </div>
                </div>
            </div>

            {/* Placeholder for Learnset */}
            <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl mb-8">
                <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Learnset (BB2R)</h3>
                <p className="text-gray-400">Learnset data will be displayed here soon...</p>
                {/* TODO: Implement learnset display using data from Pokemon Changes.md or a dedicated learnset JSON */}
            </div>

            {/* Placeholder for Encounter Locations */}
            <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl mb-8">
                <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Encounter Locations (BB2R)</h3>
                <p className="text-gray-400">Encounter locations will be displayed here soon...</p>
                {/* TODO: Implement encounter locations display using data from Wild Area Changes.md */}
            </div>

            {/* Placeholder for Evolution Chain - This will need data from your Evolution Changes.md */}
            <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl">
                <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">
                    Evolution Line (BB2R)
                </h3>
                <p className="text-gray-400">BB2R specific evolution data will be displayed here soon...</p>
                {/* TODO: Implement BB2R evolution chain display using data from Evolution Changes.md */}
            </div>
        </main>
    );
}
