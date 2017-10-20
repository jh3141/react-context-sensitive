// we expect to run webpack from the root with --config demo/webpack.conf.js,
// so paths are defined relative to there, not here.
module.exports = {
    entry: "./demo/src/demo.jsx",
    output: {
        filename: "./demo/dist/demo.js"
    },
    resolve: { extensions: ['.js', '.jsx' ] },
    module: {
        rules: [
            { test: /\.jsx?$/, use: 'babel-loader' }
        ]
    }
};
