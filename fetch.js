const fetch = require("node-fetch");

const YT_KEY = process.env.YT_KEY;
const FIREBASE_PROJECT = process.env.FB_PROJECT;
const FIREBASE_API_KEY = process.env.FB_API_KEY;

const CHANNEL_ID = "UCt4t-jeY85JegMlZ-E5UWtA";

async function fetchYouTube() {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=5`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items || [];
}

async function saveToFirestore(video) {

  const firestoreURL =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/news?key=${FIREBASE_API_KEY}`;

  const body = {
    fields: {
      videoId: { stringValue: video.id.videoId },
      title: { stringValue: video.snippet.title },
      description: { stringValue: video.snippet.description.substring(0,200) },
      channel: { stringValue: video.snippet.channelTitle },
      date: { stringValue: new Date(video.snippet.publishedAt).toLocaleString() }
    }
  };

  const response = await fetch(firestoreURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const result = await response.text();
  console.log(result);
}

async function run() {
  const videos = await fetchYouTube();

  for (let video of videos) {
    if (!video.id.videoId) continue;
    await saveToFirestore(video);
  }

  console.log("Fetch complete");
}

run();
