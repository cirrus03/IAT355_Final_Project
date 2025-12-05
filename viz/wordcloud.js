// STOPWORD LIST
const stopwords = new Set([
  // Standard English stopwords
  "the","and","a","to","of","in","it","is","that","this","for","on","was", "can",
  "with","as","but","be","are","at","by","an","from","i","you","they",
  "we","he","she","them","my","your","their","so","if","not","or","just",
  "me","what","when","how","who","why","had","have","has","been","will",
  "its","too","very","also","because","while","than","then","there","here",
  "which","were","would","could","should","into","out","about","more",
  "most","such","only","other","some","any","really","really","also",
  "ever","maybe","perhaps","quite","even","still","yet","though", "his", "him", "her", "she",

  // Pronouns + contractions
  "im","ive","id","ill","youre","youve","youll","theyre","theyve","theyll",
  "were","wasnt","dont","doesnt","didnt","cant","couldnt","shouldnt",
  "isnt","arent","werent","theyll","theres","heres","hes","shes", 

  // Review common filler words
  "book","read","reading","reads","reader","review",
  "one","two","first","second","third","thing","things",
  "bit","kind","sort","way",
  // "story"

  // Generic adjectives that add noise
  "really","pretty","quite","rather","basically","literally","honestly",
  "actually","obviously","definitely","kind","sort","different","same", "like",

  // Time / meta words reviewers use
  "finally","overall","however","though","through","during","after","before",
  "chapter","chapters","page","pages","copy",

  // Speech / conversational fluff
  "well","um","uh","yeah","lol","haha","oh","okay","ok","maybe",

  // Common verbs that add no semantic value
  "make","makes","made","get","gets","got","go","goes","went","see",
  "seems","seemed","feel","feels","felt","think","thought",

  // Goodreads-style review words
  "spoiler","spoilers","summary","synopsis","reviewer","rating","stars","star"
]);


// TEXT CLEANING + TOKENIZER
function tokenize(text) {
  return text
    .split(/[\s.]+/g)
    .map(w => w.replace(/^[“‘"\-—()\[\]{}]+/g, ""))
    .map(w => w.replace(/[;:.!?()\[\]{},"'’”\-—]+$/g, ""))
    .map(w => w.replace(/['’]s$/g, ""))
    .map(w => w.substring(0, 30))
    .map(w => w.toLowerCase())
    .filter(w => w && !stopwords.has(w));
}

function makeBigrams(tokens) {
  const bigrams = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(tokens[i] + " " + tokens[i + 1]);
  }
  return bigrams;
}


function WordCloud(freqWords, {
  width = 500,
  height = 500,
  maxWords = 100,
  fontScale = .8,
  padding = 2,
  rotate = () => 0,
  fill = "steelblue",
  selector = "#wordcloud"
} = {}) {

  // Compute frequencies
  const freq = d3.rollups(freqWords, v => v.length, d => d)
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, maxWords)
    .map(([text, size]) => ({ text, size }));

  // Clear any previous cloud
  d3.select(selector).html("");

  // Create SVG container
  const svg = d3.select(selector)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Build cloud layout — FIXED: use d3.layout.cloud()
  d3.layout.cloud()
    .size([width, height])
    //.words(freq)
    .words(freqWords)
    .padding(padding)
    .rotate(rotate)
    .font("sans-serif")
    .fontSize(d => Math.sqrt(d.size) * fontScale)
    .on("end", draw)
    .start();

  // Render words onto SVG
  function draw(freqWords) {
    svg.append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`)
      .selectAll("text")
      .data(freqWords)
      .enter()
      .append("text")
        .style("font-size", d => `${d.size}px`)
        .style("fill", fill)
        .attr("text-anchor", "middle")
        .attr("transform", d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text);
  }
}

async function initWordCloud() {
  try {
    const reviews = await d3.csv("../assets/book_reviews_cleaned.csv");

    console.log("Columns:", Object.keys(reviews[0]));

    // --- FILTER 1: High-rated reviews (4.4–5) ---
    const highRated = reviews.filter(d => +d.review_rating_n >= 4.4);

    // --- FILTER 2: Low-rated reviews (< 3) ---
    const lowRated = reviews.filter(d => +d.review_rating_n < 2);

    console.log("Total reviews:", reviews.length);
    console.log("High-rated reviews:", highRated.length);
    console.log("Low-rated reviews:", lowRated.length);

    // ---- PROCESS FUNCTION (shared by both clouds) ----
    function processReviews(reviewArray) {
      const allText = reviewArray.map(d => d.review_content_clean).join(" ");
      const tokens = tokenize(allText);
      const bigrams = makeBigrams(tokens);

      return d3.rollups(bigrams, v => v.length, d => d)
        .sort((a, b) => d3.descending(a[1], b[1]))
        .slice(0, 200)
        .map(([text, size]) => ({ text, size }));
    }

    // --- BIGRAM FREQUENCY LISTS ---
    const bigramsHigh = processReviews(highRated);
    const bigramsLow  = processReviews(lowRated);

    console.log("Top high-rated bigrams:", bigramsHigh.slice(0, 10));
    console.log("Top low-rated bigrams:", bigramsLow.slice(0, 10));

    // --- RENDER BOTH WORD CLOUDS ---
    WordCloud(bigramsHigh, {
      selector: "#wordcloud_high",
      fill: "steelblue"
    });

    WordCloud(bigramsLow, {
      selector: "#wordcloud_low",
      fill: "crimson",
      fontScale: 1.2
    });

  } catch (err) {
    console.error("Error loading CSV:", err);
  }
}

initWordCloud();


{/*async function initWordCloud() {
  try {
    const reviews = await d3.csv("./assets/book_reviews_cleaned.csv");

    console.log("Columns:", Object.keys(reviews[0]));

    // --- FILTER: Only reviews from books rated 4.4–5 ---
    const filtered = reviews.filter(d => +d.review_rating_n >= 4.4);

    console.log("Total reviews:", reviews.length);
    console.log("Filtered reviews (4.2-5 stars):", filtered.length);

    // --- Combine review text from only high-rated books ---
    const allText = filtered
      .map(d => d.review_content_clean)
      .join(" ");

    // --- Single tokens ---
    const tokens = tokenize(allText);
    console.log("Token count:", tokens.length);

    // --- Build BIGRAMS ONLY ---
    const bigrams = makeBigrams(tokens);
    console.log("Total bigrams:", bigrams.length);

    // --- Compute bigram frequencies ---
    const bigramFreq = d3.rollups(bigrams, v => v.length, d => d)
      .sort((a, b) => d3.descending(a[1], b[1]))  // sort by frequency
      .slice(0, 200)                              // TOP 200 BIGRAMS
      .map(([text, size]) => ({ text, size }));   // format for cloud

    console.log("Top bigrams:", bigramFreq.slice(0, 10));

    // --- Build word cloud using ONLY bigrams ---
    WordCloud(bigramFreq);

  } catch (err) {
    console.error("Error loading CSV:", err);
  }
} */}

initWordCloud();
