// src/app/bb2r/pokedex/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { POKEMON_TYPES as TYPE_COLORS_DATA } from '@/lib/pokemonTypes'; // Assuming this path is correct

// Interface matching the structure of your blazeblack2_redux_pokemon_data.json
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
        default: string | null;
        shiny: string | null;
    };
    height: number;
    weight: number;
    changes_bb2r: { // Indicates what was changed from vanilla for this Romhack
        stats_changed?: boolean;
        abilities_changed?: boolean;
        types_changed?: boolean;
        // Potentially add evolution_changed, moves_changed later
    };
    final_abilities: string[]; // The abilities this Pokemon has in BB2R
    final_types: string[];    // The types this Pokemon has in BB2R
}

const formatPokemonId = (id: number): string => `#${String(id).padStart(4, '0')}`;

const getTypeChipStyle = (typeName: string): React.CSSProperties => {
    const typeInfo = TYPE_COLORS_DATA.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return typeInfo
        ? { backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' }
        : { backgroundColor: '#777', color: '#fff' };
};

// No caching for this list for now, as it's loaded from a local JSON.
// Caching could be added if fetching this JSON itself becomes a bottleneck (unlikely for local file).

export default function BB2RPokedexListPage() {
    const [allBB2RPokemon, setAllBB2RPokemon] = useState<BB2RPokemon[]>([]);
    const [filteredPokemon, setFilteredPokemon] = useState<BB2RPokemon[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const fetchBB2RPokemonData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Path to your local JSON data file in the `public` folder
            const response = await fetch('/data/blazeblack2_redux_pokemon_data.json');
            if (!response.ok) {
                throw new Error(`Failed to fetch BB2R Pokémon data. Status: ${response.status}`);
            }
            const data: BB2RPokemon[] = await response.json();

            // Data should already be sorted if your JSON is, but an explicit sort is safe.
            data.sort((a, b) => a.id - b.id);

            setAllBB2RPokemon(data);
            setFilteredPokemon(data);
            console.log(`Loaded ${data.length} Pokémon for BB2R Pokédex.`);
        } catch (err: unknown) { // Type err as unknown
            let message = "An unknown error occurred while fetching BB2R Pokémon data.";
            if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
            console.error("Error fetching BB2R Pokémon data:", message, err);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBB2RPokemonData();
    }, [fetchBB2RPokemonData]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredPokemon(allBB2RPokemon);
            return;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = allBB2RPokemon.filter(p =>
            p.displayName.toLowerCase().includes(lowerSearchTerm) ||
            p.name.toLowerCase().includes(lowerSearchTerm) ||
            String(p.id).includes(lowerSearchTerm)
        );
        setFilteredPokemon(filtered);
    }, [searchTerm, allBB2RPokemon]);

    const handleRowClick = (pokemonName: string) => {
        // Navigate to a BB2R specific detail page
        router.push(`/bb2r/pokedex/${pokemonName.toLowerCase()}`);
    };

    if (isLoading) {
        return (
            <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4">
                <p className="text-2xl animate-pulse">Loading Blaze Black 2 Redux Pokédex...</p>
            </main>
        );
    }

    if (error) {
        return (
            <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-red-500 p-4">
                <p className="text-2xl mb-4">Error loading BB2R Pokédex!</p>
                <p className="text-center mb-4">{error}</p>
                <button
                    onClick={fetchBB2RPokemonData} // Retry fetching
                    className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
                >
                    Retry
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
            <header className="w-full max-w-6xl mb-6 md:mb-10 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-2">Blaze Black 2 Redux Pokédex</h1>
                <p className="text-gray-400 text-sm">Pokémon data specific to the Blaze Black 2 Redux Romhack.</p>

                <div className="my-8 p-4 bg-gray-800 rounded-xl shadow-lg">
                    <input
                        type="text"
                        placeholder="Search Pokémon by Name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 lg:w-1/3 p-3 rounded-lg bg-gray-700 text-yellow-300 border border-gray-600 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    />
                    {/* Placeholder for future BB2R specific filters if needed */}
                </div>
            </header>

            <div className="w-full max-w-6xl overflow-x-auto bg-gray-800 rounded-xl shadow-2xl">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Sprite</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Types</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Abilities</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider text-center">Changes</th>
                    </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredPokemon.map((pokemon) => (
                        <tr
                            key={pokemon.id}
                            className="hover:bg-gray-700/70 transition-colors group cursor-pointer"
                            onClick={() => handleRowClick(pokemon.name)} // Use API name for routing
                        >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 group-hover:text-yellow-300">
                                {formatPokemonId(pokemon.id)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                {pokemon.sprites.default ? (
                                    <Image src={pokemon.sprites.default} alt={pokemon.displayName} width={48} height={48} unoptimized className="group-hover:scale-125 transition-transform image-pixelated"/>
                                ) : (
                                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-xs text-gray-400">?</div>
                                )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-200 group-hover:text-yellow-300">
                                <Link href={`/bb2r/pokedex/${pokemon.name.toLowerCase()}`} className="hover:underline capitalize" onClick={(e) => e.stopPropagation()}>
                                    {pokemon.displayName}
                                </Link>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex space-x-1">
                                    {pokemon.final_types.map(typeName => (
                                        <span
                                            key={typeName}
                                            className="px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-sm"
                                            style={getTypeChipStyle(typeName)}
                                        >
                        {typeName.toUpperCase()}
                      </span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-300 group-hover:text-yellow-200 capitalize">
                                {pokemon.final_abilities.map(ab => ab.replace('-', ' ')).join(' / ')}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-center">
                                {Object.keys(pokemon.changes_bb2r).length > 0 ? (
                                    <span className="px-2 py-1 font-semibold leading-tight text-green-700 bg-green-100 rounded-full dark:bg-green-600 dark:text-green-100 text-xs">
                      MODIFIED
                    </span>
                                ) : (
                                    <span className="px-2 py-1 font-semibold leading-tight text-gray-700 bg-gray-200 rounded-full dark:bg-gray-600 dark:text-gray-300 text-xs">
                      VANILLA
                    </span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {filteredPokemon.length === 0 && !isLoading && (
                        <tr>
                            <td colSpan={6} className="px-4 py-10 text-center text-gray-500">
                                No Pokémon found matching your criteria.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}
