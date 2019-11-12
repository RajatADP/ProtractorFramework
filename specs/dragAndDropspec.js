describe('Drag Drop Action', function () {
    it('Test App', function () {
        browser.driver.get('http://demo.automationtesting.in/Static.html');

        browser.sleep(3000);

        var source = element(by.id('node'));
        var dest = element(by.id('droparea'));

        browser.actions().dragAndDrop(source, dest).perform();
        browser.sleep(3000);
    });
});