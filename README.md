# HCI Project Setup
Setup/run instructions.

## Backend (Flask microtool for web dev with Python)
PowerShell:

- `cd backend`
- `python -m venv .venv`
- `.\.venv\Scripts\Activate.ps1`
- `pip install -r requirements.txt`
- Set your Places API key (pick one):
  - **Persistent (recommended):** copy `backend/.env.example` to `backend/.env`, edit `GOOGLE_PLACES_API_KEY=...`, then run `python app.py` (`python-dotenv` loads `.env` automatically).
  - **Per session:** `$env:GOOGLE_PLACES_API_KEY="your_google_places_key"` in PowerShell before `python app.py`.
- `python app.py`

macOS / zsh:
- `cd backend`
- `python3 -m venv .venv`
- `source .venv/bin/activate`
- `pip install -r requirements.txt`
- Set `GOOGLE_PLACES_API_KEY` via `backend/.env` (copy from `.env.example`) or `export GOOGLE_PLACES_API_KEY="..."`.
- `python3 app.py`

Backend runs at:

- `http://127.0.0.1:5000`

## Mobile (Expo React Native — ManeCourse)

**Node.js:** Use **20.x LTS** (Expo SDK 54 needs **≥ 20.19**). The repo includes `.nvmrc` with `20` — with [nvm](https://github.com/coreybutler/nvm-windows) (Windows) or [fnm](https://github.com/Schniz/fnm), run `nvm install` / `nvm use` from the project root so your `node -v` matches the team.

PowerShell:

- `cd mobile`
- `npm install`
- `$env:EXPO_PUBLIC_API_URL="http://<YOUR_BACKEND_IP>:5000"`
- `npx expo start`

macOS / zsh:

- `cd mobile`
- `npm install`
- `EXPO_PUBLIC_API_URL=http://<YOUR_BACKEND_IP>:5000 npx expo start`
  
Then press `w` for web, scan the QR code for Expo Go, or use an emulator.

## Testing from 1 Computer

- open terminal, navigate to hci/backend, run instructions for backend setup, and start the server w/ 'python app.py'
- open multiple terminals and navigate to hci/mobile to execute the mobile instructions
- repeat mobile start on each different terminal (each one after the first will say 'port 8081 is being used by another process, would you like to use port 8082/8083/etc.' press 'Y' to confirm.
- once you have multiple mobile pages running, login with a hardcoded account on each (gator1/2/3/4 etc), create a group with one and add the other accounts to it. Set group settings and begin swiping round from the group leader.

**Implemented:** Expo Router screens matching the Figma flow (landing, login, sign up, My Groups, personal settings, group settings with add-by-username, swipe, waiting, match, map modal). Voting uses a demo deck size of `memberCount × 3` restaurants, simulated peer votes after you finish swiping, tie rounds with a second-round stale-tie alert, and no open “join group” (invite by username in group settings only).

