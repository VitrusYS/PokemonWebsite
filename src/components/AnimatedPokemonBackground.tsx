// src/components/AnimatedPokemonBackground.tsx
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface SpriteInfo {
    id: string;
    src: string;
    alt: string;
    x: number;
    y: number;
    size: number;
    animationDelay: string;
    createdAt: number;
    isShiny: boolean;
    movementStyle: React.CSSProperties;
    initialOpacity: number; // Added for smooth spawn
}

const MAX_POKEMON_ID_FOR_RANDOM = 1025;
const SHINY_CHANCE = 0.01;

const MAX_SPRITES_ON_SCREEN = 12;
const SPRITE_LIFESPAN_MS = 10000;
const ADD_SPRITE_INTERVAL_MS = 1200;
const PIXEL_SPRITE_BASE_SIZE = 96;

const AnimatedPokemonBackground: React.FC = () => {
    const [sprites, setSprites] = useState<SpriteInfo[]>([]);

    const getRandomPokemonDetails = useCallback(async () => {
        try {
            const randomId = Math.floor(Math.random() * MAX_POKEMON_ID_FOR_RANDOM) + 1;
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
            if (!response.ok) {
                // console.warn(`Failed to fetch Pokémon with ID ${randomId}, status: ${response.status}`);
                return null;
            }
            const data = await response.json();
            const isShiny = Math.random() < SHINY_CHANCE;
            let spriteSrc;

            if (isShiny) {
                spriteSrc =
                    data.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_shiny ||
                    data.sprites?.versions?.['generation-v']?.['black-white']?.front_shiny ||
                    data.sprites?.front_shiny ||
                    data.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
                    data.sprites?.versions?.['generation-v']?.['black-white']?.front_default ||
                    data.sprites?.front_default;
            } else {
                spriteSrc =
                    data.sprites?.versions?.['generation-v']?.['black-white']?.animated?.front_default ||
                    data.sprites?.versions?.['generation-v']?.['black-white']?.front_default ||
                    data.sprites?.front_default;
            }

            if (spriteSrc) {
                return { name: data.name, src: spriteSrc, isShiny: isShiny };
            } else {
                // console.warn(`No suitable pixel sprite found for Pokémon ID ${randomId} (${data.name})`);
                return null;
            }
        } catch (error) {
            // console.error(`Error fetching random Pokémon details:`, error);
            return null;
        }
    }, []);

    const generateNewSprite = useCallback(async () => {
        const pokemonDetails = await getRandomPokemonDetails();
        if (!pokemonDetails) return null;

        const moveX = (Math.random() - 0.5) * 40;
        const moveY = (Math.random() - 0.5) * 40;
        const rotate = (Math.random() - 0.5) * 10;

        return {
            id: `${pokemonDetails.name}-${Date.now()}-${Math.random()}`,
            src: pokemonDetails.src,
            alt: pokemonDetails.name + (pokemonDetails.isShiny ? " (shiny)" : ""),
            isShiny: pokemonDetails.isShiny,
            x: Math.random() * 90,
            y: Math.random() * 90,
            size: PIXEL_SPRITE_BASE_SIZE * (1.2 + Math.random() * 0.8),
            animationDelay: `${Math.random() * 0.5}s`, // Reduced max initial delay for quicker start
            createdAt: Date.now(),
            movementStyle: {
                '--move-x': `${moveX}px`,
                '--move-y': `${moveY}px`,
                '--rotate-deg': `${rotate}deg`,
            } as React.CSSProperties,
            initialOpacity: 0, // Start with opacity 0
        };
    }, [getRandomPokemonDetails]);

    useEffect(() => {
        const intervalId = setInterval(async () => {
            setSprites(prevSprites => {
                const now = Date.now();
                return prevSprites.filter(
                    (sprite) => now - sprite.createdAt < SPRITE_LIFESPAN_MS
                );
            });

            setSprites(prevSprites => {
                if (prevSprites.length < MAX_SPRITES_ON_SCREEN) {
                    generateNewSprite().then(newSprite => {
                        if (newSprite) {
                            setSprites(currentSprites => {
                                const updatedSprites = [...currentSprites, newSprite];
                                // Trigger a re-render shortly after adding to apply animation class if needed,
                                // or ensure animation starts from opacity 0 smoothly.
                                // For now, the CSS animation should handle this if initial opacity is 0.
                                return updatedSprites;
                            });
                        }
                    });
                }
                return prevSprites;
            });
        }, ADD_SPRITE_INTERVAL_MS);

        return () => clearInterval(intervalId);
    }, [generateNewSprite]);

    return (
        <div className="fixed inset-0 w-full h-full overflow-hidden z-0 pointer-events-none">
            {sprites.map((sprite) => (
                <div
                    key={sprite.id}
                    className="absolute animate-fadeInDriftOut"
                    style={{
                        left: `${sprite.x}%`,
                        top: `${sprite.y}%`,
                        width: `${sprite.size}px`,
                        height: `${sprite.size}px`,
                        opacity: sprite.initialOpacity, // Apply initial opacity
                        animationDelay: sprite.animationDelay,
                        animationDuration: `${SPRITE_LIFESPAN_MS}ms`,
                        imageRendering: 'pixelated',
                        ...sprite.movementStyle,
                    }}
                >
                    <Image
                        src={sprite.src}
                        alt={sprite.alt}
                        width={sprite.size}
                        height={sprite.size}
                        className="object-contain"
                        priority={false}
                        unoptimized={true}
                    />
                </div>
            ))}
        </div>
    );
};

export default AnimatedPokemonBackground;
