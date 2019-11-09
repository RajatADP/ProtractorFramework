describe('Enter name feature', function () {

    it('should enter name as Rajat', function () {
        browser.get('https://angularjs.org/');
        element(by.model('yourName')).sendKeys('Rajat');
        var txt = element(by.xpath('/html/body/div[2]/div[1]/div[2]/div[2]/div/h1'));

        expect(txt.getText()).toEqual('Hello Rajat!');

    })
});

describe('New Angular App', function () {
    it('Test App', function () {
        browser.get('http://www.way2automation.com/angularjs-protractor/registeration/#/login');
        element(by.model('Auth.user.name')).sendKeys('angular');
        element(by.model('Auth.user.password')).sendKeys('password');
        element(by.model('model[options.key]')).sendKeys('angular');
        browser.driver.sleep(2000);
        element(by.model('Auth.login()')).click;
    })


})