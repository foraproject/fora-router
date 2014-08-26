(function () {
    "use strict";

    var _;

    var pathToRegexp = require('path-to-regexp');

    var Router = function (urlRoot) {
        this.urlRoot = urlRoot;
        this.urlRootRegex = new RegExp("^" + (urlRoot || ""));
        this.routes = [];
    };


    Router.prototype.get = function(url, handler) {
        this.addPattern("GET", url, handler);
    };


    Router.prototype.post = function(url, handler) {
        this.addPattern("POST", url, handler);
    };


    Router.prototype.del = function(url, handler) {
        this.addPattern("DEL", url, handler);
    };


    Router.prototype.put = function(url, handler) {
        this.addPattern("PUT", url, handler);
    };


    Router.prototype.addPattern = function(method, url, handler) {
        this.routes.push({ type: "pattern", method: method.toUpperCase(), re: pathToRegexp(url), url: url, handler: handler });
    };


    Router.prototype.when = function(predicate, handler) {
        this.routes.push({ type: "predicate", predicate: predicate, handler: handler });
    };


    var decode = function(val) {
      if (val) return decodeURIComponent(val);
    };


    Router.prototype.route = function() {
        var self = this;

        return function*(next) {
            if (self.urlRootRegex.test(this.request.url)) {
                //Remove the prefix.
                this.request.url = this.request.url.replace(self.urlRootRegex, '');
                var routingContext = {};
                for(var i = 0; i < self.routes.length; i++) {
                    var route = self.routes[i];
                    switch (route.type) {
                        case "predicate":
                            if (route.predicate.call(this, routingContext)) {
                                var matchOtherRoutes = yield* route.handler.call(this, routingContext);
                                if (!matchOtherRoutes)
                                    return next ? (yield next) : void 0;
                            }
                            break;
                        case "pattern":
                            if (route.method === this.request.method) {
                                var m = route.re.exec(this.path);
                                if (m) {
                                    var args = m.slice(1).map(decode);
                                    _ = yield* route.handler.apply(this, args);
                                    return next ? (yield next) : void 0;
                                }
                            }
                            break;
                    }
                }
            }
            return next ? (yield next) : void 0;
        };
    };

    module.exports = Router;

})();
