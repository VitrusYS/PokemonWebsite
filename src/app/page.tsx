// D:/ProgrammingWorkspaces/AITests/pokemon-next-game/src/app/page.tsx
import Link from 'next/link';
import AnimatedPokemonBackground from '@/components/AnimatedPokemonBackground'; // Pfad anpassen, falls nötig

export default function HomePage() {
    return (
        <>
            <AnimatedPokemonBackground />
            <main className="min-h-screen bg-gray-900/10 backdrop-blur-xs text-yellow-300 p-4 md:p-8 flex flex-col items-center justify-center relative z-10">
                <div className="text-center max-w-3xl">
                    <h1
                        className="text-5xl sm:text-7xl font-bold text-transparent bg-clip-text
                       bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600
                       mb-8 animate-pulse-slow select-none"
                        style={{ textShadow: '0 0 10px rgba(250, 204, 21, 0.5), 0 0 20px rgba(250, 204, 21, 0.3)' }}
                    >
                        Welcome to Vitrusys XYZ!
                    </h1>
                    <p
                        className="text-xl sm:text-2xl text-gray-200 mb-12 leading-relaxed select-none"
                        style={{ textShadow: '0 0 5px rgba(0,0,0,0.7)'}}
                    >
                        Your ultimate hub for engaging Pokémon tools and adventures.
                        Discover type matchups, test your knowledge, and explore the world of Pokémon like never before!
                    </p>

                    <div className="space-y-5 sm:space-y-0 sm:space-x-8 flex flex-col sm:flex-row justify-center">
                        <Link
                            href="/guesser"
                            className="bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-600 hover:to-amber-700
                               text-gray-900 font-bold py-4 px-10 rounded-xl shadow-xl
                               transition-all duration-300 ease-in-out text-lg
                               transform hover:scale-110 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-opacity-50"
                        >
                            Play Type Guesser
                        </Link>
                        {/*
                        The commented out Link below would also need similar changes if uncommented:
                        <Link
                            href="/pokedex"
                            className="bg-gray-700 hover:bg-gray-600 border-2 border-gray-600 hover:border-yellow-500
                                       text-yellow-300 font-bold py-4 px-10 rounded-xl shadow-lg
                                       transition-all duration-300 ease-in-out text-lg
                                       transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-500 focus:ring-opacity-50"
                        >
                            Pokédex (Soon!)
                        </Link>
                        */}
                    </div>

                    <div className="mt-20 text-gray-500">
                        <p>&copy; {new Date().getFullYear()} Vitrusys XYZ. All rights reserved.</p>
                        <p className="text-sm">Pokémon and Pokémon character names are trademarks of Nintendo.</p>
                    </div>
                </div>
            </main>
        </>
    );
}