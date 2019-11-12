describe('KeyBoard Action', function () {
    it('Test App', function () {
        browser.get('http://demo.automationtesting.in/Register.html');
        browser.sleep(3000);
        element(by.model('FirstName')).sendKeys('Dummy');
        element(by.model('FirstName')).sendKeys(protractor.Key.ENTER);
        browser.sleep(3000);

    });

    fit('Double Click App', function () {
        browser.get('http://demo.automationtesting.in/WebTable.html');
        browser.sleep(3000);
       var doButton = element(by.css('button[class="btn btn-xs btn-custom"]'));
       
       //way 1
       browser.actions().mouseMove(doButton).doubleClick().perform();
       browser.sleep(3000);

       //way 2
       browser.actions().doubleClick(doButton).perform();
       browser.sleep(3000);
    });
});