const { element, browser } = require("protractor");

describe('Date Picker App', () => {

    it('Test 1', () => {
        browser.driver.get('http://demo.automationtesting.in/Datepicker.html');
        browser.manage().window().maximize();
        element(by.id('datepicker2')).sendKeys('10/24/1991');
    });

      fit('Test 2', () => {
        browser.driver.get('http://demo.automationtesting.in/Datepicker.html');
        browser.manage().window().maximize();
        
        browser.executeScript("document.getElementById('datepicker1').value='10/24/1991'")
        element(by.id('datepicker1')).getAttribute('value').then(date => {
            console.log(date);
        })
    });      
});