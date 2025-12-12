// STOPWORD LIST
const stopwordsMobile = new Set([
  // Standard English stopwords
  "the", "and", "a", "to", "of", "in", "it", "is", "that", "this", "for", "on", "was", "can",
  "with", "as", "but", "be", "are", "at", "by", "an", "from", "i", "you", "they",
  "we", "he", "she", "them", "my", "your", "their", "so", "if", "not", "or", "just",
  "me", "what", "when", "how", "who", "why", "had", "have", "has", "been", "will",
  "its", "too", "very", "also", "because", "while", "than", "then", "there", "here",
  "which", "were", "would", "could", "should", "into", "out", "about", "more",
  "most", "such", "only", "other", "some", "any", "really", "really", "also",
  "ever", "maybe", "perhaps", "quite", "even", "still", "yet", "though", "his", "him", "her", "she",

  // Pronouns + contractions
  "im", "ive", "id", "ill", "youre", "youve", "youll", "theyre", "theyve", "theyll",
  "were", "wasnt", "dont", "doesnt", "didnt", "cant", "couldnt", "shouldnt",
  "isnt", "arent", "werent", "theyll", "theres", "heres", "hes", "shes",

  // Review common filler words
  "book", "read", "reading", "reads", "reader", "review",
  "one", "two", "first", "second", "third", "thing", "things",
  "bit", "kind", "sort", "way",
  // "story"

  // Generic adjectives that add noise
  "really", "pretty", "quite", "rather", "basically", "literally", "honestly",
  "actually", "obviously", "definitely", "kind", "sort", "different", "same", "like",

  // Time / meta words reviewers use
  "finally", "overall", "however", "though", "through", "during", "after", "before",
  "chapter", "chapters", "page", "pages", "copy",

  // Speech / conversational fluff
  "well", "um", "uh", "yeah", "lol", "haha", "oh", "okay", "ok", "maybe",

  // Common verbs that add no semantic value
  "make", "makes", "made", "get", "gets", "got", "go", "goes", "went", "see",
  "seems", "seemed", "feel", "feels", "felt", "think", "thought",

  // Goodreads-style review words
  "spoiler", "spoilers", "summary", "synopsis", "reviewer", "rating", "stars", "star"
]);


// =====================================================================
// TOKENIZER + BIGRAM MAKER
// =====================================================================
function tokenize(text) {
  return text
    .split(/[\s.]+/g)
    .map(w => w.replace(/^[“‘"\-—()\[\]{}]+/g, ""))         // leading punctuation
    .map(w => w.replace(/[;:.!?()\[\]{},"'’”\-—]+$/g, ""))  // trailing punctuation
    .map(w => w.replace(/['’]s$/g, ""))                    // possessives
    .map(w => w.substring(0, 30))                          // clamp length
    .map(w => w.toLowerCase())
    .filter(w => w && !stopwordsMobile.has(w));
}

function makeBigrams(tokens) {
  const arr = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    arr.push(tokens[i] + " " + tokens[i + 1]);
  }
  return arr;
}



function CombinedWordCloud(low, high, {
  selector = "#wordcloud_combined",
  maxWords = 75,
  padding = 4
} = {}) {

  // -------------------------------
  // 1. RESPONSIVE BREAKPOINT
  // -------------------------------

  const container = document.querySelector(selector);
  const width = container.clientWidth;
  const isMobile = width < 425;
  const height = isMobile ? width * 1.1 : width * 1.0;


  // Mobile overrides:
  const mobileMaxWords = isMobile ? 40 : maxWords;
  const mobileRotateChance = isMobile ? 0.05 : 0.2;
  const mobilePadding = isMobile ? 3 : padding;
  const fontRangeMin = isMobile ? 10 : 12;
  const fontRangeMax = isMobile ? 28 : 40;

  // -------------------------------
  // 2. MERGE WORDS & ASSIGN COLORS
  // -------------------------------
  const combined = [
    ...high.slice(0, mobileMaxWords).map(d => ({
      text: d.text,
      size: d.size,
      color: "var(--primary)"
    })),
    ...low.slice(0, mobileMaxWords).map(d => ({
      text: d.text,
      size: d.size,
      color: "#C4644C"
    }))
  ];

  // dynamic font scale
  const sizeScale = d3.scaleLinear()
    .domain([
      d3.min(combined, d => d.size),
      d3.max(combined, d => d.size)
    ])
    .range([fontRangeMin, fontRangeMax]);

  // -------------------------------
  // 3. CLEAR OLD + CREATE SVG
  // -------------------------------
  d3.select(selector).html("");

  const svg = d3.select(selector)
    .append("svg")
    .attr("width", "100%")
    .attr("height", isMobile ? height * 1.3 : height)
    .attr("viewBox", `0 0 ${width} ${isMobile ? height * 1.3 : height}`)
    .style("overflow", "visible");

  // -------------------------------
  // 4. CLOUD LAYOUT
  // -------------------------------
  d3.layout.cloud()
    .size([width, isMobile ? height * 1.3 : height])
    .words(combined.map(w => ({
      text: w.text,
      size: sizeScale(w.size),
      color: w.color
    })))
    .padding(mobilePadding)
    .rotate(() => 0)
    .random(() => 0.6)
    .font("Playfair Display")
    .fontSize(d => d.size)
    .on("end", draw)
    .start();

  // -------------------------------
  // 5. DRAW WORDS
  // -------------------------------
  function draw(words) {
    svg.append("g")
      .attr("transform", `translate(${width / 2}, ${(isMobile ? height * 1.3 : height) / 2})`)
      .selectAll("text")
      .data(words)
      .enter()
      .append("text")
      .style("font-family", "Playfair Display")
      .style("font-size", d => d.size + "px")
      .style("fill", d => d.color)
      .attr("text-anchor", "middle")
      .attr("transform", d =>
        `translate(${d.x}, ${d.y}) rotate(${d.rotate})`
      )
      .text(d => d.text);
  }
}




// =====================================================================
// ⭐ MAIN INITIALIZER
// =====================================================================
async function initWordCloud() {
  try {
    const reviews = await d3.csv("./assets/book_reviews_cleaned.csv");

    // high/low ratings
    const highRated = reviews.filter(r => +r.review_rating_n >= 4.4);
    const lowRated = reviews.filter(r => +r.review_rating_n < 2);

    // equal-size samples
    const n = Math.min(highRated.length, lowRated.length);
    const highSample = highRated.slice(0, n);
    const lowSample = lowRated.slice(0, n);

    // process function
    const processReviews = arr => {
      const allText = arr.map(d => d.review_content_clean).join(" ");
      const tokens = tokenize(allText);
      const bigrams = makeBigrams(tokens);

      return d3.rollups(bigrams, v => v.length, d => d)
        .sort((a, b) => d3.descending(a[1], b[1]))
        .slice(0, 200)
        .map(([text, size]) => ({ text, size }));
    };

    // compute final lists
    const bigramsLow = processReviews(lowSample);
    const bigramsHigh = processReviews(highSample);

    // draw responsive cloud
    CombinedWordCloud(bigramsLow, bigramsHigh, {
      selector: "#wordcloud_combined"
    });

  } catch (err) {
    console.error("Error loading wordcloud CSV:", err);
  }
}

initWordCloud();
const wcContainer = document.querySelector("#wordcloud_combined");

let resizerTimeout;

const observer = new ResizeObserver(() => {
  clearTimeout(resizeTimeout);
  resizerTimeout = setTimeout(() => {
    initWordCloud();
  }, 300); // waits 300ms after resize stops
});

observer.observe(wcContainer);