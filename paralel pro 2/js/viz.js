var margin = {top: 30, right: 10, bottom: 10, left: 10},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;

var x = d3.scale.ordinal().rangePoints([0, width], 1);
var y = {};
var dragging = {};

var line = d3.svg.line();
var axis = d3.svg.axis().orient("left");
var background, foreground;

var svg = d3.select("body").append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

// Tooltip konteyneri oluşturuluyor
var tooltip = svg.append("g")
    .attr("class", "tooltip")
    .style("display", "none");

// Tooltip için dikdörtgen oluşturuluyor
tooltip.append("rect")
    .attr("width", 100)
    .attr("height", 20)
    .attr("fill", "white")
    .style("opacity", 0.9);

// Tooltip içine metin ekleniyor ve konumu ayarlanıyor
tooltip.append("text")
    .attr("x", 10)
    .attr("y", 15)
    .text("");

d3.csv("data/data.csv", function(error, ngrams) {
  console.log(ngrams);

  // Boyut listesini çıkar ve her biri için bir ölçek oluştur
  x.domain(dimensions = d3.keys(ngrams[0]).filter(function(d) {
    return d !== "institution" && (y[d] = d3.scale.linear()
        .domain(d3.extent(ngrams, function(p) { return +p[d]; }))
        .range([height, 0]));
  }));

  // Arka plan için gri çizgileri ekle
  background = svg.append("g")
      .attr("class", "background")
    .selectAll("path")
    .data(ngrams)
    .enter().append("path")
      .attr('institution', function(d) { return d.institution; })
      .attr("d", path);

  // Odaklanma için mavi çizgileri ekle
  foreground = svg.append("g")
      .attr("class", "foreground")
    .selectAll("path")
    .data(ngrams)
    .enter().append("path")
      .attr('institution', function(d) { return d.institution; })
      .attr("d", path)
      .on("mouseover", function(d) {
        tooltip.style("display", null);
      })
      .on("mouseout", function(d) {
        tooltip.style("display", "none");
      })
      .on("mousemove", function(d) {
        var xPosition = d3.mouse(this)[0] - 5;
        var yPosition = d3.mouse(this)[1] - 5;
        tooltip.attr("transform", "translate(" + xPosition + "," + yPosition + ")");
        tooltip.select("text").text(d.institution); // Tooltip içeriğini burada güncelleyebilirsiniz
      });

  // Renklendirme kodunu ekle
  foreground.style("stroke", function(d) {
    var colorScale = d3.scale.linear()
      .domain(d3.extent(ngrams, function(p) { return +p["score_scaled"]; }))
      .range(["lightblue", "darkblue"]);

    return colorScale(d["score_scaled"]);
  });

  // Her bir boyut için bir grup elemanı ekle
  var g = svg.selectAll(".dimension")
      .data(dimensions)
    .enter().append("g")
      .attr("class", "dimension")
      .attr("transform", function(d) { return "translate(" + x(d) + ")"; })
      .call(d3.behavior.drag()
        .origin(function(d) { return {x: x(d)}; })
        .on("dragstart", function(d) {
          dragging[d] = x(d);
          background.attr("visibility", "hidden");
        })
        .on("drag", function(d) {
          dragging[d] = Math.min(width, Math.max(0, d3.event.x));
          foreground.attr("d", path);
          dimensions.sort(function(a, b) { return position(a) - position(b); });
          x.domain(dimensions);
          g.attr("transform", function(d) { return "translate(" + position(d) + ")"; });
        })
        .on("dragend", function(d) {
          delete dragging[d];
          transition(d3.select(this)).attr("transform", "translate(" + x(d) + ")");
          transition(foreground).attr("d", path);
          background.attr("d", path)
            .transition()
            .delay(500)
            .duration(0)
            .attr("visibility", null);
        }));

  // Eksen ve başlık ekle
  g.append("g")
      .attr("class", "axis")
      .each(function(d) { d3.select(this).call(axis.scale(y[d])); })
    .append("text")
      .style("text-anchor", "middle")
      .attr("y", -19)
      .text(function(d) { return d; });

  // Her bir eksen için bir fırça ekle ve sakla
  g.append("g")
      .attr("class", "brush")
      .each(function(d) {
        d3.select(this).call(y[d].brush = d3.svg.brush().y(y[d]).on("brushstart", brushstart).on("brush", brush));
      })
    .selectAll("rect")
      .attr("x", -18)
      .attr("width", 16);
});

function position(d) {
  var v = dragging[d];
  return v == null ? x(d) : v;
}

function transition(g) {
  return g.transition().duration(500);
}

// Veri noktası için yol döndürme işlevi
function path(d) {
  return line(dimensions.map(function(p) { return [position(p), y[p](d[p])]; }));
}

function brushstart() {
  d3.event.sourceEvent.stopPropagation();
}

// Fırça etkinliğini işle, ön plandaki çizgilerin görüntüsünü değiştirerek
function brush() {
  var actives = dimensions.filter(function(p) { return !y[p].brush.empty(); });
  var extents = actives.map(function(p) { 
    return y[p].brush.extent();
  });
  var ngram_array = [];

  foreground.style("display", function(d) {
    return actives.every(function(p, i) {
      if (extents[i][0] <= d[p] && d[p] <= extents[i][1]){
        ngram_array.push(d.institution);
      }
      return extents[i][0] <= d[p] && d[p] <= extents[i][1];
    }) ? null : "none";
  });

  console.log(ngram_array);
}
