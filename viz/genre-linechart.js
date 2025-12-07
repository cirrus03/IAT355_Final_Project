// --------------------------------------------------
// GLOBAL TOGGLE FUNCTION (unchanged)
// --------------------------------------------------
let activeGenre = null;

function toggleGenre(genre) {
  activeGenre = activeGenre === genre ? null : genre;

  d3.selectAll(".genre-line")
    .attr("stroke-opacity", d =>
      activeGenre && d.genre !== activeGenre ? 0.1 : 1
    )
    .attr("stroke-width", d =>
      activeGenre && d.genre !== activeGenre ? 1.2 : 1.8
    );

  // Adjust legend opacity
  document.querySelectorAll("#genre-legend .legend-item").forEach(el => {
    el.style.opacity =
      !activeGenre || el.dataset.genre === activeGenre ? 1 : 0.3;
  });
}

// --------------------------------------------------
// MAIN FUNCTION
// --------------------------------------------------
async function releaseTrends() {
  // --------------------------------------------------
  // LOAD CSV
  // --------------------------------------------------
  const raw = await d3.csv("./assets/book_details_with_mapped_genres_finals.csv");

  let data = raw
    .map(d => ({
      ...d,
      year: +d.original_publication_year || +d.publication_year || null,
      genres: d.genres_mapped_clean
        ?.replace(/[\[\]']+/g, "")
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0)
    }))
    .filter(d => d.year && d.year >= 1980 && d.year <= 2025);

  // --------------------------------------------------
  // FIND TOP 25 GENRES
  // --------------------------------------------------
  const genreCounts = d3.rollup(
    data.flatMap(d => d.genres),
    v => v.length,
    g => g
  );

  const top25 = Array.from(genreCounts.entries())
    .sort((a, b) => d3.descending(a[1], b[1]))
    .slice(0, 25)
    .map(([g]) => g);

  // --------------------------------------------------
  // BUILD YEARLY COUNTS
  // --------------------------------------------------
  const yearly = [];
  data.forEach(d => {
    d.genres.forEach(g => {
      if (top25.includes(g)) yearly.push({ genre: g, year: d.year });
    });
  });

  const counts = d3
    .rollups(
      yearly,
      v => v.length,
      d => d.genre,
      d => d.year
    )
    .map(([genre, yearMap]) => {
      const entries = Array.from(yearMap, ([year, count]) => ({
        year: +year,
        count
      }))
        .filter(d => !Number.isNaN(d.year))
        .sort((a, b) => a.year - b.year);

      // Moving average window = 5
      entries.forEach((d, i) => {
        const win = entries.slice(Math.max(0, i - 2), i + 3);
        d.smooth = d3.mean(win, x => x.count) || 0;
      });

      return { genre, values: entries };
    });

  if (!counts.length) return;

  // --------------------------------------------------
  // SVG SETUP
  // --------------------------------------------------
  const width = 610;
  const height = 610;
  const margin = { top: 40, right: 50, bottom: 40, left: 50 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg
    .insert("rect", ":first-child")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "var(--page-background)")
    .attr("pointer-events", "none");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // --------------------------------------------------
  // SCALES
  // --------------------------------------------------
  const x = d3
    .scaleLinear()
    .domain([1980, 2025])
    .range([0, innerWidth]);

  const yMax =
    d3.max(counts, d => d3.max(d.values, v => v.smooth)) || 1;

  const y = d3
    .scaleLinear()
    .domain([0, yMax])
    .nice()
    .range([innerHeight, 0]);

  // --------------------------------------------------
  // COLOR PALETTE (unchanged)
// --------------------------------------------------
  const genreColors = [
    "#E77D62", "#345463", "#FF9E89", "#8A6B82", "#3C8A61",
    "#6F8FA0", "#A7849F", "#C4644C", "#DFAE7A", "#245E3D",
    "#9FB3BC", "#5E3C2B", "#FFBFAF", "#8A4E3C", "#B78463",
    "#9EC3B0", "#D9C9D6", "#F5F2E4", "#67495F", "#5FAF83",
    "#F5CFA0", "#4F6F80", "#7BAA98", "#D4E7D6", "#8F674F"
  ];

  const color = d3
    .scaleOrdinal()
    .domain(top25)
    .range(genreColors);

  // --------------------------------------------------
  // LINE GENERATOR
  // --------------------------------------------------
  const line = d3
    .line()
    .x(d => x(d.year))
    .y(d => y(d.smooth))
    .curve(d3.curveMonotoneX);

  // --------------------------------------------------
  // TOOLTIP + HOVER ELEMENTS
  // --------------------------------------------------
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("z-index", 999999999);
  

  const hoverLine = g
    .append("line")
    .attr("stroke", "#555")
    .attr("stroke-width", 1)
    .attr("y1", 0)
    .attr("y2", innerHeight)
    .style("opacity", 0)
    .style("pointer-events", "none");

  const hoverDots = g
    .append("g")
    .style("opacity", 0)
    .style("pointer-events", "none");

  // --------------------------------------------------
  // DRAW LINES (visual only)
// --------------------------------------------------
  g.selectAll(".genre-line")
    .data(counts)
    .join("path")
    .attr("class", "genre-line")
    .attr("fill", "none")
    .attr("stroke", d => color(d.genre))
    .attr("stroke-width", 1.8)
    .attr("d", d => line(d.values));

  // Helper: closest point in a series for a given year
  function closestByYear(values, year) {
    return values.reduce((a, b) =>
      Math.abs(b.year - year) < Math.abs(a.year - year) ? b : a
    );
  }

  // --------------------------------------------------
  // OVERLAY RECT FOR HOVER
  // --------------------------------------------------
  g.append("rect")
    .attr("class", "hover-overlay")
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "none")
    .attr("pointer-events", "all")
    .on("mousemove", (event) => {
      const [mx, my] = d3.pointer(event, g.node());
      const hoveredYear = Math.round(x.invert(mx));

      const points = counts.map(series => {
        const pt = closestByYear(series.values, hoveredYear);
        return {
          genre: series.genre,
          year: pt.year,
          smooth: pt.smooth,
          x: x(pt.year),
          yVal: y(pt.smooth)
        };
      });

      // nearest line vertically to mouse
      const nearest = points.reduce((a, b) =>
        Math.abs(b.yVal - my) < Math.abs(a.yVal - my) ? b : a
      );

      // vertical hover line
      hoverLine
        .attr("x1", x(hoveredYear))
        .attr("x2", x(hoveredYear))
        .style("opacity", 0.8);

      // dots for all series
      hoverDots
        .selectAll("circle")
        .data(points, d => d.genre)
        .join("circle")
        .attr("r", 3.5)
        .attr("cx", d => d.x)
        .attr("cy", d => d.yVal)
        .attr("fill", d => color(d.genre));

      hoverDots.style("opacity", 1);

      // tooltip for nearest series
      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${nearest.genre}</strong><br>` +
            `Year: ${nearest.year}<br>` +
            `Total books: ${nearest.smooth.toFixed(1)}`
        )
        .style("left", (event.clientX + 15) + "px")
        .style("top", (event.clientY - 20) + "px");
    })
    .on("mouseout", () => {
      hoverLine.style("opacity", 0);
      hoverDots.style("opacity", 0);
      tooltip.style("opacity", 0);
    })
    .on("click", (event) => {
      const [mx, my] = d3.pointer(event, g.node());
      const clickedYear = Math.round(x.invert(mx));

      const points = counts.map(series => {
        const pt = closestByYear(series.values, clickedYear);
        return {
          genre: series.genre,
          year: pt.year,
          smooth: pt.smooth,
          x: x(pt.year),
          yVal: y(pt.smooth)
        };
      });

      const nearest = points.reduce((a, b) =>
        Math.abs(b.yVal - my) < Math.abs(a.yVal - my) ? b : a
      );

      toggleGenre(nearest.genre);
    });

  // --------------------------------------------------
  // AXES
  // --------------------------------------------------
  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(d3.axisBottom(x).ticks(9).tickFormat(d3.format("d")));

  g.append("g").call(d3.axisLeft(y));

  // --------------------------------------------------
  // TITLE & LABELS
  // --------------------------------------------------
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -15)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-family", "'Playfair Display', serif")
    .style("font-weight", "500")
    .style("fill", "var(--text-main)")
    .text("Genre Publication Trends on Goodreads (1980–2025)");

  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 30)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main)")
    .text("Publication Year");

  g.append("text")
    .attr("transform", `rotate(-90)`)
    .attr("x", -innerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main)")
    .text("Number of Books Published");

  // --------------------------------------------------
  // LEGEND (your descriptions kept exactly)
// --------------------------------------------------
  const legendContainer = document.getElementById("genre-legend");
  legendContainer.innerHTML = "";
  Object.assign(legendContainer.style, {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "5px 12px",
    width: "100%",
    padding: "8px",
    background: "var(--legend-color)",
    border: "1px solid var(--secondary)",
    borderRadius: "8px",
    marginTop: "12px"
  });

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
    label.style.fontSize = "0.55rem";
    label.style.fontWeight = "500";
    label.style.fontFamily = "'Playfair Display', serif";

    row.appendChild(colorBox);
    row.appendChild(label);

    const desc = document.createElement("span");
    desc.textContent = genreDescriptions[genre] || "";
    desc.style.fontSize = "0.55rem";
    desc.style.opacity = "0.7";
    desc.style.marginLeft = "16px";
    desc.style.fontFamily = "'Playfair Display', serif";

    item.appendChild(row);
    item.appendChild(desc);
    legendContainer.appendChild(item);

    // Legend interactions
    item.addEventListener("mouseenter", () => {
      d3.selectAll(".genre-line")
        .attr("stroke-opacity", d => d.genre === genre ? 1 : 0.15)
        .attr("stroke-width", d => d.genre === genre ? 3 : 1.2);
    });

    item.addEventListener("mouseleave", () => {
      d3.selectAll(".genre-line")
        .attr("stroke-opacity", 1)
        .attr("stroke-width", 1.8);
    });

    item.addEventListener("click", () => toggleGenre(genre));
  });
} // END releaseTrends()

// --------------------------------------------------
// RUN FUNCTION
// --------------------------------------------------
releaseTrends();
