#!/usr/bin/env python3
"""Screenshot generator for Chess 2.0 using Selenium + Chrome headless."""
import os
import sys
import time
import threading
import http.server
import socketserver
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(PROJECT_DIR, 'src')
PORT = 8765

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=SRC_DIR, **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress HTTP logs

def start_server():
    handler = CustomHandler
    httpd = socketserver.TCPServer(("", PORT), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    return httpd

def get_driver():
    options = Options()
    options.add_argument('--headless')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1280,800')
    service = Service(ChromeDriverManager().install())
    return webdriver.Chrome(service=service, options=options)

def screenshot(driver, name, js_setup=None):
    driver.get(f'http://localhost:{PORT}/index.html')
    time.sleep(0.5)
    if js_setup:
        driver.execute_script(js_setup)
        time.sleep(0.3)
    out_path = os.path.join(PROJECT_DIR, 'assets', 'screenshots', name)
    driver.save_screenshot(out_path)
    print(f'Saved {name}')

def main():
    server = start_server()
    driver = get_driver()
    try:
        # Home screen
        screenshot(driver, 'home_screen.png', """
            switchScreen('home');
        """)

        # Mode select
        screenshot(driver, 'mode_select.png', """
            switchScreen('modeSelect');
        """)

        # Character select (unlock all for a nice view)
        screenshot(driver, 'character_select.png', """
            store.set('maxUnlockedLevel', 5);
            switchScreen('characterSelect');
        """)

        # Theme select
        screenshot(driver, 'theme_select.png', """
            switchScreen('themeSelect');
        """)

        # Game screen - classic mode with some pieces moved
        screenshot(driver, 'game_screen.png', """
            store.set('mode', 'classic');
            store.set('whitePlayer', 'Player 1');
            store.set('blackPlayer', 'AI');
            switchScreen('game');
            // Make a few moves programmatically
            setTimeout(() => {
                if (screens.game && screens.game.board) {
                    screens.game.board.movePiece('e2', 'e4');
                    screens.game.board.movePiece('e7', 'e5');
                    screens.game.board.movePiece('g1', 'f3');
                    screens.game.turn = 'black';
                    screens.game.lastMove = { from: 'g1', to: 'f3' };
                }
            }, 100);
        """)

        # Pause menu - need to show game first then pause
        screenshot(driver, 'pause_menu.png', """
            store.set('mode', 'classic');
            switchScreen('game');
            setTimeout(() => {
                if (PauseMenu) PauseMenu.show();
            }, 200);
        """)

    finally:
        driver.quit()
        server.shutdown()

if __name__ == '__main__':
    main()
