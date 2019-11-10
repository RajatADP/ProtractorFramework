describe('Before After Each Function', function () {
    it('First App', function () {
        console.log('first it');
    });

    it('Second App', function () {
        console.log('second it');

    });

    beforeEach(function(){
        console.log('beforeEach it');
    });

    afterEach(function(){
        console.log('afterEach it');
    });

    beforeAll(function(){
        console.log('before All it');
    });

    afterAll(function(){
        console.log('After All it');
    });
});
