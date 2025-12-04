async function buildGenreBarChart() {

  const data = await d3.csv("./assets/book_details_long_genres.csv");

  // --- Expand into individual genre rows ---
  const expanded = data.flatMap(row => {
    const genres = row.genres_mapped_clean
      .split(";")
      .map(g => g.trim())
      .filter(g => g.length > 0);

    return genres.map(g => ({
      genre: g,
      ratings: +row.num_ratings.replace(/,/g, ""),
      reviews: +row.num_reviews.replace(/,/g, "")
    }));
  });

  // --- Aggregate totals per genre ---
  const genreStats = d3.rollups(
    expanded,
    v => ({
      ratings: d3.sum(v, d => d.ratings),
      reviews: d3.sum(v, d => d.reviews)
    }),
    d => d.genre
  ).map(([genre, totals]) => ({ genre, ...totals }))
   .sort((a, b) => d3.descending(a.ratings, b.ratings));

  // --------------------------
  // CHART DIMENSIONS
  // --------------------------
  const width = 600;
  const height = 600;
  const margin = { top: 40, right: 20, bottom: 40, left: 150 };

  const svg = d3.select("#genre-bar-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Tooltip
  const tooltip = d3.select("#genre-bar-chart")
    .append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("font-size", "12px");

  // X = metric values (linear scale)
  const x = d3.scaleLinear()
    .range([margin.left, width - margin.right]);

  // Y = genre names
  const y = d3.scaleBand()
    .domain(genreStats.map(d => d.genre))
    .range([margin.top, height - margin.bottom])
    .padding(0.2);

  const xAxis = svg.append("g")
    .attr("class", "x-axis")
    .attr("transform", `translate(0, ${margin.top})`);

  const yAxis = svg.append("g")
    .attr("class", "y-axis")
    .attr("transform", `translate(${margin.left}, 0)`);

  const bars = svg.append("g").attr("class", "bars");

  // --------------------------
  // UPDATE (ratings or reviews)
  // --------------------------
  function update(metric) {

    x.domain([0, d3.max(genreStats, d => d[metric])]);

    // Title
    document.getElementById("genre-chart-title").textContent =
      metric === "ratings" ? "Total Ratings by Genre" : "Total Reviews by Genre";

    // Axes
    xAxis.call(d3.axisTop(x).ticks(5, "~s"));
    yAxis.call(d3.axisLeft(y));

    // Bars
    bars.selectAll("rect")
      .data(genreStats, d => d.genre)
      .join("rect")
        .attr("y", d => y(d.genre))
        .attr("height", y.bandwidth())
        .transition()
        .duration(700)
        .attr("x", x(0))
        .attr("width", d => x(d[metric]) - x(0))
        .attr("fill", "#8CA496");

    // Tooltips
    bars.selectAll("rect")
      .on("mousemove", function (event, d) {
        tooltip.style("opacity", 1)
          .html(`
            <strong>${d.genre}</strong><br>
            ${metric === "ratings" 
              ? `Ratings: ${d.ratings.toLocaleString()}`
              : `Reviews: ${d.reviews.toLocaleString()}`
            }
          `)
          .style("left", event.offsetX + 15 + "px")
          .style("top", event.offsetY + "px");
      })
      .on("mouseleave", () => tooltip.style("opacity", 0));
  }

  // Draw initial chart
  update("ratings");

  // Dropdown interaction
  document.getElementById("genre-metric-select")
    .addEventListener("change", e => update(e.target.value));
}

buildGenreBarChart();
