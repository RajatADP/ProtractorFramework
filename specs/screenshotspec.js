var fs = require('fs')
describe('Screenshot Action', function () {
    it('Test App', function () {
        browser.driver.get('http://demo.automationtesting.in/Register.html');

        browser.takeScreenshot().then(function (fullPage) {
            var stream = fs.createWriteStream('./specs/screenshots/fullPage.png');
            stream.write(new Buffer(fullPage, 'base64'));
            stream.end();
        });

    });

    it('WebElement Screenshot App', function () {
        browser.driver.get('http://demo.automationtesting.in/Register.html');

        var logo = element(by.id('imagetrgt'));

        logo.takeScreenshot().then(function (elePage) {
            var stream = fs.createWriteStream('./specs/screenshots/elePage.png');
            stream.write(new Buffer(elePage, 'base64'));
            stream.end();
        });

    });
});