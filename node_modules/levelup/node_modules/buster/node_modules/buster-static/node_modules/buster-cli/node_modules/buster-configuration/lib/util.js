module.exports = {
    addUnique: function (arr1, arr2) {
        arr1 = arr1 || [];
        (arr2 || []).forEach(function (item) {
            if (arr1.indexOf(item) < 0) { arr1.push(item); }
        });
        return arr1;
    }
};
