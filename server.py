#!/usr/bin/env python3
"""
Simple HTTP Server for Padel Tournament
Run this script to serve the padel-tournament.html file locally
"""

import http.server
import socketserver
import os
import webbrowser
from pathlib import Path

# Configuration
PORT = 8000
DIRECTORY = Path(__file__).parent

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        # Enable CORS for ngrok
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

def start_server():
    # Change to the directory containing this script
    os.chdir(DIRECTORY)
    
    # Create the server
    with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
        print(f"\n{'='*60}")
        print(f"  PADEL TOURNAMENT SERVER")
        print(f"{'='*60}")
        print(f"\n🚀 Server started successfully!")
        print(f"\n📍 Local Access:")
        print(f"   http://localhost:{PORT}/index.html")
        print(f"   http://127.0.0.1:{PORT}/index.html")
        print(f"\n📱 Network Access (for devices on same network):")
        import socket
        hostname = socket.gethostname()
        local_ip = socket.gethostbyname(hostname)
        print(f"   http://{local_ip}:{PORT}/index.html")
        print(f"\n🌐 For ngrok access:")
        print(f"   1. Download ngrok from: https://ngrok.com/download")
        print(f"   2. Run: ngrok http {PORT}")
        print(f"   3. Use the ngrok URL provided")
        print(f"\n⏹️  Press Ctrl+C to stop the server")
        print(f"{'='*60}\n")
        
        # Open browser automatically
        webbrowser.open(f'http://localhost:{PORT}/index.html')
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print(f"\n\n{'='*60}")
            print(f"  Server stopped. Goodbye! 👋")
            print(f"{'='*60}\n")

if __name__ == "__main__":
    start_server()
