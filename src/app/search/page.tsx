// src/app/search/page.tsx
"use client";

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { usePokedex } from '@/contexts/PokedexContext';
import { POKEMON_TYPES as TYPE_COLORS_DATA } from '@/lib/pokemonTypes'; // For type chips if needed

interface SearchResultItem {
    type: 'page' | 'pokemon';
    name: string;
    path: string;
    id?: number;
    sprite?: string | null; // For Pokémon
    types?: Array<{ name: string }>; // For Pokémon
    apiName?: string; // For Pokémon, the lowercase name for linking
}

// Static page data for search (same as in Header, could be centralized)
const pageSearchData: Omit<SearchResultItem, 'id' | 'sprite' | 'types' | 'apiName'>[] = [
    { type: 'page', name: 'Home', path: '/' },
    { type: 'page', name: 'Pokémon Guesser', path: '/guesser' },
    { type: 'page', name: 'Pokédex List', path: '/pokedex' },
];

const getTypeChipStyle = (typeName: string): React.CSSProperties => {
    const typeInfo = TYPE_COLORS_DATA.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return typeInfo
        ? { backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' }
        : { backgroundColor: '#777', color: '#fff' };
};

function SearchResultsComponent() {
    const searchParams = useSearchParams();
    const query = searchParams.get('q');
    const { minimalPokemonList, isLoadingMinimalList, searchError: contextError } = usePokedex();

    const [results, setResults] = useState<SearchResultItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isLoadingMinimalList) {
            // Wait for the minimal list to load if it's still loading
            setIsLoading(true);
            return;
        }

        setIsLoading(true);
        if (query) {
            const lowerQuery = query.toLowerCase();

            // Filter static pages
            const filteredPages: SearchResultItem[] = pageSearchData
                .filter(page => page.name.toLowerCase().includes(lowerQuery))
                .map(page => ({ ...page })); // Ensure proper object structure

            // Filter Pokémon
            const filteredPokemon: SearchResultItem[] = minimalPokemonList
                .filter(pokemon =>
                    pokemon.displayName.toLowerCase().includes(lowerQuery) ||
                    pokemon.name.toLowerCase().includes(lowerQuery) || // API name
                    String(pokemon.id).includes(lowerQuery)
                )
                .map(pokemon => ({
                    type: 'pokemon',
                    name: pokemon.displayName,
                    path: `/pokedex/${pokemon.name}`, // Use API name for path
                    id: pokemon.id,
                    apiName: pokemon.name,
                    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`, // Basic sprite
                }));

            setResults([...filteredPages, ...filteredPokemon]);
        } else {
            setResults([]);
        }
        setIsLoading(false);
    }, [query, minimalPokemonList, isLoadingMinimalList]);

    if (isLoading) {
        return <div className="text-center py-10 text-yellow-400 animate-pulse">Searching...</div>;
    }

    if (contextError) {
        return <div className="text-center py-10 text-red-500">Error loading Pokémon data for search: {contextError}</div>;
    }

    if (!query) {
        return <div className="text-center py-10 text-gray-400">Please enter a search term.</div>;
    }

    return (
        <div className="w-full max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-yellow-400 mb-6">
                Search Results for: <span className="text-yellow-200">&quot;{query}&quot;</span> {/* Escaped quotes */}
            </h1>
            {results.length > 0 ? (
                <ul className="space-y-4">
                    {results.map((item, index) => (
                        <li key={`${item.type}-${item.name}-${index}`} className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700/70 transition-colors">
                            <Link href={item.path} className="flex items-center space-x-4 group">
                                {item.type === 'pokemon' && item.sprite && (
                                    <Image src={item.sprite} alt={item.name} width={48} height={48} unoptimized className="rounded-full bg-gray-700 group-hover:scale-110 transition-transform" />
                                )}
                                <div className="flex-1">
                                    <p className="text-lg font-semibold text-yellow-300 group-hover:text-yellow-200 capitalize">
                                        {item.name.replace('-', ' ')}
                                        {item.type === 'pokemon' && item.id && (
                                            <span className="text-sm text-gray-400 ml-2 group-hover:text-gray-300">
                        (#{String(item.id).padStart(4, '0')})
                      </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500 group-hover:text-gray-400">{item.path}</p>
                                </div>
                                <span className="text-xs px-2 py-0.5 rounded-full text-gray-900" style={getTypeChipStyle(item.type === 'pokemon' ? 'Grass' : 'Normal')}> {/* Placeholder type for pages */}
                                    {item.type.toUpperCase()}
                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-gray-400">No results found for &quot;{query}&quot;.</p> /* Escaped quotes */
            )}
        </div>
    );
}

// Wrap with Suspense for useSearchParams
export default function SearchPage() {
    return (
        <Suspense fallback={<div className="text-center py-10 text-yellow-400 animate-pulse">Loading search page...</div>}>
            <main className="min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
                <SearchResultsComponent />
            </main>
        </Suspense>
    );
}
