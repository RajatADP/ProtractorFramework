describe('First describe',function(){

    it('First App', function () {
        console.log('first it');
    });
    //only second it is executed-Only include
    fit('Second App', function () {
        console.log('Second it');
    });

    //Third it is not executed-Exclude
    xit('Third App', function () {
        console.log('Third it');
    });
});