// // Step 1: Load the CSV data
// d3.csv("data/book_details_cleaned_final.csv").then(function(books) {

//   // Step 2: Process the data
//   books.forEach(d => {
//     d.publication_year = +d.publication_year; // Convert year to number
//     d.num_ratings = +d.num_ratings; // Convert num_reviews to number
//   });

//   // Step 3: Calculate total reviews by author and filter top 5 authors
//   const authorReviewTotals = d3.rollup(
//     books,
//     v => d3.sum(v, d => d.num_ratings),
//     d => d.author
//   );

//   const topAuthors = Array.from(authorReviewTotals, ([author, totalReviews]) => ({ author, totalReviews }))
//     .sort((a, b) => b.totalReviews - a.totalReviews)
//     .slice(0, 8); // Get top 8 authors

//   const topAuthorNames = topAuthors.map(d => d.author);

//   // Filter the data to include only the top 5 authors
//   const filteredBooks = books.filter(d => topAuthorNames.includes(d.author));

//   // Step 4: Set up the SVG container for the scatter plot
//   const margin = { top: 0, right: 20, bottom: 40, left: 40 };
//   const width = 300 - margin.left - margin.right;
//   const height = 200 - margin.top - margin.bottom;

//   const svg = d3.select("#author-chart").append("svg")
//     .attr("width", width + margin.left + margin.right)
//     .attr("height", height + margin.top + margin.bottom)
//     .append("g")
//     .attr("transform", `translate(${margin.left},${margin.top})`);


//   //trying to create distinct colours for each author
//   var colourScale =d3.scaleOrdinal()
//     .domain(topAuthorNames)
//     .range(["#F55B3D", "#DB8FD2", "#149C84", "#7B2ADE", "#3B8FFF", "#128A11", "#DE8D02"]);

//   // Step 5: Create scales for x (year) and y (num_reviews)
//   const x = d3.scaleLinear()
//     .domain([d3.min(filteredBooks, d => d.publication_year) - 1, d3.max(filteredBooks, d => d.publication_year) + 1])
//     .range([0, width]);

//   const y = d3.scaleLinear()
//     .domain([0, d3.max(filteredBooks, d => d.num_ratings) * 1.1])
//     .range([height, 0]);

//   // Step 6: Create axes
//   svg.append("g")
//     .selectAll(".x-axis")
//     .data([x])
//     .enter()
//     .append("g")
//     .attr("class", "x-axis")
//     .attr("transform", `translate(0,${height})`)
//     .call(d3.axisBottom(x));

//   svg.append("g")
//     .selectAll(".y-axis")
//     .data([y])
//     .enter()
//     .append("g")
//     .attr("class", "y-axis")
//     .call(d3.axisLeft(y));

//   // Step 7: Plot the data as scatter points
//   const points = svg.append("g")
//     .selectAll(".point")
//     .data(filteredBooks)
//     .enter()
//     .append("circle")
//     .attr("class", "point")
//     .attr("cx", d => x(d.publication_year))
//     .attr("cy", d => y(d.num_ratings))
//     .attr("r", 5)
//     .attr("fill", d => colourScale(d.author)
//     )  // Color by author
//     .attr("stroke", "black")
//     .attr("stroke-width", 1)
//     .attr("opacity", 1);

//   // Step 8: Add tooltips for hover
//   const tooltip = d3.select("#tooltip");

//   points.on("mouseover", function(event, d) {
//     tooltip.style("visibility", "visible")
//       .html(`Book: ${d.book_title}<br>Author: ${d.author}<br>Year: ${d.publication_year}<br>Reviews: ${d.num_ratings}`);
//   })
//   .on("mousemove", function(event) {
//     tooltip.style("top", (event.pageY + 10) + "px")
//       .style("left", (event.pageX + 10) + "px");
//   })
//   .on("mouseout", function() {
//     tooltip.style("visibility", "hidden");
//   });

//   // Step 9: Add click-to-filter behavior
//   let selectedAuthor = null;

//   points.on("click", function (event, d) {
//     if (selectedAuthor === d.author) {
//       selectedAuthor = null;  // Deselect if the same author is clicked again
//       points.attr("fill", d => d3.scaleOrdinal(d3.schemeCategory10)(d.author))
//       .attr("opacity", 1); // Reset all points
//     } else {
//       selectedAuthor = d.author;
//       points.attr("fill", point =>
//         point.author === selectedAuthor 
//           ? colourScale(point.author) //grey out non selected authors
//           : "grey")
//       .attr("opacity", point => point.author === selectedAuthor ? 1 : 0.3); //lower opacity for nonselected authors
//   }});


//   //dropdown menu for selecting an author
//   const authorSelect = d3.select("#author-select");

//   //add authors to dropdown menu
//   topAuthors.forEach(function(d) {
//     authorSelect.append("option")
//       .attr("value", d.author)
//       .text(d.author);
//   });

//   //changes in dropdown menu
//   authorSelect.on("change", function() {
//     const selectedAuthor = this.value;

//     points.attr("fill", function(d) {
//       if (!selectedAuthor || d.author === selectedAuthor) {
//        return colourScale(d.author);  //highlight selected author
//       } else {
//         return "grey";  //grey out other authors
//       }
//     }); 

//   });


// //legend box
// const legendSvg = d3.select("#legend-container")
//   .append("svg")
//   .attr("width", 200)
//   .attr("height", topAuthorNames.length * 25 + 10);

// const legend = legendSvg.append("g")
//   .attr("class", "legend")
//   .attr("transform", "translate(10, 10)");

// const legendItems = legend.selectAll(".legend-item")
//   .data(topAuthorNames)
//   .enter()
//   .append("g")
//   .attr("class", "legend-item")
//   .attr("transform", (d, i) => `translate(0, ${i * 25})`)
//   .style("cursor", "pointer");

// //inside legend
// legendItems.append("rect")
//   .attr("width", 18)
//   .attr("height", 18)
//   .attr("fill", d => colourScale(d))
//   .attr("stroke", "black");

// legendItems.append("text")
//   .attr("x", 25)
//   .attr("y", 14)
//   .text(d => d)
//   .style("font-size", "13px");



//   //interaction
//   //hovering
//   legendItems
//   .on("mouseover", function(event, author) {
//     points
//       .attr("fill", d =>
//         d.author === author ? colourScale(d.author) : "grey"
//       )
//       .attr("opacity", d =>
//         d.author === author ? 1 : 0.2
//       );
//   })
//   .on("mouseout", function() {
//     if (selectedAuthor) {
//       points
//         .attr("fill", d =>
//           d.author === selectedAuthor ? colourScale(d.author) : "grey"
//         )
//         .attr("opacity", d =>
//           d.author === selectedAuthor ? 1 : 0.2
//         );
//     } else {
//       points
//         .attr("fill", d => colourScale(d.author))
//         .attr("opacity", 1);
//     }
//   })
//   .on("click", function(event, author) { //clicking
//     if (selectedAuthor === author) {
//       selectedAuthor = null;

//       points
//         .attr("fill", d => colourScale(d.author))
//         .attr("opacity", 1);
//     } else {
//       selectedAuthor = author;

//       points
//         .attr("fill", d =>
//           d.author === selectedAuthor ? colourScale(d.author) : "grey"
//         )
//         .attr("opacity", d =>
//           d.author === selectedAuthor ? 1 : 0.2
//         );
//     }
//   });
  

  

// });





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
