# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

This is a full-stack application with a client/server architecture:

- **client/**: React frontend built with Vite, TanStack Router, and Tailwind CSS
- **server/**: Backend (currently minimal setup)

## Common Development Commands

All commands should be run from the `client/` directory unless otherwise specified.

### Client Development
```bash
cd client
npm install              # Install dependencies
npm run dev             # Start development server on port 3000
npm run build           # Build for production (runs vite build && tsc)
npm run serve           # Preview production build
npm run test            # Run tests with Vitest
```

### Code Quality
```bash
npm run lint            # Lint code with Biome
npm run format          # Format code with Biome  
npm run check           # Run both lint and format checks
```

### Adding Components
```bash
pnpx shadcn@latest add button    # Add Shadcn components
```

## Architecture Overview

### Frontend Stack
- **React 19** with TypeScript
- **TanStack Router** for routing (code-based routing setup)
- **TanStack Query** for server state management
- **TanStack Store** for client state management
- **Tailwind CSS v4** with Vite plugin
- **Shadcn/ui** components
- **Vitest** for testing
- **Biome** for linting and formatting

### Key Configuration
- **Vite**: Uses `@vitejs/plugin-react` and `@tailwindcss/vite`
- **TypeScript**: Path alias `@` points to `./src`
- **Biome**: Uses tab indentation, double quotes, ignores `src/routeTree.gen.ts`
- **Testing**: Vitest with jsdom environment and global test APIs

### Routing Architecture
- Currently uses **code-based routing** with routes defined in `src/main.tsx`
- Routes are created using `createRoute()` and assembled into a route tree
- Can be migrated to file-based routing using `@tanstack/router-plugin`
- Root layout includes TanStack Router Devtools

### State Management
- **TanStack Query** for server state (configured with QueryClientProvider)
- **TanStack Store** for local state management
- Demo store and devtools available in `src/lib/demo-store.ts`

### Component Architecture
- Uses Shadcn/ui component system
- Component utilities in `src/lib/utils.ts`
- Header component demonstrates basic structure
- Uses `class-variance-authority` for component variants

## Important Notes

- The server directory currently has minimal setup - no build/test scripts defined
- Demo files (prefixed with `demo`) can be safely deleted
- Route tree generation is excluded from Biome formatting
- Uses React 19 with latest TanStack ecosystem
- Port 3000 is configured for development server