describe('Alerts Action', function () {
    it('Test App', function () {
        browser.driver.get('http://demo.automationtesting.in/Alerts.html');
        browser.sleep(3000);
        element(by.linkText('Alert with OK & Cancel')).click();

        element(By.buttonText('click the button to display a confirm box')).click();

        browser.switchTo().alert().accept();
        browser.sleep(3000);

        element(By.buttonText('click the button to display a confirm box')).click();

        browser.switchTo().alert().dismiss();
        browser.sleep(3000);
        element(By.buttonText('click the button to display a confirm box')).click();

        browser.switchTo().alert().getText().then(txt => {
            console.log('Alert Text ', txt);
        });
    });

    it('Switch Window App', function () {

        browser.driver.get('http://demo.automationtesting.in/Windows.html');


        var tabButton = element(by.xpath('//*[@id="Tabbed"]/a/button'));
        tabButton.click();
        browser.sleep(3000);

        var winHandles = browser.getAllWindowHandles();

        winHandles.then(function (handles) {
            var parentHandles = handles[0];
            var childWindow = handles[1];
            browser.waitForAngularEnabled(false);
            browser.switchTo().window(childWindow);
            browser.sleep(5000);
            browser.getTitle().then(tit => {
                console.log(tit);
            });
            browser.close(); //child window closed

            browser.switchTo().window(parentHandles);
            browser.getTitle().then(tit => {
                console.log(tit);
            });
        });

    });
});