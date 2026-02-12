# Padel Tournament Ultimate

A web-based Padel tournament scoring application with support for two game modes: Americano and Tennis.

## Features

- **Americano Mode**: Points-based scoring (first to 21 points)
- **Tennis Mode**: Games-based scoring (best of 3 games)
- **Separate Rankings**: Independent ranking tables for each mode
- **Match History**: Track all completed matches
- **Mobile Responsive**: Works on all devices
- **Data Persistence**: All data saved to localStorage
- **Color-coded Rankings**: Gold, Silver, Bronze, and Gray for top 4 positions
- **Large Tap Targets**: Optimized for touch devices with easy-to-press buttons
- **Undo Functionality**: Quickly undo last scoring action to prevent errors
- **Real-time Visual Feedback**: Animations and toasts for immediate confirmation
- **Confirmation Modals**: Prevents accidental match finishing or tournament reset

## Quick Start

### Option 1: Direct File Access (Simple)
Simply open `index.html` in your web browser (Chrome, Safari, Firefox, etc.)

### Option 2: Local Server (Recommended for ngrok)

#### Windows:
1. Double-click `start-server.bat`
2. The server will start and open automatically in your browser

#### Mac/Linux:
```bash
python3 server.py
```

The server will start on `http://localhost:8000`

## Using ngrok for Remote Access

### Step 1: Install ngrok
1. Go to https://ngrok.com/download
2. Download ngrok for your operating system
3. Extract the downloaded file

### Step 2: Start the Local Server
Run the server using one of the methods above (Option 2)

### Step 3: Start ngrok
Open a new terminal/command prompt and run:
```bash
ngrok http 8000
```

### Step 4: Share the URL
ngrok will provide a forwarding URL like:
```
Forwarding: https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:8000
```

Share this URL with anyone to give them access to your Padel Tournament app!

## How to Use

### Playing Matches
1. Select a game mode (Americano or Tennis)
2. Add points using the large "+ Point" buttons
3. Remove points using the "- Point" buttons if needed
4. Use the "Undo Last Action" button at the bottom to quickly correct mistakes
5. Click "Finish Match" when the match is complete (requires confirmation)
6. The round will automatically advance

### Undo Functionality
- The "Undo Last Action" button appears at the bottom of the screen after any scoring action
- Click it to revert the last point addition or subtraction
- Action history stores up to 10 actions for undo
- History is automatically cleared when switching game modes or finishing a match

### Viewing Rankings
1. Click the "Ranking" tab
2. Switch between Americano and Tennis rankings
3. See top players with color-coded positions

### Viewing History
1. Click the "History" tab
2. View all completed matches for each mode
3. See match details including winners

### Resetting
- Click "View Standings" to see current rankings
- Click "Reset Tournament" to clear all data and start fresh

## Game Modes

### Americano (Points)
- Total points scored (max 21 per match)
- Ranking shows total points accumulated
- First team to reach 21 points wins

### Tennis (Games)
- Best of 3 games format
- Traditional tennis scoring (0, 15, 30, 40, Deuce, Advantage)
- Ranking shows total games won
- First team to win 2 games wins the match

## Players

Default players:
- Aria
- Bryan
- Hanip
- Lutpi

The tournament consists of 3 rounds with rotating team pairings.

## Data Storage

All tournament data is stored in your browser's localStorage:
- Player statistics
- Round progress for each mode
- Current match scores
- Match history

Data persists across browser sessions and device refreshes.

## Troubleshooting

### Server won't start
- Make sure Python is installed (Python 3.6+)
- Check that port 8000 is not already in use
- Try running with administrator/sudo privileges

### ngrok connection issues
- Make sure the local server is running first
- Check your ngrok account status (free tier has limits)
- Try restarting ngrok if connection drops

### Data not saving
- Check that localStorage is enabled in your browser
- Try using a different browser (Chrome, Safari, Firefox)
- Make sure you're not in private/incognito mode

## Technical Details

- **Frontend**: Pure HTML, CSS, JavaScript
- **Backend**: Python HTTP Server (for local hosting)
- **Data Storage**: Browser localStorage
- **Responsive Design**: Mobile-friendly interface with large touch targets
- **Cross-browser**: Works on Chrome, Safari, Firefox, Edge
- **Accessibility**: WCAG 2.1 compliant with ARIA labels
- **Touch-Optimized**: Haptic feedback support on compatible devices

## License

Free to use for personal and commercial purposes.
