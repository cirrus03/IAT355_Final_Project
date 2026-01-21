// --------------------------------------------------
// CONFIG FOR YEAR LINE CHART
// --------------------------------------------------
const yearConfigMobile = {
  width: 560,
  height: 400,
  margin: { top: 40, right: 20, bottom: 60, left: 70 }
};

let currentYearModeMobile = "popularity"; // "popularity" | "engagement"

// --------------------------------------------------
// MAIN FUNCTION
// --------------------------------------------------
async function yearTrends() {
  const raw = await d3.csv("./data/book_details_cleaned_final.csv");

  const data = raw
    .map(d => {
      const year = +d.publication_year || +d.original_publication_year;
      const avg = +d.average_rating;
      const numRatings = +d.num_ratings;
      const numReviews = +d.num_reviews;

      if (
        Number.isNaN(year) ||
        Number.isNaN(avg) ||
        Number.isNaN(numRatings) ||
        Number.isNaN(numReviews)
      ) {
        return null;
      }

      return {
        year,
        average_rating: avg,
        num_ratings: numRatings,
        num_reviews: numReviews
      };
    })
    .filter(d => d !== null)
    // keep a reasonable window; adjust if you want
    .filter(d => d.year >= 1900 && d.year <= 2025);

  if (!data.length) {
    console.warn("No valid rows found for year trends chart.");
    return;
  }

  // --------------------------------------------------
  // AGGREGATE BY YEAR
  // --------------------------------------------------
  const yearly = d3.rollups(
    data,
    v => ({
      total_ratings: d3.sum(v, d => d.num_ratings),
      total_reviews: d3.sum(v, d => d.num_reviews),
      avg_rating: d3.mean(v, d => d.average_rating),
      count_books: v.length
    }),
    d => d.year
  )
  .map(([year, stats]) => ({
    year: +year,
    ...stats
  }))
  .sort((a, b) => a.year - b.year);

  const { width, height, margin } = yearConfigMobile;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
    .select("#year-trends-mobile")
    .append("svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .style("max-width", "100%")
    .style("height", "auto");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Background
  g.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "var(--page-background, #faf7f2)");

  // SCALES
  const x = d3
    .scaleLinear()
    .domain(d3.extent(yearly, d => d.year))
    .range([0, innerWidth]);

  // Y will depend on mode (ratings vs reviews)
  const y = d3
    .scaleLog()
    .range([innerHeight, 0])
    .clamp(true);

  const line = d3
    .line()
    .x(d => x(d.year))
    .y(d => y(d.yValue))
    .curve(d3.curveMonotoneX);

  // AXES GROUPS
  const xAxisG = g
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`);

  const yAxisG = g.append("g");

  const xLabel = g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main, #333)")
    .text("Publication Year");

  const yLabel = g.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -50)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main, #333)");

  // Title
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -12)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-family", "'Playfair Display', serif")
    .style("font-weight", "500")
    .style("fill", "var(--text-main, #333)")
    .text("Popularity / Engagement vs Publication Year");

  // Tooltip
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("z-index", 999999999);

  // Hover vertical guide line
  const hoverLine = g.append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .style("opacity", 0);

  // Line + points group
  const lineG = g.append("path").attr("class", "year-line");
  const pointsG = g.append("g").attr("class", "year-points");

  // UPDATE FUNCTION
  function updateYear(mode) {
    currentYearModeMobile = mode;
    const yVar =
      mode === "popularity" ? "total_ratings" : "total_reviews";

    const yLabelText =
      mode === "popularity"
        ? "Total Ratings (Popularity)"
        : "Total Written Reviews (Engagement)";

    // Map data with yValue for this mode
    const series = yearly.map(d => ({
      ...d,
      yValue: d[yVar]
    }));

    const minVal = d3.min(series, d => d.yValue);
    const maxVal = d3.max(series, d => d.yValue);

    y.domain([Math.max(1, minVal || 1), maxVal || 10]);

    const xAxis = d3.axisBottom(x).ticks(8).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(y).ticks(6, "~s");

    xAxisG
      .transition()
      .duration(600)
      .call(xAxis);

    yAxisG
      .transition()
      .duration(600)
      .call(yAxis);

    yLabel
      .transition()
      .duration(600)
      .text(yLabelText);

    // Update line
    lineG
      .datum(series)
      .transition()
      .duration(600)
      .attr("fill", "none")
      .attr("stroke","var(--secondary)")
      .attr("stroke-width", 2)
      .attr("d", line);

    // Update points
    const pts = pointsG
      .selectAll("circle")
      .data(series, d => d.year);

    const ptsEnter = pts
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", "var(--secondary)");

    const allPts = ptsEnter.merge(pts);

    allPts
      .transition()
      .duration(600)
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(Math.max(1, d.yValue)));

    pts.exit().remove();

    // Hover interaction
    allPts
      .on("mousemove", (event, d) => {
        const xPos = x(d.year);
        const yPos = y(Math.max(1, d.yValue));
        updateZoom(currentYearModeMobile, d.year);

        hoverLine
          .attr("x1", xPos)
          .attr("x2", xPos)
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .style("opacity", 0.35);

        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.year}</strong><br>
             Avg rating: ${d.avg_rating.toFixed(2)}<br>
             Total ratings: ${d.total_ratings.toLocaleString()}<br>
             Total reviews: ${d.total_reviews.toLocaleString()}<br>
             Books that year: ${d.count_books}`
          )
          .style("left", event.clientX + 15 + "px")
          .style("top", event.clientY - 20 + "px");
      })
      .on("mouseout", () => {
        hoverLine.style("opacity", 0);
        tooltip.style("opacity", 0);
      });
  }

    // --------------------------------------------------
    // ZOOMED-IN CHART SETUP (DETAIL VIEW)
    // --------------------------------------------------
    const zoomWidth = width;      // can reuse same width
    const zoomHeight = 220;       // shorter height
    const zoomInnerHeight = zoomHeight - margin.top - margin.bottom;

    const zoomSvg = d3
    .select("#year-zoom-mobile")
    .append("svg")
    .attr("viewBox", `0 0 ${zoomWidth} ${zoomHeight}`)
    .style("max-width", "100%")
    .style("height", "auto");

    const zoomG = zoomSvg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

    zoomG.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", innerWidth)
    .attr("height", zoomInnerHeight)
    .attr("fill", "var(--page-background, #faf7f2)");

    const zoomXAxisG = zoomG
    .append("g")
    .attr("transform", `translate(0, ${zoomInnerHeight})`);

    const zoomYAxisG = zoomG.append("g");

    zoomTitle = zoomG.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", -12)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main)")
    .style("opacity", 0.6)
    .style("font-style", "italic")
    .text("Hover on a point to show zoomed view");

    // Reuse same line generator but with different yScale later
    const zoomLine = d3
    .line()
    .x(d => zoomX(d.year))
    .y(d => zoomY(Math.max(1, d.yValue)))
    .curve(d3.curveMonotoneX);

    const zoomLinePath = zoomG.append("path").attr("class", "zoom-line");
    const zoomPointsG = zoomG.append("g").attr("class", "zoom-points");

    // scales for zoom chart
    const zoomX = d3.scaleLinear().range([0, innerWidth]);
    const zoomY = d3.scaleLog().range([zoomInnerHeight, 0]).clamp(true);

    function updateZoom(mode, centerYear) {
    const yVar = mode === "popularity" ? "total_ratings" : "total_reviews";

    const windowSize = 5; // years on each side
    const minYear = centerYear - windowSize;
    const maxYear = centerYear + windowSize;

    const zoomData = yearly
        .filter(d => d.year >= minYear && d.year <= maxYear)
        .map(d => ({
        ...d,
        yValue: d[yVar]
        }));

    if (!zoomData.length) return;

    zoomX.domain([minYear, maxYear]);

    const minVal = d3.min(zoomData, d => d.yValue);
    const maxVal = d3.max(zoomData, d => d.yValue);
    zoomY.domain([Math.max(1, minVal || 1), maxVal || 10]);

    const xAxis = d3.axisBottom(zoomX).ticks(6).tickFormat(d3.format("d"));
    const yAxis = d3.axisLeft(zoomY).ticks(4, "~s");

    zoomXAxisG
        .transition()
        .duration(400)
        .call(xAxis);

    zoomYAxisG
        .transition()
        .duration(400)
        .call(yAxis);

    zoomTitle.text(`Zoomed view: around ${centerYear}`);

    zoomLinePath
        .datum(zoomData)
        .transition()
        .duration(400)
        .attr("fill", "none")
        .attr("stroke", "var(--secondary)")
        .attr("stroke-width", 2)
        .attr("d", zoomLine);

    const zPts = zoomPointsG
        .selectAll("circle")
        .data(zoomData, d => d.year);

    const zEnter = zPts
        .enter()
        .append("circle")
        .attr("r", 3)
        .attr("fill", "var(--secondary)");

    zEnter.merge(zPts)
        .transition()
        .duration(400)
        .attr("cx", d => zoomX(d.year))
        .attr("cy", d => zoomY(Math.max(1, d.yValue)));

    zPts.exit().remove();
    }

  // Initial render
  updateYear(currentYearModeMobile);

  // --------------------------------------------------
  // TOGGLE STYLING + INTERACTION (MATCHES SCATTER STYLE)
// --------------------------------------------------
  const yearButtons = document.querySelectorAll(".year-toggle-mobile .year-mode-btn");

  yearButtons.forEach(btn => {
    // Base style
    btn.style.padding = "6px 14px";
    btn.style.background = "var(--text-main)";        // dark green
    btn.style.color = "var(--page-background)";       // yellow
    btn.style.border = "none";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.fontFamily = "'Playfair Display', serif";
    btn.style.transition = "background 0.2s, opacity 0.2s";
    btn.style.opacity = "0.60";

    // Hover
    btn.addEventListener("mouseenter", () => {
      btn.style.opacity = "1";
    });

    btn.addEventListener("mouseleave", () => {
      if (!btn.classList.contains("active")) {
        btn.style.opacity = "0.60";
      }
    });

    // Click
    btn.addEventListener("click", () => {
      const mode = btn.dataset.mode;
      if (mode === currentYearModeMobile) return;

      yearButtons.forEach(b => {
        b.classList.remove("active");
        b.style.opacity = "0.60";
        b.style.background = "var(--text-main)";
        b.style.color = "var(--page-background)";
      });

      btn.classList.add("active");
      btn.style.opacity = "1";
      btn.style.background = "rgba(0,50,0,0.95)";
      btn.style.color = "var(--page-background)";

      updateYear(mode);
    });
  });

  // Initial active button
  const initialYearActive = document.querySelector(
    `.year-toggle .year-mode-btn[data-mode="${currentYearModeMobile}"]`
  );
  if (initialYearActive) {
    initialYearActive.classList.add("active");
    initialYearActive.style.opacity = "1";
    initialYearActive.style.background = "rgba(0,50,0,0.95)";
    initialYearActive.style.color = "var(--page-background)";
  }
}

// --------------------------------------------------
// RUN
// --------------------------------------------------
yearTrends();
