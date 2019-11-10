describe('First describe',function(){

    it('First App', function () {
        console.log('first it');
    });
});

//only second describe is executed-Only include
fdescribe('Second describe',function(){

    it('Second App', function () {
        console.log('Second it');
    });
});

//Third describe is not executed-Exclude
xdescribe('Third describe',function(){

    it('Third App', function () {
        console.log('Third it');
    });
});