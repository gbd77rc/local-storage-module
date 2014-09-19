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
        self.logger = config.logger;
        self.jobName = util.format("%s-cache-refresh-job", self.name.toLowerCase());
    };


    self.processItems = function(items){
        if ( items.length > 0 ){
            self.cache = [];
            for( var i = 0; i < items.length; i++ ){
                self.cache.push(self.convertTo(items[i]));
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

    self.startJob = function(jobStatus){
        try{
            self.logger.info(utils.format("Starting job (%s).",self.jobName));
            var def = q.defer();
            self.refresh(jobStatus, def);
            return def.promise;
        }catch(e){
            self.logger.error(util.format("Problem happen in job (%s) - %s", self.jobName, e));
        }
    }

    self.refresh = function(jobStatus, def){
        if ( jobStatus === undefined){
            jobStatus = {
                processed : 0,
                status: "not-started"
            }
        }
        var promisedCreated = false;
        if ( def == undefined) {
            promisedCreated = true;
            def = q.defer();
        }
        remote.request(self.url, "GET")
            .then(function(data){
                if ( data.length > 0 ) {
                    self.processItems(JSON.parse(data));
                    jobStatus.processed += self.cache.length;
                    self.save();
                }
                var msg =util.format("Download %d %s", self.cache.length, self.name);
                self.logger.debug(msg);
                def.resolve(msg);
            }, function(error){
                jobStatus.processed = 0;
                self.logger.error(error);
                def.reject(error);
            });
        if ( promisedCreated) {
            return def.promise;
        }
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
            var error = util.format("Problem saving %s - %s ", self.storeFileName, e);
            self.logger.error(error);
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
            name : self.jobName,
            pattern : self.pattern,
            start : self.startJob
        };
    }
};

exports.getStore = function(config){
    var store = new LocalStore();
    store.initialise(config);

    return store;
};
