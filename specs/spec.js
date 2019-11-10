describe('New Angular App', function () {
    it('Test App', function () {
        browser.get('http://www.way2automation.com/angularjs-protractor/registeration/#/login');
        element(By.model('Auth.user.name')).sendKeys('angular');
        element(By.model('Auth.user.password')).sendKeys('password');
        element(By.model('model[options.key]')).sendKeys('angular');
        element(By.css('[ng-click="Auth.login()"]')).click();
        browser.driver.sleep(5000);

    });
});
