/**
 * A simple data provider synchronously indexing the given data using an RTree
 * index.
 */
function IDataProvider() {
    this.initialize.apply(this, arguments);
}
IDataProvider.prototype = {

    /** Initializes this object and indexes the initial data set. */
    initialize : function(options) {
        this.options = options || {};
    },

    /**
     * Loads and returns indexed data contained in the specified bounding box.
     */
    loadData : function(options, callback) {
        callback(null, this.options.data || []);
    }

};

module.exports = IDataProvider;
