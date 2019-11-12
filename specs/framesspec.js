describe('Frames Action', function () {
    it('Test App', function () {
        browser.driver.get('http://demo.automationtesting.in/Frames.html');
        browser.switchTo().frame(0);
        element(by.xpath('/html/body/section/div/div/div/input')).sendKeys('Taj');

    });
});