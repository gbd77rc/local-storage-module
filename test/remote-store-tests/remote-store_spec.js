var assert = require('assert');
var should = require('should');
var remote = require('../../lib/remote-store');

describe("Remote Store API", function(){
    this.timeout(30000) // Make sure mocha will wait 15 seconds before reporting an issue with the url
    it("Get Data from PI Countries",  function(done){
        remote.request("http://localhost:3080/pi/1/countries")
            .then(function(data){
                should.exists(data);
                data.length.should.be.greaterThan(0);
                done();
            }, function(error){
                should.not.exists(error);
                done();
            });
    });

    it("Get Data from Unknown Remote",  function(done){
        remote.request("http://localhost:9999/pi/1/countries")
            .then(function(data){
                should.not.exists(data);
                done();
            }, function(error){
                should.exists(error);
                done();
            });
    });
});