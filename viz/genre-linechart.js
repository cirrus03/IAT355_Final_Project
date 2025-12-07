async function releaseTrends() {

  // ----------------------------
  // LOAD CSV
  // ----------------------------
  const raw = await d3.csv("./assets/book_details_with_mapped_genres_finals.csv");

  let data = raw.map(d => ({
    ...d,
    year: +d.original_publication_year || +d.publication_year || null,
    genres: d.genres_mapped_clean
      ?.replace(/[\[\]']+/g, "")
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0)
  }))
  .filter(d => d.year >= 1980 && d.year <= 2025);

  // ----------------------------
  // FIND TOP 25 GENRES
  // ----------------------------
  const genreCounts = d3.rollup(
    data.flatMap(d => d.genres),
    v => v.length,
    g => g
  );

  const top25 = Array.from(genreCounts.entries())
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 25)
    .map(([g]) => g);

  // ----------------------------
  // YEARLY COUNTS
  // ----------------------------
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
  ).map(([genre, yearMap]) => {
    const entries = Array.from(yearMap, ([year, count]) => ({ year: +year, count }))
      .sort((a, b) => a.year - b.year);

    // Smooth values
    entries.forEach((d, i) => {
      const win = entries.slice(Math.max(0, i - 2), i + 3);
      d.smooth = d3.mean(win, x => x.count);
    });

    return { genre, values: entries };
  });

  // ----------------------------
  // SCALES
  // ----------------------------
  const minYear = d3.min(counts.flatMap(d => d.values.map(v => v.year)));
  const maxYear = d3.max(counts.flatMap(d => d.values.map(v => v.year)));

  const width = 610;
  const height = 610;
  const margin = { top: 40, right: 50, bottom: 40, left: 50 };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  

  // BACKGROUND RECTANGLE
  svg.insert("rect", ":first-child")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "var(--page-background)");


  const g = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, width - margin.left - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(counts.flatMap(d => d.values.map(v => v.smooth)))])
    .nice()
    .range([height - margin.top - margin.bottom, 0]);

  // ----------------------------
  // COLOR SCALE
  // ---------------------------- 
  const genreColors = [
  "#E77D62", // Brick Rose
  "#345463", // Deep Slate Blue
  "#FF9E89", // Warm Coral
  "#8A6B82", // Antique Rose
  "#3C8A61", // Bright Moss
  "#6F8FA0", // Vintage Blue
  "#A7849F", // Dusty Mauve
  "#C4644C", // Deep Terracotta
  "#DFAE7A", // Golden Sand
  "#245E3D", // Deep Forest Green
  "#9FB3BC", // Blue Mist
  "#5E3C2B", // Espresso Brown
  "#FFBFAF", // Strong Peach
  "#8A4E3C", // Mocha Clay
  "#B78463", // Honey Umber
  "#9EC3B0", // Light Dusty Green
  "#D9C9D6", // Lavender Fog
  "#F5F2E4", // Warm Paper
  "#67495F", // Plum Smoke
  "#5FAF83", // Fresh Sage
  "#F5CFA0", // Vanilla Cream
  "#4F6F80", // Dusty Steel
  "#7BAA98", // Muted Sage
  "#D4E7D6", // Pale Leaf
  "#8F674F"  // Rich Clay
  ];

const color = d3.scaleOrdinal()
  .domain(top25)
  .range(genreColors);


  // ----------------------------
  // LINE GENERATOR
  // ----------------------------
  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.smooth))
    .curve(d3.curveMonotoneX);

  // ----------------------------
  // TOOLTIP styling
  // ----------------------------
  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "var(--legend-color)")
    .style("border", "1px solid var(--secondary)")
    .style("color", "var(--text-main)")
    .style("font-family", "'Playfair Display', serif")
    .style("border-radius", "4px")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("font-size", "12px");

  // ----------------------------
  // HOVER LINE + DOTS
  // ----------------------------
  const hoverLine = g.append("line")
    .attr("stroke", "#555")
    .attr("stroke-width", 1)
    .style("opacity", 0)
    .style("pointer-events", "none")
    .attr("y1", 0)
    .attr("y2", height - margin.top - margin.bottom);

  const hoverDots = g.append("g")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // ----------------------------
  // DRAW LINES
  // ----------------------------
  const lines = g.selectAll(".genre-line")
    .data(counts)
    .join("path")
    .attr("class", "genre-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.genre))
    .attr("stroke-width", 1.8)
    .attr("pointer-events", "stroke")
    .attr("d", d => line(d.values))
    .style("cursor", "pointer")
    .on("mousemove", function (event, d) {
      tooltip.style("opacity", 1);

      const [mx] = d3.pointer(event, g.node());
      const hoveredYear = Math.round(x.invert(mx));

      const closest = d.values.reduce((a, b) =>
        Math.abs(b.year - hoveredYear) < Math.abs(a.year - hoveredYear) ? b : a
      );

      hoverLine
        .style("opacity", 0.8)
        .attr("x1", x(closest.year))
        .attr("x2", x(closest.year));

      // All dots
      const dotData = counts.map(series => {
        const pt = series.values.reduce((a, b) =>
          Math.abs(b.year - hoveredYear) < Math.abs(a.year - hoveredYear) ? b : a
        );
        return { genre: series.genre, x: x(pt.year), y: y(pt.smooth) };
      });

      const dots = hoverDots.selectAll("circle")
        .data(dotData, d => d.genre);

      dots.enter()
        .append("circle")
        .attr("r", 3.5)
        .attr("fill", d => color(d.genre))
        .merge(dots)
        .attr("cx", d => d.x)
        .attr("cy", d => d.y);

      dots.exit().remove();
      hoverDots.style("opacity", 1);

      tooltip
        .html(`
          <strong>${d.genre}</strong><br>
          Year: ${closest.year}<br>
          Total books: ${closest.smooth?.toFixed(1)}
        `)
        .style("left", event.pageX + 15 + "px")
        .style("top", event.pageY - 20 + "px");
    })
    .on("mouseout", () => {
      tooltip.style("opacity", 0);
      hoverLine.style("opacity", 0);
      hoverDots.style("opacity", 0);
    })
    .on("click", (event, d) => toggleGenre(d.genre));

  // ----------------------------
  // AXES
  // ----------------------------

  const xAxis = g.append("g")
  .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
  .call(
    d3.axisBottom(x)
      .ticks((maxYear - minYear) / 5)
      .tickFormat(d3.format("d"))
  );

  // STYLE X-AXIS TEXT
  xAxis.selectAll("text")
    .style("font-family", "'Playfair Display', serif")
    .style("font-size", "12px")
    .style("fill", "var(--text-main)");

  // X-axis label
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", height - margin.top - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main)")
    .text("Publication Year");

  const yAxis = g.append("g").call(d3.axisLeft(y));

  // STYLE Y-AXIS TEXT
  yAxis.selectAll("text")
    .style("font-family", "'Playfair Display', serif")
    .style("font-size", "12px")
    .style("fill", "var(--text-main)");

  // Y-axis label
  g.append("text")
    .attr("class", "axis-title")
    .attr("x", -((height - margin.top - margin.bottom) / 2))
    .attr("y", -40)
    .attr("transform", "rotate(-90)")
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main)")
    .text("Number of Books Published");

  // ----------------------------
  // TITLE
  // ----------------------------
  
  g.append("text")
    .attr("x", (width - margin.left - margin.right) / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-family", "'Playfair Display', serif")
    .style("font-weight", "600")
    .style("fill", "var(--text-main)")
    .text("Genre Publication Trends on Goodreads (1980–2025)");

// ------------------------------------
// FINAL 2-COLUMN LEGEND WITH DESCRIPTIONS + INTERACTIONS
// ------------------------------------
const legendContainer = document.getElementById("genre-legend");
legendContainer.innerHTML = "";

// Optional genre descriptions
const genreDescriptions = {
  "fantasy": "Stories with magical worlds, mythical creatures, or supernatural elements.",
  "adult fiction": "Fiction intended for mature readers, often with complex themes.",
  "romance": "Stories focused on relationships, attraction, and emotional intimacy.",
  "paranormal & supernatural": "Ghosts, vampires, witches, or unexplained phenomena.",
  "contemporary life": "Modern-day realistic stories about everyday experiences.",
  "mystery & crime": "Detective stories, investigations, and crime-solving.",
  "historical fiction": "Stories set in real past historical periods.",
  "literature & classics": "Critically acclaimed works and timeless novels.",
  "world literature": "Books originating from global cultures and languages.",
  "science fiction": "Speculative stories involving science, future tech, or space.",
  "adventure": "Action-driven stories with exploration or high-risk journeys.",
  "historical": "Nonfiction or fiction grounded heavily in history.",
  "kids & pre-teens": "Books written for children aged 8–12.",
  "horror": "Stories meant to scare, unsettle, or thrill.",
  "other / niche": "Genres that don’t fit common categories.",
  "dark & erotic": "Mature stories exploring sensual or taboo topics.",
  "chick lit": "Lighthearted stories focusing on modern women’s lives.",
  "classics": "Canon literature with cultural significance.",
  "comedy": "Humorous and lighthearted storytelling.",
  "dystopian": "Bleak future societies with oppressive control.",
  "ideas & growth": "Self-help, philosophy, and personal development.",
  "comics & manga": "Illustrated storytelling in comic or manga format.",
  "lgbtq+": "Stories featuring queer identities, love, and themes.",
  "drama": "Emotionally intense character-driven stories.",
  "religious & spiritual": "Faith-based, spiritual growth, or religious topics."
};


// Legend layout
Object.assign(legendContainer.style, {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "5px 12px",
  width: "100%",
  padding: "8px",
  overflow: "visible",
  background: "var(--legend-color)",  
  border: "1px solid var(--secondary)",
  borderRadius: "8px",
  marginTop: "12px"
});

// Build each legend entry
top25.forEach(genre => {
  const item = document.createElement("div");
  item.className = "legend-item"; 
  item.dataset.genre = genre;

  Object.assign(item.style, {
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    overflow: "visible",
  });

  // Color box + label row
  const row = document.createElement("div");
  Object.assign(row.style, {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "4px"
  });

  const colorBox = document.createElement("div");
  Object.assign(colorBox.style, {
    width: "10px",
    height: "10px",
    borderRadius: "10px",
    background: color(genre),
    flexShrink: "0"
  });

  const label = document.createElement("span");
  label.textContent = genre;
  label.style.fontSize = "0.55rem";
  label.style.fontWeight = "500";
  label.style.fontFamily = "'Playfair Display', serif";


  row.appendChild(colorBox);
  row.appendChild(label);

  // Description text
  const desc = document.createElement("span");
  desc.className = "legend-description";
  desc.textContent = genreDescriptions[genre];
  desc.style.fontSize = "0.55rem";
  desc.style.opacity = "0.7";
  desc.style.marginLeft = "16px"; // align with text
  desc.style.fontFamily = "'Playfair Display', serif";

  item.appendChild(row);
  item.appendChild(desc);

  legendContainer.appendChild(item);
});

// ------------------------------------
// INTERACTION BINDINGS (HOVER + CLICK)
// ------------------------------------
document.querySelectorAll(".legend-item").forEach(item => {
  const genre = item.dataset.genre;

  // Hover highlight
  item.addEventListener("mouseenter", () => {
    lines
      .attr("stroke-opacity", d => d.genre === genre ? 1 : 0.15)
      .attr("stroke-width", d => d.genre === genre ? 3 : 1.2);
  });

  item.addEventListener("mouseleave", () => {
    lines
      .attr("stroke-opacity", 1)
      .attr("stroke-width", 1.8);
  });

  // Click isolate
  item.addEventListener("click", () => {
    toggleGenre(genre);

    // Sync legend appearance
    document.querySelectorAll(".legend-item").forEach(el => {
      el.style.opacity = (!activeGenre || el.dataset.genre === activeGenre) ? 1 : 0.3;
    });
  });
});


  // ----------------------------
  // TOGGLE FUNCTION
  // ----------------------------
  let activeGenre = null;

  function toggleGenre(genre) {
    activeGenre = activeGenre === genre ? null : genre;

    lines.attr("stroke-opacity", d =>
      activeGenre && d.genre !== activeGenre ? 0.1 : 1
    );

    document.querySelectorAll("#genre-legend .legend-item").forEach(el => {
      el.style.opacity = (!activeGenre || el.dataset.genre === activeGenre) ? 1 : 0.3;
    });
  }
}

releaseTrends();
