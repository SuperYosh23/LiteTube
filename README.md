# LiteTube - Lightweight YouTube Frontend

A minimal, web-based YouTube frontend optimized for low-end devices such as Wii U, Nintendo 3DS, and other resource-constrained systems.

## Features

- **Lightweight Design**: Minimal JavaScript and CSS for fast loading on low-end devices
- **No API Key Required**: Uses web scraping with CORS proxy (no Google API key needed)
- **YouTube Integration**: Scrapes YouTube search results and uses YouTube IFrame API for playback
- **Responsive Layout**: Optimized for various screen sizes including small handheld screens
- **No Frameworks**: Pure HTML, CSS, and JavaScript - no heavy dependencies
- **Simple Interface**: Search YouTube or paste URLs to watch videos

## Requirements

- A web server (can be local or hosted)
- Active internet connection

## Setup

1. **Serve the Application**:
   - Use any web server to serve the files
   - Example using Python:
     ```bash
     python3 -m http.server 8000
     ```
   - Or use Node.js:
     ```bash
     npx serve
     ```

2. **Access the Application**:
   - Open your browser and navigate to `http://localhost:8000`
   - On Wii U/3DS, enter the server URL in the browser

## Usage

- **Search**: Enter a search query and press Enter or click Search to find videos
- **Direct Load**: Paste a YouTube URL or video ID to directly load a specific video
- **Play Video**: Click on any video thumbnail to play it
- **Back**: Click "Back to Results" to return to search results

## Optimization for Low-End Devices

- Minimal DOM manipulation
- Lazy loading for thumbnails
- No animations or transitions
- Efficient CSS selectors
- Responsive grid layout
- Small font sizes for small screens
- Touch-friendly interface

## Browser Compatibility

- Wii U Browser
- Nintendo 3DS Browser
- Any modern browser with JavaScript enabled

## File Structure

```
lightweight-youtube/
├── index.html    # Main HTML structure
├── styles.css    # Optimized CSS styling
├── script.js     # JavaScript logic for API integration
└── README.md     # This file
```

## Notes

- The application requires an active internet connection to access YouTube via CORS proxy
- Web scraping may break if YouTube changes their HTML structure
- CORS proxies are used to bypass browser restrictions; multiple proxies are tried for reliability
- For production use, consider hosting your own CORS proxy or backend server
- The YouTube IFrame API is used for video playback, which requires JavaScript

## License

This project is provided as-is for educational and personal use.
