describe('Non Angular App', () => {

    it('Test App', () => {
        browser.waitForAngularEnabled(false);
        browser.get('http://newtours.demoaut.com/');
        browser.manage().window().maximize();
      });

      it('Test App', () => {
        browser.internalIgnoreSynchronization = true;
        browser.get('http://newtours.demoaut.com/');
        browser.manage().window().maximize();
      });
      
      it('Test App', () => {
        browser.driver.get('http://newtours.demoaut.com/');
        browser.manage().window().maximize();
      });
});