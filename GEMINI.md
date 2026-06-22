# Storyweave - Project Context

This is a text-based Hardcore Fantasy RPG powered by AI, built with Next.js and TypeScript. It features a stateful game engine that manages player status, inventory, and story progression through dynamic AI interactions.

## Project Overview

*   **Core Logic:** The game follows a state machine flow (Phase 0: Language Selection, Phase 1: Setup, Phase 2: Playing).
*   **AI Backend:** Integration with Ollama (default model: `gemma4:e2b`) via a custom API route that handles complex system prompts and JSON-formatted responses.
*   **Frontend:** A responsive, dark-themed UI built with Next.js App Router and Tailwind CSS 4, providing real-time streaming of AI narratives.
*   **State Management:** Zustand with `persist` middleware ensures the game state is saved locally in the browser.

## Key Technologies

*   **Framework:** [Next.js 16.2.9](https://nextjs.org/) (App Router)
*   **Library:** [React 19](https://react.dev/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **State:** [Zustand](https://zustand-demo.pmnd.rs/)
*   **AI Service:** [Ollama](https://ollama.com/) (Local LLM)

## Project Structure

*   `src/app/page.tsx`: Main game interface and client-side logic for streaming and parsing AI responses.
*   `src/app/api/chat/route.ts`: Server-side API route that communicates with Ollama and manages the system prompt/game phases.
*   `src/store/useGameStore.ts`: Zustand store for global game state (player status, history, phase, language).
*   `src/app/globals.css`: Global styles including Tailwind directives.

## Building and Running

### Prerequisites

*   Node.js (LTS recommended)
*   [Ollama](https://ollama.com/) installed and running locally.
*   Pull the required model: `ollama pull gemma4:e2b`

### Commands

*   `npm install`: Install dependencies.
*   `npm run dev`: Start the development server at `http://localhost:3000`.
*   `npm run build`: Build the application for production.
*   `npm run start`: Start the production server.
*   `npm run lint`: Run ESLint for code quality checks.

## Development Conventions

*   **JSON Communication:** AI responses must strictly follow the JSON schema defined in `src/app/api/chat/route.ts`.
*   **Phase Management:** Always check `game_phase` and `current_language` when modifying game logic to ensure the state machine remains consistent.
*   **Styling:** Use Tailwind CSS 4 utility classes for all styling. Maintain the dark, immersive aesthetic.
*   **Typing:** Ensure all new state properties or API parameters are properly typed in `useGameStore.ts` and relevant components.
*   **Internationalization:** The AI handles multi-language support dynamically based on the `current_language` state. Narrative and summaries should always respect this.
