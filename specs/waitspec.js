describe('First describe', function () {

    it('First App', function () {
        browser.get('http://juliemr.github.io/protractor-demo/');
        element(By.model('first')).sendKeys('10');
        element(By.model('second')).sendKeys('20');
        element(By.buttonText('Go!')).click();
        expect(element(By.binding('latest')).getText()).toEqual('30');
    });
});