var app = angular.module('chartApp', []);

app.controller('appCtrl', ['$scope', '$http', function($scope, $http) {
    $scope.getData = function() {
            $http.get('static/data/trends2.json')
                .success(function(data) {
                    $scope.myData = data;
                    console.log('$scope.myData');
                    console.log($scope.myData);
                }).error(function(err) {
                    throw err;
                });
        } // END $scope.getData()
    $scope.getData();


}]); // END appCtrl

app.directive('trendChart', function($parse, $window) {
    // CHART SOURCE: http://bl.ocks.org/nnattawat/9689303

    // set chart constants
    var margin = {
            top: 10,
            right: 10,
            bottom: 100,
            left: 40
        },
        margin2 = {
            top: 430,
            right: 10,
            bottom: 20,
            left: 40
        },
        height = 500 - margin.top - margin.bottom,
        height2 = 500 - margin2.top - margin2.bottom;

    // helpers for date formatting
    parseDate = d3.time.format("%Y-%m-%d").parse;
    formatForQuery = d3.time.format('%Y-%m-%d');

    return {
        restrict: 'EA',
        scope: {
            data: '=chartData',
        },
        link: function(scope, element, attrs) {
                var counter = 0;
                console.log(counter);
                scope.$watch('data', function(data) {
                    // If we don't pass any data, return out of the element
                    if (!data) return;

                    // FORMAT DATA
                    console.log('scope.data');
                    console.log(data);
                    data.forEach(function(d) {
                        console.log('parsing data');
                        d.date = parseDate(d.date);
                        d.count = +d.count;
                    });

                    // On resize, re-render. This could be done with scope.$apply() but resize does
                    // not change the scope on the chart so re-rendering without running the digest
                    // cycle should be more performant across the DOM
                    window.onresize = function() {
                        console.log('window.onresize');
                        scope.render(data);
                    };

                    // Render a new chart on window resize
                    // Watch for resize event
                    scope.$watch(function() {
                        console.log('watch.angular.elem');
                        return angular.element($window)[0].innerWidth;
                    }, function() {
                        console.log('watch.angular.elem.render');
                        scope.render(data);
                    });

                    // Render a new chart each time scope.chartData changes - this includes initial load
                    // which was not covered by the previous watch on chartData alone
                    scope.$watch('data', function(newVal, oldVal) {
                        setTimeout(function() {
                            console.log('watch.newVals');
                            scope.render(data);
                        }, 10);
                    });

                    scope.render = function(data) {
                        console.log('rendering chart');
                        // If we don't pass any data, return out of the element
                        if (!data) return;

                        // RESPONSIVE SIZING
                        var width = d3.select(element[0])[0][0].offsetWidth - margin.right - margin.left;

                        // SCALES
                        var x = d3.time.scale().range([0, width]),
                            x2 = d3.time.scale().range([0, width]), // for brush preview
                            y = d3.scale.linear().range([height, 0]),
                            y2 = d3.scale.linear().range([height2, 0]); // for brush preview

                        // AXIS
                        var xAxis = d3.svg.axis()
                            .scale(x)
                            .orient("bottom"),
                            xAxis2 = d3.svg.axis()
                            .scale(x2)
                            .orient("bottom")
                            .tickFormat(d3.time.format("%x")), // for brush preview
                            yAxis = d3.svg.axis()
                            .scale(y)
                            .orient("left");

                        // BRUSH
                        var brush = d3.svg.brush()
                            .x(x2)
                            .on("brush", brushed);

                        // AREA
                        var area = d3.svg.area()
                            .interpolate("linear")
                            .x(function(d) {
                                return x(d.date);
                            })
                            .y0(height)
                            .y1(function(d) {
                                return y(d.count);
                            });

                        // BRUSH PREVIEW
                        var area2 = d3.svg.area()
                            .interpolate("linear")
                            .x(function(d) {
                                return x2(d.date);
                            })
                            .y0(height2)
                            .y1(function(d) {
                                return y2(d.count);
                            });

                        // TREND LINE
                        var line = d3.svg.line()
                            .x(function(d) {
                                return x(d.date);
                            })
                            .y(function(d) {
                                return y(d.count);
                            })
                            .interpolate("linear");

                        // Will append SVG and subsequent d3 chart elements to the given
                        // element class
                        var chartTarget = '.trend-chart';

                        // REMOVE PREVIOUS
                        d3.select(chartTarget).selectAll("svg").remove();

                        // SVG CANVAS for entire d3 chart
                        var svg = d3.select(chartTarget).append('svg')
                            .attr('class', 'trend-chart-canvas')
                            .style('width', '100%')
                            .style('height', height + margin.top + margin.bottom);

                        // Wil clip the visibility of elements that aren't within the chart area
                        svg.append("defs").append("clipPath")
                            .attr("id", "clip")
                            .append("rect")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height);

                        var chartMain = svg.append("g")
                            .attr("class", "trend-chart-main")
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                        var chartPreview = svg.append("g")
                            .attr("class", "trend-chart-preview")
                            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

                        var zoom = d3.behavior.zoom()
                            .on("zoom", draw);
                        // Add rect cover the zoomed graph and attach zoom event.
                        var rect = svg.append("svg:rect")
                            .attr("class", "pane")
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height)
                            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
                            .call(zoom);

                        // Data domains for axis scales
                        x.domain(d3.extent(data, (function(d) {
                            return d.date;
                        })));
                        y.domain([0, d3.max(data, (function(d) {
                            return d.count;
                        }))]);
                        x2.domain(x.domain());
                        y2.domain(y.domain());

                        // Set up zoom behavior
                        zoom.x(x);

                        // Add d3 elements to main chart
                        chartMain.append("path")
                            .datum(data)
                            .attr("class", "area")
                            .attr("d", area);

                        chartMain.append("path")
                            .attr('class', 'trend-line')
                            .attr("d", line(data));

                        chartMain.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(0," + height + ")")
                            .call(xAxis);

                        chartMain.append("g")
                            .attr("class", "y axis")
                            .call(yAxis);

                        // Add d3 elements to preview slider
                        chartPreview.append("path")
                            .datum(data)
                            .attr("class", "area")
                            .attr("d", area2);

                        chartPreview.append("g")
                            .attr("class", "x axis")
                            .attr("transform", "translate(0," + height2 + ")")
                            .call(xAxis2);

                        chartPreview.append("g")
                            .attr("class", "x brush")
                            .call(brush)
                            .selectAll("rect")
                            .attr("y", -6)
                            .attr("height", height2 + 7);

                        function brushed() {
                            x.domain(brush.empty() ? x2.domain() : brush.extent());
                            chartMain.select(".area").attr("d", area);
                            chartMain.select(".trend-line").attr("d", line(data));
                            chartMain.select(".x.axis").call(xAxis);
                            // Reset zoom scale's domain
                            zoom.x(x);
                        }

                        function draw() {
                            chartMain.select(".area").attr("d", area);
                            chartMain.select(".trend-line").attr("d", line(data));
                            chartMain.select(".x.axis").call(xAxis);
                            // Force changing brush range
                            brush.extent(x.domain());
                            svg.select(".brush").call(brush);
                        }

                    }; // END scope.render();
                }); // END initial scope.watch
            } // END directive link
    }; // END directive return
}); // END trend-chart directive