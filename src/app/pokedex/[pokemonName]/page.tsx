// src/app/pokedex/[pokemonName]/page.tsx
"use client";

import React, { useState, useEffect, useCallback, useRef, JSX } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { POKEMON_TYPES } from '@/lib/pokemonTypes';

interface PokemonPageProps {
    params: {
        pokemonName: string;
    };
}

// --- Data Interfaces ---
interface AbilityInfo { ability: { name: string; url: string }; is_hidden: boolean; }
interface StatInfo {
    base_stat: number;
    stat: { name: string };
    current_width?: string;
    current_color?: string; // For animated background color
}
interface PokemonData {
    id: number; name: string;
    sprites: { other?: { 'official-artwork'?: { front_default: string | null } }; front_default: string | null; };
    types: Array<{ slot: number; type: { name: string; url: string } }>;
    abilities: AbilityInfo[]; stats: StatInfo[]; species: { url: string };
    height: number; weight: number;
}
interface PokemonSpeciesData { evolution_chain: { url: string }; }
interface EvolutionChainLink { species: { name: string; url: string }; evolves_to: EvolutionChainLink[]; }
interface EvolutionChainData { chain: EvolutionChainLink; }
interface TypeEffectivenessEntry { name: string; multiplier: number; }
interface NavLinkInfo { id: number; name: string; displayName: string; }

// --- Client-side Cache for Pokémon Data ---
interface CachedPokemonData {
    data: PokemonData;
    timestamp: number;
}
const pokemonDataCache = new Map<string, CachedPokemonData>();
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

const formatPokemonId = (id: number): string => `#${String(id).padStart(4, '0')}`;
const getTypeChipStyle = (typeName: string): React.CSSProperties => {
    const typeInfo = POKEMON_TYPES.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return typeInfo
        ? { backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' }
        : { backgroundColor: '#777', color: '#fff' };
};

const MAX_STAT_VALUE = 255;
const MAX_POKEMON_ID_FOR_NAV = 1025;

const getStatColor = (base_stat: number): string => {
    if (base_stat < 50) return '#c0392b'; // Darker Red
    if (base_stat < 80) return '#f39c12'; // Orange
    if (base_stat < 110) return '#27ae60'; // Green
    return '#2980b9'; // Blue
};

const fetchPokemonNavInfoById = async (id: number): Promise<NavLinkInfo | null> => {
    if (id <= 0 || id > MAX_POKEMON_ID_FOR_NAV) return null;
    try {
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!res.ok) return null;
        const data = await res.json();
        return { id: data.id, name: data.name, displayName: data.name.replace('-', ' ') };
    } catch { return null; }
};

const fetchPokemonDataByNameOrId = async (identifier: string, isPreload: boolean = false): Promise<PokemonData | null> => {
    const cacheKey = identifier.toLowerCase();
    const cachedEntry = pokemonDataCache.get(cacheKey);

    if (cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_EXPIRY_MS)) {
        if (!isPreload) console.log(`[Cache HIT] Loading ${identifier} from cache.`);
        return cachedEntry.data;
    }
    if (isPreload && cachedEntry) {
        return null;
    }

    if (!isPreload) console.log(`[Cache MISS or EXPIRED] Fetching ${identifier} from API.`);
    else console.log(`[Preloading] Fetching ${identifier} from API.`);

    try {
        const pokemonRes = await fetch(`https://pokeapi.co/api/v2/pokemon/${cacheKey}`);
        if (!pokemonRes.ok) {
            console.error(`API Error: Pokémon "${identifier}" not found. Status: ${pokemonRes.status}`);
            return null;
        }
        const fetchedPokemonData: PokemonData = await pokemonRes.json();

        pokemonDataCache.set(cacheKey, { data: fetchedPokemonData, timestamp: Date.now() });
        if (!isPreload) console.log(`Fetched and cached ${identifier}.`);
        else console.log(`Preloaded and cached ${identifier}.`);

        return fetchedPokemonData;
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error(`Error fetching data for ${identifier}:`, err.message);
        } else {
            console.error(`An unknown error occurred while fetching data for ${identifier}:`, err);
        }
        return null;
    }
};


export default function PokemonDetailPage({ params }: PokemonPageProps) {
    const { pokemonName: currentPokemonIdentifier } = params;
    const [pokemonData, setPokemonData] = useState<PokemonData | null>(null);
    const [animatedStats, setAnimatedStats] = useState<StatInfo[]>([]);
    const [evolutionChain, setEvolutionChain] = useState<EvolutionChainLink | null>(null);
    const [hasMultipleEvoPaths, setHasMultipleEvoPaths] = useState<boolean>(false);
    const [typeEffectiveness, setTypeEffectiveness] = useState<TypeEffectivenessEntry[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prevPokemonLink, setPrevPokemonLink] = useState<NavLinkInfo | null>(null);
    const [nextPokemonLink, setNextPokemonLink] = useState<NavLinkInfo | null>(null);
    const [abilityEffectOnGround, setAbilityEffectOnGround] = useState<string | null>(null);

    const preloadInitiatedRef = useRef(false);

    const fetchPageSpecificDetails = useCallback(async (baseData: PokemonData) => {
        try {
            const speciesRes = await fetch(baseData.species.url);
            if (!speciesRes.ok) throw new Error(`Species data for "${baseData.name}" not found`);
            const fetchedSpeciesData: PokemonSpeciesData = await speciesRes.json();

            if (fetchedSpeciesData.evolution_chain.url) {
                const evolutionRes = await fetch(fetchedSpeciesData.evolution_chain.url);
                if (!evolutionRes.ok) throw new Error(`Evolution chain for "${baseData.name}" not found`);
                const fetchedEvolutionData: EvolutionChainData = await evolutionRes.json();
                setEvolutionChain(fetchedEvolutionData.chain);

                let currentLinkInEvo: EvolutionChainLink | undefined = fetchedEvolutionData.chain;
                setHasMultipleEvoPaths(false);
                while (currentLinkInEvo) {
                    if (currentLinkInEvo.evolves_to.length > 1) {
                        setHasMultipleEvoPaths(true);
                        break;
                    }
                    currentLinkInEvo = currentLinkInEvo.evolves_to[0];
                }
            }

            const typeDetailsPromises = baseData.types.map(typeInfo =>
                fetch(typeInfo.type.url).then(res => res.json())
            );
            const typesData = await Promise.all(typeDetailsPromises);

            const effectivenessMap: Record<string, number> = {};
            POKEMON_TYPES.forEach(pt => effectivenessMap[pt.name.toLowerCase()] = 1);

            typesData.forEach(typeDetail => {
                typeDetail.damage_relations.double_damage_from.forEach((t: {name: string}) => effectivenessMap[t.name.toLowerCase()] *= 2);
                typeDetail.damage_relations.half_damage_from.forEach((t: {name: string}) => effectivenessMap[t.name.toLowerCase()] *= 0.5);
                typeDetail.damage_relations.no_damage_from.forEach((t: {name: string}) => effectivenessMap[t.name.toLowerCase()] *= 0);
            });

            const hasLevitate = baseData.abilities.some(a => a.ability.name.toLowerCase() === 'levitate');
            setAbilityEffectOnGround(null);
            if (hasLevitate && effectivenessMap['ground'] !== 0) {
                effectivenessMap['ground'] = 0;
                setAbilityEffectOnGround("Immune to Ground due to Levitate.");
            }

            const sortedEffectiveness: TypeEffectivenessEntry[] = POKEMON_TYPES.map(type => ({
                name: type.name,
                multiplier: effectivenessMap[type.name.toLowerCase()] ?? 1,
            })).sort((a, b) => b.multiplier - a.multiplier);

            setTypeEffectiveness(sortedEffectiveness);

        } catch (err: unknown) {
            if (err instanceof Error) {
                console.error("Error fetching page-specific details:", err.message);
                setError(`Failed to load some details: ${err.message}`);
            } else {
                console.error("An unknown error occurred while fetching page-specific details:", err);
                setError("An unknown error occurred while loading some details.");
            }
        }
    }, []);


    const loadCurrentPokemonAndPreloadNeighbors = useCallback(async () => {
        if (!currentPokemonIdentifier) return;

        setIsLoading(true);
        setError(null);
        setAnimatedStats([]);
        preloadInitiatedRef.current = false;

        const fetchedPokemonData = await fetchPokemonDataByNameOrId(currentPokemonIdentifier.toLowerCase());

        if (fetchedPokemonData) {
            setPokemonData(fetchedPokemonData);

            // Prepare stats for animation (initial width 0 and red color)
            const initialStats = fetchedPokemonData.stats.map(stat => ({
                ...stat,
                current_width: '0%',
                current_color: '#EF4444' // Start with red (Tailwind's red-500)
            }));
            setAnimatedStats(initialStats);

            await fetchPageSpecificDetails(fetchedPokemonData);

            // Trigger stat animation after a short delay
            setTimeout(() => {
                setAnimatedStats(fetchedPokemonData.stats.map(stat => ({
                    ...stat,
                    current_width: `${Math.min((stat.base_stat / MAX_STAT_VALUE) * 100, 100)}%`,
                    current_color: getStatColor(stat.base_stat) // Target color
                })));
            }, 100);

            setPrevPokemonLink(null);
            setNextPokemonLink(null);

            if (fetchedPokemonData.id > 1) {
                const prevInfo = await fetchPokemonNavInfoById(fetchedPokemonData.id - 1);
                if (prevInfo) {
                    setPrevPokemonLink(prevInfo);
                    if (!pokemonDataCache.has(prevInfo.name.toLowerCase())) {
                        fetchPokemonDataByNameOrId(prevInfo.name.toLowerCase(), true);
                    }
                }
            }
            if (fetchedPokemonData.id < MAX_POKEMON_ID_FOR_NAV) {
                const nextInfo = await fetchPokemonNavInfoById(fetchedPokemonData.id + 1);
                if (nextInfo) {
                    setNextPokemonLink(nextInfo);
                    if (!pokemonDataCache.has(nextInfo.name.toLowerCase())) {
                        fetchPokemonDataByNameOrId(nextInfo.name.toLowerCase(), true);
                    }
                }
            }
            preloadInitiatedRef.current = true;

        } else {
            setError(`Pokémon "${currentPokemonIdentifier}" not found or failed to load.`);
        }
        setIsLoading(false);
    }, [currentPokemonIdentifier, fetchPageSpecificDetails]);

    useEffect(() => {
        loadCurrentPokemonAndPreloadNeighbors();
    }, [loadCurrentPokemonAndPreloadNeighbors]);

    const renderEvolutionChain = (chainLink: EvolutionChainLink | null): JSX.Element[] => {
        if (!chainLink) return [];
        const elements: JSX.Element[] = [];
        const pokemonIdFromUrl = chainLink.species.url.split('/').filter(Boolean).pop();

        elements.push(
            <div key={chainLink.species.name} className="flex flex-col items-center mx-2 text-center">
                <Link href={`/pokedex/${chainLink.species.name.toLowerCase()}`} className="hover:opacity-80 transition-opacity p-2 rounded-lg hover:bg-gray-600">
                    {pokemonIdFromUrl && (
                        <Image
                            src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonIdFromUrl}.png`}
                            alt={chainLink.species.name}
                            width={96}
                            height={96}
                            unoptimized
                            className="bg-gray-700/50 rounded-full p-1 mb-1"
                        />
                    )}
                    <p className="capitalize text-yellow-400 text-sm">{chainLink.species.name.replace('-', ' ')}</p>
                </Link>
            </div>
        );

        if (chainLink.evolves_to && chainLink.evolves_to.length > 0) {
            elements.push(
                <div key={`${chainLink.species.name}-arrow`} className="text-3xl text-yellow-500 mx-1 sm:mx-2 self-center animate-pulse-fast">&rarr;</div>
            );
            elements.push(...renderEvolutionChain(chainLink.evolves_to[0]));
        }
        return elements;
    };

    const regularAbilities = pokemonData?.abilities.filter(a => !a.is_hidden) || [];
    const hiddenAbility = pokemonData?.abilities.find(a => a.is_hidden);

    // --- Loading and Error States ---
    if (isLoading && !pokemonData) {
        return (
            <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4">
                <p className="text-2xl animate-pulse">Loading Pokémon data for {currentPokemonIdentifier}...</p>
            </main>
        );
    }
    if (error) return (
        <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-red-500 p-4">
            <p className="text-2xl mb-4">Error!</p>
            <p className="text-center mb-4">{error}</p>
            <Link href="/pokedex" className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">
                Back to Pokédex List
            </Link>
        </main>
    );
    if (!pokemonData && !isLoading) {
        return (
            <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4">
                <p className="text-2xl mb-4">Pokémon not found.</p>
                <Link href="/pokedex" className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">
                    Back to Pokédex List
                </Link>
            </main>
        );
    }

    // --- Main Render ---
    return (
        <main className="min-h-[calc(100vh-80px)] bg-gray-800 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
            <div className="w-full max-w-5xl flex justify-between items-center mb-6">
                {prevPokemonLink ? (
                    <Link href={`/pokedex/${prevPokemonLink.name}`} className="text-yellow-400 hover:text-yellow-200 transition-colors py-2 px-4 bg-gray-700 rounded-lg shadow hover:shadow-md flex items-center text-sm sm:text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        <span className="ml-2 capitalize">{prevPokemonLink.displayName} ({formatPokemonId(prevPokemonLink.id)})</span>
                    </Link>
                ) : <div className="w-1/4 opacity-0 pointer-events-none md:w-auto"></div>}

                {pokemonData && (
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold capitalize text-center text-yellow-400 mx-2">
                        {pokemonData.name.replace('-', ' ')} <span className="text-xl md:text-2xl text-gray-400">{formatPokemonId(pokemonData.id)}</span>
                    </h1>
                )}

                {nextPokemonLink ? (
                    <Link href={`/pokedex/${nextPokemonLink.name}`} className="text-yellow-400 hover:text-yellow-200 transition-colors py-2 px-4 bg-gray-700 rounded-lg shadow hover:shadow-md flex items-center text-sm sm:text-base">
                        <span className="mr-2 capitalize">{nextPokemonLink.displayName} ({formatPokemonId(nextPokemonLink.id)})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </Link>
                ) : <div className="w-1/4 opacity-0 pointer-events-none md:w-auto"></div>}
            </div>

            {!pokemonData && isLoading && (
                <div className="flex items-center justify-center min-h-[50vh] w-full">
                    <p className="text-2xl animate-pulse text-yellow-400">Loading Details...</p>
                </div>
            )}

            {pokemonData && (
                <>
                    <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="md:col-span-1 bg-gray-700 p-6 rounded-xl shadow-xl flex flex-col items-center">
                            {/* ... Image, Types, Abilities section ... */}
                            <Image
                                src={pokemonData.sprites.other?.['official-artwork']?.front_default || pokemonData.sprites.front_default || `https://placehold.co/256x256/4A5568/E2E8F0?text=${pokemonData.name}`}
                                alt={pokemonData.name}
                                width={256}
                                height={256}
                                className="object-contain mb-4"
                                priority
                            />
                            <div className="flex space-x-2 mb-4">
                                {pokemonData.types.map(({ type }) => (
                                    <span key={type.name} className="px-4 py-1.5 text-base font-bold rounded-full shadow-md" style={getTypeChipStyle(type.name)}>
                    {type.name.toUpperCase()}
                  </span>
                                ))}
                            </div>
                            <div className="w-full text-left mt-2 bg-gray-600/50 p-3 rounded-lg">
                                <h3 className="text-xl font-semibold text-yellow-400 mb-2 text-center border-b border-gray-500 pb-1">Abilities</h3>
                                <div className="grid grid-cols-2 gap-x-4">
                                    <div>
                                        {regularAbilities.map(({ ability }) => (
                                            <p key={ability.name} className={`capitalize text-gray-200 py-0.5 hover:text-yellow-300 cursor-pointer transition-colors`} title={`Ability: ${ability.name.replace('-', ' ')}`}>
                                                {ability.name.replace('-', ' ')}
                                            </p>
                                        ))}
                                    </div>
                                    <div>
                                        {hiddenAbility && (
                                            <>
                                                <p className={`capitalize text-yellow-400 py-0.5 italic hover:text-yellow-200 cursor-pointer transition-colors`} title={`Hidden Ability: ${hiddenAbility.ability.name.replace('-', ' ')}`}>
                                                    {hiddenAbility.ability.name.replace('-', ' ')}
                                                </p>
                                                <p className="text-xs text-gray-400">(Hidden)</p>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="md:col-span-2 bg-gray-700 p-6 rounded-xl shadow-xl">
                            <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Base Stats</h3>
                            {(animatedStats.length > 0 ? animatedStats : pokemonData.stats).map(({ stat, base_stat, current_width, current_color }) => (
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
                                                backgroundColor: current_color || '#EF4444', // Default to red if no color set
                                                transitionProperty: 'width, background-color', // Animate both width and color
                                                transitionDuration: '1.5s', // Duration for both animations
                                                transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)', // Custom ease-in-out
                                                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)',
                                            }}
                                        >
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="mt-5 pt-3 border-t border-gray-600 flex justify-between font-bold text-lg">
                                <span className="text-yellow-400">Total:</span>
                                <span className="text-gray-100">{pokemonData.stats.reduce((sum, s) => sum + s.base_stat, 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* ... Type Effectiveness and Evolution Chain sections ... */}
                    {typeEffectiveness ? (
                        <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl mb-8">
                            <h3 className="text-2xl font-semibold text-yellow-400 mb-2 border-b-2 border-yellow-500 pb-2">Type Effectiveness</h3>
                            <p className="text-sm text-gray-400 mb-4">Damage taken from attacking types:</p>
                            {['4x', '2x', '1x', '½x', '¼x', '0x'].map(group => {
                                const groupMultiplier =
                                    group === '4x' ? 4 :
                                        group === '2x' ? 2 :
                                            group === '1x' ? 1 :
                                                group === '½x' ? 0.5 :
                                                    group === '¼x' ? 0.25 : 0;

                                const typesInGroup = typeEffectiveness.filter(t => t.multiplier === groupMultiplier);
                                if (typesInGroup.length === 0 && !(group === '0x' && abilityEffectOnGround && !typeEffectiveness.some(t => t.name.toLowerCase() === 'ground' && t.multiplier === 0))) return null;

                                return (
                                    <div key={group} className="mb-4">
                                        <p className="font-semibold text-yellow-500 mb-1.5">{group} Damage:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {typesInGroup.map(type => (
                                                <span
                                                    key={type.name}
                                                    className="px-3 py-1 text-xs font-bold rounded-sm shadow-sm"
                                                    style={getTypeChipStyle(type.name)}
                                                >
                           {type.name.toUpperCase()}
                                                    {type.name.toLowerCase() === 'ground' && abilityEffectOnGround && groupMultiplier !== 0 ? <span className="text-red-400 ml-1">*</span> : ''}
                         </span>
                                            ))}
                                            {group === '0x' && abilityEffectOnGround && !typesInGroup.some(t => t.name.toLowerCase() === 'ground') && (
                                                <span
                                                    key="ground-levitate"
                                                    className="px-3 py-1 text-xs font-bold rounded-sm shadow-sm"
                                                    style={getTypeChipStyle('Ground')}
                                                >
                           GROUND<span className="text-red-400 ml-1">*</span>
                         </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {abilityEffectOnGround && (
                                <p className="text-xs text-yellow-600 mt-2">* {abilityEffectOnGround}</p>
                            )}
                        </div>
                    ) : <div className="w-full max-w-5xl text-center py-4">Calculating type effectiveness...</div>}

                    {evolutionChain ? (
                        <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl">
                            <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">
                                Evolution Chain {hasMultipleEvoPaths && <span className="text-yellow-500" title="This Pokémon or its evolutions might have multiple evolution paths. Only one is shown.">*</span>}
                            </h3>
                            <div className="flex flex-wrap justify-center items-center gap-2 sm:gap-4">
                                {renderEvolutionChain(evolutionChain)}
                            </div>
                        </div>
                    ) : <div className="w-full max-w-5xl text-center py-4">Loading evolution chain...</div>}
                </>
            )}
        </main>
    );
}
