

d3.csv("data/book_details_cleaned_final.csv").then(function(books) {


  books.forEach(d => {
    d.publication_year = +d.publication_year;
    d.num_ratings = +d.num_ratings;
  });

  //get total ratings of each author
  const authorReviewTotals = d3.rollup(
    books,
    v => d3.sum(v, d => d.num_ratings),
    d => d.author
  );

    //i only want to keep the top 8
  const topAuthors = Array.from(authorReviewTotals, ([author, totalReviews]) => ({ author, totalReviews }))
    .sort((a, b) => b.totalReviews - a.totalReviews)
    .slice(0, 8); //this is where you choose the number to keep

  const topAuthorNames = topAuthors.map(d => d.author); //then get the names of the top authors only
  const filteredBooks = books.filter(d => topAuthorNames.includes(d.author)); //and only the books that correspond with the names

  //making each author's colour different
  const colourScale = d3.scaleOrdinal() //scale ordinal for nominal stuff
    .domain(topAuthorNames)
    .range(["#F55B3D", "#DB8FD2", "#149C84", "#7B2ADE", "#3B8FFF", "#128A11", "#DE8D02"]);

  let selectedAuthor = null; //start with nobody selected


  function renderChart() {

    //clear old content so it won't stay around when screen resizes and it rerenders
    d3.select("#author-chart").selectAll("*").remove();
    d3.select("#legend-container").selectAll("*").remove();

    //get container size
    const container = document.getElementById("author-chart");
    var width = container.clientWidth;
    var height = container.clientHeight || 500; // fallback if container has no height

    const margin = { top: 20, right: 40, bottom: 40, left: 40 };

    //make svg with viewbox, w/h using the width/height we got before
    const svg = d3.select("#author-chart").append("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
      .style("width", "100%")
      .style("height", "100%");

    //title
    svg.append("text")
      .attr("class", "chart-title")
      .attr("text-anchor", "middle")
      .attr("x", width / 2) //position halfway of x width
      .attr("y", margin.top)   //positions it above everything
      .style("font-size", "1rem") //set font size
      .style("font-weight", "bold")
      .text("Top Authors by Ratings Over Time");

    //the scales
    const x = d3.scaleLinear()
      .domain(d3.extent(filteredBooks, d => d.publication_year))
      .range([margin.left, width - margin.right]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(filteredBooks, d => d.num_ratings) * 1.1])
      .range([height - margin.bottom, margin.top]);

    //axises
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(x));

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(y));

    //labels?
    svg.append("text")
      .attr("class", "x-label")
      .attr("text-anchor", "middle")
      .attr("x", width / 2)
      .attr("y", height - 5)
      .style("font-size", "0.8rem")
      .text("Publication Year");

    svg.append("text")
      .attr("class", "y-label")
      .attr("text-anchor", "middle")
      .attr("transform", `translate(15, ${height / 2}) rotate(-90)`)
      .style("font-size", "0.8rem")
      .text("Total Number of Ratings")
  

    //draw the points for each book
    const points = svg.append("g")
      .selectAll("circle")
      .data(filteredBooks)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.publication_year))
      .attr("cy", d => y(d.num_ratings))
      .attr("r", 5)
      .attr("fill", d => colourScale(d.author))
      .attr("opacity", 1)
      .style("cursor", "pointer");

    //making the hover tooltip that shows book details
    const tooltip = d3.select("#author-tooltip");

    points
      .on("mouseover", (event, d) => {
        tooltip.style("visibility", "visible")
          .html(`Book: ${d.book_title}<br>Author: ${d.author}<br>Year: ${d.publication_year}<br>Ratings: ${d.num_ratings}`); //change this to semantically correct css later
      })
      .on("mousemove", event => {
        tooltip.style("top", event.pageY + 10 + "px")
          .style("left", event.pageX + 10 + "px");
      })
      .on("mouseout", () => {
        tooltip.style("visibility", "hidden");
      });

    //highlight selected author on point click
    points.on("click", (event, d) => {
      if (selectedAuthor === d.author) {
        selectedAuthor = null;
        points.attr("fill", p => colourScale(p.author)).attr("opacity", 1);
      } else {
        selectedAuthor = d.author;
        points
          .attr("fill", p => p.author === selectedAuthor ? colourScale(p.author) : "grey")
          .attr("opacity", p => p.author === selectedAuthor ? 1 : 0.2);
      }
    });

    //make the legend
    const legendSvg = d3.select("#legend-container")
      .append("svg")
      .attr("width", 200)
      .attr("height", topAuthorNames.length * 25 + 10);

    const legend = legendSvg.append("g").attr("transform", "translate(10,10)");

    const legendItems = legend.selectAll(".legend-item")
      .data(topAuthorNames)
      .enter()
      .append("g")
      .attr("class", "legend-item")
      .attr("transform", (d, i) => `translate(0, ${i * 25})`)
      .style("cursor", "pointer");
    

    legendItems.append("rect")
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", d => colourScale(d));

    legendItems.append("text")
      .attr("x", 25)
      .attr("y", 14)
      // .style("font-family", "'Playfair Display', serif")
      // .attr("fill", "#2C6E49")
      .text(d => d);

    //legend interactions when hovering and clicking
    legendItems
      .on("mouseover", (event, author) => {
        points
          .attr("fill", d => d.author === author ? colourScale(d.author) : "grey")
          .attr("opacity", d => d.author === author ? 1 : 0.2);
      })
      .on("mouseout", () => {
        if (selectedAuthor) {
          points
            .attr("fill", d => d.author === selectedAuthor ? colourScale(d.author) : "grey")
            .attr("opacity", d => d.author === selectedAuthor ? 1 : 0.2);
        } else {
          points
            .attr("fill", d => colourScale(d.author))
            .attr("opacity", 1);
        }
      })
      .on("click", (event, author) => {
        if (selectedAuthor === author) {
          selectedAuthor = null;
          points.attr("fill", d => colourScale(d.author)).attr("opacity", 1);
        } else {
          selectedAuthor = author;
          points
            .attr("fill", d => d.author === author ? colourScale(d.author) : "grey")
            .attr("opacity", d => d.author === selectedAuthor ? 1 : 0.2);
        }
      });

  } 


  renderChart();
  window.addEventListener("resize", renderChart); //call redner chart when window changes

});
