// src/contexts/PokedexContext.tsx
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

export interface MinimalPokemonInfo {
    id: number;
    name: string; // This will be the lowercase name from the API, e.g., "bulbasaur"
    displayName: string; // This will be a more display-friendly name, e.g., "Bulbasaur"
}

interface PokedexContextType {
    minimalPokemonList: MinimalPokemonInfo[];
    isLoadingMinimalList: boolean;
    searchError: string | null;
}

const PokedexContext = createContext<PokedexContextType | undefined>(undefined);

const TOTAL_POKEMON_FOR_SEARCH = 1025; // Adjust as needed
const CACHE_KEY_MINIMAL_LIST = 'pokedex_minimal_pokemon_list_v1';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export const PokedexProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [minimalPokemonList, setMinimalPokemonList] = useState<MinimalPokemonInfo[]>([]);
    const [isLoadingMinimalList, setIsLoadingMinimalList] = useState<boolean>(true);
    const [searchError, setSearchError] = useState<string | null>(null);

    const fetchMinimalPokemonList = useCallback(async () => {
        setIsLoadingMinimalList(true);
        setSearchError(null);

        const cachedData = localStorage.getItem(CACHE_KEY_MINIMAL_LIST);
        if (cachedData) {
            const { timestamp, data } = JSON.parse(cachedData);
            if (Date.now() - timestamp < CACHE_DURATION_MS) {
                console.log("[PokedexContext] Loading MINIMAL Pokémon list from cache.");
                setMinimalPokemonList(data);
                setIsLoadingMinimalList(false);
                return;
            } else {
                console.log("[PokedexContext] MINIMAL list cache expired.");
                localStorage.removeItem(CACHE_KEY_MINIMAL_LIST);
            }
        }

        console.log("[PokedexContext] Fetching new MINIMAL Pokémon list from API...");
        try {
            // Fetching the 'pokemon' endpoint gives us names and URLs to detail pages.
            // The detail page URL contains the ID, or we can fetch details for each.
            // For just names and IDs, a more efficient way might be to iterate or use a different source if available.
            // However, the 'pokemon' endpoint is standard. We'll fetch a large limit.
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${TOTAL_POKEMON_FOR_SEARCH}&offset=0`);
            if (!response.ok) {
                throw new Error('Failed to fetch minimal Pokémon list for search.');
            }
            const data = await response.json();

            const listWithDetails: MinimalPokemonInfo[] = await Promise.all(
                data.results.map(async (p: { name: string; url: string }, index: number) => {
                    // Extract ID from URL or use index+1 as a fallback (PokéAPI IDs are usually sequential)
                    let id = index + 1;
                    const urlParts = p.url.split('/');
                    const idFromUrl = parseInt(urlParts[urlParts.length - 2], 10);
                    if (!isNaN(idFromUrl)) {
                        id = idFromUrl;
                    }
                    return {
                        id: id,
                        name: p.name, // lowercase name
                        displayName: p.name.charAt(0).toUpperCase() + p.name.slice(1).replace('-', ' ') // Capitalized, hyphen replaced
                    };
                })
            );

            // Sort by ID to ensure consistency
            listWithDetails.sort((a,b) => a.id - b.id);

            setMinimalPokemonList(listWithDetails);
            localStorage.setItem(CACHE_KEY_MINIMAL_LIST, JSON.stringify({
                timestamp: Date.now(),
                data: listWithDetails,
            }));
            console.log("[PokedexContext] MINIMAL Pokémon list fetched and cached.");
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "An unknown error occurred while fetching minimal Pokémon list.";
            console.error("[PokedexContext]", message, err);
            setSearchError(message);
        } finally {
            setIsLoadingMinimalList(false);
        }
    }, []);

    useEffect(() => {
        fetchMinimalPokemonList();
    }, [fetchMinimalPokemonList]);

    return (
        <PokedexContext.Provider value={{ minimalPokemonList, isLoadingMinimalList, searchError }}>
            {children}
        </PokedexContext.Provider>
    );
};

export const usePokedex = (): PokedexContextType => {
    const context = useContext(PokedexContext);
    if (context === undefined) {
        throw new Error('usePokedex must be used within a PokedexProvider');
    }
    return context;
};
