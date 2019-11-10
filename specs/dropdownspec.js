describe('First describe', function () {

    it('First way', function () {
        browser.get('http://juliemr.github.io/protractor-demo/');
        browser.sleep(3000);
        element(By.model('operator')).element(By.css('option[value="DIVISION"]')).click();
        browser.sleep(3000);
    });

    it('Second way', function () {
        browser.get('http://juliemr.github.io/protractor-demo/');
        browser.sleep(3000);
        element.all(by.options('value for (key, value) in operators')).get(4).click();
        browser.sleep(5000);
    });
    fit('Third way', function () {
        browser.get('http://juliemr.github.io/protractor-demo/');
        browser.sleep(3000);
        element(By.cssContainingText('option','*')).click();
        browser.sleep(5000);
    });
});