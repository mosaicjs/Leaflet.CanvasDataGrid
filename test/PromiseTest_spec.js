var expect = require('expect.js');
var P = require('../src/P');

describe('Promise', function() {
    it('should be able to return basic operations in chain', //
    function(done) {
        P.then(function() {
            return 'abc';
        }).then(function(test) {
            expect(test).to.eql('abc');
            return 'cde';
        }).then(function(test) {
            expect(test).to.eql('cde');
        }).then(done, done);
    });
    it('should be able to handle errors ', //
    function(done) {
        P.then(function() {
            throw 'abc';
        }).then(function() {
            done(new Erorr());
        }, function(test) {
            expect(test).to.eql('abc');
            return 'cde';
        }).then(function(test) {
            expect(test).to.eql('cde');
        }).then(done, done);
    });
    it('should be able to return thennable values ', //
    function(done) {
        P.then(function() {
            return P.then(function() {
                return 'abc';
            });
        }).then(function(test) {
            expect(test).to.eql('abc');
        }).then(done, done);
    });
    it('should be able to transfert values to the next "then" call ', //
    function(done) {
        P.then(function() {
            return 'abc';
        }).then(null, null).then(function(test) {
            expect(test).to.eql('abc');
        }).then(done, done);
    });
    it('should be able to return the same results multiple times ', //
    function(done) {
        var deferred = P.defer();
        deferred.resolve('abc');
        var promises = [];
        var action = function(test) {
            expect(test).to.eql('abc');
            return 'cde';
        };
        for (var i = 0; i < 10; i++) {
            promises.push(deferred.promise.then(action));
        }
        var ok = false;
        P.all(promises).then(function(results) {
            expect(results.length).to.eql(promises.length);
            for (var i = 0; i < results.length; i++) {
                expect(results[i]).to.eql('cde');
            }
            ok = true;
        }).then(function() {
            expect(ok).to.eql(true);
        }).then(done, done);
    });
});
