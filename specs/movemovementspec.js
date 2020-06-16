describe('Mouse Hover', function () {
    it('Test App', function () {
        browser.get('https://ng-bootstrap.github.io/#/components/tooltip/examples');
        browser.sleep(3000);
        var button = element(by.css('button[ngbtooltip="Tooltip on top"]'));
        browser.actions().mouseMove(button).perform();
        browser.sleep(3000);
    });
});