const fetch = require("node-fetch");

const YT_KEY = process.env.YT_KEY;
const FIREBASE_PROJECT = process.env.FB_PROJECT;
const FIREBASE_API_KEY = process.env.FB_API_KEY;

const MAX_VIDEOS = 40;

async function fetchYouTube() {
  const url = `https://www.googleapis.com/youtube/v3/search?key=${YT_KEY}&q=india breaking news&part=snippet,id&type=video&order=date&maxResults=20`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    console.log("YouTube Error:", data.error);
    return [];
  }

  const items = data.items || [];

  const unique = [];
  const seenTitles = new Set();

  for (let video of items) {
    const cleanTitle = video.snippet.title
      .toLowerCase()
      .replace(/\d+\s?(am|pm)/g, "")
      .replace(/top headlines today/g, "")
      .trim();

    if (!seenTitles.has(cleanTitle)) {
      seenTitles.add(cleanTitle);
      unique.push(video);
    }
  }

  return unique.slice(0,10);
}
function detectCategory(title) {
  title = title.toLowerCase();

  if (title.includes("crime") || title.includes("murder")) return "Crime";
  if (title.includes("accident")) return "Accident";
  if (title.includes("politics") || title.includes("election")) return "Politics";
  return "General";
}

async function saveToFirestore(video) {
  const videoId = video.id.videoId;
  const category = detectCategory(video.snippet.title);

  const firestoreURL =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/news/${videoId}?key=${FIREBASE_API_KEY}`;

  const body = {
    fields: {
      videoId: { stringValue: videoId },
      title: { stringValue: video.snippet.title },
      description: { stringValue: video.snippet.description.substring(0,200) },
      channel: { stringValue: video.snippet.channelTitle },
      thumbnail: { stringValue: video.snippet.thumbnails.high.url },
      category: { stringValue: category },
      publishedAt: { stringValue: video.snippet.publishedAt },
      trendingScore: { integerValue: Date.now() }
    }
  };

  await fetch(firestoreURL, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  console.log("Saved:", videoId);
}

async function cleanupOldVideos() {
  const listURL =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/news?key=${FIREBASE_API_KEY}`;

  const res = await fetch(listURL);
  const data = await res.json();

  if (!data.documents) return;

  const docs = data.documents;

  if (docs.length <= MAX_VIDEOS) return;

  const sorted = docs.sort((a, b) =>
    parseInt(b.fields.trendingScore.integerValue) -
    parseInt(a.fields.trendingScore.integerValue)
  );

  const toDelete = sorted.slice(MAX_VIDEOS);

  for (let doc of toDelete) {
    await fetch(doc.name + `?key=${FIREBASE_API_KEY}`, {
      method: "DELETE"
    });
    console.log("Deleted old:", doc.name);
  }
}

async function run() {
  const videos = await fetchYouTube();

  for (let video of videos) {
    if (!video.id.videoId) continue;
    await saveToFirestore(video);
  }

  await cleanupOldVideos();

  console.log("Fetch complete");
}

run();
