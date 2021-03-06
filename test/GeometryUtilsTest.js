var expect = require('expect.js');
var GeometryUtils = require('../src/data/GeometryUtils');

describe('GeometryUtils', function() {

    function getRound(precision) {
        var r = Math.pow(10, -precision) / 2;
        return function(f) {
            f = +f;
            f += (f > 0) ? r : -r;
            return +f.toFixed(precision);
        }
    }
    function getRoundCoords(precision) {
        var round = getRound(precision);
        return function(list) {
            return list.map(function(point) {
                return [ round(point[0]), round(point[1]) ];
            });
        }
    }

    function testIntersection(first, second, result) {
        var n = 5;
        var round = getRoundCoords(5);
        // round = Math.round;
        var test = GeometryUtils.clipPolygon(first, second, round);
        test = round(test);
        result = round(result);
        var a = JSON.stringify(test);
        var b = JSON.stringify(result);
        // console.log('>>', a);
        // console.log('>>', b);
        if (a !== b)
            throw new Error('Values are not equal');
        // expect(a).to.eql(b);
    }

    it('should be able define intersections', function() {

        testIntersection([ [ -17.2265625, 34.88593094075317 ],
                [ -17.2265625, 52.696361078274485 ],
                [ 16.5234375, 52.696361078274485 ],
                [ 16.5234375, 34.88593094075317 ],
                [ -17.2265625, 34.88593094075317 ] ], // 
        [ [ 15.8203125, 58.44773280389084 ],
                [ -3.8671874999999996, 44.33956524809713 ],
                [ 33.3984375, 44.08758502824518 ],
                [ 15.8203125, 58.44773280389084 ] ], //

        [ [ -3.8671875, 44.339565 ], [ 7.794455, 52.696361 ],
                [ 16.523437, 52.696361 ], [ 16.523437, 44.201689 ],
                [ -3.8671875, 44.339565 ] ]
        // from postgres:
        // [ [ 7.79445581802627, 52.6963610782745 ],
        // [ 16.5234375, 52.6963610782745 ],
        // [ 16.5234375, 44.2016892787442 ],
        // [ -3.8671875, 44.3395652480971 ],
        // [ 7.79445581802627, 52.6963610782745 ] ]
        );

        testIntersection([ [ -122.801742, 45.48565 ],
                [ -122.801742, 45.60491 ], [ -122.584762, 45.60491 ],
                [ -122.584762, 45.48565 ], [ -122.801742, 45.48565 ] ],

        [ [ -122.520217, 45.535693 ], [ -122.64038, 45.553967 ],
                [ -122.720031, 45.526554 ], [ -122.669906, 45.507309 ],
                [ -122.723464, 45.446643 ], [ -122.532577, 45.408574 ],
                [ -122.487258, 45.477466 ], [ -122.520217, 45.535693 ] ],

        [ [ -122.613494, 45.485650 ], [ -122.669906, 45.507309 ],
                [ -122.630095, 45.552403 ], [ -122.584762, 45.545509 ],
                [ -122.584762, 45.485650 ], [ -122.613494, 45.485650 ] ]
        //
        // [ [ -122.584762, 45.545508794628965 ], [ -122.584762, 45.48565 ],
        // [ -122.68902729894835, 45.48565 ], [ -122.669906, 45.507309 ],
        // [ -122.720031, 45.526554 ], [ -122.64038, 45.553967 ],
        // [ -122.584762, 45.545508794628965 ] ]

        );
    });
});
