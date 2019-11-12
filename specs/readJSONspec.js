var data = require('../src/global.json')
describe('Json Action', function () {

    it('Read JSON', function () {
        console.log(data.url);
        console.log(data.country.city);
    });
});