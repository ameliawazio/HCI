# HCI Project Setup
Setup/run instructions.

## Backend (Flask microtool for web dev with Python)
PowerShell:

- `cd backend`
- `python -m venv .venv`
- `.\.venv\Scripts\Activate.ps1`
- `pip install -r requirements.txt`
- `$env:GOOGLE_PLACES_API_KEY="your_google_places_key"`
- `python app.py`

Backend runs at:

- `http://127.0.0.1:5000`

## Mobile (Expo React Native — ManeCourse)

**Node.js:** Use **20.x LTS** (Expo SDK 54 needs **≥ 20.19**). The repo includes `.nvmrc` with `20` — with [nvm](https://github.com/coreybutler/nvm-windows) (Windows) or [fnm](https://github.com/Schniz/fnm), run `nvm install` / `nvm use` from the project root so your `node -v` matches the team.

PowerShell:

- `cd mobile`
- `npm install`
- `$env:EXPO_PUBLIC_API_URL="http://<YOUR_BACKEND_IP>:5000"`
- `npx expo start`

Then press `w` for web, scan the QR code for Expo Go, or use an emulator.

**Implemented:** Expo Router screens matching the Figma flow (landing, login, sign up, My Groups, personal settings, group settings with add-by-username, swipe, waiting, match, map modal). Voting uses a demo deck size of `memberCount × 3` restaurants, simulated peer votes after you finish swiping, tie rounds with a second-round stale-tie alert, and no open “join group” (invite by username in group settings only).

