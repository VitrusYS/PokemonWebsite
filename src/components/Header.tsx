// src/components/Header.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { usePokedex } from '@/contexts/PokedexContext';

interface SearchSuggestion {
    type: 'page' | 'pokemon';
    name: string;
    path: string;
    id?: number;
    pokemonApiName?: string;
    displaySuffix?: string;
}

// Static page suggestions (Home link removed)
const pageSuggestionsData: Omit<SearchSuggestion, 'id' | 'pokemonApiName' | 'displaySuffix'>[] = [
    { type: 'page', name: 'Pokémon Guesser', path: '/guesser' },
    { type: 'page', name: 'Pokédex List', path: '/pokedex' },
    { type: 'page', name: 'Blaze Black 2 Redux Pokédex', path: '/bb2r/pokedex' },
];

const SiteHeader = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState<number>(-1); // For keyboard navigation
    const router = useRouter();
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null); // Ref for the search input
    const { minimalPokemonList, isLoadingMinimalList } = usePokedex();

    useEffect(() => {
        if (searchTerm.trim() === '') {
            setSuggestions([]);
            setActiveIndex(-1); // Reset active index when search term is empty
            return;
        }

        const lowerSearchTerm = searchTerm.toLowerCase();

        const filteredPages = pageSuggestionsData.filter(page =>
            page.name.toLowerCase().includes(lowerSearchTerm)
        );

        let filteredPokemon: SearchSuggestion[] = [];
        if (!isLoadingMinimalList && minimalPokemonList) {
            filteredPokemon = minimalPokemonList
                .filter(pokemon =>
                    pokemon.displayName.toLowerCase().includes(lowerSearchTerm) ||
                    pokemon.name.toLowerCase().includes(lowerSearchTerm) ||
                    String(pokemon.id).includes(lowerSearchTerm)
                )
                .map(pokemon => ({
                    type: 'pokemon',
                    name: pokemon.displayName,
                    path: `/pokedex/${pokemon.name}`,
                    id: pokemon.id,
                    pokemonApiName: pokemon.name,
                    displaySuffix: `(#${String(pokemon.id).padStart(4, '0')})`
                }));
        }

        setSuggestions([...filteredPages, ...filteredPokemon].slice(0, 10));
        setActiveIndex(-1); // Reset active index when suggestions change
    }, [searchTerm, minimalPokemonList, isLoadingMinimalList]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
                setActiveIndex(-1);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchContainerRef]);

    const navigateToSearchPage = useCallback((term: string) => {
        router.push(`/search?q=${encodeURIComponent(term.trim())}`);
        setSearchTerm('');
        setSuggestions([]);
        setIsSearchFocused(false);
        setActiveIndex(-1);
    }, [router]);

    const handleSuggestionClick = useCallback((path: string) => {
        router.push(path);
        setSearchTerm('');
        setSuggestions([]);
        setIsSearchFocused(false);
        setActiveIndex(-1);
    }, [router]);

    const handleSearchSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
        if (e) e.preventDefault();
        const termToSearch = searchTerm.trim();
        if (termToSearch === '') return;

        if (activeIndex >= 0 && activeIndex < suggestions.length) {
            // If a suggestion is actively selected by keyboard, navigate to it
            handleSuggestionClick(suggestions[activeIndex].path);
        } else if (suggestions.length > 0 && suggestions[0].name.toLowerCase() === termToSearch.toLowerCase()) {
            // Fallback: if the first suggestion is an exact match (case-insensitive)
            handleSuggestionClick(suggestions[0].path);
        } else {
            // Otherwise, navigate to the general search page
            navigateToSearchPage(termToSearch);
        }
    }, [searchTerm, suggestions, activeIndex, handleSuggestionClick, navigateToSearchPage]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isSearchFocused || suggestions.length === 0) {
            // If enter is pressed and there are no suggestions, but there is a search term, submit to search page
            if (e.key === 'Enter' && searchTerm.trim() !== '') {
                e.preventDefault(); // Prevent form submission if we handle it manually
                navigateToSearchPage(searchTerm.trim());
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault(); // Prevent cursor from moving in input
                setActiveIndex(prevIndex => (prevIndex + 1) % suggestions.length);
                break;
            case 'ArrowUp':
                e.preventDefault(); // Prevent cursor from moving in input
                setActiveIndex(prevIndex => (prevIndex - 1 + suggestions.length) % suggestions.length);
                break;
            case 'Enter':
                e.preventDefault(); // Important to prevent default form submission
                if (activeIndex >= 0 && activeIndex < suggestions.length) {
                    handleSuggestionClick(suggestions[activeIndex].path);
                } else {
                    // If no specific item is selected via keyboard but suggestions are open,
                    // default to submitting the current search term for a general search.
                    handleSearchSubmit();
                }
                break;
            case 'Escape':
                setSearchTerm('');
                setSuggestions([]);
                setIsSearchFocused(false);
                setActiveIndex(-1);
                searchInputRef.current?.blur(); // Remove focus from input
                break;
            default:
                break;
        }
    };

    // Scroll active suggestion into view
    useEffect(() => {
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
            const activeElement = document.getElementById(`suggestion-${activeIndex}`);
            activeElement?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex, suggestions]);


    return (
        <header className="bg-black shadow-lg sticky top-0 z-50">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Top">
                <div className="w-full py-3 flex items-center justify-between border-b border-yellow-500">
                    <div className="flex items-center">
                        <Link href="/" className="text-2xl font-bold text-yellow-400 hover:text-yellow-300 transition-colors">
                            <span className="sr-only">Vitrus</span>
                            Vitrus
                        </Link>
                    </div>

                    <div className="hidden lg:flex lg:items-center space-x-4 ml-10">
                        <Link
                            href="/guesser"
                            className="text-base font-medium text-yellow-300 hover:text-yellow-200 transition-colors px-3 py-2 rounded-md hover:bg-gray-800"
                        >
                            Pokémon Guesser
                        </Link>
                        <Link
                            href="/pokedex"
                            className="text-base font-medium text-yellow-300 hover:text-yellow-200 transition-colors px-3 py-2 rounded-md hover:bg-gray-800"
                        >
                            Pokédex
                        </Link>
                    </div>

                    <div className="flex-1 flex justify-end ml-6">
                        <div className="max-w-md w-full lg:max-w-xs" ref={searchContainerRef}>
                            <form onSubmit={handleSearchSubmit} className="relative" role="search">
                                <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center">
                                    <Search className="h-5 w-5 text-gray-400" aria-hidden="true" />
                                </div>
                                <input
                                    ref={searchInputRef} // Assign ref to input
                                    id="search"
                                    name="search"
                                    className="block w-full bg-gray-800 border border-transparent rounded-md py-2 pl-10 pr-10 text-sm placeholder-gray-400 focus:outline-none focus:bg-gray-700 focus:border-yellow-500 focus:ring-yellow-500 focus:text-gray-100 sm:text-sm transition-colors"
                                    placeholder="Search Pokémon or Pages..."
                                    type="search"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onFocus={() => setIsSearchFocused(true)}
                                    onKeyDown={handleKeyDown} // Add keydown handler
                                    autoComplete="off"
                                    role="combobox"
                                    aria-expanded={isSearchFocused && suggestions.length > 0}
                                    aria-controls="search-suggestions-list"
                                    aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        aria-label="Clear search"
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                        onClick={() => { setSearchTerm(''); setSuggestions([]); setActiveIndex(-1); }}
                                    >
                                        <X className="h-5 w-5 text-gray-400 hover:text-gray-200" aria-hidden="true" />
                                    </button>
                                )}
                            </form>
                            {isSearchFocused && searchTerm.trim() && (suggestions.length > 0 || isLoadingMinimalList) && (
                                <div
                                    id="search-suggestions-list"
                                    role="listbox"
                                    className="absolute mt-1 w-full max-w-md lg:max-w-xs rounded-md bg-gray-800 shadow-lg overflow-hidden z-20 border border-gray-700 max-h-80 overflow-y-auto right-0 lg:right-auto"
                                >
                                    <ul>
                                        {isLoadingMinimalList && searchTerm.length > 1 && (
                                            <li role="option" aria-live="polite">
                                                <div className="px-4 py-2 text-sm text-gray-400">Loading Pokémon suggestions...</div>
                                            </li>
                                        )}
                                        {suggestions.map((suggestion, index) => (
                                            <li
                                                key={`${suggestion.type}-${suggestion.name}-${index}`}
                                                id={`suggestion-${index}`} // ID for aria-activedescendant
                                                role="option"
                                                aria-selected={activeIndex === index}
                                                className={`${activeIndex === index ? 'bg-yellow-600 text-gray-900' : 'text-gray-200 hover:bg-yellow-500 hover:text-gray-900'}`}
                                            >
                                                <button
                                                    onClick={() => handleSuggestionClick(suggestion.path)}
                                                    className="block w-full text-left px-4 py-2 text-sm transition-colors"
                                                >
                                                    {suggestion.name}
                                                    {suggestion.displaySuffix && <span className={`ml-1 text-xs ${activeIndex === index ? 'text-gray-700' : 'text-gray-400'}`}>{suggestion.displaySuffix}</span>}
                                                </button>
                                            </li>
                                        ))}
                                        {searchTerm.trim() !== '' && !isLoadingMinimalList && suggestions.length === 0 && (
                                            <li role="option">
                                                <div className="px-4 py-2 text-sm text-gray-400">No matching Pokémon or pages found.</div>
                                            </li>
                                        )}
                                        {searchTerm.trim() !== '' && ( // Always show this option if there's a search term
                                            <li>
                                                <button
                                                    onClick={() => navigateToSearchPage(searchTerm)}
                                                    className="block w-full text-left px-4 py-3 text-sm text-yellow-400 bg-gray-700 hover:bg-yellow-600 hover:text-gray-900 transition-colors font-semibold"
                                                >
                                                    Search for pages containing &quot;{searchTerm.trim()}&quot;
                                                </button>
                                            </li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    );
};

export default SiteHeader;
