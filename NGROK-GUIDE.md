# 🌐 Ngrok Setup Guide for Padel Tournament

This guide will help you set up ngrok to share your Padel Tournament app with others over the internet.

## What is ngrok?

ngrok is a tool that creates a secure tunnel from your local server to the public internet, allowing others to access your local application.

## Prerequisites

1. ✅ Your local server must be running (Node.js or Python)
2. ✅ You need an ngrok account (free tier available)

## Step-by-Step Setup

### Step 1: Download ngrok

1. Go to https://ngrok.com/download
2. Download the version for your operating system:
   - Windows: `ngrok-v3-stable-windows-amd64.zip`
   - Mac: `ngrok-v3-stable-darwin-amd64.zip`
   - Linux: `ngrok-v3-stable-linux-amd64.zip`

### Step 2: Install ngrok

#### Windows:
1. Extract the downloaded zip file
2. Move the extracted folder to a convenient location (e.g., C:\ngrok)
3. Add ngrok to your PATH (optional but recommended):
   - Open System Properties → Environment Variables
   - Add ngrok folder to PATH

#### Mac/Linux:
```bash
# Unzip and move to /usr/local/bin
unzip ~/Downloads/ngrok-v3-stable-darwin-amd64.zip
sudo mv ngrok /usr/local/bin/
```

### Step 3: Sign Up and Authenticate

1. Go to https://ngrok.com/signup
2. Create a free account
3. Get your authtoken from the dashboard
4. Authenticate ngrok:

#### Windows (Command Prompt):
```cmd
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

#### Mac/Linux:
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN_HERE
```

### Step 4: Start Your Local Server

Make sure your Padel Tournament server is running:

#### Option A: Using Node.js (Recommended)
```bash
# Windows
node server.js

# Or double-click: start-node-server.bat

# Mac/Linux
node server.js
```

#### Option B: Using Python
```bash
# Windows
python server.py

# Or double-click: start-server-multi.bat

# Mac/Linux
python3 server.py
```

Your server should show:
```
🚀 Server started successfully!
📍 Local Access:
   http://localhost:8000/index.html
```

### Step 5: Start ngrok

Open a NEW terminal/command prompt and run:

```bash
ngrok http 8000
```

You should see output like:
```
ngrok by @inconshreveable

Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Forwarding                    https://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:8000
Forwarding                    http://xxxx-xxxx-xxxx.ngrok-free.app -> http://localhost:8000

Connections                   ttl     opn     rt1     rt5     p50     p90     max
                              0       0       0.00    0.00    0.00    0.00    0
```

### Step 6: Share Your App

Copy the HTTPS forwarding URL from ngrok output:
```
https://xxxx-xxxx-xxxx.ngrok-free.app
```

Share this URL with anyone! They can access your Padel Tournament app by adding `/index.html` to the end:
```
https://xxxx-xxxx-xxxx.ngrok-free.app/index.html
```

## Quick Start Commands

### Windows (PowerShell or CMD):
```powershell
# Terminal 1: Start the server
node server.py

# Terminal 2: Start ngrok
ngrok http 8000
```

### Mac/Linux:
```bash
# Terminal 1: Start the server
node server.js

# Terminal 2: Start ngrok
ngrok http 8000
```

## Important Notes

### Keep Both Terminals Open
- Terminal 1: Your local server (Node.js/Python)
- Terminal 2: ngrok tunnel
- Both must remain running for the app to be accessible

### Free Tier Limitations
- ngrok free tier has some limitations:
  - Random URLs (changes each session)
  - Limited bandwidth
  - Session timeout (8 hours)
  - 2 tunnels per account

### Security
- Anyone with the ngrok URL can access your app
- Don't share sensitive data
- Consider using ngrok's paid features for production use

### Troubleshooting

#### ngrok shows "Connection Refused"
- Make sure your local server is running
- Check that the server is on port 8000
- Try restarting ngrok

#### ngrok URL doesn't work
- Wait a few seconds for the tunnel to establish
- Check that both server and ngrok are running
- Try refreshing the ngrok URL

#### "ngrok is not recognized"
- Make sure ngrok is in your PATH
- Use full path to ngrok executable
- Restart your terminal

## Advanced Options

### Custom Subdomain (Paid Feature)
```bash
ngrok http 8000 --domain=your-custom-domain.ngrok-free.app
```

### Basic Auth (Password Protection)
```bash
ngrok http 8000 --auth=username:password
```

### Inspect Traffic
```bash
ngrok http 8000 --log=stdout
```

## Stopping the Server

1. Press `Ctrl+C` in the ngrok terminal
2. Press `Ctrl+C` in the server terminal
3. Both processes will stop

## Alternative: Using ngrok Config File

Create `ngrok.yml`:
```yaml
tunnels:
  padel-tournament:
    addr: 8000
    proto: http
    bind_tls: true
    inspect: false
```

Run with:
```bash
ngrok start --all
```

## Need Help?

- ngrok Documentation: https://ngrok.com/docs
- ngrok Support: https://ngrok.com/contact
- Check ngrok status: https://status.ngrok.com

## Summary

1. ✅ Start local server (Node.js or Python)
2. ✅ Start ngrok in new terminal: `ngrok http 8000`
3. ✅ Copy HTTPS URL from ngrok output
4. ✅ Share URL with `/index.html` appended
5. ✅ Keep both terminals running

Your Padel Tournament app is now accessible from anywhere! 🎉
