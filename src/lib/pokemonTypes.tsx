// src/lib/pokemonTypes.ts

// Interface for type data, used across different components
export interface TypeData {
    id: string; // Unique ID for each type (e.g., 'type-normal')
    name: string;
    color: string;
    textColor?: string; // Optional text color for better contrast on some backgrounds
}

// Pokémon types with their standard colors and IDs
export const POKEMON_TYPES: TypeData[] = [
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
