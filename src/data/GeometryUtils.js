module.exports = {

    // ------------------------------------------------------------------------
    // Points

    /**
     * Gets a list of points (as a sequence of [x,y] coordinates) and returns
     * points in the specified bounding box.
     */
    clipPoints : function(points, bbox) {
        var result = [];
        for (var i = 0; i < points.length; i++) {
            var point = points[i];
            if (this.bboxContainsPoint(point, bbox)) {
                result.push(point);
            }
        }
        return result;
    },

    /**
     * Returns <code>true</code> a point is contained in the specified
     * bounding box.
     */
    bboxContainsPoints : function(points, bbox) {
        for (var i = 0; i < points.length; i++) {
            if (this.bboxContainsPoint(points[i], bbox))
                return true;
        }
        return false;
    },

    /**
     * Returns <code>true</code> a point is contained in the specified
     * bounding box.
     */
    bboxContainsPoint : function(point, bbox) {
        return inRange(point[0], bbox[0][0], bbox[1][0])
                && inRange(point[1], bbox[0][1], bbox[1][1]);
        function inRange(val, a, b) {
            return (val - a) * (val - b) <= 0;
        }
    },

    // ------------------------------------------------------------------------
    // Lines

    /**
     * Returns true if the specified poly-line (defined as a sequence of [x,y]
     * coordinates of their segments) has intersections with the specified
     * bounding box.
     */
    bboxIntersectsLines : function(lines, bbox) {
        for (var i = 0; i < lines.length; i++) {
            if (this.bboxIntersectsLine(lines[i], bbox))
                return true;
        }
        return false;
    },

    /**
     * Returns true if the specified poly-line (defined as a sequence of [x,y]
     * coordinates of their segments) has intersections with the specified
     * bounding box.
     */
    bboxIntersectsLine : function(line, bbox) {
        var prev = line[0];
        for (var i = 1; i < line.length; i++) {
            var next = line[i];
            var clipped = this.clipLine([ prev, next ], bbox);
            if (clipped) {
                return true;
            }
            prev = next;
        }
        return false;
    },

    /**
     * Trims a multiline defined as a sequence of coordinates [x,y] by the
     * specified bounding box and returns the clipped result.
     */
    clipLines : function(lines, bbox) {
        var result = [];
        var prev = lines[0];
        for (var i = 1; i < lines.length; i++) {
            var next = lines[i];
            var clipped = this.clipLine([ prev, next ], bbox);
            if (clipped) {
                var last = result.length ? result[result.length - 1] : null;
                if (!last || (last[0] !== clipped[0][0])
                        || (last[1] !== clipped[0][1])) {
                    result.push(clipped[0]);
                }
                result.push(clipped[1]);
            }
            prev = next;
        }
        return result;
    },

    /**
     * Cohen-Sutherland line-clipping algorithm. It is used to clip one line
     * segment.
     */
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

    /**
     * This method simplifies the specified line (given as a sequence of
     * [x,y] coordinates of their points) by reducing the number of points but
     * it keeps the total "form" of the line.
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
    })(),

    // ------------------------------------------------------------------------
    // Polygons

    /**
     * Transforms a bounding box to a closed clipping polygon with clockwise
     * order of coordinates.
     * 
     * @param bbox
     *            [[xmin,ymin],[xmax,ymax]]
     * @return a clipping rectangle with the following coordinates:
     *         [[xmin,ymin],[xmin,ymax],[xmax,ymax],[xmax,ymin],[xmin,ymin]]
     */
    getClippingPolygon : function(bbox) {
        var xmin = Math.min(bbox[0][0], bbox[1][0]);
        var ymin = Math.min(bbox[0][1], bbox[1][1]);
        var xmax = Math.max(bbox[0][0], bbox[1][0]);
        var ymax = Math.max(bbox[0][1], bbox[1][1]);
        return [ [ xmin, ymin ], [ xmin, ymax ], [ xmax, ymax ],
                [ xmax, ymin ], [ xmin, ymin ] ];
    },

    /**
     * Returns <code>true</code> if the specified sequence of points are
     * arranged in the clockwise order.
     */
    isClockwise : function(coords) {
        var i, j, area = 0;
        for (i = 0; i < coords.length; i++) {
            j = (i + 1) % coords.length;
            area += coords[i][0] * coords[j][1];
            area -= coords[j][0] * coords[i][1];
        }
        return (area < 0);
    },

    /**
     * Returns <code>true</code> if the specified bounding box is intersects
     * at least one of the given polygons.
     */
    bboxIntersectsPolygons : function(polygons, bbox) {
        for (var i = 0; i < polygons.length; i++) {
            if (this.bboxIntersectsPolygon(polygons[i], bbox))
                return true;
        }
        return false;
    },

    /**
     * Returns <code>true</code> if the specified bounding box is intersects
     * with the given polygon.
     */
    bboxIntersectsPolygon : function(polygon, bbox) {
        var polygon = this.getClippingPolygon(bbox);
        var result = this.clipPolygon(polygon, polygon);
        return !!result.length;
    },

    /**
     * Clips polygon by the specified bounding polygon (not a bounding box!).
     * The subject and clipping polygons are closed "rings" or [x,y] coordinate
     * arrays (the last and the first coordinates in each sequence should be the
     * same).
     */
    clipPolygon : function(subjectPolygon, clipPolygon) {
        var subj = [].concat(subjectPolygon);
        if (!this.isClockwise(subj)) {
            subj.reverse();
        }

        var clip = [].concat(clipPolygon);
        if (this.isClockwise(clip)) {
            clip.reverse();
        }

        var result = this._clipPolygon(subj, clip);
        return result;
    },

    // Sutherland Hodgman polygon clipping algorithm
    // http://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping
    _clipPolygon : function(subjectPolygon, clipPolygon) {
        var cp1, cp2, s, e;
        var inside = function(p) {
            return (cp2[0] - cp1[0]) * //
            (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * //
            (p[0] - cp1[0]);
        };
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
        var outputLen = subjectPolygon.length - 1;
        var clipLen = clipPolygon.length - 1;
        cp1 = clipPolygon[clipLen - 1];
        for (var j = 0; j < clipLen; j++) {
            cp2 = clipPolygon[j];
            var inputList = outputList;
            var inputLen = outputLen;
            outputList = [];
            s = inputList[inputLen - 1]; // last on the input list
            for (var i = 0; i < inputLen; i++) {
                e = inputList[i];
                if (inside(e)) {
                    if (!inside(s)) {
                        outputList.push(intersection());
                    }
                    outputList.push(e);
                } else if (inside(s)) {
                    outputList.push(intersection());
                }
                s = e;
            }
            cp1 = cp2;
            outputLen = outputList.length;
        }
        if (outputList && outputList.length && outputList !== subjectPolygon) {
            outputList.push(outputList[0]);
        }
        return outputList || [];
    },

};
