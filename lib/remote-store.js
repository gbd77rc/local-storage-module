var q = require('q');
var http = require('http');
var urlPath = require('url');

var genOptions = function(url, method, length, etag){
    var parsedUrl = urlPath.parse(url);

    var options = {
        hostname : parsedUrl.hostname,
        port: parsedUrl.port,
        path:parsedUrl.path,
        method:method,
        headers: {
            'Accept' : 'application/json'
        }
    };

    if ( length != undefined && length > 0){
        options.headers['Content-Type'] = 'application/json;charset=utf-8';
        options.headers['Content-Length'] = length;

        if ( etag != ""){
            if ( method == "PUT" || method == "DELETE") {
                options.headers["if-match"] = '"' + etag + '"';
            }
        }
    }

    return options;
};

exports.request = function(url, method, data){
    var def = q.defer();

    var etag = "";

    if ( method === undefined ){
        method = "GET";
    }

    if ( data !== undefined){
        if ( typeof data === "object"){
            if ( data.timestamp != undefined){
                etag = new Buffer(data.timestamp.toString()).toString('base64');
            }
            data = JSON.stringify(data);
        }
    } else {
        data = "";
    }

    var options = genOptions(url, method, data.length, etag);

    var req = http.request(options, function(res){
        res.setEncoding('utf8');
        var responseData = "";

        res.on('data',function(chunk){
            responseData += chunk;
        });

        res.on('end',function(){
            if ( responseData.indexOf("{") > -1 && res.statusCode < 400){
                def.resolve(responseData);
            } else {
                def.reject("Problem with the JSON result! - " + responseData);
            }
        });
    });

    req.on('error', function(e){
        def.reject("Problem with remote store - " + e.message);
    });

    if ( data.length > 0 && method != "DELETE" ){
        req.write(data);
    }

    req.end();

    return def.promise;
}
