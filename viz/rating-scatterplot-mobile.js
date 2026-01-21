// --------------------------------------------------
// CONFIG
// --------------------------------------------------
const scatterConfigMobile = {
  width: 610,
  height: 580,
  margin: { top: 40, right: 40, bottom: 60, left: 70 }
};

let currentModeMobile = "popularity"; // "popularity" | "engagement"

// --------------------------------------------------
// MAIN FUNCTION
// --------------------------------------------------
async function ratingScatter() {
  // --------------------------------------------------
  // LOAD + PREP DATA
  // --------------------------------------------------
  const raw = await d3.csv("./data/book_details_cleaned_final.csv");

  const data = raw
    .map(d => {
      const avg = +d.average_rating;
      const numRatings = +d.num_ratings;
      const numReviews = +d.num_reviews;

      // Skip rows with missing key fields
      if (Number.isNaN(avg) || Number.isNaN(numRatings) || Number.isNaN(numReviews)) {
        return null;
      }

      // Bin rating into 0.5-star increments
      const ratingBin = Math.round(avg * 2) / 2; // e.g. 3.7 -> 3.5, 4.2 -> 4.0

      return {
        title: d.book_title || d.title || "Unknown title",
        author: d.book_author || d.author || "Unknown author",
        average_rating: avg,
        num_ratings: numRatings,
        num_reviews: numReviews,
        ratingBin
      };
    })
    .filter(d => d !== null);

  if (!data.length) {
    console.warn("No valid rows found for scatterplot.");
    return;
  }

  // Collect distinct rating bins (0.5 to 5 in your data)
  const ratingBins = Array.from(
    new Set(data.map(d => d.ratingBin))
  ).sort((a, b) => a - b);

  // --------------------------------------------------
  // SVG SETUP
  // --------------------------------------------------
  const { width, height, margin } = scatterConfigMobile;
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const svg = d3
  .select("#rating-scatter-mobile")
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

  // --------------------------------------------------
  // SCALES
  // --------------------------------------------------
  // X: average rating (constant)
  const x = d3
    .scaleLinear()
    .domain(d3.extent(data, d => d.average_rating))
    .nice()
    .range([0, innerWidth]);

  // Y will change depending on mode (popularity vs engagement)
  const y = d3
    .scaleLog()
    .range([innerHeight, 0])
    .clamp(true);

  // Color by rating bin (0.5-star steps)
  const color = d3
    .scaleOrdinal()
    .domain(ratingBins)
    .range([
      "#f4f1de", "#f2cc8f", "#e5989b", "#b5838d", "#6d6875",
      "#8bbabb", "#6a994e", "#386641", "#2a9d8f", "#264653"
    ].slice(0, ratingBins.length)); // trim if fewer bins

  // --------------------------------------------------
  // AXES GROUPS
  // --------------------------------------------------
  const xAxisG = g
    .append("g")
    .attr("transform", `translate(0, ${innerHeight})`);

  const yAxisG = g.append("g");

  // X-axis label (Average Rating – constant)
  const xLabel = g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 45)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-family", "'Playfair Display', serif")
    .style("fill", "var(--text-main, #333)")
    .text("Average Rating");

  // Y-axis label (changes with mode)
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
    .text("Popularity / Engagement vs Average Rating");

  // --------------------------------------------------
  // TOOLTIP
  // --------------------------------------------------
  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip")
    .style("position", "fixed")
    .style("opacity", 0)
    .style("pointer-events", "none")
    .style("z-index", 999999999);

  // --------------------------------------------------
  // HOVER CROSSHAIR LINES
  // --------------------------------------------------
  const hoverXLine = g.append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .style("opacity", 0);

  const hoverYLine = g.append("line")
    .attr("stroke", "#999")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "3,3")
    .style("opacity", 0);

  // --------------------------------------------------
  // CIRCLES GROUP
  // --------------------------------------------------
  const dotsG = g.append("g").attr("class", "dots-layer");

  // --------------------------------------------------
  // UPDATE FUNCTION (toggles mode)
// --------------------------------------------------
  function updateScatter(mode) {
    currentModeMobile = mode;

    const yVar = mode === "popularity" ? "num_ratings" : "num_reviews";
    const labelText =
      mode === "popularity"
        ? "Total Number of Ratings (Popularity)"
        : "Total Number of Written Reviews (Engagement)";

    // Set y domain (avoid log(0) by clamping to at least 1)
    const minVal = d3.min(data, d => d[yVar]);
    const maxVal = d3.max(data, d => d[yVar]);

    y.domain([Math.max(1, minVal || 1), maxVal || 10]);

    // Axes
    const xAxis = d3.axisBottom(x).ticks(6);
    const yAxis = d3.axisLeft(y).ticks(8, "~s");

    xAxisG
      .transition()
      .duration(700)
      .call(xAxis);

    yAxisG
      .transition()
      .duration(700)
      .call(yAxis);

    xLabel
      .transition()
      .duration(700)
      .text("Average Rating");

    yLabel
      .transition()
      .duration(700)
      .text(labelText);

    // Dots
    const dots = dotsG
      .selectAll("circle")
      .data(data, d => d.title + d.author);

    // ENTER + UPDATE MERGED SELECTION
    const dotsEnter = dots
      .enter()
      .append("circle")
      .attr("r", 3)
      .attr("fill", d => color(d.ratingBin));

    const allDots = dotsEnter.merge(dots);

    allDots
      .transition()
      .duration(700)
      .attr("cx", d => x(d.average_rating))
      .attr("cy", d => y(Math.max(1, d[yVar])))
      .attr("opacity", 0.75)
      .attr("fill", d => color(d.ratingBin));

    // HOVER INTERACTIONS (tooltip + crosshair + dimming)
    allDots
      .on("mousemove", (event, d) => {
        const xVal = x(d.average_rating);
        const yVal = y(Math.max(1, d[yVar]));

        // Tooltip
        tooltip
          .style("opacity", 1)
          .html(
            `<strong>${d.title}</strong><br>
             ${d.author}<br>
             ⭐ ${d.average_rating.toFixed(2)}<br>
             Ratings: ${d.num_ratings.toLocaleString()}<br>
             Reviews: ${d.num_reviews.toLocaleString()}`
          )
          .style("left", event.clientX + 15 + "px")
          .style("top", event.clientY - 20 + "px");

        // Crosshair lines
        hoverXLine
          .attr("x1", xVal)
          .attr("x2", xVal)
          .attr("y1", 0)
          .attr("y2", innerHeight)
          .style("opacity", 0.35);

        hoverYLine
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yVal)
          .attr("y2", yVal)
          .style("opacity", 0.35);

        // Dim non-related points (different ratingBin)
        allDots
          .attr("opacity", d2 => d2.ratingBin === d.ratingBin ? 0.9 : 0.15);
      })
      .on("mouseout", () => {
        tooltip.style("opacity", 0);
        hoverXLine.style("opacity", 0);
        hoverYLine.style("opacity", 0);

        // Reset all dots
        allDots.attr("opacity", 0.75);
      });

    // EXIT
    dots.exit().remove();

    console.log("initial chart render complete");
  }

  // Initial render
  updateScatter(currentModeMobile);

    // --------------------------------------------------
    // BUTTON INTERACTIONS + STYLING
    // --------------------------------------------------
    const buttons = document.querySelectorAll(".scatter-toggle .mode-btn");

    // Base styling + interactions for all buttons
    buttons.forEach(btn => {
    // Base style
    btn.style.padding = "6px 14px";
    btn.style.background = "var(--text-main)";         // dark green background
    btn.style.color = "var(--page-background)";        // yellow/tan text
    btn.style.border = "none";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";
    btn.style.fontSize = "12px";
    btn.style.fontFamily = "'Playfair Display', serif";
    btn.style.transition = "background 0.2s, opacity 0.2s";
    btn.style.opacity = "0.60";

    // Hover behavior
    btn.addEventListener("mouseenter", () => {
        btn.style.opacity = "1";
    });

    btn.addEventListener("mouseleave", () => {
        if (!btn.classList.contains("active")) {
        btn.style.opacity = "0.60";
        }
    });

    // Click behavior
    btn.addEventListener("click", () => {
        const mode = btn.dataset.mode;
        if (mode === currentModeMobile) return;

        // Reset all buttons
        buttons.forEach(b => {
        b.classList.remove("active");
        b.style.opacity = "0.60";
        b.style.background = "var(--text-main)";
        b.style.color = "var(--page-background)";
        });

        // Activate clicked button
        btn.classList.add("active");
        btn.style.opacity = "1";
        btn.style.background = "rgba(0,50,0,0.95)"; // slightly darker green
        btn.style.color = "var(--page-background)";

        // Update chart
        updateScatter(mode);
    });
    });

    // Ensure initial active button matches currentMode
    const initialActive = document.querySelector(
    `.scatter-toggle .mode-btn[data-mode="${currentModeMobile}"]`
    );
    if (initialActive) {
    initialActive.classList.add("active");
    initialActive.style.opacity = "1";
    initialActive.style.background = "rgba(0,50,0,0.95)";
    initialActive.style.color = "var(--page-background)";
    }

  // --------------------------------------------------
  // LEGEND FOR RATING BINS
  // --------------------------------------------------
  const legend = d3
    .select("#rating-scatter-mobile")
    .append("div")
    .attr("class", "rating-legend")
    .style("display", "flex")
    .style("flex-wrap", "wrap")
    .style("gap", "10px")
    .style("margin-top", "8px");

  ratingBins.forEach(bin => {
    const item = legend
      .append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("gap", "4px")
      .style("font-size", "11px")
      .style("font-family", "'Playfair Display', serif");

    item
      .append("span")
      .style("display", "inline-block")
      .style("width", "10px")
      .style("height", "10px")
      .style("border-radius", "50%")
      .style("background", color(bin));

    item.append("span").text(`${bin.toFixed(1)}★`);
  });
}

// --------------------------------------------------
// RUN
// --------------------------------------------------
ratingScatter();
