module.exports = {

    getClippingPolygon : function(bbox) {
        var xmin = Math.min(bbox[0][0], bbox[1][0]);
        var ymin = Math.min(bbox[0][1], bbox[1][1]);
        var xmax = Math.max(bbox[0][0], bbox[1][0]);
        var ymax = Math.max(bbox[0][1], bbox[1][1]);
        return [ [ xmin, ymin ], [ xmin, ymax ], [ xmax, ymax ],
                [ xmax, ymin ], [ xmin, ymin ] ];
        return [ [ xmin, ymin ], [ xmax, ymin ], [ xmax, ymax ],
                [ xmin, ymax ], [ xmin, ymin ] ];

        return [ [ bbox[0][0], bbox[0][1] ], [ bbox[0][0], bbox[1][1] ],
                [ bbox[1][0], bbox[1][1] ], [ bbox[1][0], bbox[0][1] ],
                [ bbox[0][0], bbox[0][1] ] ];
    },

    clipPoints : function(points, bounds) {
        function inRange(val, a, b) {
            return (val - a) * (val - b) <= 0;
        }
        var result = [];
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            if (inRange(point[0], bounds[0][0], bounds[1][0])
                    && inRange(point[1], bounds[0][1], bounds[1][1])) {
                result.push(point);
            }
        }
        return result;
    },

    clipLines : function(lines, bounds) {
        var result = [];
        var prev = lines[0];
        for (var i = 1; i < lines.length; i++) {
            var next = lines[i];
            var clipped = this.clipLine([ prev, next ], bounds);
            if (clipped) {
                result.push(clipped);
            }
            prev = next;
        }
        return result;
    },

    // Cohen-Sutherland line-clipping algorithm
    clipLine : (function() {
        function getCode(x, y, xmin, ymin, xmax, ymax) {
            var oc = 0;
            if (y > ymax)
                oc |= 1 /* TOP */;
            else if (y < ymin)
                oc |= 2 /* BOTTOM */;
            if (x > xmax)
                oc |= 4 /* RIGHT */;
            else if (x < xmin)
                oc |= 8 /* LEFT */;
            return oc;
        }
        return function(line, bbox) {
            var x1 = line[0][0];
            var y1 = line[0][1];
            var x2 = line[1][0];
            var y2 = line[1][1];
            var xmin = Math.min(bbox[0][0], bbox[1][0]);
            var ymin = Math.min(bbox[0][1], bbox[1][1]);
            var xmax = Math.max(bbox[0][0], bbox[1][0]);
            var ymax = Math.max(bbox[0][1], bbox[1][1]);
            var accept = false;
            var done = false;

            var outcode1 = getCode(x1, y1, xmin, ymin, xmax, ymax);
            var outcode2 = getCode(x2, y2, xmin, ymin, xmax, ymax);
            do {
                if (outcode1 === 0 && outcode2 === 0) {
                    accept = true;
                    done = true;
                } else if (!!(outcode1 & outcode2)) {
                    done = true;
                } else {
                    var x, y;
                    var outcode_ex = outcode1 ? outcode1 : outcode2;
                    if (outcode_ex & 1 /* TOP */) {
                        x = x1 + (x2 - x1) * (ymax - y1) / (y2 - y1);
                        y = ymax;
                    } else if (outcode_ex & 2 /* BOTTOM */) {
                        x = x1 + (x2 - x1) * (ymin - y1) / (y2 - y1);
                        y = ymin;
                    } else if (outcode_ex & 4 /* RIGHT */) {
                        y = y1 + (y2 - y1) * (xmax - x1) / (x2 - x1);
                        x = xmax;
                    } else { // 8 /* LEFT */
                        y = y1 + (y2 - y1) * (xmin - x1) / (x2 - x1);
                        x = xmin;
                    }
                    if (outcode_ex === outcode1) {
                        x1 = x;
                        y1 = y;
                        outcode1 = getCode(x1, y1, xmin, ymin, xmax, ymax);
                    } else {
                        x2 = x;
                        y2 = y;
                        outcode2 = getCode(x2, y2, xmin, ymin, xmax, ymax);
                    }
                }
            } while (!done);
            var result = [ [ x1, y1 ], [ x2, y2 ] ];
            return accept ? result : null;
        };
    })(),

    clipPolygon : function(subjectPolygon, clipPolygon, round) {
        var subj = [].concat(subjectPolygon);
        subj.pop();
        var clip = [].concat(clipPolygon);
        clip.pop();
        var result = this._clipPolygon(subj, clip, round);
        return result;
    },

    // Sutherland Hodgman polygon clipping algorithm
    // http://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping
    _clipPolygon : function(subjectPolygon, clipPolygon, r) {
        r = r || Math.round;
        var cp1, cp2, s, e;
        var inside = function(p) {
            return (cp2[0] - cp1[0]) * //
            (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * //
            (p[0] - cp1[0]);
        };
        var round = function(point) {
            return [ r(point[0]), r(point[1]) ];
        }
        var intersection = function() {
            var dc = [ cp1[0] - cp2[0], cp1[1] - cp2[1] ];
            var dp = [ s[0] - e[0], s[1] - e[1] ];
            var n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0];
            var n2 = s[0] * e[1] - s[1] * e[0];
            var n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
            return [ ((n1 * dp[0] - n2 * dc[0]) * n3),
                    ((n1 * dp[1] - n2 * dc[1]) * n3) ];
        };
        var outputList = subjectPolygon;
        cp1 = clipPolygon[clipPolygon.length - 1];
        for ( var j in clipPolygon) {
            cp2 = clipPolygon[j];
            var inputList = outputList;
            outputList = [];
            s = inputList[inputList.length - 1]; // last on the input list
            for ( var i in inputList) {
                e = inputList[i];
                if (inside(e)) {
                    if (!inside(s)) {
                        outputList.push(round(intersection()));
                    }
                    outputList.push(round(e));
                } else if (inside(s)) {
                    outputList.push(round(intersection()));
                }
                s = e;
            }
            cp1 = cp2;
        }
        if (outputList && outputList.length) {
            outputList.push(outputList[0]);
        }
        return outputList || [];
    },

    /**
     * This method simplifies the specified line by reducing the number of
     * points but it keeps the total "form" of the line.
     * 
     * @param line
     *            a sequence of points to simplify
     * @param tolerance
     *            an optional parameter defining allowed divergence of points
     * @param highestQuality
     *            excludes distance-based preprocessing step which leads to
     *            highest quality simplification but runs ~10-20 times slower.
     */
    simplify : (function() {
        // Released under the terms of BSD license
        /*
         * (c) 2013, Vladimir Agafonkin Simplify.js, a high-performance JS
         * polyline simplification library mourner.github.io/simplify-js
         */

        // to suit your point format, run search/replace for
        // '.x' and '.y'; for
        // 3D version, see 3d branch (configurability would draw
        // significant
        // performance overhead) square distance between 2
        // points
        function getSqDist(p1, p2) {
            var dx = p1[0] - p2[0];
            var dy = p1[1] - p2[1];
            return dx * dx + dy * dy;
        }

        // square distance from a point to a segment
        function getSqSegDist(p, p1, p2) {
            var x = p1[0], y = p1[1], dx = p2[0] - x, dy = p2[1] - y;
            if (dx !== 0 || dy !== 0) {
                var t = ((p[0] - x) * dx + (p[1] - y) * dy) / //
                (dx * dx + dy * dy);

                if (t > 1) {
                    x = p2[0];
                    y = p2[1];

                } else if (t > 0) {
                    x += dx * t;
                    y += dy * t;
                }
            }
            dx = p[0] - x;
            dy = p[1] - y;

            return dx * dx + dy * dy;
        }
        // rest of the code doesn't care about point format

        // basic distance-based simplification
        function simplifyRadialDist(points, sqTolerance) {

            var prevPoint = points[0];
            var newPoints = [ prevPoint ];
            var point;

            for (var i = 1, len = points.length; i < len; i++) {
                point = points[i];

                if (getSqDist(point, prevPoint) > sqTolerance) {
                    newPoints.push(point);
                    prevPoint = point;
                }
            }

            if (prevPoint !== point)
                newPoints.push(point);

            return newPoints;
        }

        // simplification using optimized Douglas-Peucker
        // algorithm with recursion elimination
        function simplifyDouglasPeucker(points, sqTolerance) {

            var len = points.length;
            var MarkerArray = typeof Uint8Array !== 'undefined' ? Uint8Array
                    : Array;
            var markers = new MarkerArray(len);
            var first = 0;
            var last = len - 1;
            var stack = [];
            var newPoints = [];
            var i;
            var maxSqDist;
            var sqDist;
            var index;

            markers[first] = markers[last] = 1;

            while (last) {

                maxSqDist = 0;

                for (i = first + 1; i < last; i++) {
                    sqDist = getSqSegDist(points[i], points[first],
                            points[last]);

                    if (sqDist > maxSqDist) {
                        index = i;
                        maxSqDist = sqDist;
                    }
                }

                if (maxSqDist > sqTolerance) {
                    markers[index] = 1;
                    stack.push(first, index, index, last);
                }

                last = stack.pop();
                first = stack.pop();
            }

            for (i = 0; i < len; i++) {
                if (markers[i])
                    newPoints.push(points[i]);
            }

            return newPoints;
        }

        // both algorithms combined for awesome performance
        function simplify(points, tolerance, highestQuality) {

            if (points.length <= 1)
                return points;

            var sqTolerance = tolerance !== undefined ? tolerance * tolerance
                    : 1;

            points = highestQuality ? points : simplifyRadialDist(points,
                    sqTolerance);
            points = simplifyDouglasPeucker(points, sqTolerance);

            return points;
        }

        return simplify;
    })()
};
