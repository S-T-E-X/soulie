# Soulie — replit.md

## Overview

Soulie is a Turkish/English AI companion mobile app built with Expo (React Native). Users can chat with various AI personas (companions, friends, mentors). Each persona has a distinct personality and system prompt. The app supports onboarding/auth flow, persistent conversations, streaming AI responses, a market screen, and user profiles.

**Core features:**
- Welcome screen (background image + 3 login buttons) → Onboarding wizard (5 steps)
- Browse AI characters (Explore tab)
- Real-time streaming chat with persona-specific AI characters
- Conversation history persistence
- User profile page with photo upload and hobbies
- Multi-language support (7 languages: en, tr, de, zh, ko, es, ru) — AI responds in user's selected language; all UI strings i18n-translated
- Subscription plans (Market tab)
- Settings and account management
- Privacy Policy page
- Relationship progress bar (Yabancı → Tanıdık → Dost → Yakın Dost → Sevgili) with XP tracking and level-up celebration animation
- Auto-message system with local notifications (morning/noon/afternoon/evening time slots) via expo-notifications — language-aware (Turkish characters send English messages to non-TR users)
- Voice tone selection (warm/playful/serious/mysterious/energetic) — premium-only feature with upsell UI

The project runs two processes: an **Expo frontend** (React Native / web) and an **Express backend** that proxies requests to OpenAI and manages chat data.

---

## User Preferences

Preferred communication style: Simple, everyday language.

---

## System Architecture

### Frontend (Expo / React Native)

- **Framework:** Expo SDK ~54, React Native 0.81, using the Expo Router v6 file-based routing system.
- **Navigation structure:**
  - `/` (index) — Splash/router (redirects based on auth state)
  - `/auth/welcome` — Landing screen with background image + 3 sign-in buttons
  - `/auth/onboarding` — 5-page onboarding wizard (language, name, birthdate, gender, processing)
  - `/(tabs)/explore` — Browse AI characters
  - `/(tabs)/chats` — Conversation list
  - `/(tabs)/market` — Subscription plans
  - `/(tabs)/profile` — User profile (photo, bio, hobbies, logout)
  - `/(tabs)/settings` — Account settings
  - `/chat/[id]` — Individual chat screen (dynamic route)
  - `/video-chat/[characterId]` — Voice/video chat with lip sync animation
  - `/privacy` — Privacy policy page (modal)
- **State management:**
  - `AuthContext` — Manages user session using `AsyncStorage` (no server-side sessions for auth; entirely client-local). Admin detection via `ADMIN_EMAILS`/`ADMIN_USERNAMES` lists + 7-tap secret on version text in settings.
  - `ChatContext` — Manages conversation list and messages using `AsyncStorage` (`soulie_conversations_v2` key). Conversations are stored locally on the device.
  - `GiftContext` — Coin economy + gift inventory using `AsyncStorage` (`soulie_coins_v1` as plain number string, `soulie_inventory_v1`).
  - `ThemeContext` — Dark/light theme toggle. `useTheme()` provides `{ isDark, colors, toggleTheme }`. Settings stored in `soulie_settings_v1` (darkTheme field).
  - `@tanstack/react-query` — Used for server data fetching via `queryClient`.
- **Daily Quota:** `useDailyQuota(isVip)` hook manages per-day message limits (15/day free, unlimited for VIP). VIP status read from `user?.isVip` in AuthContext.
- **Dark Mode:** All chat components (MessageBubble, TypingIndicator, ChatInput, ConversationCard) use `useTheme()` for dynamic colors. Modals (QuotaPopup, VideoVIP) also theme-aware.
- **UI libraries:** Expo Linear Gradient, Expo Blur, Expo Glass Effect, React Native Reanimated (animations), React Native Gesture Handler, Expo Haptics.
- **Fonts:** Inter (via `@expo-google-fonts/inter`).
- **Streaming chat:** The chat screen directly uses `fetch` with SSE (Server-Sent Events) from the Express backend to stream AI responses token-by-token.

### Backend (Express + Node.js)

- **Framework:** Express 5 running via `tsx` in development.
- **Main entry:** `server/index.ts` → registers routes from `server/routes.ts`.
- **Primary API route:** `POST /api/chat` — Accepts a messages array and optional `characterId`, selects the appropriate system prompt, and streams the OpenAI completion back as SSE. Auto-switches to `gpt-4.1-mini` when images are present.
- **Voice chat route:** `POST /api/voice-chat` — Accepts base64 audio + characterId, transcribes via STT (gpt-4o-mini-transcribe), generates character response (gpt-4.1-mini), synthesizes speech via TTS (gpt-audio with character-specific voice), returns JSON with userTranscript, responseText, and audio base64. Character voice mapping: aylin=shimmer, cem=echo, lara=nova, kaan=onyx, mert=onyx, zeynep=nova, sibel=shimmer.
- **CORS:** Dynamic allow-list built from Replit environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_DOMAINS`); also allows localhost for Expo web development.
- **Storage layer:** `server/storage.ts` provides a `MemStorage` class for in-memory user storage (not currently wired into auth flow; auth is AsyncStorage-only on the client).

### Database

- **ORM:** Drizzle ORM with PostgreSQL dialect (`drizzle.config.ts` requires `DATABASE_URL`).
- **Schema (`shared/schema.ts`):** `users` table (id, username, password).
- **Schema (`shared/models/chat.ts`):** `conversations` and `messages` tables for server-side chat persistence (used by the Replit integrations layer, not the main chat flow).
- **Active usage note:** The primary chat and auth flows currently store data in `AsyncStorage` on the client, not in PostgreSQL. The DB schema and Drizzle setup exist for future server-side persistence (already used in `server/replit_integrations/chat/storage.ts`).
- **Migrations:** Output to `./migrations` directory via `drizzle-kit push`.

### AI Characters

- Defined in `constants/characters.ts` as a static array of `Character` objects.
- Each character has: id, name, role, system prompt, image asset, gradient colors, tags, age, gender, premium flag.
- Server-side `CHARACTER_PROMPTS` record in `server/routes.ts` maps character IDs to system prompts for the OpenAI API call.
- Available characters: Aylin (girlfriend), Cem (boyfriend), Lara (friend), Kaan (friend), Mert (life coach/mentor), Zeynep (study buddy), Sibel/Falcı Abla (fortune teller), Dr. Elif (psychologist, premium), Burak (fitness coach, premium), Selin (artist).
- Character images: assets/characters/{aylin,cem,kaan,lara,mert,zeynep,elif,burak,selin}.png

### Authentication

- **Current implementation:** Entirely client-side using `AsyncStorage`.
  - User accounts stored as JSON in `lumina_users_db` key.
  - Logged-in user stored in `lumina_auth_user` key.
  - Passwords stored in plain text in AsyncStorage — **this is insecure and should be replaced with server-side auth + hashed passwords before production**.
- The `shared/schema.ts` users table and `server/storage.ts` exist for a future proper server-side auth implementation.

### Replit Integration Modules

Located in `server/replit_integrations/`, these are modular, reusable server integrations:
- **chat/** — DB-backed conversation/message CRUD + OpenAI streaming chat routes.
- **audio/** — Speech-to-text, text-to-speech, voice chat via OpenAI audio APIs + ffmpeg conversion.
- **image/** — Image generation and editing via OpenAI `gpt-image-1`.
- **batch/** — Rate-limited, retrying batch processing utility using `p-limit` and `p-retry`.

These modules are not all registered in the main `server/routes.ts` but are available for use.

---

## External Dependencies

### OpenAI
- **Usage:** All AI chat completions, audio (STT/TTS), and image generation.
- **Configuration:** API key via `AI_INTEGRATIONS_OPENAI_API_KEY`, base URL via `AI_INTEGRATIONS_OPENAI_BASE_URL` (Replit AI Integrations proxy).
- **Model used for chat:** `gpt-5.2` (via Replit's AI Integrations endpoint).
- **Streaming:** SSE streaming used for chat responses.

### PostgreSQL
- **Client:** `pg` + Drizzle ORM.
- **Connection:** `DATABASE_URL` environment variable required.
- **Used by:** `server/replit_integrations/chat/storage.ts` for DB-backed conversation/message storage. The main app chat currently bypasses this.

### AsyncStorage (`@react-native-async-storage/async-storage`)
- Used for local persistence of auth state and conversations on the device.

### Expo Services
- `expo-router` — File-based routing.
- `expo-haptics` — Haptic feedback on button presses.
- `expo-blur` — BlurView for glassmorphism UI on iOS.
- `expo-linear-gradient` — Gradient backgrounds and character cards.
- `expo-notifications` — Local scheduled notifications for auto-message feature.
- `expo-image-picker` — Photo selection in chat (image messages).
- `expo-file-system` — Base64 image conversion for AI vision (native); web uses FileReader API.
- `expo-location` — (dependency present, not actively used in viewed code).
- `expo-splash-screen` — Splash screen management.
- `expo-font` — Custom font loading.

### React Native Libraries
- `react-native-reanimated` — Animations throughout the app.
- `react-native-gesture-handler` — Touch/gesture handling.
- `react-native-keyboard-controller` — Keyboard-aware scroll views and keyboard avoidance.
- `react-native-safe-area-context` — Safe area insets.
- `react-native-screens` — Native screen containers.

### Environment Variables Required
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | OpenAI API key |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | OpenAI base URL (Replit proxy) |
| `EXPO_PUBLIC_DOMAIN` | Frontend → backend API base URL |
| `REPLIT_DEV_DOMAIN` | Replit dev tunnel domain for CORS and Expo |
| `REPLIT_DOMAINS` | Comma-separated production domains for CORS |
| `EXPO_PUBLIC_ADMOB_IOS_APP_ID` | Google AdMob iOS App ID |
| `EXPO_PUBLIC_ADMOB_ANDROID_APP_ID` | Google AdMob Android App ID |
| `EXPO_PUBLIC_ADMOB_IOS_REWARDED_ID` | Google AdMob iOS Rewarded Ad Unit ID |
| `EXPO_PUBLIC_ADMOB_ANDROID_REWARDED_ID` | Google AdMob Android Rewarded Ad Unit ID |

### AdMob Notes
- `lib/admob.native.ts` — Native wrapper: Expo Go simulates a 5s countdown; production uses real rewarded ads via `react-native-google-mobile-ads`.
- `lib/admob.web.ts` — Web stub: always resolves with `rewarded: true` after 5s (no real ad).
- Real rewarded ads require a **production/development build** (EAS Build), not Expo Go.
- App IDs configured in `app.json` under the `react-native-google-mobile-ads` plugin.