module.exports = {
    entry : __dirname + '/index.js',
    output : {
        path : __dirname + '/dist',
        filename : 'index.js',
        libraryTarget : 'umd'
    },
    module : {
        loaders : [ {
            test : /\.jsx?$/,
//            exclude : [ /node_modules/ ],
            include : [ /node_modules\/mosaic\-/, __dirname + '/index.js', __dirname + '/libs' ],
            loader : 'babel'
        } ]
    },
    externals : [ 'promise', 'leaflet' ]
};
