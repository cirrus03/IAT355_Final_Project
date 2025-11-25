async function drawGenreHeatmap() {
  const container = document.getElementById("genre-heatmap");

  // Load CSV
  const raw = await d3.csv("../assets/book_details_with_mapped_genres_finals.csv");

  // ---- 1. Extract + clean genres ----
  const allPairs = [];
  const genreSet = new Set();

  raw.forEach(d => {
    if (!d.genres_mapped_clean) return;

    const clean = d.genres_mapped_clean.replace(/[\[\]"]/g, "");
    const genres = clean.split(",").map(s => s.trim()).filter(Boolean);

    genres.forEach(g => genreSet.add(g));

    // Generate co-occurrence pairs
    for (let i = 0; i < genres.length; i++) {
      for (let j = 0; j < genres.length; j++) {
        allPairs.push([genres[i], genres[j]]);
      }
    }
  });

  const genres = Array.from(genreSet).sort();

  // ---- 2. Build co-occurrence matrix ----
  const matrix = {};
  genres.forEach(g1 => {
    matrix[g1] = {};
    genres.forEach(g2 => matrix[g1][g2] = 0);
  });

  allPairs.forEach(([g1, g2]) => {
    matrix[g1][g2] += 1;
  });

  // Flatten matrix for heatmap
  const matrixData = [];
  genres.forEach(row => {
    genres.forEach(col => {
      matrixData.push({
        row,
        col,
        value: matrix[row][col]
      });
    });
  });

  // ---- 3. Scales ----
  const size = 600;
  const cell = size / genres.length;

  const color = d3.scaleSequential()
    .domain([0, d3.max(matrixData, d => d.value)])
    .interpolator(d3.interpolateInferno);

  // ---- 4. Tooltip ----
  const tooltip = d3.select("body")
    .append("div")
    .style("position", "absolute")
    .style("padding", "6px")
    .style("background", "white")
    .style("border", "1px solid black")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font", "12px sans-serif")
    .style("opacity", 0);

  // ---- 5. Draw SVG ----
  const svg = d3.select(container)
    .append("svg")
    .attr("width", size + 200)
    .attr("height", size + 200);

  // Row labels
  svg.append("g")
    .selectAll("text")
    .data(genres)
    .join("text")
    .attr("x", 150)
    .attr("y", (_, i) => 150 + i * cell + cell / 2)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "end")
    .attr("font-size", 10)
    .text(d => d);

  // Column labels
  svg.append("g")
    .selectAll("text")
    .data(genres)
    .join("text")
    .attr("transform", (_, i) => `translate(${150 + i * cell + cell / 2}, 140) rotate(-60)`)
    .attr("dominant-baseline", "middle")
    .attr("text-anchor", "end")
    .attr("font-size", 10)
    .text(d => d);

  // Heatmap squares
  svg.append("g")
    .selectAll("rect")
    .data(matrixData)
    .join("rect")
    .attr("x", d => 150 + genres.indexOf(d.col) * cell)
    .attr("y", d => 150 + genres.indexOf(d.row) * cell)
    .attr("width", cell)
    .attr("height", cell)
    .attr("fill", d => color(d.value))
    .on("mouseover", (event, d) => {
      tooltip.style("opacity", 1)
        .html(`
          <strong>${d.row} × ${d.col}</strong><br>
          Co-occurrences: ${d.value}
        `);
    })
    .on("mousemove", (event) => {
      tooltip
        .style("left", event.pageX + 10 + "px")
        .style("top", event.pageY + 10 + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));
}

// Call it
drawGenreHeatmap();
