// src/app/pokedex/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { POKEMON_TYPES as TYPE_COLORS_DATA } from '@/lib/pokemonTypes';

interface SimplePokemon {
    id: number;
    name: string;
    sprite: string | null;
    types: Array<{ name: string; url: string }>;
}

const formatPokemonId = (id: number): string => `#${String(id).padStart(4, '0')}`;

const getTypeChipStyle = (typeName: string): React.CSSProperties => {
    const typeInfo = TYPE_COLORS_DATA.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return typeInfo
        ? { backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' }
        : { backgroundColor: '#777', color: '#fff' };
};

const POKEMON_PER_BATCH = 100;
const TOTAL_POKEMON_TARGET = 1025;
const CACHE_KEY_COMPLETE_LIST = 'pokedex_complete_list_v2';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

export default function PokedexListPage() {
    const [allPokemon, setAllPokemon] = useState<SimplePokemon[]>([]);
    const [filteredPokemon, setFilteredPokemon] = useState<SimplePokemon[]>([]);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    // isLoadingBackground can be kept for logic but not necessarily for UI display
    const [isLoadingBackground, setIsLoadingBackground] = useState(false);
    // loadingProgress state can be removed if not displayed
    // const [loadingProgress, setLoadingProgress] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const isLoadingAllPokemonRef = useRef(false);

    const fetchPokemonBatch = useCallback(async (offset: number, limit: number): Promise<SimplePokemon[]> => {
        console.log(`Fetching Pokémon batch. Offset: ${offset}, Limit: ${limit}`); // Console log for progress
        try {
            const listResponse = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`);
            if (!listResponse.ok) throw new Error(`Failed to fetch Pokémon batch (offset: ${offset}).`);
            const listData = await listResponse.json();

            if (listData.results.length === 0) {
                return [];
            }

            const pokemonDetailsPromises = listData.results.map(async (p: { name: string; url: string }) => {
                try {
                    const detailResponse = await fetch(p.url);
                    if (!detailResponse.ok) return null;
                    const detailData = await detailResponse.json();
                    return {
                        id: detailData.id,
                        name: detailData.name,
                        sprite: detailData.sprites?.front_default || null,
                        types: detailData.types.map((t: any) => ({ name: t.type.name, url: t.type.url })),
                    };
                } catch { return null; }
            });

            const settledPokemonDetails = await Promise.allSettled(pokemonDetailsPromises);
            return settledPokemonDetails
                .filter(result => result.status === 'fulfilled' && result.value !== null)
                .map(result => (result as PromiseFulfilledResult<SimplePokemon>).value)
                .sort((a, b) => a.id - b.id);
        } catch (err: any) {
            console.error("Error in fetchPokemonBatch:", err);
            throw err;
        }
    }, []);

    useEffect(() => {
        const loadAllSequentially = async () => {
            if (isLoadingAllPokemonRef.current) return;
            isLoadingAllPokemonRef.current = true;

            setIsLoadingInitial(true);
            setError(null);

            const cachedData = localStorage.getItem(CACHE_KEY_COMPLETE_LIST);
            if (cachedData) {
                const { timestamp, data } = JSON.parse(cachedData);
                if (Date.now() - timestamp < CACHE_DURATION_MS) {
                    console.log("Loading COMPLETE Pokémon list from cache.");
                    setAllPokemon(data);
                    setFilteredPokemon(data);
                    setIsLoadingInitial(false);
                    isLoadingAllPokemonRef.current = false;
                    return;
                } else {
                    console.log("Complete list cache expired.");
                    localStorage.removeItem(CACHE_KEY_COMPLETE_LIST);
                }
            }

            console.log("Starting sequential load of all Pokémon...");
            let currentPokemonList: SimplePokemon[] = [];
            let currentOffset = 0;
            let hasMoreToLoad = true;

            while (hasMoreToLoad && currentOffset < TOTAL_POKEMON_TARGET) {
                if (currentOffset > 0) setIsLoadingBackground(true);
                // setLoadingProgress(`Loading Pokémon ${currentOffset + 1} - ${Math.min(currentOffset + POKEMON_PER_BATCH, TOTAL_POKEMON_TARGET)} of ${TOTAL_POKEMON_TARGET}...`);
                console.log(`Loading Pokémon ${currentOffset + 1} - ${Math.min(currentOffset + POKEMON_PER_BATCH, TOTAL_POKEMON_TARGET)} of ${TOTAL_POKEMON_TARGET}...`); // Console log for progress

                try {
                    const newBatch = await fetchPokemonBatch(currentOffset, POKEMON_PER_BATCH);
                    if (newBatch.length > 0) {
                        currentPokemonList = [...currentPokemonList, ...newBatch];
                        currentPokemonList.sort((a,b) => a.id - b.id);
                        setAllPokemon([...currentPokemonList]);
                        currentOffset = currentPokemonList.length; // More robust way to set offset
                    } else {
                        hasMoreToLoad = false;
                    }
                } catch (batchError) {
                    const errorMessage = `Error loading batch starting at offset ${currentOffset}. Some Pokémon may be missing.`;
                    setError(errorMessage);
                    console.error(errorMessage, batchError);
                    hasMoreToLoad = false;
                }
                if (isLoadingInitial) setIsLoadingInitial(false);
            }

            setFilteredPokemon([...currentPokemonList]);
            setIsLoadingBackground(false);
            // setLoadingProgress(currentPokemonList.length >= TOTAL_POKEMON_TARGET ? 'All Pokémon loaded!' : `Loaded ${currentPokemonList.length} Pokémon.`);
            console.log(currentPokemonList.length >= TOTAL_POKEMON_TARGET ? 'All Pokémon loaded!' : `Loaded ${currentPokemonList.length} Pokémon.`); // Console log for final status

            if (!error && currentPokemonList.length > 0) {
                localStorage.setItem(CACHE_KEY_COMPLETE_LIST, JSON.stringify({
                    timestamp: Date.now(),
                    data: currentPokemonList
                }));
                console.log("Complete Pokémon list cached.");
            }
            isLoadingAllPokemonRef.current = false;
        };

        loadAllSequentially();
    }, [fetchPokemonBatch]);

    useEffect(() => {
        if (!searchTerm) {
            setFilteredPokemon(allPokemon);
            return;
        }
        const lowerSearchTerm = searchTerm.toLowerCase();
        const filtered = allPokemon.filter(p =>
            p.name.toLowerCase().includes(lowerSearchTerm) ||
            String(p.id).includes(lowerSearchTerm)
        );
        setFilteredPokemon(filtered);
    }, [searchTerm, allPokemon]);

    const handleRowClick = (pokemonName: string) => {
        router.push(`/pokedex/${pokemonName.toLowerCase()}`);
    };

    if (isLoadingInitial && allPokemon.length === 0) {
        return (
            <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4">
                <p className="text-2xl animate-pulse">Loading Pokédex (Initialising...)</p>
            </main>
        );
    }

    if (error && allPokemon.length === 0) {
        return (
            <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-red-500 p-4">
                <p className="text-2xl mb-4">Error loading Pokédex!</p>
                <p className="text-center mb-4">{error}</p>
                <button
                    onClick={() => {
                        localStorage.removeItem(CACHE_KEY_COMPLETE_LIST);
                        setAllPokemon([]);
                        window.location.reload();
                    }}
                    className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors"
                >
                    Retry Full Load
                </button>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
            <header className="w-full max-w-6xl mb-6 md:mb-10 text-center">
                <h1 className="text-4xl sm:text-5xl font-bold text-yellow-400 mb-6">Pokédex</h1>
                <div className="mb-8 p-4 bg-gray-800 rounded-xl shadow-lg">
                    <input
                        type="text"
                        placeholder="Search by Name or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/2 lg:w-1/3 p-3 rounded-lg bg-gray-700 text-yellow-300 border border-gray-600 focus:ring-2 focus:ring-yellow-500 focus:border-transparent outline-none transition-all"
                    />
                    <div className="mt-6 flex flex-wrap justify-center gap-4">
                        <button className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-yellow-400 rounded-md shadow transition-colors disabled:opacity-50" disabled>Filter by Generation (Soon)</button>
                        <button className="py-2 px-4 bg-gray-700 hover:bg-gray-600 text-yellow-400 rounded-md shadow transition-colors disabled:opacity-50" disabled>Filter by Type (Soon)</button>
                    </div>
                </div>
            </header>

            {/* Removed Loading Progress Indicator from UI */}
            {/* {(isLoadingInitial || isLoadingBackground) && (
        <div className="w-full max-w-6xl text-center mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 animate-pulse">{loadingProgress || "Loading Pokémon..."}</p>
        </div>
      )} */}
            {error && !isLoadingInitial && (
                <div className="w-full max-w-6xl text-center mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400">{error}</p>
                </div>
            )}


            <div className="w-full max-w-6xl overflow-x-auto bg-gray-800 rounded-xl shadow-2xl">
                <table className="min-w-full divide-y divide-gray-700">
                    <thead className="bg-gray-700/50">
                    <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">ID</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Sprite</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Name</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-yellow-400 uppercase tracking-wider">Types</th>
                    </tr>
                    </thead>
                    <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {filteredPokemon.map((pokemon) => (
                        <tr
                            key={pokemon.id}
                            className="hover:bg-gray-700/70 transition-colors group cursor-pointer"
                            onClick={() => handleRowClick(pokemon.name)}
                        >
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-400 group-hover:text-yellow-300">
                                {formatPokemonId(pokemon.id)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                {pokemon.sprite ? (
                                    <Image src={pokemon.sprite} alt={pokemon.name} width={48} height={48} unoptimized className="group-hover:scale-125 transition-transform"/>
                                ) : (
                                    <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-xs text-gray-400">?</div>
                                )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-200 group-hover:text-yellow-300">
                                <Link href={`/pokedex/${pokemon.name.toLowerCase()}`} className="hover:underline capitalize" onClick={(e) => e.stopPropagation()}>
                                    {pokemon.name.replace('-', ' ')}
                                </Link>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex space-x-1">
                                    {pokemon.types.map(typeInfo => (
                                        <span
                                            key={typeInfo.name}
                                            className="px-2.5 py-0.5 text-xs font-semibold rounded-full shadow-sm"
                                            style={getTypeChipStyle(typeInfo.name)}
                                        >
                        {typeInfo.name.toUpperCase()}
                      </span>
                                    ))}
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredPokemon.length === 0 && !isLoadingInitial && !isLoadingBackground && (
                        <tr>
                            <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                                No Pokémon found matching your criteria or list is empty.
                            </td>
                        </tr>
                    )}
                    </tbody>
                </table>
            </div>
            {!isLoadingInitial && !isLoadingBackground && allPokemon.length >= TOTAL_POKEMON_TARGET && (
                <div className="mt-4 text-center text-sm text-green-500">
                    All {allPokemon.length} Pokémon loaded and cached!
                </div>
            )}
        </main>
    );
}
