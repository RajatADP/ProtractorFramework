describe('ag-Grid Protractor Test', function () {
    // not an angular application
    browser.ignoreSynchronization = true;

    browser.get("https://www.ag-grid.com/example-runner/vanilla.php?section=javascript-grid&example=hello-world");

    browser.driver.sleep(5000);
    let rows = element.all(by.css('div.ag-center-cols-container > [role="row"]'));
    let ag_grid_utils = require("ag-grid-testing");

    it('should have e', function () {
        ag_grid_utils.getCellContentsAsText(0, "make")
            .then(function (cellValue) {
                console.log('cell value -', cellValue);

            });
    });


    fit('fit', function () {
        var s;
        for (let i = 0; i <= 2; i++) {
            //ag_grid_utils.verifyCellContentsMatches(i,"make",'Toyota');
           s = ag_grid_utils.getCellContentsAsText(i, "make").then(function (cellValue) {
                if (cellValue==='Porsche') {
                    s=i;
                    console.log('cell value -found', i);
                }
            });
            
        }
        console.log('s value -found', s);
    });

    xit('should have expected column headers', () => {
        let a = 0;
        while (a >= 0) {
            ag_grid_utils.getCellContentsAsText(a, "Make")
                .then(function (cellValue) {
                    if (cellValue === 'Porsche') {
                        console.log('cell value -', cellValue);
                        a = -1;
                    }
                    else {
                        a = a + 1;
                    }
                });
        }

    });
});
