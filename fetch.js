import fetch from "node-fetch";

const YT_KEY = process.env.YT_KEY;
const FIREBASE_PROJECT = process.env.FB_PROJECT;

const CHANNEL_ID = "UCt4t-jeY85JegMlZ-E5UWtA";

async function fetchYouTube() {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=5`;
  const res = await fetch(url);
  const data = await res.json();
  return data.items || [];
}

async function saveToFirestore(video) {

  const firestoreURL = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/news`;

  const body = {
    fields: {
      videoId: { stringValue: video.id.videoId },
      title: { stringValue: video.snippet.title },
      description: { stringValue: video.snippet.description.substring(0,200) },
      channel: { stringValue: video.snippet.channelTitle },
      date: { stringValue: new Date(video.snippet.publishedAt).toLocaleString() }
    }
  };

  await fetch(firestoreURL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
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
