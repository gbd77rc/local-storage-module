var q = require('q');
var fs = require('fs');
var path = require('path');
var remote = require("./remote-store");
var util = require('util');

var LocalStore = function(){
    var self = this;
    self.cache = [];
    self.url = "";
    self.dataPath = "";
    self.pattern = "";
    self.name = "";

    self.initialise = function(config){
        self.url = config.url;
        self.dataPath = config.dataPath || ".";
        self.pattern = config.pattern || "0 3 * * *";
        self.name = config.name;
        self.storeFileName = path.join(self.dataPath, util.format("%s-cache.json", self.name.toLowerCase()));
    };


    self.processItems = function(items){
        if ( items.length > 0 ){
            self.cache = [];
            for( var i = 0; i < items.length; i++ ){
                self.cache.push(self.convertTo(item));
            }
        }
    };

    self.convertTo = function(item){
        var etag = item.timestamp !== undefined ? new Buffer(item.timestamp.toString()).toString("base64") : "";

        return {
            hasChanged : false,
            etag : '"' + etag + '"',
            item : item
        };
    };

    self.refresh = function(jobStatus){
        if ( jobStatus === undefined){
            jobStatus = {
                processed : 0,
                status: "not-started"
            }
        }
        var def = q.defer();
        remote.request(self.url, "GET")
            .then(function(data){
                self.processItems(JSON.parse(data));
                jobStatus.processed += self.cache.length;
                self.save();
                def.resolve(util.format("Download %d %s", self.cache.length, self.name));
            }, function(error){
                jobStatus.processed = 0;
                def.reject(error);
            });
        return def.promise;
    };

    self.add = function(item){
        var cacheItem = self.convertTo(item);
        cacheItem.hasChanged = true;
        self.cache.push(cacheItem);
    };

    self.save = function(){
        try {
            fs.writeFileSync(self.storeFileName, JSON.stringify(self.cache));
        } catch(e){
        }
    };

    self.read = function(){
        try {
            var data = fs.readFileSync(self.storeFileName);
            self.cache = JSON.parse(data);
        }
        catch(e){
        }
    };

    self.generateJob = function(){
        return {
            name : util.format("%s-cache-refresh-job", self.name.toLowerCase()),
            pattern : self.pattern,
            start : self.refresh
        };
    }
};

exports.getStore = function(config){
    var store = new LocalStore();
    store.initialise(config);

    return store;
};
