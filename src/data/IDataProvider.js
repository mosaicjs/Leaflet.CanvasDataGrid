/**
 * A simple data provider synchronously indexing the given data using an RTree
 * index.
 */
function IDataProvider() {
    if (typeof this.options.getGeometry === 'function') {
        this.getGeometry = this.options.getGeometry;
    }
    this.options = options || {};
}
/**
 * Loads and returns indexed data contained in the specified bounding box.
 */
IDataProvider.prototype.loadData = function(options, callback) {
    callback(null, this.options.data || []);
}
IDataProvider.prototype.getGeometry = function(r) {
    return r.geometry;
}

module.exports = IDataProvider;
