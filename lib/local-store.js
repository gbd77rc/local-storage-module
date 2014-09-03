var q = require('q');
var fs = require('fs');
var path = require('path');
var remote = require("./remote-store");
var util = require('utils');

var LocalStore = function(){
    var self = this;
    self.cache = [];
    self.url = "";
    self.dataPath = "";
    self.pattern = "";
    self.name = "";
    self.storeFileName = path.join(self.dataPath, util.format("%s.json", self.name));

    self.processItems = function(items){
        if ( items.length > 0 ){
            self.cache = [];
            for( var i = 0; i < items.length; i++ ){
                var item = items[i];

                var etag = item.timestamp !== undefined ? new Buffer(item.timestamp.toString()).toString("base64") : "";

                var cache = {
                    hasChanged : false,
                    etag : '"' + etag + '"',
                    item : item
                }

                self.cache.push(cache);
            }
        }
    }

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
                def.resolve(self.cache);
            }, function(error){
                jobStatus.processed = 0;
                def.reject(error);
            });
        return def;
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
    }

    self.generateJob = function(){
        return {
            name : util.format("%s-cache-refresh-job", self.name),
            pattern : self.pattern,
            start : self.refresh
        };
    }
};

exports.getStore = function(config){
    var store = new LocalStore();
    store.url = config.url;
    store.dataPath = config.dataPath || path.join(__dirname, "data");
    store.pattern = config.dataPath || "0 3 * * *";
    store.name = config.name;
    return store;
}
