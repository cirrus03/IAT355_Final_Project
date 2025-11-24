export async function drawTreemap(metric = "reviews") {
  const container = document.getElementById("treemap-page");
  if (!container) return;

  // Clear previous SVG & tooltip
  container.querySelectorAll("svg, div.tooltip").forEach(el => el.remove());

  
  // Responsive sizing
 
  const width = container.clientWidth;
  const height = Math.min(container.clientHeight, window.innerHeight * 0.85);

 
  // Load LONG-FORM CSV (no try/catch)
  
  const data = await d3.csv("../assets/book_details_long_genres.csv");
  if (!data || data.length === 0) return;

  
  // Aggregate by genre
  
  const genreMap = new Map();

  data.forEach(d => {
    const genre = d.genres_mapped_clean?.trim();
    if (!genre) return;

    const engagements = metric === "reviews"
      ? +d.num_reviews
      : +d.num_ratings;

    if (!genreMap.has(genre)) {
      genreMap.set(genre, { genre, count: 0, engagements: 0 });
    }

    const entry = genreMap.get(genre);
    entry.count += 1;
    entry.engagements += engagements;
  });

  const genresArray = Array.from(genreMap.values());

  
  // Build hierarchy
  
  const root = d3.hierarchy({ children: genresArray })
    .sum(d => d.count)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .paddingInner(2)
    .paddingOuter(2)(root);

  const maxEngagements = d3.max(genresArray, d => d.engagements);

  const color = d3.scaleSequential()
    .domain([0, maxEngagements])
    .interpolator(d3.interpolatePuRd);

  
  // SVG + Tooltip
 
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  const tooltip = d3.select(container)
    .append("div")
    .classed("tooltip", true);

  // -----------------------------
  // Draw rectangles
  // -----------------------------
  svg.selectAll("rect")
    .data(root.leaves())
    .join("rect")
    .attr("x", d => d.x0)
    .attr("y", d => d.y0)
    .attr("width", d => Math.max(0, d.x1 - d.x0))
    .attr("height", d => Math.max(0, d.y1 - d.y0))
    .attr("fill", d => color(d.data.engagements))
    .on("mousemove", (event, d) => {
      const rect = container.getBoundingClientRect();
      tooltip.style("opacity", 1)
        .html(`
          <b>${d.data.genre}</b><br>
          Books: ${d.data.count}<br>
          ${metric === "reviews" ? "Engagements" : "Ratings"}: 
          ${d.data.engagements.toLocaleString()}
        `)
        .style("left", (event.clientX - rect.left + 12) + "px")
        .style("top", (event.clientY - rect.top + 12) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // -----------------------------
  // Labels
  // -----------------------------
  svg.selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("x", d => d.x0 + 4)
    .attr("y", d => d.y0 + 14)
    .text(d => {
      const w = d.x1 - d.x0;
      const h = d.y1 - d.y0;
      if (w < 60 || h < 25) return "";
      return d.data.genre;
    })
    .style("font-size", "10px")
    .style("fill", "black")
    .style("pointer-events", "none");

// Dropdown listeners
const select = document.getElementById("metric-select");
if (select) {
  select.addEventListener("change", () => drawTreemap(select.value));
}

// Initial draw
drawTreemap(select ? select.value : "reviews");

// Redraw on resize
window.addEventListener("resize", () =>
  drawTreemap(select ? select.value : "reviews")
);
