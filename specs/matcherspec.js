describe('First describe',function(){

    it('First App', function () {
        var a = true;
        expect(a).toBe(true);
    });

    it('Second App', function () {
        var a = 10;
        expect(a).toEqual(10);
    });

    fit('Third App', function () {
        var a = [1,2,3];
        expect(a).toEqual([1,2,3]);
        expect(a).toContain(2);  
        var b = null;
        expect(b).toBeNull();    
        
        b = 'jasmine';
        expect(b).not.toBeNull(); 
        expect(b).toContain('mine');      
    });
});