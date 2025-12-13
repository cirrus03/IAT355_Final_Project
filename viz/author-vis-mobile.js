d3.csv("data/book_details_cleaned_final.csv").then(function(books) {

  books.forEach(d => {
    d.publication_year = +d.publication_year;
    d.num_ratings = +d.num_ratings;
  });

  // get total ratings of each author
  const authorReviewTotals = d3.rollup(
    books,
    v => d3.sum(v, d => d.num_ratings),
    d => d.author
  );

  // keep the top 8
  const topAuthors = Array.from(authorReviewTotals, ([author, totalReviews]) => ({ author, totalReviews }))
    .sort((a, b) => b.totalReviews - a.totalReviews)
    .slice(0, 8);

  const topAuthorNames = topAuthors.map(d => d.author);
  const filteredBooks = books.filter(d => topAuthorNames.includes(d.author));

  // author colour palette (soft but distinct)
  const colourScale = d3.scaleOrdinal()
    .domain(topAuthorNames)
    .range([
      "#E77D62", "#345463", "#FF9E89", "#8A6B82",
      "#3C8A61", "#6F8FA0", "#A7849F", "#C4644C"
    ]);

  let selectedAuthor = null;

  function renderChart() {
    // clear old content
    d3.select("#author-chart-mobile").selectAll("*").remove();
    d3.select("#legend-container").selectAll("*").remove();

    // container size
    const container = document.getElementById("author-chart-mobile");
    const width = container.clientWidth || 560;
    const height = container.clientHeight || 420;

    const margin = { top: 40, right: 30, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // svg with viewBox for responsiveness
    const svg = d3.select("#author-chart-mobile").append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("max-width", "100%")
      .style("height", "auto");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // background panel
    g.append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "var(--page-background, #faf7f2)");

    // title
    svg.append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", margin.top - 16)
      .style("font-size", "18px")
      .style("font-family", "'Playfair Display', serif")
      .style("font-weight", "500")
      .style("fill", "var(--text-main, #2C6E49)")
      .text("Top Authors by Ratings Over Time");

    // scales
    const x = d3.scaleLinear()
      .domain(d3.extent(filteredBooks, d => d.publication_year))
      .nice()
      .range([0, innerWidth]);

    const y = d3.scaleLog()
      .domain([
        Math.max(1, d3.min(filteredBooks, d => d.num_ratings) || 1),
        d3.max(filteredBooks, d => d.num_ratings) * 1.1
      ])
      .range([innerHeight, 0])
      .clamp(true);

    // axes
    const xAxis = d3.axisBottom(x).ticks(8).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).ticks(6, "~s");

    const xAxisG = g.append("g")
      .attr("transform", `translate(0, ${innerHeight})`)
      .call(xAxis);

    const yAxisG = g.append("g")
      .call(yAxis);

    xAxisG.selectAll("text")
      .style("font-family", "'Playfair Display', serif")
      .style("font-size", "11px")
      .style("fill", "var(--text-main, #2C6E49)");

    yAxisG.selectAll("text")
      .style("font-family", "'Playfair Display', serif")
      .style("font-size", "11px")
      .style("fill", "var(--text-main, #2C6E49)");

    xAxisG.selectAll("path, line")
      .style("stroke", "var(--axis-grid, #d0d0d0)");

    yAxisG.selectAll("path, line")
      .style("stroke", "var(--axis-grid, #d0d0d0)");

    // axis labels
    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 15)
      .style("font-size", "13px")
      .style("font-family", "'Playfair Display', serif")
      .style("fill", "var(--text-main, #2C6E49)")
      .text("Publication Year");

    svg.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(20, ${height / 2}) rotate(-90)`)
      .style("font-size", "13px")
      .style("font-family", "'Playfair Display', serif")
      .style("fill", "var(--text-main, #2C6E49)")
      .text("Total Number of Ratings");

    // --------------------------------------------------
    // TOOLTIP (lives in <body>, above everything)
// --------------------------------------------------
    let tooltip = d3.select("body").select("#author-tooltip-mobile");
    if (tooltip.empty()) {
      tooltip = d3.select("body")
        .append("div")
        .attr("id", "author-tooltip-mobile")
        .attr("class", "author-mobile");
    }

    tooltip
      .style("position", "fixed")
      .style("opacity", 0)
      .style("visibility", "hidden")
      .style("pointer-events", "none")
      .style("background", "var(--page-background)")
      .style("color", "var(--text-main, #333)")
      .style("padding", "6px 8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("font-family", "'Playfair Display', serif")
      .style("max-width", "260px")
      .style("border", "1px solid var(--text-main)")
      .style("z-index", 999999999);

    // --------------------------------------------------
    // POINTS
    // --------------------------------------------------
    const points = g.append("g")
      .selectAll("circle")
      .data(filteredBooks)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.publication_year))
      .attr("cy", d => y(Math.max(1, d.num_ratings)))
      .attr("r", 3.5)
      .attr("fill", d => colourScale(d.author))
      .attr("opacity", 0.8)
      .style("cursor", "pointer");

    // HOVER HANDLERS
    points
      .on("mousemove", (event, d) => {
        tooltip
          .style("opacity", 1)
          .style("visibility", "visible")
          .html(
            `<strong>${d.book_title}</strong><br>
             ${d.author}<br>
             Year: ${d.publication_year}<br>
             Ratings: ${d.num_ratings.toLocaleString()}`
          )
          .style("left", event.clientX + 15 + "px")
          .style("top", event.clientY - 20 + "px");
      })
      .on("mouseout", () => {
        tooltip
          .style("opacity", 0)
          .style("visibility", "hidden");
      });

    // --------------------------------------------------
    // CLICK TO HIGHLIGHT AUTHOR
    // --------------------------------------------------
    points.on("click", (event, d) => {
      if (selectedAuthor === d.author) {
        selectedAuthor = null;
        points
          .attr("fill", p => colourScale(p.author))
          .attr("opacity", 0.8);
      } else {
        selectedAuthor = d.author;
        points
          .attr("fill", p =>
            p.author === selectedAuthor ? colourScale(p.author) : "rgba(0,0,0,0.2)"
          )
          .attr("opacity", p => p.author === selectedAuthor ? 0.95 : 0.25);
      }
    });

    // --------------------------------------------------
    // LEGEND (compact 2-column)
// --------------------------------------------------
    const legendCols = 2;
    const legendItemHeight = 18;   // vertical spacing
    const legendItemWidth = 120;   // horizontal spacing

    const legendRows = Math.ceil(topAuthorNames.length / legendCols);
    const legendWidth = legendCols * legendItemWidth + 16;
    const legendHeight = legendRows * legendItemHeight + 16;

    const legendSvg = d3.select("#legend-container")
      .append("svg")
      .attr("viewBox", `0 0 ${legendWidth} ${legendHeight}`)
      .style("max-width", "100%")
      .style("height", "auto");

    const legend = legendSvg.append("g")
      .attr("transform", "translate(8,8)");

    const legendItems = legend.selectAll(".legend-item")
      .data(topAuthorNames)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => {
        const col = i % legendCols;
        const row = Math.floor(i / legendCols);
        return `translate(${col * legendItemWidth}, ${row * legendItemHeight})`;
      })
      .style("cursor", "pointer");

    legendItems.append("rect")
      .attr("width", 10)
      .attr("height", 10)
      .attr("rx", 5)
      .attr("ry", 5)
      .attr("fill", d => colourScale(d));

    legendItems.append("text")
      .attr("x", 16)
      .attr("y", 9)
      .style("font-family", "'Playfair Display', serif")
      .style("font-size", "10px")
      .style("fill", "var(--text-main, #2C6E49)")
      .text(d => d);

    // legend interactions
    legendItems
      .on("mouseover", (event, author) => {
        points
          .attr("fill", d => d.author === author ? colourScale(d.author) : "rgba(0,0,0,0.2)")
          .attr("opacity", d => d.author === author ? 0.95 : 0.25);
      })
      .on("mouseout", () => {
        if (selectedAuthor) {
          points
            .attr("fill", d =>
              d.author === selectedAuthor ? colourScale(d.author) : "rgba(0,0,0,0.2)"
            )
            .attr("opacity", d => d.author === selectedAuthor ? 0.95 : 0.25);
        } else {
          points
            .attr("fill", d => colourScale(d.author))
            .attr("opacity", 0.8);
        }
      })
      .on("click", (event, author) => {
        if (selectedAuthor === author) {
          selectedAuthor = null;
          points
            .attr("fill", d => colourScale(d.author))
            .attr("opacity", 0.8);
        } else {
          selectedAuthor = author;
          points
            .attr("fill", d =>
              d.author === selectedAuthor ? colourScale(d.author) : "rgba(0,0,0,0.2)"
            )
            .attr("opacity", d => d.author === selectedAuthor ? 0.95 : 0.25);
        }
      });
  }

  // initial render + resize handler
  renderChart();
  window.addEventListener("resize", renderChart);
});
