# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development Commands
- **Local server**: `python -m http.server 8000` (serves from root directory)
- **Node.js server**: `cd shift-bot && npm start` (runs the chat-enabled Express server)
- **Testing**: `cd shift-bot && npm test` (runs Jest tests for the server)
- **Test endpoints**: `cd shift-bot && node test-endpoints.js` (manual API endpoint testing)

### Accessing the Application
- **Main portfolio**: Open `index.html` in browser or http://localhost:8000
- **Wage calculator**: Navigate to `kalkulator/index.html` or http://localhost:8000/kalkulator
- **Production**: https://kkarlsen.art and https://kkarlsen.art/kalkulator

## Architecture Overview

### Multi-Component System
This is a Norwegian wage calculation application with three main components:

1. **Portfolio Site** (`index.html`, `css/style.css`) - Landing page showcasing the developer
2. **Wage Calculator App** (`kalkulator/`) - Main application for shift and wage calculations
3. **Chat Bot Server** (`shift-bot/`) - Node.js/Express API with OpenAI integration

### Frontend Architecture (Wage Calculator)

#### Core JavaScript Files
- `kalkulator/js/appLogic.js` - **Business logic and calculations** (332KB+ file with wage calculations, shift management, tariff system)
- `kalkulator/js/app.js` - **UI controllers and interaction handlers** (welcome screen, animations, event delegation)
- `kalkulator/js/auth.js` - **Authentication system** (Supabase auth, login, signup, password recovery)
- `kalkulator/js/config.js` - **Configuration constants** (Supabase keys, API endpoints)

#### Key Architectural Patterns
- **Event delegation**: App.js uses centralized event handling for dynamic content
- **Module imports**: Dynamic ES6 imports (`await import('./appLogic.js?v=5')`)
- **State management**: Global app object with methods exposed to window
- **Progressive Web App**: Manifest.json for mobile app-like experience

### Authentication Flow
1. **Login Page** (`kalkulator/index.html`) - Handles auth states and recovery flows
2. **Main App** (`kalkulator/app.html`) - Protected route requiring authentication
3. **Supabase Integration**: JWT tokens, user metadata, password recovery
4. **Profile System**: Optional user profile completion with first name

### Backend Architecture (Chat Bot)

#### Express Server (`shift-bot/server.js`)
- **Authentication**: JWT Bearer token middleware with Supabase verification
- **OpenAI Integration**: GPT function calling for shift management
- **Database**: Supabase with `shifts` and `settings` tables
- **CORS enabled** for cross-origin requests from the frontend

#### API Endpoints
- `GET /settings` - Retrieve user hourly rate settings (authenticated)
- `POST /chat` - Process chat messages with OpenAI GPT integration (authenticated)

### Database Schema (Supabase)
```sql
-- shifts table
CREATE TABLE shifts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  start TIME NOT NULL,
  end TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- settings table  
CREATE TABLE settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  hourly_rate NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Key Business Logic

### Norwegian Wage System (Virke 2025 Tariff)
- **Tariff-based calculations**: Automatic base wage calculation
- **Weekend/holiday bonuses**: Additional rates for special days  
- **Overtime calculations**: Progressive rates for extended hours
- **Automatic break deductions**: 30-minute unpaid breaks for shifts >5.5 hours

### Mobile-First Design
- **Responsive layout**: CSS Grid and Flexbox with mobile breakpoints
- **Touch interactions**: Optimized for mobile gesture navigation
- **PWA features**: App manifest, service worker ready, installable
- **Dynamic viewport**: Handles mobile browser UI changes (address bar hiding)

## Technology Stack

### Frontend
- **Vanilla JavaScript ES6+**: No framework dependencies
- **CSS3**: Modern features (Grid, Flexbox, CSS variables, animations)
- **Supabase Client**: Authentication and database access
- **LocalStorage**: Client-side data persistence fallback

### Backend
- **Node.js/Express**: REST API server
- **Supabase**: PostgreSQL database with real-time features
- **OpenAI API**: GPT-4 integration for chat functionality
- **Jest/Supertest**: Testing framework

### Deployment
- **Netlify**: Static site hosting with redirects (`_redirects` file)
- **Environment Variables**: `.env` for sensitive API keys in production

## Development Notes

### File Structure Patterns
- Configuration centralized in `kalkulator/js/config.js`
- Supabase client initialized in each auth-required file
- Global window objects for cross-file communication (`window.app`, `window.supa`)
- CSS variables for consistent theming (`--speed-normal`, `--ease-default`)

### Authentication States
- Password recovery flows handled via URL hash fragments
- Session persistence with automatic redirects
- JWT token validation on both frontend and backend

### Chat Integration
- Expandable chat pill UI component with animation
- OpenAI function calling to add shifts via natural language
- Real-time shift data refresh after bot interactions