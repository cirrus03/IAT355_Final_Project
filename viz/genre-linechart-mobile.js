// --------------------------------------------------
// TOGGLE STATE
// --------------------------------------------------
let activeGenresMobile = new Map();
let activeGenreMobile = null;
let lastModeMobile = null;   // track mobile/desktop across redraws


// Toggle opacity + stroke width when a genre is clicked
function toggleGenre(genre) {
  activeGenreMobile = activeGenreMobile === genre ? null : genre;

  d3.selectAll(".genre-line")
    .attr("stroke-opacity", d =>
      activeGenreMobile && d.genre !== activeGenreMobile ? 0.1 : 1
    )
    .attr("stroke-width", d =>
      activeGenreMobile && d.genre !== activeGenreMobile ? 1.2 : 2.2
    );

  // Fade legend items that aren't selected
  document.querySelectorAll("#genre-legend-mobile .legend-item").forEach(el => {
    el.style.opacity =
      !activeGenreMobile || el.dataset.genre === activeGenreMobile ? 1 : 0.3;
  });
}


// --------------------------------------------------
// MAIN FUNCTION 
// --------------------------------------------------
async function releaseTrends() {

  const chartEl = document.getElementById("genre-chart-mobile");
while (chartEl.firstChild) chartEl.removeChild(chartEl.firstChild);

document.getElementById("genre-legend-mobile").innerHTML = "";
d3.select("body").selectAll(".tooltip").remove();


  // Clear previous SVG + tooltip
  d3.select("#genre-chart-mobile").selectAll("*").remove();
  d3.select("body").selectAll(".tooltip").remove();

  // Load container & compute responsive width/height
  const container = document.getElementById("genre-chart-mobile");
  // const width = container.clientWidth;
  let width = container.clientWidth;
  if (!width || width < 50) {
    width = container.parentNode.clientWidth || 360; // fallback
  }
  
  const isMobile = width < 450;   // adjust breakpoint as needed

  // Mobile-specific responsive height
  let height = isMobile ? width * 1.3 : width * 1.1;
  if (!height || height < 100) {
    height = width * 1.2;
  }

  // Determine the squareness of the container is
  const aspect = width / height;

  // If container is roughly square 
  if (aspect > 0.9 && aspect < 1.2) {
    // Apply your custom aspect ratio
    height = width*.9;
  }

  // Mobile margins (smaller but balanced)
  const margin = isMobile
    ? { top: 22, right: 10, bottom: 40, left: 35 }
    : { top: 30, right: 20, bottom: 40, left: 40 };

  var innerWidth = width - margin.left - margin.right;
  var innerHeight = height - margin.top - margin.bottom;
  if (innerWidth < 0) {
    innerWidth = 0;
  }
  if (innerHeight < 0) {
    innerHeight = 0;
  }

  



  // --------------------------------------------------
  // LOAD CSV + CLEAN DATA
  // --------------------------------------------------
  const raw = await d3.csv("./data/book_details_with_mapped_genres_finals.csv");

  let data = raw
    .map(d => ({
      ...d,
      year: +d.original_publication_year || +d.publication_year || null,
      genres: d.genres_mapped_clean
        ?.replace(/[\[\]']+/g, "")
        .split(",")
        .map(s => s.trim())
        .filter(s => s)
    }))
    .filter(d => d.year >= 1900 && d.year <= 2025);

  // --------------------------------------------------
  // FIND TOP 25 GENRES
  // --------------------------------------------------
  const genreCounts = d3.rollup(
    data.flatMap(d => d.genres),
    v => v.length,
    g => g
  );

  const collapsedVisibleGenres = [
    "Fantasy",
    "Adult fiction",
    "Romance",
    "Paranormal & supernatural",
    "Mystery & crime",
    "LGBTQ+",
    "Religious & spiritual",
    "Contemporary life",
    "World literature",
    "Classics",
    "Comedy",
  ];


  // Sort all genres by frequency
  const allGenresSorted = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g]) => g);

  // Choose genres based on device
  let genresToUse;

  if (isMobile) {
    // MOBILE --> show only collapsed visible genres
    genresToUse = collapsedVisibleGenres.filter(g => allGenresSorted.includes(g));
  } else {
    // DESKTOP → top 25
    genresToUse = allGenresSorted.slice(0, 22);
  }

  const top25 = genresToUse;

  // ---------------------------
  // MODE TRANSITION HANDLER
  // ---------------------------
  const mode = isMobile ? "mobile" : "desktop";

  if (lastModeMobile === "mobile" && mode === "desktop") {
    activeGenresMobile = new Map();
    top25.forEach(g => activeGenresMobile.set(g, true));
  }

  lastModeMobile = mode;

  // Initialize visibility
  if (activeGenresMobile.size === 0 || mode === "desktop") {
    activeGenresMobile = new Map();
    top25.forEach(g => activeGenresMobile.set(g, true));
  }





  // --------------------------------------------------
  // YEARLY COUNTS (SMOOTHED)
  // --------------------------------------------------
  const yearly = [];
  data.forEach(d => {
    d.genres.forEach(g => {
      if (top25.includes(g)) yearly.push({ genre: g, year: d.year });
    });
  });

  const counts = d3.rollups(
    yearly,
    v => v.length,
    d => d.genre,
    d => d.year
  )
    .map(([genre, yearMap]) => {
      const arr = Array.from(yearMap, ([year, count]) => ({
        year: +year,
        count
      })).sort((a, b) => a.year - b.year);

      // 5-year moving average
      arr.forEach((d, i) => {
        const win = arr.slice(Math.max(0, i - 2), i + 3);
        d.smooth = d3.mean(win, x => x.count) || 0;
      });

      return { genre, values: arr };
    });

  // --------------------------------------------------
  // SVG
  // --------------------------------------------------
  const svg = d3
    .select("#genre-chart-mobile")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("width", "100%")
    .style("height", "auto");


  // inner background rectangle
  svg.append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "var(--page-background)");

  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // --------------------------------------------------
  // SCALES
  // --------------------------------------------------
  const x = d3.scaleLinear().domain([1900, 2025]).range([0, innerWidth]);

  const yMax = d3.max(counts, d => d3.max(d.values, v => v.smooth)) || 1;
  const y = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

  // --------------------------------------------------
  // COLORS
  // --------------------------------------------------
  const genreColors = [
    "#E77D62", "#345463", "#FF9E89", "#5d4758ff", "#3C8A61",
    "#6F8FA0", "#886280ff", "#C4644C", "#DFAE7A", "#245E3D",
    "#9FB3BC", "#5E3C2B", "#FFBFAF", "#8A4E3C", "#B78463",
    "#9EC3B0", "#caa7c4ff", "#c6b671ff", "#67495F", "#5FAF83",
    "#F5CFA0", "#4F6F80", "#7BAA98", "#a9c5acff", "#8F674F"
  ];
  const color = d3.scaleOrdinal().domain(top25).range(genreColors);

  // --------------------------------------------------
  // LINE GENERATOR
  // --------------------------------------------------
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.smooth))
    .curve(d3.curveMonotoneX);

  // --------------------------------------------------
  // TOOLTIP
  // --------------------------------------------------
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("pointer-events", "none")
    .style("opacity", 0);

  // --------------------------------------------------
  // DRAW LINES
  // --------------------------------------------------
  const countsFiltered = counts.filter(d => top25.includes(d.genre));

  g.selectAll(".genre-line")
    .data(countsFiltered)
    .join("path")
    .attr("class", "genre-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.genre))
    .attr("stroke-width", isMobile ? 1.2 : 1.8)
    .attr("d", d => line(d.values))
    .style("display", d => activeGenresMobile.get(d.genre) ? "block" : "none");

  // --------------------------------------------------
  // HOVER ELEMENTS
  // --------------------------------------------------
  const hoverLine = g.append("line")
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .attr("stroke", "#444")
    .style("opacity", 0);

  const hoverDots = g.append("g").style("opacity", 0);

  function closest(values, yr) {
    return values.reduce((a, b) =>
      Math.abs(b.year - yr) < Math.abs(a.year - yr) ? b : a
    );
  }

  g.append("rect")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event);
      const year = Math.round(x.invert(mx));

      const pts = counts.map(s => {
        const p = closest(s.values, year);
        return {
          genre: s.genre,
          year: p.year,
          smooth: p.smooth,
          x: x(p.year),
          y: y(p.smooth)
        };
      });

      const nearest = pts.reduce((a, b) =>
        Math.abs(b.y - my) < Math.abs(a.y - my) ? b : a
      );

      hoverLine
        .attr("x1", x(year))
        .attr("x2", x(year))
        .style("opacity", 1);

      hoverDots.selectAll("circle")
        .data(pts)
        .join("circle")
        .attr("cx", d => d.x)
        .attr("cy", d => d.y)
        .attr("r", isMobile ? 2.4 : 3.2)
        .attr("fill", d => color(d.genre));

      hoverDots.style("opacity", 1);

      const offsetX = isMobile ? 8 : 12;
      const offsetY = isMobile ? 18 : 28;
      tooltip
        .style("opacity", 1)
        .html(`<strong>${nearest.genre}</strong><br>Year: ${nearest.year}<br>Books: ${nearest.smooth.toFixed(1)}`)
        .style("left", event.clientX + offsetX + "px")
        .style("top", event.clientY - offsetY + "px");
    })
    .on("mouseout", () => {
      hoverLine.style("opacity", 0);
      hoverDots.style("opacity", 0);
      tooltip.style("opacity", 0);
    })
    .on("click", (event) => {
      const [mx, my] = d3.pointer(event);
      const year = Math.round(x.invert(mx));

      const pts = counts.map(s => {
        const p = closest(s.values, year);
        return { genre: s.genre, y: y(p.smooth) };
      });

      const nearest = pts.reduce((a, b) =>
        Math.abs(b.y - my) < Math.abs(a.y - my) ? b : a
      );

      toggleGenre(nearest.genre);
    });

  // --------------------------------------------------
  // AXES
  // --------------------------------------------------
  g.append("g")
    .attr("transform", `translate(0,${innerHeight})`)
    .call(
      d3.axisBottom(x)
        .ticks(width < 500 ? 5 : 9)
        .tickFormat(d3.format("d"))
    );

  g.append("g").call(d3.axisLeft(y));

  // --------------------------------------------------
  // TITLES
  // --------------------------------------------------
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -12)
    .attr("text-anchor", "middle")
    .text("Genre Publication Trends on Goodreads (1900–2025)")
    .style("font-size", isMobile ? "12px" : "18px")
    .style("fill", "var(--text-main)")
    .style("font-family", "'Playfair Display', serif");

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 30)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "13px")
    .style("fill", "var(--text-main)")
    .style("font-family", "'Playfair Display', serif")
    .text("Publication Year");

  g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", isMobile ? "10px" : "13px")
    .style("fill", "var(--text-main)")
    .style("font-family", "'Playfair Display', serif")
    .text("Number of Books Published");


  // --------------------------------------------------
  // LEGEND STYLING + CONTENT
  // --------------------------------------------------
  const legendContainer = document.getElementById("genre-legend-mobile");
  legendContainer.innerHTML = "";
  Object.assign(legendContainer.style, {
    display: "grid",
    gridTemplateColumns: width < 350 ? "1fr" : "1fr 1fr",
    gap: isMobile ? "4px 6px" : "5px 12px",
    width: "100%",
    padding: isMobile ? "6px" : "8px",
    background: "var(--legend-color)",
    border: "1px solid var(--secondary)",
    borderRadius: "8px",
    marginTop: "12px"
  });

  const genreDescriptions = {
    "Fantasy": "Stories with magical worlds, mythical creatures, or supernatural elements.",
    "Adult fiction": "Fiction intended for mature readers, often with complex themes.",
    "Romance": "Stories focused on relationships, attraction, and emotional intimacy.",
    "Paranormal & supernatural": "Ghosts, vampires, witches, or unexplained phenomena.",
    "Mystery & crime": "Detective stories, investigations, and crime-solving.",
    "LGBTQ+": "Stories featuring queer identities, love, and themes.",
    "Religious & spiritual": "Faith-based, spiritual growth, or religious topics.",
    "Contemporary life": "Modern-day realistic stories about everyday experiences.",
    "Period pieces": "Stories set in a specific historical era with attention to detail.",
    "Classics": "Canon literature with cultural significance.",
    "World literature": "Books set in or about global cultures and languages.",
    "Other/Niche": "Genres that don’t fit common categories.",
    "Science fiction": "Speculative stories involving science, future tech, or space.",
    "Action & adventure": "Action-driven stories with exploration or high-risk journeys.",
    "Children & pre-teens": "Books written for children aged 8-12 years old.",
    "Horror": "Stories meant to scare, unsettle, or thrill.",
    "Dark & erotic": "Mature stories exploring sensual or taboo topics.",
    "Chick lit": "Lighthearted stories focusing on modern women’s lives.",
    "Comedy": "Humorous and lighthearted storytelling.",
    "Dystopian": "Bleak future societies with oppressive control.",
    "Ideas & growth": "Self-help, philosophy, and personal development.",
    "Comics & manga": "Illustrated storytelling in comic or manga format.",
    "Drama": "Emotionally intense character-driven stories.",
  };

  top25.forEach(genre => {
    const item = document.createElement("div");
    item.className = "legend-item";
    item.dataset.genre = genre;

    Object.assign(item.style, {
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-start"
    });

    const row = document.createElement("div");
    Object.assign(row.style, {
      display: "flex",
      alignItems: "center",
      gap: "4px"
    });

    const colorBox = document.createElement("div");
    Object.assign(colorBox.style, {
      width: "10px",
      height: "10px",
      borderRadius: "10px",
      background: color(genre)
    });

    const label = document.createElement("span");
    label.textContent = genre;
    label.style.fontSize = isMobile ? "0.5rem" : "0.55rem";
    label.style.fontWeight = "500";
    label.style.fontFamily = "'Playfair Display', serif";

    row.appendChild(colorBox);
    row.appendChild(label);

    const desc = document.createElement("span");
    desc.textContent = genreDescriptions[genre] || "";
    desc.style.fontSize = isMobile ? "0.45rem" : "0.55rem";
    desc.style.opacity = "0.7";
    desc.style.marginLeft = "16px";
    desc.style.fontFamily = "'Playfair Display', serif";

    item.appendChild(row);
    item.appendChild(desc);
    legendContainer.appendChild(item);


    item.addEventListener("mouseenter", () => {
      d3.selectAll(".genre-line")
        .attr("stroke-opacity", d => d.genre === genre ? 1 : 0.15)
        .attr("stroke-width", d => d.genre === genre ? 3 : 1.2);
    });

    item.addEventListener("mouseleave", () => {
      d3.selectAll(".genre-line")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", isMobile ? 1.2 : 1.8)
    });

    item.addEventListener("click", () => toggleGenre(genre));
  });

}

// --------------------------------------------------
// RUN + RESIZE LISTENER
// --------------------------------------------------
releaseTrends();

let resizeTimeoutMobile;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimeoutMobile);
  resizeTimeoutMobile = setTimeout(() => releaseTrends(), 150);
});

