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

    entries.forEach((d, i) => {
      const win = entries.slice(Math.max(0, i - 2), i + 3);
      d.smooth = d3.mean(win, x => x.count);
    });

    return { genre, values: entries };
  });

  // ----------------------------
  // FLEXIBLE YEAR SCALE
  // ----------------------------
  const minYear = d3.min(counts.flatMap(d => d.values.map(v => v.year)));
  const maxYear = d3.max(counts.flatMap(d => d.values.map(v => v.year)));

  const width = 600;
  const height = 650;
  const margin = { top: 40, right: 150, bottom: 40, left: 60 };

  const svg = d3.select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  const x = d3.scaleLinear()
    .domain([minYear, maxYear])
    .range([0, width - margin.left - margin.right]);

  const y = d3.scaleLinear()
    .domain([0, d3.max(counts.flatMap(d => d.values.map(v => v.smooth)))])
    .nice()
    .range([height - margin.top - margin.bottom, 0]);

  const color = d3.scaleOrdinal()
    .domain(top25)
    .range(d3.schemeTableau10.concat(d3.schemeSet3));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(d.smooth))
    .curve(d3.curveMonotoneX);

  // ----------------------------
  // TOOLTIP
  // ----------------------------
  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("font-size", "12px");

  // ----------------------------
  // STATE: SELECTED GENRE
  // ----------------------------
  let activeGenre = null;

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
    .attr("d", d => line(d.values))
    .style("cursor", "pointer")
    .on("click", (event, d) => toggleGenre(d.genre))
    .on("mousemove", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`<strong>${d.genre}</strong>`)
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // ----------------------------
  // X-AXIS
  // ----------------------------
  g.append("g")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
    .call(
      d3.axisBottom(x)
        .ticks((maxYear - minYear) / 5)
        .tickFormat(d3.format("d"))
    );

  // ----------------------------
  // Y-AXIS
  // ----------------------------
  g.append("g").call(d3.axisLeft(y));

  // ----------------------------
  // TITLE
  // ----------------------------
  g.append("text")
    .attr("x", 0)
    .attr("y", -12)
    .attr("font-size", "18px")
    .attr("font-weight", "600")
    .text("Publication Trends – Top 25 Genres");

  // ----------------------------
  // LEGEND
  // ----------------------------
  const legend = g.append("g")
    .attr("transform", `translate(${width - margin.left - margin.right + 20}, 0)`);

  const legendItems = legend.selectAll(".legend-item")
    .data(top25)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (_, i) => `translate(0, ${i * 18})`)
    .style("cursor", "pointer")
    .on("click", (event, genre) => toggleGenre(genre));

  legendItems.append("rect")
    .attr("width", 10)
    .attr("height", 10)
    .attr("fill", color);

  legendItems.append("text")
    .attr("x", 15)
    .attr("y", 10)
    .style("font-size", "11px")
    .text(d => d);

  // ----------------------------
  // ISOLATE GENRE FUNCTION
  // ----------------------------
  function toggleGenre(genre) {
    activeGenre = activeGenre === genre ? null : genre;

    lines.attr("stroke-opacity", d =>
      activeGenre && d.genre !== activeGenre ? 0.1 : 1
    );

    legendItems.attr("opacity", d =>
      activeGenre && d !== activeGenre ? 0.3 : 1
    );
  }
}

releaseTrends();

