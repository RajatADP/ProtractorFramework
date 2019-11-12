describe('Get Text', function () {
    it('Test App', function () {
        browser.get('http://juliemr.github.io/protractor-demo/');
        browser.getTitle().then(function (title) {
            console.log('title is:', title);
        });
    });

    fit('Get Text App', function () {
        browser.get('http://juliemr.github.io/protractor-demo/');
        var button = element(By.buttonText('Go!')).getAttribute('id');
        
        button.then(function (idValue) {
            console.log('idValue is:', idValue);
        });
    });
});
