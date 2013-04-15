var Matrix, RelativeGrid;

module.exports = {
    createMatrix: function (options) {
        Matrix = Matrix || require("./matrix");
        return new Matrix(options);
    },

    createRelativeGrid: function (outputStream) {
        RelativeGrid = RelativeGrid || require("./relative-grid");
        return new RelativeGrid(outputStream);
    }
};
