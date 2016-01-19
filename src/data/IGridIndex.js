module.exports = IGridIndex;

function IGridIndex() {
}

IGridIndex.prototype = {

    /**
     * Returns data associated with the specified position on the canvas.
     */
    getData : function(x, y) {
        return null;
    },

    /**
     * Returns all data objects associated with the specified position on the
     * canvas.
     */
    getAllData : function(x, y) {
        return null;
    },

    /**
     * Sets data in the specified position on the canvas.
     */
    setData : function(x, y, data) {
        return [];
    },

}
