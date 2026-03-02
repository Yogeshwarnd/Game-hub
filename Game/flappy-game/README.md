# Flappy Bird Game - Complete Setup Guide

A fully functional Flappy Bird-style browser game with HTML5 Canvas, Vanilla JavaScript, PHP backend, and MySQL database.

## Project Structure

```
flappy-game/
├── index.html           # Main game HTML file
├── style.css           # Game styling
├── game.js             # Game logic (Canvas rendering, physics, collision detection)
├── db.php              # Database connection file
├── save_score.php      # API endpoint for saving scores
├── get_scores.php      # API endpoint for retrieving leaderboard
├── database.sql        # MySQL database schema
└── README.md           # This file
```

## Features

### Game Features
- Gravity-based bird physics
- Flap mechanism (Spacebar or Click)
- Randomly generated pipes with varying gaps
- Smooth 60 FPS animation using requestAnimationFrame
- Collision detection with pipes and ground
- Score tracking and display
- Game Over screen with restart option
- High score tracking in localStorage

### Backend Features
- Save player scores to MySQL database
- Retrieve top 10 scores (leaderboard)
- Secure prepared statements (SQL injection prevention)
- JSON API responses
- Input validation and sanitization
- Error handling with appropriate HTTP status codes

### Database
- MySQL table with indexed columns for performance
- Automatic timestamp tracking
- UTF-8 character encoding support

## Prerequisites

### Software Required
- **XAMPP** (or any local PHP + MySQL server)
  - Download: https://www.apachefriends.org/
- **Text Editor** (VS Code, Sublime Text, etc.)
- **Web Browser** (Chrome, Firefox, Safari, Edge)

### Supported Browsers
- Chrome 60+
- Firefox 55+
- Safari 10+
- Edge 79+

## Installation & Setup

### Step 1: Install XAMPP

1. Download XAMPP from https://www.apachefriends.org/
2. Run the installer and complete the setup
3. Default installation path:
   - Windows: `C:\xampp`
   - Mac: `/Applications/XAMPP`
   - Linux: `/opt/lampp`

### Step 2: Start XAMPP Services

**On Windows:**
1. Open XAMPP Control Panel
2. Click "Start" for Apache
3. Click "Start" for MySQL

**On Mac/Linux:**
1. Open Terminal
2. Run: `sudo /Applications/XAMPP/xamppfiles/xampp start` (Mac)
3. Or: `sudo /opt/lampp/lampp start` (Linux)

### Step 3: Copy Project Files

1. Copy the entire `flappy-game` folder to your web root:
   - **Windows:** `C:\xampp\htdocs\flappy-game`
   - **Mac:** `/Applications/XAMPP/htdocs/flappy-game`
   - **Linux:** `/opt/lampp/htdocs/flappy-game`

### Step 4: Create Database

#### Method 1: Using phpMyAdmin (GUI)

1. Open http://localhost/phpmyadmin in your browser
2. Click on "SQL" tab at the top
3. Paste the entire contents of `database.sql`
4. Click "Go" to execute

#### Method 2: Using MySQL Command Line

1. Open Terminal/Command Prompt
2. Navigate to your project folder
3. Run the following commands:

```bash
# Connect to MySQL (Windows/Mac/Linux)
mysql -u root -p

# Press Enter if no password (default)
# Then paste these commands:

CREATE DATABASE IF NOT EXISTS flappy_game;
USE flappy_game;

CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_name VARCHAR(50) NOT NULL,
    score INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_score (score DESC),
    INDEX idx_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

exit;
```

#### Method 3: Automatic Import (Recommended)

1. Open Terminal/Command Prompt
2. Navigate to the `flappy-game` folder
3. Run:

```bash
# Windows
mysql -u root -p flappy_game < database.sql

# Mac/Linux
mysql -u root -p flappy_game < database.sql
```

### Step 5: Verify Database Connection (Optional)

1. Open http://localhost/phpmyadmin
2. In the left sidebar, you should see `flappy_game` database
3. Click on it to verify the `scores` table exists

## Running the Game

### Starting the Game

1. Start XAMPP (Apache and MySQL services running)
2. Open your browser
3. Go to: **http://localhost/flappy-game**
4. Click the canvas or press SPACEBAR to start playing

### Game Controls

| Input | Action |
|-------|--------|
| **SPACEBAR** | Flap bird |
| **MOUSE CLICK** | Flap bird |
| **Touch** | Flap bird (mobile) |

### Game Rules

- Each passed pipe increases your score by 1
- Avoid hitting the top and bottom pipes
- Avoid hitting the ground
- Game ends on collision
- Save your score to the leaderboard
- Check your ranking on the leaderboard

## Testing Locally

### Test 1: Basic Game Functionality

1. Load http://localhost/flappy-game
2. Verify the game canvas displays
3. Press SPACEBAR or click to start
4. Verify bird falls with gravity
5. Press SPACEBAR to flap
6. Verify pipes appear and move
7. Verify score increments when passing pipes
8. Intentionally crash to trigger Game Over

**Expected Result:** Game Over modal appears with final score

### Test 2: Save Score Functionality

1. Play and end game
2. Enter a player name in the modal
3. Click "Save Score"
4. Verify success message appears

**Expected Result:** Green success message "Score saved successfully!"

### Test 3: Error Handling - Empty Name

1. End game and see Game Over modal
2. Leave the name field empty
3. Click "Save Score"

**Expected Result:** Red error message "Please enter your name!"

### Test 4: Error Handling - Long Name

1. End game and see Game Over modal
2. Enter more than 50 characters
3. Click "Save Score"

**Expected Result:** Red error message about name length

### Test 5: Leaderboard Display

1. Save multiple scores with different names and scores
2. Verify top 10 scores appear in the leaderboard
3. Verify scores are sorted by score (highest first)
4. Verify ranking (1st, 2nd, 3rd) has special styling

**Expected Result:** Leaderboard shows scores in correct order with proper styling

### Test 6: Database Verification

1. Open http://localhost/phpmyadmin
2. Select `flappy_game` database
3. Select `scores` table
4. View records to verify saved data

**Expected Result:** All saved scores appear in the table

### Test 7: Restart Game

1. End game and see Game Over modal
2. Click "Restart Game"

**Expected Result:** Game resets, canvas clears, ready for new game

### Test 8: High Score - Local Storage

1. Play and save score (e.g., 100 points)
2. Refresh page (F5)
3. Play and end game with lower score (e.g., 50 points)
4. Close the browser
5. Reopen browser and go back to game

**Expected Result:** High score persists (localStorage)

### Test 9: Responsive Design

1. Open game on different screen sizes
2. Test on mobile device (portrait and landscape)
3. Test on tablet

**Expected Result:** Game adapts to screen size

### Test 10: API Response Format

1. Open Developer Tools (F12)
2. Go to Network tab
3. Save a score
4. Click on `save_score.php` request
5. View Response to verify JSON format

**Expected Response:**
```json
{
    "success": true,
    "message": "Score saved successfully",
    "id": 1,
    "player_name": "John",
    "score": 150
}
```

## API Endpoints

### POST /save_score.php

**Purpose:** Save a player's score to the database

**Request:**
```json
{
    "player_name": "John Doe",
    "score": 150
}
```

**Response (Success - 201):**
```json
{
    "success": true,
    "message": "Score saved successfully",
    "id": 1,
    "player_name": "John Doe",
    "score": 150
}
```

**Response (Error - 400):**
```json
{
    "success": false,
    "message": "Missing required fields: player_name, score"
}
```

### GET /get_scores.php

**Purpose:** Retrieve top 10 scores from the database

**Response (Success - 200):**
```json
{
    "success": true,
    "message": "Scores retrieved successfully",
    "count": 3,
    "scores": [
        {
            "id": 4,
            "player_name": "Alice",
            "score": 200,
            "created_at": "2024-01-15 10:30:00"
        },
        {
            "id": 1,
            "player_name": "John",
            "score": 150,
            "created_at": "2024-01-15 09:15:00"
        },
        {
            "id": 2,
            "player_name": "Jane",
            "score": 120,
            "created_at": "2024-01-15 08:45:00"
        }
    ]
}
```

## Physics Constants

These values can be tweaked in `game.js` for difficulty adjustment:

```javascript
const GRAVITY = 0.4;              // Gravity acceleration
const FLAP_VELOCITY = -8;         // Upward velocity when flapping
const PIPE_SPEED = 3;             // Horizontal pipe movement speed
const PIPE_GAP = 120;             // Vertical space between top/bottom pipes
const PIPE_INTERVAL = 180;        // Frames between pipe generation
const FPS = 60;                   // Target frames per second
```

### Difficulty Adjustments

**Make Easier:**
- Increase `PIPE_GAP` (150+)
- Decrease `PIPE_SPEED` (2)
- Increase `FLAP_VELOCITY` (-10)

**Make Harder:**
- Decrease `PIPE_GAP` (80)
- Increase `PIPE_SPEED` (4)
- Decrease `FLAP_VELOCITY` (-6)

## Troubleshooting

### Issue: Database Connection Error

**Error:** `Connection failed: Connection refused`

**Solution:**
1. Verify MySQL is running in XAMPP
2. Check credentials in `db.php`
3. Verify database name is `flappy_game`

### Issue: Scores Not Saving

**Error:** No success/error message after clicking "Save Score"

**Solutions:**
1. Open Developer Tools (F12) → Console
2. Check for JavaScript errors
3. Check Network tab to see if request is being sent
4. Verify PHP files are in correct location

### Issue: Empty Leaderboard

**Possible Causes:**
1. No scores saved yet (Expected behavior initially)
2. Database not properly created
3. Connection issue with database

**Solution:**
1. Save at least one score first
2. Verify database table exists in phpMyAdmin
3. Check browser console for errors

### Issue: Game Not Loading

**Error:** White blank screen

**Solutions:**
1. Verify files are in `htdocs/flappy-game`
2. Check browser console for errors (F12)
3. Verify Apache is running
4. Try clearing browser cache (Ctrl+Shift+Delete)
5. Try different browser

### Issue: Spacebar Not Working

**Solution:**
1. Click on game canvas first to focus it
2. Try mouse click instead
3. Check browser console for JavaScript errors

### Issue: CORS Error in Console

**Error:** `Access to XMLHttpRequest blocked by CORS policy`

**Note:** This shouldn't happen on localhost, but if it does:
1. Add CORS headers to PHP files
2. Save files in proper htdocs location
3. Access via `localhost`, not IP address

## File Descriptions

### index.html
- Contains HTML structure with canvas element
- Game Over modal for score saving
- Leaderboard section
- Game instructions
- Responsive meta tags

### style.css
- Modern, gradient-based design
- Responsive layout for mobile devices
- Modal styling and animations
- Leaderboard table styling
- Button hover effects
- Canvas styling

### game.js
- Complete game logic (1000+ lines)
- Bird physics (gravity, velocity, collision)
- Pipe generation and movement
- Collision detection
- Score tracking
- Canvas rendering with 60 FPS
- Keyboard and mouse input handlers
- API communication with Fetch
- LocalStorage for high score

### db.php
- MySQL connection setup
- Error handling for connection failures
- UTF-8 charset configuration
- Reusable connection object

### save_score.php
- POST endpoint for saving scores
- Input validation and sanitization
- Prepared statement for SQL injection prevention
- HTTP status code handling
- JSON response formatting
- Error messages

### get_scores.php
- GET endpoint for retrieving leaderboard
- Top 10 scores query with proper sorting
- HTML entity escaping for security
- JSON response formatting
- Error handling

### database.sql
- Database creation statement
- Scores table schema
- Indexed columns for performance
- UTF-8 collation
- Sample data (commented)

## Security Features

1. **SQL Injection Prevention:** Prepared statements in all PHP queries
2. **XSS Prevention:** `htmlspecialchars()` for user input output
3. **CSRF Protection:** Using POST for data modification
4. **Input Validation:** All inputs validated on server side
5. **Error Handling:** Proper HTTP status codes and error messages

## Performance Optimizations

1. **Canvas Scaling:** Responsive canvas adapts to screen size
2. **Pipe Removal:** Off-screen pipes removed from memory
3. **Indexed Database:** Columns indexed for faster queries
4. **Efficient Collision Detection:** Bounding box detection
5. **RequestAnimationFrame:** Optimal 60 FPS rendering
6. **LocalStorage:** Client-side high score caching

## Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 60+ | ✅ Full |
| Firefox | 55+ | ✅ Full |
| Safari | 10+ | ✅ Full |
| Edge | 79+ | ✅ Full |
| IE 11 | - | ❌ Not supported |

## Future Enhancement Ideas

1. Sound effects and background music
2. Different bird skins/themes
3. Difficulty levels
4. Daily challenges
5. Multiplayer mode
6. Game pause functionality
7. Power-ups (shield, slow motion)
8. Statistics tracking (total games, avg score)
9. Monthly leaderboards
10. User accounts and authentication

## License

This project is free to use and modify for educational purposes.

## Support

For issues or questions:
1. Check the Troubleshooting section
2. Verify all setup steps
3. Check browser console for errors (F12)
4. Verify database connection using phpMyAdmin

---

**Enjoy playing Flappy Bird!** 🐦
