// LiteTube - Lightweight YouTube Frontend for Low-End Devices
// Uses web scraping with CORS proxy and YouTube IFrame Player API
// ES5 compatible for Wii U browser

var CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://corsproxy.io/?',
    'https://cors-anywhere.herokuapp.com/',
    'https://thingproxy.freeboard.io/fetch/'
];
var currentProxyIndex = 0;
var player;
var currentVideoId = null;

// Debug function for on-screen logging (Wii U has no console)
function debugLog(message) {
    console.log(message);
    var debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.innerHTML += message + '<br>';
        debugDiv.scrollTop = debugDiv.scrollHeight;
    }
}

function clearDebug() {
    var debugDiv = document.getElementById('debug');
    if (debugDiv) {
        debugDiv.innerHTML = '';
    }
}

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
    var patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
        /^([a-zA-Z0-9_-]{11})$/
    ];
    
    for (var i = 0; i < patterns.length; i++) {
        var pattern = patterns[i];
        var match = url.match(pattern);
        if (match) {
            return match[1];
        }
    }
    return null;
}

// Search YouTube videos via web scraping
function searchVideos(query) {
    debugLog('searchVideos called with: ' + query);
    clearDebug();
    debugLog('Starting search for: ' + query);
    
    var loading = document.getElementById('loading');
    var results = document.getElementById('results');
    
    loading.classList.remove('hidden');
    results.innerHTML = '';
    
    // Convert spaces to + for YouTube URL
    var searchQuery = query.replace(/\s+/g, '+');
    debugLog('Search query: ' + searchQuery);
    
    // Try each CORS proxy until one works
    tryProxy(0, searchQuery, loading, results);
}

function tryProxy(index, searchQuery, loading, results) {
    if (index >= CORS_PROXIES.length) {
        // All proxies failed - show manual URL option
        showDirectLoadOption(results, loading);
        return;
    }
    
    var proxy = CORS_PROXIES[index];
    var searchUrl = 'https://www.youtube.com/results?search_query=' + searchQuery;
    
    debugLog('Trying proxy ' + index + ': ' + proxy);
    
    var xhr = new XMLHttpRequest();
    xhr.open('GET', proxy + encodeURIComponent(searchUrl), true);
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            debugLog('Response status: ' + xhr.status);
            if (xhr.status === 200) {
                var html = xhr.responseText;
                debugLog('HTML length: ' + html.length);
                var videos = parseYouTubeResults(html);
                debugLog('Found ' + videos.length + ' videos');
                
                if (videos && videos.length > 0) {
                    currentProxyIndex = index;
                    displayResults(videos);
                    loading.classList.add('hidden');
                } else {
                    tryProxy(index + 1, searchQuery, loading, results);
                }
            } else {
                debugLog('Error with proxy ' + CORS_PROXIES[index] + ': HTTP ' + xhr.status);
                tryProxy(index + 1, searchQuery, loading, results);
            }
        }
    };
    xhr.onerror = function() {
        debugLog('Error with proxy ' + CORS_PROXIES[index]);
        tryProxy(index + 1, searchQuery, loading, results);
    };
    xhr.send();
}

function showDirectLoadOption(results, loading) {
    results.innerHTML = 
        '<p class="error">Unable to fetch search results. All CORS proxies are currently unavailable.</p>' +
        '<div style="padding: 20px; background: #2a2a2a; margin-top: 15px;">' +
        '<h3 style="margin-bottom: 10px;">Alternative: Direct Video Load</h3>' +
        '<p style="margin-bottom: 10px; color: #aaa;">Paste a YouTube URL or video ID directly:</p>' +
        '<input type="text" id="directUrlInput" placeholder="https://youtube.com/watch?v=..." ' +
        'style="width: 100%; padding: 10px; margin-bottom: 10px; background: #333; color: #fff; border: 1px solid #444;">' +
        '<button id="directLoadBtn" style="padding: 10px 20px; background: #ff0000; color: #fff; border: none; cursor: pointer;">Load Video</button>' +
        '</div>';
    loading.classList.add('hidden');
    
    // Add event listener for direct load button
    var directLoadBtn = document.getElementById('directLoadBtn');
    if (directLoadBtn) {
        directLoadBtn.onclick = function() {
            var url = document.getElementById('directUrlInput').value.trim();
            var videoId = extractVideoId(url);
            if (videoId) {
                playVideo(videoId, 'Direct Load', 'YouTube');
            } else {
                alert('Invalid YouTube URL or video ID');
            }
        };
    }
}

// Parse YouTube search results from HTML
function parseYouTubeResults(html) {
    var videos = [];
    
    // Try to extract video data from ytInitialData (multiple patterns)
    var ytDataPatterns = [
        /var ytInitialData = ({.*?});/,
        /ytInitialData = ({.*?});/,
        /"ytInitialData":({.*?}),/
    ];
    
    for (var i = 0; i < ytDataPatterns.length; i++) {
        var pattern = ytDataPatterns[i];
        var ytDataMatch = html.match(pattern);
        if (ytDataMatch) {
            try {
                var data = JSON.parse(ytDataMatch[1]);
                var contents = null;
                if (data.contents && data.contents.twoColumnSearchResultsRenderer && 
                    data.contents.twoColumnSearchResultsRenderer.primaryContents && 
                    data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer) {
                    contents = data.contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents;
                }
                
                if (contents) {
                    for (var j = 0; j < contents.length; j++) {
                        var section = contents[j];
                        var items = null;
                        if (section.itemSectionRenderer) {
                            items = section.itemSectionRenderer.contents;
                        }
                        if (items) {
                            for (var k = 0; k < items.length; k++) {
                                var item = items[k];
                                var video = null;
                                if (item.videoRenderer) {
                                    video = item.videoRenderer;
                                } else if (item.compactVideoRenderer) {
                                    video = item.compactVideoRenderer;
                                }
                                if (video && video.videoId) {
                                    var title = '';
                                    if (video.title && video.title.runs && video.title.runs[0]) {
                                        title = video.title.runs[0].text;
                                    } else if (video.title && video.title.simpleText) {
                                        title = video.title.simpleText;
                                    }
                                    
                                    var channel = '';
                                    if (video.ownerText && video.ownerText.runs && video.ownerText.runs[0]) {
                                        channel = video.ownerText.runs[0].text;
                                    } else if (video.shortBylineText && video.shortBylineText.runs && video.shortBylineText.runs[0]) {
                                        channel = video.shortBylineText.runs[0].text;
                                    }
                                    
                                    var thumbnail = '';
                                    if (video.thumbnail && video.thumbnail.thumbnails && video.thumbnail.thumbnails[0]) {
                                        thumbnail = video.thumbnail.thumbnails[0].url;
                                    }
                                    
                                    videos.push({
                                        videoId: video.videoId,
                                        title: title,
                                        channel: channel,
                                        thumbnail: thumbnail
                                    });
                                }
                            }
                        }
                    }
                }
                if (videos.length > 0) return videos;
            } catch (e) {
                debugLog('Error parsing ytInitialData: ' + e);
            }
        }
    }
    
    // Fallback: improved regex extraction
    if (videos.length === 0) {
        var videoIdRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        var titleRegex = /"text":"([^"]{10,100})"/g;
        var channelRegex = /"channelName":"([^"]+)"/g;
        
        var videoIds = [];
        var match;
        while ((match = videoIdRegex.exec(html)) !== null) {
            videoIds.push(match[1]);
        }
        
        var titles = [];
        while ((match = titleRegex.exec(html)) !== null) {
            titles.push(match[1]);
        }
        
        var channels = [];
        while ((match = channelRegex.exec(html)) !== null) {
            channels.push(match[1]);
        }
        
        // Filter unique video IDs
        var uniqueVideoIds = [];
        var seen = {};
        for (var i = 0; i < videoIds.length; i++) {
            if (!seen[videoIds[i]]) {
                seen[videoIds[i]] = true;
                uniqueVideoIds.push(videoIds[i]);
            }
        }
        
        var maxVideos = Math.min(uniqueVideoIds.length, 12);
        for (var i = 0; i < maxVideos; i++) {
            videos.push({
                videoId: uniqueVideoIds[i],
                title: titles[i] || 'Video',
                channel: channels[i] || 'Channel',
                thumbnail: 'https://img.youtube.com/vi/' + uniqueVideoIds[i] + '/mqdefault.jpg'
            });
        }
    }
    
    return videos;
}

// Display search results
function displayResults(items) {
    debugLog('displayResults called with ' + items.length + ' items');
    var results = document.getElementById('results');
    var resultsContainer = document.getElementById('resultsContainer');
    
    debugLog('Results container before: ' + resultsContainer.className);
    resultsContainer.classList.remove('hidden');
    debugLog('Results container after: ' + resultsContainer.className);
    
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var videoId = item.videoId;
        var title = item.title;
        var channel = item.channel || item.author;
        var thumbnail = item.thumbnail;
        
        if (!thumbnail) {
            thumbnail = 'https://img.youtube.com/vi/' + videoId + '/mqdefault.jpg';
        }
        
        debugLog('Creating video card for: ' + title);
        var videoCard = document.createElement('div');
        videoCard.className = 'video-card';
        videoCard.innerHTML = 
            '<img src="' + thumbnail + '" alt="' + title + '" class="thumbnail">' +
            '<div class="video-card-info">' +
            '<h3 class="video-card-title">' + title + '</h3>' +
            '<p class="video-card-channel">' + channel + '</p>' +
            '</div>';
        
        (function(vid, t, c) {
            videoCard.onclick = function() {
                playVideo(vid, t, c);
            };
        })(videoId, title, channel);
        
        results.appendChild(videoCard);
    }
    
    debugLog('Finished adding ' + items.length + ' video cards');
}

// Handle search/URL input
function handleSearch() {
    var input = document.getElementById('searchInput');
    var inputValue = input.value.trim();
    
    if (!inputValue) return;
    
    // Hide home container
    document.getElementById('homeContainer').classList.add('hidden');
    
    // Check if it's a YouTube URL or video ID
    var videoId = extractVideoId(inputValue);
    if (videoId) {
        playVideo(videoId, 'Video from URL', 'YouTube');
        return;
    }
    
    // Otherwise treat it as a search query
    searchVideos(inputValue);
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
document.getElementById('searchBtn').onclick = handleSearch;

document.getElementById('searchInput').onkeypress = function(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
        handleSearch();
    }
};

document.getElementById('backBtn').onclick = goBack;
document.getElementById('homeBtn').onclick = goHome;
