module.exports = {

    /**
     * Draws a simple marker on the specified canvas 2d context.
     */
    drawMarker : function(g, x, y, width, height, radius) {
        g.beginPath();
        // a
        g.moveTo(x + width / 2, y);
        // b
        g.bezierCurveTo(//
        x + width / 2 + radius / 2, y, //
        x + width / 2 + radius, y + radius / 2, //
        x + width / 2 + radius, y + radius);
        // c
        g.bezierCurveTo( //
        x + width / 2 + radius, y + radius * 2, //
        x + width / 2, y + height / 2 + radius / 3, //
        x + width / 2, y + height);
        // d
        g.bezierCurveTo(//
        x + width / 2, y + height / 2 + radius / 3, //
        x + width / 2 - radius, y + radius * 2, //
        x + width / 2 - radius, y + radius);
        // e (a)
        g.bezierCurveTo(//
        x + width / 2 - radius, y + radius / 2, //
        x + width / 2 - radius / 2, y + 0, //
        x + width / 2, y + 0);
        g.closePath();
    }

}
