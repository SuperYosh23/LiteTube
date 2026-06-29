// LiteTube - Lightweight YouTube Frontend for Low-End Devices
// Uses web scraping with CORS proxy and YouTube IFrame Player API

const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://cors-anywhere.herokuapp.com/'
];
let currentProxyIndex = 0;
let player;
let currentVideoId = null;

// Initialize YouTube IFrame Player API
function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'rel': 0,
            'modestbranding': 1
        },
        events: {
            'onReady': onPlayerReady
        }
    });
}

function onPlayerReady(event) {
    // Player is ready
}

// Extract video ID from YouTube URL
function extractVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

// Search YouTube videos via web scraping
async function searchVideos(query) {
    const loading = document.getElementById('loading');
    const results = document.getElementById('results');
    
    loading.classList.remove('hidden');
    results.innerHTML = '';
    
    // Convert spaces to + for YouTube URL
    const searchQuery = query.replace(/\s+/g, '+');
    
    // Try each CORS proxy until one works
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            const proxy = CORS_PROXIES[i];
            const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;
            console.log(`Trying proxy ${i}: ${proxy}`);
            const response = await fetch(proxy + encodeURIComponent(searchUrl));
            
            console.log(`Response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const html = await response.text();
            console.log(`HTML length: ${html.length}`);
            const videos = parseYouTubeResults(html);
            console.log(`Found ${videos.length} videos`);
            
            if (videos && videos.length > 0) {
                currentProxyIndex = i;
                displayResults(videos);
                loading.classList.add('hidden');
                return;
            }
        } catch (error) {
            console.error(`Error with proxy ${CORS_PROXIES[i]}:`, error.message);
        }
    }
    
    // All proxies failed - show manual URL option
    results.innerHTML = `
        <p class="error">Unable to fetch search results. All CORS proxies are currently unavailable.</p>
        <div style="padding: 20px; background: #2a2a2a; margin-top: 15px;">
            <h3 style="margin-bottom: 10px;">Alternative: Direct Video Load</h3>
            <p style="margin-bottom: 10px; color: #aaa;">Paste a YouTube URL or video ID directly:</p>
            <input type="text" id="directUrlInput" placeholder="https://youtube.com/watch?v=..." 
                   style="width: 100%; padding: 10px; margin-bottom: 10px; background: #333; color: #fff; border: 1px solid #444;">
            <button id="directLoadBtn" style="padding: 10px 20px; background: #ff0000; color: #fff; border: none; cursor: pointer;">Load Video</button>
        </div>
    `;
    loading.classList.add('hidden');
    
    // Add event listener for direct load button
    document.getElementById('directLoadBtn').addEventListener('click', () => {
        const url = document.getElementById('directUrlInput').value.trim();
        const videoId = extractVideoId(url);
        if (videoId) {
            playVideo(videoId, 'Direct Load', 'YouTube');
        } else {
            alert('Invalid YouTube URL or video ID');
        }
    });
}

// Parse YouTube search results from HTML
function parseYouTubeResults(html) {
    const videos = [];
    
    // Try to extract video data from ytInitialData (multiple patterns)
    const ytDataPatterns = [
        /var ytInitialData = ({.*?});/,
        /ytInitialData = ({.*?});/,
        /"ytInitialData":({.*?}),/
    ];
    
    for (const pattern of ytDataPatterns) {
        const ytDataMatch = html.match(pattern);
        if (ytDataMatch) {
            try {
                const data = JSON.parse(ytDataMatch[1]);
                const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents;
                
                if (contents) {
                    for (const section of contents) {
                        const items = section.itemSectionRenderer?.contents;
                        if (items) {
                            for (const item of items) {
                                const video = item.videoRenderer || item.compactVideoRenderer;
                                if (video && video.videoId) {
                                    videos.push({
                                        videoId: video.videoId,
                                        title: video.title?.runs?.[0]?.text || video.title?.simpleText || '',
                                        channel: video.ownerText?.runs?.[0]?.text || video.shortBylineText?.runs?.[0]?.text || '',
                                        thumbnail: video.thumbnail?.thumbnails?.[0]?.url || ''
                                    });
                                }
                            }
                        }
                    }
                }
                if (videos.length > 0) return videos;
            } catch (e) {
                console.error('Error parsing ytInitialData:', e);
            }
        }
    }
    
    // Fallback: improved regex extraction
    if (videos.length === 0) {
        const videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const titleRegex = /"text":"([^"]{10,100})"/g;
        const channelRegex = /"channelName":"([^"]+)"/g;
        
        const videoIds = [...html.matchAll(videoIdRegex)].map(m => m[1]);
        const titles = [...html.matchAll(titleRegex)].map(m => m[1]);
        const channels = [...html.matchAll(channelRegex)].map(m => m[1]);
        
        // Filter unique video IDs
        const uniqueVideoIds = [...new Set(videoIds)];
        
        for (let i = 0; i < Math.min(uniqueVideoIds.length, 12); i++) {
            videos.push({
                videoId: uniqueVideoIds[i],
                title: titles[i] || 'Video',
                channel: channels[i] || 'Channel',
                thumbnail: `https://img.youtube.com/vi/${uniqueVideoIds[i]}/mqdefault.jpg`
            });
        }
    }
    
    return videos;
}

// Display search results
function displayResults(items) {
    console.log('displayResults called with', items.length, 'items');
    const results = document.getElementById('results');
    const resultsContainer = document.getElementById('resultsContainer');
    
    console.log('Results container before:', resultsContainer.className);
    resultsContainer.classList.remove('hidden');
    console.log('Results container after:', resultsContainer.className);
    
    items.forEach(item => {
        const videoId = item.videoId;
        const title = item.title;
        const channel = item.channel || item.author;
        const thumbnail = item.thumbnail || 
                         item.videoThumbnails?.find(t => t.quality === 'medium')?.url || 
                         item.videoThumbnails?.find(t => t.quality === 'default')?.url ||
                         `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        console.log('Creating video card for:', title);
        const videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.innerHTML = `
            <img src="${thumbnail}" alt="${title}" class="thumbnail" loading="lazy">
            <div class="video-card-info">
                <h3 class="video-card-title">${title}</h3>
                <p class="video-card-channel">${channel}</p>
            </div>
        `;
        
        videoCard.addEventListener('click', () => playVideo(videoId, title, channel));
        results.appendChild(videoCard);
    });
    
    console.log('Finished adding', items.length, 'video cards');
}

// Handle search/URL input
function handleSearch() {
    const input = document.getElementById('searchInput').value.trim();
    
    if (!input) return;
    
    // Hide home container
    document.getElementById('homeContainer').classList.add('hidden');
    
    // Check if it's a YouTube URL or video ID
    const videoId = extractVideoId(input);
    if (videoId) {
        playVideo(videoId, 'Video from URL', 'YouTube');
        return;
    }
    
    // Otherwise treat it as a search query
    searchVideos(input);
}

// Load video from URL
function loadVideoFromUrl() {
    handleSearch();
}

// Play selected video
function playVideo(videoId, title, channel) {
    currentVideoId = videoId;
    
    document.getElementById('videoTitle').textContent = title;
    document.getElementById('videoChannel').textContent = channel;
    
    document.getElementById('resultsContainer').classList.add('hidden');
    document.getElementById('videoContainer').classList.remove('hidden');
    
    if (player && player.loadVideoById) {
        player.loadVideoById(videoId);
    }
}

// Go back to search results
function goBack() {
    document.getElementById('videoContainer').classList.add('hidden');
    document.getElementById('resultsContainer').classList.remove('hidden');
    
    if (player && player.stopVideo) {
        player.stopVideo();
    }
}

// Go to home page
function goHome() {
    document.getElementById('videoContainer').classList.add('hidden');
    document.getElementById('resultsContainer').classList.add('hidden');
    document.getElementById('homeContainer').classList.remove('hidden');
    document.getElementById('searchInput').value = '';
    
    if (player && player.stopVideo) {
        player.stopVideo();
    }
}

// Event listeners
document.getElementById('searchBtn').addEventListener('click', handleSearch);

document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

document.getElementById('backBtn').addEventListener('click', goBack);
document.getElementById('homeBtn').addEventListener('click', goHome);
