// src/app/bb2r/pokedex/[pokemonName]/page.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { POKEMON_TYPES } from '@/lib/pokemonTypes';

// --- Data Interfaces ---
interface BB2RPokemon {
    id: number;
    name: string;
    displayName: string;
    stats: { hp: number; attack: number; defense: number; "special-attack": number; "special-defense": number; speed: number; };
    sprites: { default: string | null; shiny: string | null; };
    height: number; weight: number;
    changes_bb2r: { stats_changed?: boolean; abilities_changed?: boolean; types_changed?: boolean; evolution_changed?: boolean; moves_changed?: boolean; };
    final_abilities: string[];
    final_types: string[];
}

interface BB2REvolutionOverride { // From your blazeblack2_redux_evolution_data.json
    pokemon_id: string;
    pokemon_name: string; // This is the displayName of the Pokémon that evolves
    new_methods: string[];
}

interface PokemonPageProps { params: { pokemonName: string }; }

// --- PokeAPI Specific Interfaces ---
interface PokeApiSpecies { url: string; name: string; }
interface PokeApiEvolutionDetail {
    item: PokeApiSpecies | null;
    trigger: PokeApiSpecies | null;
    gender: number | null;
    held_item: PokeApiSpecies | null;
    known_move: PokeApiSpecies | null;
    known_move_type: PokeApiSpecies | null;
    location: PokeApiSpecies | null;
    min_affection: number | null;
    min_beauty: number | null;
    min_happiness: number | null;
    min_level: number | null;
    needs_overworld_rain: boolean;
    party_species: PokeApiSpecies | null;
    party_type: PokeApiSpecies | null;
    relative_physical_stats: number | null;
    time_of_day: string;
    trade_species: PokeApiSpecies | null;
    turn_upside_down: boolean;
}
interface PokeApiChainLink {
    is_baby: boolean;
    species: PokeApiSpecies;
    evolution_details: PokeApiEvolutionDetail[];
    evolves_to: PokeApiChainLink[];
}
interface PokeApiEvolutionChain {
    id: number;
    baby_trigger_item: PokeApiSpecies | null;
    chain: PokeApiChainLink;
}
interface PokeApiPokemonSpeciesData {
    evolution_chain: { url: string };
}

// --- Helper function to parse your BB2R evolution strings ---
interface ParsedBB2RMethod {
    targetPokemonName: string | null;
    methodText: string;
}

const parseBB2REvolutionString = (method: string): ParsedBB2RMethod => {
    const evolutionRegex = /Now evolves into ([\w\s'-.]+?)(?: (?:at Level|via the use of a|by leveling up|via the use of an)) (.*)/i;
    const match = method.match(evolutionRegex);

    if (match && match[1]) {
        const target = match[1].trim();
        const originalFullMethod = method.substring(method.toLowerCase().indexOf(target.toLowerCase()) + target.length).trim();
        return { targetPokemonName: target, methodText: originalFullMethod };
    }
    const simpleMatch = method.match(/Now evolves into ([\w\s'-.]+?) (.*)/i);
    if (simpleMatch && simpleMatch[1]) {
        return { targetPokemonName: simpleMatch[1].trim(), methodText: simpleMatch[2].trim() };
    }
    return { targetPokemonName: null, methodText: method };
};


// --- Helper Functions (formatPokemonId, getTypeChipStyle, etc.) ---
const formatPokemonId = (id: number): string => `#${String(id).padStart(4, '0')}`;
const getTypeChipStyle = (typeName: string): React.CSSProperties => {
    const typeInfo = POKEMON_TYPES.find(t => t.name.toLowerCase() === typeName.toLowerCase());
    return typeInfo ? { backgroundColor: typeInfo.color, color: typeInfo.textColor || '#000' } : { backgroundColor: '#A8A77A', color: '#FFF' };
};
const MAX_STAT_VALUE = 255;
const getStatColor = (base_stat: number): string => {
    if (base_stat < 50) return '#F08030'; if (base_stat < 80) return '#F8D030';
    if (base_stat < 110) return '#78C850'; if (base_stat < 140) return '#6890F0';
    return '#A040A0';
};

const formatPokeApiEvolutionDetails = (details: PokeApiEvolutionDetail[]): string => {
    if (!details || details.length === 0) return "Special Condition";
    const detail = details[0];
    let methodParts: string[] = [];

    if (detail.trigger?.name === "level-up") {
        if (detail.min_level) methodParts.push(`Lvl ${detail.min_level}`);
        else methodParts.push("Level Up");
        if (detail.min_happiness) methodParts.push(`High Happiness`);
        if (detail.known_move) methodParts.push(`knows ${detail.known_move.name.replace(/-/g, ' ')}`);
        if (detail.time_of_day && detail.time_of_day !== "") methodParts.push(detail.time_of_day === "day" ? "Daytime" : "Nighttime");
        if (detail.location) methodParts.push(`at ${detail.location.name.replace(/-/g, ' ')}`);
        if (detail.held_item) methodParts.push(`holds ${detail.held_item.name.replace(/-/g, ' ')}`);
    } else if (detail.trigger?.name === "trade") {
        methodParts.push("Trade");
        if (detail.held_item) methodParts.push(`holds ${detail.held_item.name.replace(/-/g, ' ')}`);
        if (detail.trade_species) methodParts.push(`for ${detail.trade_species.name.replace(/-/g, ' ')}`);
    } else if (detail.trigger?.name === "use-item") {
        if (detail.item) methodParts.push(`Use ${detail.item.name.replace(/-/g, ' ')}`);
        else methodParts.push("Use Item");
    } else {
        methodParts.push(detail.trigger?.name ? detail.trigger.name.replace(/-/g, ' ') : "Special");
    }
    if (detail.gender === 1) methodParts.push("(♀)");
    if (detail.gender === 2) methodParts.push("(♂)");
    if (detail.needs_overworld_rain) methodParts.push("in Rain");

    return methodParts.join(', ').trim();
};


export default function BB2RPokemonDetailPage({ params }: PokemonPageProps) {
    const { pokemonName: currentPokemonIdentifier } = params;

    const [pokemonData, setPokemonData] = useState<BB2RPokemon | null>(null);
    const [bb2rEvolutionOverrides, setBb2rEvolutionOverrides] = useState<BB2REvolutionOverride | null>(null);
    const [pokeApiEvolutionChain, setPokeApiEvolutionChain] = useState<PokeApiChainLink | null>(null);
    const [animatedStats, setAnimatedStats] = useState<Array<{stat: {name: string}, base_stat: number, current_width?: string, current_color?: string}>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [prevPokemonLink, setPrevPokemonLink] = useState<BB2RPokemon | null>(null);
    const [nextPokemonLink, setNextPokemonLink] = useState<BB2RPokemon | null>(null);
    const [fullPokedexList, setFullPokedexList] = useState<BB2RPokemon[]>([]);
    const [allBb2rEvoOverridesFromFile, setAllBb2rEvoOverridesFromFile] = useState<BB2REvolutionOverride[]>([]);

    const fetchAllData = useCallback(async (identifier: string) => {
        setIsLoading(true);
        setError(null);
        setPokemonData(null);
        setBb2rEvolutionOverrides(null);
        setPokeApiEvolutionChain(null);
        setAnimatedStats([]);

        try {
            const bb2rListResponse = await fetch('/data/blazeblack2_redux_pokemon_data.json');
            if (!bb2rListResponse.ok) throw new Error('Failed to fetch BB2R Pokémon list.');
            const allBb2rPokemon: BB2RPokemon[] = await bb2rListResponse.json();
            setFullPokedexList(allBb2rPokemon);

            const foundPokemon = allBb2rPokemon.find(p => p.name.toLowerCase() === identifier.toLowerCase() || String(p.id) === identifier);
            if (!foundPokemon) throw new Error(`Pokémon "${identifier}" not found in BB2R data.`);

            setPokemonData(foundPokemon);

            const initialStats = foundPokemon.stats ? Object.entries(foundPokemon.stats).map(([name, value]) => ({ stat: { name }, base_stat: value, current_width: '0%', current_color: getStatColor(0) })) : [];
            setAnimatedStats(initialStats);

            setTimeout(() => {
                const currentPokemonForAnimation = allBb2rPokemon.find(p => p.id === foundPokemon.id);
                if (currentPokemonForAnimation && currentPokemonForAnimation.stats) {
                    setAnimatedStats(Object.entries(currentPokemonForAnimation.stats).map(([name, value]) => ({ stat: { name }, base_stat: value, current_width: `${Math.min((value / MAX_STAT_VALUE) * 100, 100)}%`, current_color: getStatColor(value) })));
                }
            }, 100);

            const currentIndex = allBb2rPokemon.findIndex(p => p.id === foundPokemon.id);
            setPrevPokemonLink(currentIndex > 0 ? allBb2rPokemon[currentIndex - 1] : null);
            setNextPokemonLink(currentIndex < allBb2rPokemon.length - 1 ? allBb2rPokemon[currentIndex + 1] : null);

            const specificOverride = allBb2rEvoOverridesFromFile.find(evo => evo.pokemon_name.toLowerCase() === foundPokemon.displayName.toLowerCase());
            if (specificOverride) {
                setBb2rEvolutionOverrides(specificOverride);
            }

            const speciesResponse = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${foundPokemon.id}/`);
            if (!speciesResponse.ok) {
                console.warn(`Could not fetch species data from PokeAPI for ${foundPokemon.displayName}.`);
            } else {
                const speciesData: PokeApiPokemonSpeciesData = await speciesResponse.json();
                if (speciesData.evolution_chain?.url) {
                    const evolutionChainResponse = await fetch(speciesData.evolution_chain.url);
                    if (evolutionChainResponse.ok) {
                        const evolutionChainData: PokeApiEvolutionChain = await evolutionChainResponse.json();
                        setPokeApiEvolutionChain(evolutionChainData.chain);
                    } else console.warn('Could not fetch evolution chain from PokeAPI.');
                } else console.warn('No evolution chain URL in species data.');
            }
        } catch (err: unknown)  {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
        } finally {
            setIsLoading(false);
        }
    }, [allBb2rEvoOverridesFromFile]);

    useEffect(() => {
        const fetchOverrides = async () => {
            try {
                const res = await fetch('/data/blazeblack2_redux_evolution_data.json');
                if (res.ok) {
                    const data: BB2REvolutionOverride[] = await res.json();
                    setAllBb2rEvoOverridesFromFile(data);
                } else {
                    console.warn('Could not fetch BB2R evolution override data file. Proceeding without overrides.');
                    setAllBb2rEvoOverridesFromFile([]);
                }
            } catch (e) {
                console.error("Failed to fetch all BB2R evo overrides", e);
                setAllBb2rEvoOverridesFromFile([]);
            }
        };
        fetchOverrides();
    }, []);

    useEffect(() => {
        if (currentPokemonIdentifier) {
            if (allBb2rEvoOverridesFromFile) {
                fetchAllData(currentPokemonIdentifier as string);
            }
        }
    }, [currentPokemonIdentifier, allBb2rEvoOverridesFromFile, fetchAllData]);


    const renderEvolutionStage = (chainLink: PokeApiChainLink | null): JSX.Element | null => {
        if (!chainLink) return null;

        const pokeApiSpeciesName = chainLink.species.name;
        const bb2rPokemonInfo = fullPokedexList.find(p => p.name.toLowerCase() === pokeApiSpeciesName.toLowerCase());

        const currentPokemonCard = (
            <div className="flex flex-col items-center text-center mx-1 my-1 p-3 bg-gray-700/60 rounded-lg shadow-md min-w-[120px] max-w-[140px] shrink-0">
                <Link
                    href={bb2rPokemonInfo ? `/bb2r/pokedex/${bb2rPokemonInfo.name}` : `/pokedex/${pokeApiSpeciesName}`}
                    className="hover:opacity-80 transition-opacity group flex flex-col items-center"
                >
                    {/* Sprite container: fixed size circle, relative positioning for the Image */}
                    <div className="w-20 h-20 bg-gray-600/75 rounded-full relative p-1 mb-2 group-hover:ring-2 group-hover:ring-yellow-400 transition-all">
                        <Image
                            src={bb2rPokemonInfo?.sprites?.default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${chainLink.species.url.split('/')[6]}.png`}
                            alt={bb2rPokemonInfo?.displayName || pokeApiSpeciesName}
                            layout="fill" // Fill the parent div (the 20x20 circle)
                            objectFit="contain" // Ensure aspect ratio and containment
                            className="image-pixelated" // Keep pixelated style
                            unoptimized
                        />
                    </div>
                    <p className="capitalize text-yellow-400 text-xs font-semibold group-hover:underline break-words">
                        {bb2rPokemonInfo?.displayName || pokeApiSpeciesName.replace(/-/g, ' ')}
                    </p>
                </Link>
                {bb2rPokemonInfo && (
                    <div className="flex justify-center items-center gap-1 mt-1 w-full">
                        {bb2rPokemonInfo.final_types.map(type => (
                            <span key={type} className="px-1.5 py-0.5 text-[10px] font-bold rounded-sm shadow-sm whitespace-nowrap" style={getTypeChipStyle(type)}>
                                {type.toUpperCase()}
                            </span>
                        ))}
                    </div>
                )}
            </div>
        );

        if (!chainLink.evolves_to || chainLink.evolves_to.length === 0) {
            return currentPokemonCard;
        }

        const evolutionPathsElements = chainLink.evolves_to.map((nextStageLink, index) => {
            let evolutionMethodText = formatPokeApiEvolutionDetails(nextStageLink.evolution_details);
            const evolvingFromPokeApiName = chainLink.species.name;
            const evolvingToPokeApiName = nextStageLink.species.name;

            const evolvingFromBb2rData = fullPokedexList.find(p => p.name.toLowerCase() === evolvingFromPokeApiName.toLowerCase());
            if (evolvingFromBb2rData && allBb2rEvoOverridesFromFile) {
                const overridesForEvolvingPokemon = allBb2rEvoOverridesFromFile.find(
                    (o: BB2REvolutionOverride) => o.pokemon_name.toLowerCase() === evolvingFromBb2rData.displayName.toLowerCase()
                );
                if (overridesForEvolvingPokemon) {
                    overridesForEvolvingPokemon.new_methods.forEach(bb2r_method_string => {
                        const parsedBb2r = parseBB2REvolutionString(bb2r_method_string);
                        if (parsedBb2r.targetPokemonName && parsedBb2r.targetPokemonName.toLowerCase() === evolvingToPokeApiName.toLowerCase()) {
                            evolutionMethodText = parsedBb2r.methodText;
                        }
                    });
                }
            }

            const arrowAndMethod = (
                <div className="flex flex-col items-center justify-center text-center px-1 py-1 shrink-0 w-24 self-center">
                    <div className="text-xl text-yellow-500">&rarr;</div>
                    <p className="text-[10px] leading-tight text-gray-300 mt-0.5 break-words">{evolutionMethodText}</p>
                </div>
            );

            const nextEvolutionTree = renderEvolutionStage(nextStageLink);

            return (
                <div key={`${pokeApiSpeciesName}-to-${nextStageLink.species.name}-${index}`} className="flex flex-row items-center">
                    {arrowAndMethod}
                    {nextEvolutionTree}
                </div>
            );
        });

        if (chainLink.evolves_to.length === 1) {
            // Linear evolution: Pokemon -> Arrow/Method -> Next Stage
            return (
                <div className="flex flex-row items-center">
                    {currentPokemonCard}
                    {evolutionPathsElements[0]} {/* This already contains arrow + next stage */}
                </div>
            );
        } else {
            // Branched evolution: Pokemon on left, stack of (Arrow/Method -> Next Stage) on right
            return (
                // Ensure the current Pokemon card is vertically centered with the start of the branches.
                // items-center should align Kirlia (currentPokemonCard) with the vertical center of the branching column.
                <div className="flex flex-row items-center"> {/* MODIFIED: items-start to items-center */}
                    {currentPokemonCard}
                    {/* This inner div handles the vertical stacking of individual branches. */}
                    {/* items-start here is correct to align each branch from its top. */}
                    <div className="flex flex-col items-start ml-2 pl-2 border-l-2 border-gray-600 space-y-2 py-1">
                        {evolutionPathsElements}
                    </div>
                </div>
            );
        }
    };

    if (isLoading) return <main className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4"><p className="text-2xl animate-pulse">Loading BB2R Pokémon data...</p></main>;
    if (error) return <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-red-500 p-4"><p className="text-2xl mb-4">Error!</p><p className="text-center mb-4">{error}</p><Link href="/bb2r/pokedex" className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">Back to BB2R Pokédex List</Link></main>;
    if (!pokemonData) return <main className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-gray-900 text-yellow-400 p-4"><p className="text-2xl mb-4">Pokémon not found.</p><Link href="/bb2r/pokedex" className="px-6 py-2 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-colors">Back to BB2R Pokédex List</Link></main>;


    const regularAbilities = pokemonData.final_abilities.slice(0, pokemonData.final_abilities.length > 2 && POKEMON_TYPES.find(t => t.name.toLowerCase() === pokemonData.final_abilities[1]?.toLowerCase()) ? 1 : 2).filter(ab => ab);
    const hiddenAbility = pokemonData.final_abilities.length > 2 ? pokemonData.final_abilities[2] :
        (pokemonData.final_abilities.length === 2 && !POKEMON_TYPES.find(t => t.name.toLowerCase() === pokemonData.final_abilities[1]?.toLowerCase()) && pokemonData.final_abilities[0].toLowerCase() !== pokemonData.final_abilities[1].toLowerCase()) ? pokemonData.final_abilities[1] : null;

    return (
        <main className="min-h-[calc(100vh-80px)] bg-gray-800 text-yellow-300 p-4 md:p-8 flex flex-col items-center">
            {/* Navigation Section */}
            <div className="w-full max-w-5xl flex justify-between items-center mb-6">
                {prevPokemonLink ? (
                    <Link href={`/bb2r/pokedex/${prevPokemonLink.name}`} className="text-yellow-400 hover:text-yellow-200 transition-colors py-2 px-4 bg-gray-700 rounded-lg shadow hover:shadow-md flex items-center text-sm sm:text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                        <span className="ml-2 capitalize">{prevPokemonLink.displayName} ({formatPokemonId(prevPokemonLink.id)})</span>
                    </Link>
                ) : <div className="w-1/3 opacity-0 pointer-events-none md:w-auto"></div>}
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold capitalize text-center text-yellow-400 mx-2">
                    {pokemonData.displayName} <span className="text-xl md:text-2xl text-gray-400">{formatPokemonId(pokemonData.id)}</span>
                </h1>
                {nextPokemonLink ? (
                    <Link href={`/bb2r/pokedex/${nextPokemonLink.name}`} className="text-yellow-400 hover:text-yellow-200 transition-colors py-2 px-4 bg-gray-700 rounded-lg shadow hover:shadow-md flex items-center text-sm sm:text-base">
                        <span className="mr-2 capitalize">{nextPokemonLink.displayName} ({formatPokemonId(nextPokemonLink.id)})</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </Link>
                ) : <div className="w-1/3 opacity-0 pointer-events-none md:w-auto"></div>}
            </div>

            {/* Main Content Grid */}
            <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* Left Column */}
                <div className="md:col-span-1 bg-gray-700 p-6 rounded-xl shadow-xl flex flex-col items-center">
                    {pokemonData.sprites.default ? ( <Image src={pokemonData.sprites.default} alt={pokemonData.displayName} width={192} height={192} className="object-contain mb-4 image-pixelated" unoptimized priority /> ) : ( <div className="w-48 h-48 bg-gray-600 rounded-full flex items-center justify-center text-gray-400 mb-4">No Sprite</div> )}
                    <div className="flex space-x-2 mb-4">
                        {pokemonData.final_types.map((typeName) => ( <span key={typeName} className="px-4 py-1.5 text-base font-bold rounded-full shadow-md" style={getTypeChipStyle(typeName)}> {typeName.toUpperCase()} </span> ))}
                    </div>
                    {(Object.values(pokemonData.changes_bb2r).some(val => val === true) || (bb2rEvolutionOverrides && bb2rEvolutionOverrides.new_methods.length > 0) ) && (
                        <div className="mb-4 w-full text-center">
                            <span className="px-3 py-1 text-xs font-semibold text-black bg-yellow-400 rounded-full">BB2R Modified</span>
                            <ul className="text-xs text-gray-300 mt-1 list-disc list-inside text-left">
                                {pokemonData.changes_bb2r.stats_changed && <li>Stats Changed</li>}
                                {pokemonData.changes_bb2r.types_changed && <li>Type Changed</li>}
                                {pokemonData.changes_bb2r.abilities_changed && <li>Abilities Changed</li>}
                                {(bb2rEvolutionOverrides && bb2rEvolutionOverrides.new_methods.length > 0) && <li>Evolution Method Changed</li>}
                            </ul>
                        </div>
                    )}
                    <div className="w-full text-left mt-2 bg-gray-600/50 p-3 rounded-lg">
                        <h3 className="text-xl font-semibold text-yellow-400 mb-2 text-center border-b border-gray-500 pb-1">Abilities</h3>
                        <div className={`grid ${hiddenAbility ? 'grid-cols-2' : 'grid-cols-1'} gap-x-4 place-items-center`}>
                            <div className={`${hiddenAbility ? '' : 'col-span-2 text-center'}`}> {regularAbilities.map((abilityName) => ( <p key={abilityName} className={`capitalize text-gray-200 py-0.5 hover:text-yellow-300 cursor-pointer transition-colors`} title={`Ability: ${abilityName.replace(/-/g, ' ')}`}>{abilityName.replace(/-/g, ' ')}</p> ))} </div>
                            {hiddenAbility && ( <div className="text-center"> <p className={`capitalize text-yellow-400 py-0.5 italic hover:text-yellow-200 cursor-pointer transition-colors`} title={`Hidden Ability: ${hiddenAbility.replace(/-/g, ' ')}`}>{hiddenAbility.replace(/-/g, ' ')}</p> <p className="text-xs text-gray-400">(Hidden)</p> </div> )}
                            {!hiddenAbility && regularAbilities.length === 0 && <p className="text-gray-400 col-span-2 text-center">No standard abilities listed.</p>}
                        </div>
                    </div>
                </div>
                {/* Right Column: Base Stats */}
                <div className="md:col-span-2 bg-gray-700 p-6 rounded-xl shadow-xl">
                    <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Base Stats</h3>
                    {animatedStats.map(({ stat, base_stat, current_width, current_color }) => (
                        <div key={stat.name} className="mb-3.5">
                            <div className="flex justify-between text-gray-200 capitalize mb-1 text-sm font-medium"> <span>{stat.name.replace(/-/g, ' ').replace('special attack', 'Sp. Atk').replace('special defense', 'Sp. Def')}</span> <span>{base_stat}</span> </div>
                            <div className="w-full bg-gray-600 rounded-full h-6 p-0.5 shadow-inner"> <div className="h-full rounded-full flex items-center justify-end pr-2 text-xs font-bold text-white" style={{ width: current_width || '0%', backgroundColor: current_color || '#EF4444', transitionProperty: 'width, background-color', transitionDuration: '1.2s', transitionTimingFunction: 'cubic-bezier(0.65, 0, 0.35, 1)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.2)', }} /> </div>
                        </div>
                    ))}
                    <div className="mt-5 pt-3 border-t border-gray-600 flex justify-between font-bold text-lg"> <span className="text-yellow-400">Total:</span> <span className="text-gray-100">{Object.values(pokemonData.stats).reduce((sum, value) => sum + value, 0)}</span> </div>
                </div>
            </div>

            {/* Learnset and Encounter Locations Placeholders */}
            <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl mb-8"> <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Learnset (BB2R)</h3> <p className="text-gray-400">Learnset data will be displayed here once available...</p> </div>
            <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl mb-8"> <h3 className="text-2xl font-semibold text-yellow-400 mb-4 border-b-2 border-yellow-500 pb-2">Encounter Locations (BB2R)</h3> <p className="text-gray-400">Encounter locations will be displayed here once available...</p> </div>

            {/* --- Evolution Chain Section (Updated Logic) --- */}
            <div className="w-full max-w-5xl bg-gray-700 p-6 rounded-xl shadow-xl">
                <h3 className="text-2xl font-semibold text-yellow-400 mb-6 border-b-2 border-yellow-500 pb-2">
                    Evolution Line
                </h3>
                {pokeApiEvolutionChain ? (
                    <div className="flex justify-center w-full overflow-x-auto py-2">
                        <div className="inline-block">
                            {renderEvolutionStage(pokeApiEvolutionChain)}
                        </div>
                    </div>
                ) : (bb2rEvolutionOverrides && bb2rEvolutionOverrides.new_methods.length > 0) ? (
                    <div className="space-y-4">
                        <p className="text-gray-400 text-sm italic">Displaying BB2R specific evolution methods (PokeAPI chain not available):</p>
                        {bb2rEvolutionOverrides.new_methods.map((methodStr, index) => {
                            const parsed = parseBB2REvolutionString(methodStr);
                            const targetInBb2rList = parsed.targetPokemonName ? fullPokedexList.find(p => p.displayName.toLowerCase() === parsed.targetPokemonName!.toLowerCase()) : null;
                            return ( <div key={`bb2r_override_only_${index}`} className="bg-gray-600/70 p-3 rounded-lg shadow-sm flex items-center space-x-3"> {targetInBb2rList?.sprites.default && ( <Image src={targetInBb2rList.sprites.default} alt={targetInBb2rList.displayName} width={48} height={48} className="bg-gray-500/50 rounded-full image-pixelated" unoptimized /> )} <p className="text-gray-300"> {parsed.targetPokemonName ? ( <>Evolves to <Link href={targetInBb2rList ? `/bb2r/pokedex/${targetInBb2rList.name}` : '#'} className="text-yellow-400 hover:underline font-semibold">{parsed.targetPokemonName}</Link>: {parsed.methodText.replace(parsed.targetPokemonName, '').trim()}</> ) : parsed.methodText} </p> </div> );
                        })}
                    </div>
                ) : ( <p className="text-gray-400">Evolution data is currently unavailable or this Pokémon does not evolve.</p> )}
            </div>
        </main>
    );
}

