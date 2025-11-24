import * as d3 from "https://cdn.skypack.dev/d3@7";

export async function drawTreemap(metric = "reviews") {
  const container = document.getElementById("treemap-page");
  if (!container) return;

  // Clear previous SVG & tooltip
  container.querySelectorAll("svg, div.tooltip").forEach(el => el.remove());

  // -----------------------------
  // Responsive sizing
  // -----------------------------
  const width = container.clientWidth;
  const height = Math.min(container.clientHeight, window.innerHeight * 0.85);

  // -----------------------------
  // Load CSV
  // -----------------------------
  let data;
  try {
    data = await d3.csv("../assets/book_details_with_mapped_genres_finals.csv");
  } catch (err) {
    console.error("Error loading CSV:", err);
    return;
  }

  if (!data || data.length === 0) return;

  // -----------------------------
  // Flatten genres & aggregate
  // -----------------------------
  const rows = [];
  data.forEach(d => {
    const engagements = metric === "reviews" ? +d.num_reviews : +d.num_ratings;
    const genresStr = d.genres_mapped_clean;
    if (!genresStr) return;

    const genres = genresStr.replace(/[\[\]']/g, "")
      .split(",")
      .map(g => g.trim())
      .filter(Boolean);

    genres.forEach(g => rows.push({ genre: g, engagements }));
  });

  const genreStatsMap = new Map();
  rows.forEach(d => {
    if (!genreStatsMap.has(d.genre)) genreStatsMap.set(d.genre, { count: 0, engagements: 0 });
    const stat = genreStatsMap.get(d.genre);
    stat.count += 1;
    stat.engagements += d.engagements;
  });

  const genresArray = Array.from(genreStatsMap.entries())
    .map(([genre, stat]) => ({ genre, count: stat.count, engagements: stat.engagements }));

  // -----------------------------
  // Treemap hierarchy
  // -----------------------------
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

  // -----------------------------
  // SVG & Tooltip
  // -----------------------------
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
        .html(`<b>${d.data.genre}</b><br>Books: ${d.data.count}<br>${metric === "reviews" ? "Engagements" : "Ratings"}: ${d.data.engagements.toLocaleString()}`)
        .style("left", (event.clientX - rect.left + 12) + "px")
        .style("top", (event.clientY - rect.top + 12) + "px");
    })
    .on("mouseout", () => tooltip.style("opacity", 0));

  // -----------------------------
  // Draw labels
  // -----------------------------
  svg.selectAll("text")
    .data(root.leaves())
    .join("text")
    .attr("x", d => d.x0 + 4)
    .attr("y", d => d.y0 + 14)
    .text(d => {
      const boxW = d.x1 - d.x0;
      const boxH = d.y1 - d.y0;

      // Prevent labels in tiny boxes
      if (boxW < 60 || boxH < 25) return "";

      return d.data.genre;
    })

    .style("font-size", d => Math.min(
      8,                        // max size
      Math.max(10, (d.y1 - d.y0) / 3)  // auto-scaling size
) + "px")    .style("fill", "white")
    .style("pointer-events", "none");

// -----------------------------
// Legend
// -----------------------------
const legendHeight = 10;
const legendWidth = 180;

const legend = svg.append("g")
  .attr("class", "legend")
  .attr("transform", `translate(${width - legendWidth - 20}, ${height - 40})`);

// Gradient definition
const defs = svg.append("defs");
const gradient = defs.append("linearGradient")
  .attr("id", "legend-gradient")
  .attr("x1", "0%")
  .attr("x2", "100%")
  .attr("y1", "0%")
  .attr("y2", "0%");

gradient.append("stop")
  .attr("offset", "0%")
  .attr("stop-color", color(0));

gradient.append("stop")
  .attr("offset", "100%")
  .attr("stop-color", color(maxEngagements));

// Draw gradient bar
legend.append("rect")
  .attr("width", legendWidth)
  .attr("height", legendHeight)
  .attr("fill", "url(#legend-gradient)")
  .attr("rx", 4);

// Min value label
legend.append("text")
  .attr("x", 0)
  .attr("y", legendHeight + 14)
  .text("Low")
  .style("font-size", "10px")
  .style("fill", "white");

// Max value label
legend.append("text")
  .attr("x", legendWidth)
  .attr("y", legendHeight + 14)
  .attr("text-anchor", "end")
  .text("High")
  .style("font-size", "10px")
  .style("fill", "white");

// Legend title (Engagements / Ratings)
legend.append("text")
  .attr("x", legendWidth / 2)
  .attr("y", -6)
  .attr("text-anchor", "middle")
  .text(metric === "reviews" ? "Engagement (Reviews)" : "Popularity (Ratings)")
  .style("font-size", "11px")
  .style("fill", "white");


}


// -----------------------------
// Dropdown toggle
// -----------------------------
const select = document.getElementById("metric-select");
if (select) {
  select.addEventListener("change", () => drawTreemap(select.value));
}

// -----------------------------
// Initial draw
// -----------------------------
drawTreemap(select ? select.value : "reviews");

// -----------------------------
// Redraw on window resize
// -----------------------------
window.addEventListener("resize", () => drawTreemap(select ? select.value : "reviews"));

