(function () {
    "use strict";

    var _;

    var pathToRegexp = require('path-to-regexp');

    var Router = function (urlRoot) {
        urlRoot = urlRoot || "";
        this.urlRoot = /\/$/.test(urlRoot) ? urlRoot : (urlRoot + "/");
        this.urlRootRegex = new RegExp("^" + this.urlRoot);
        this.routes = [];
        this.onRequestHandlers = [];
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


    Router.prototype.onRequest = function(fn) {
        this.onRequestHandlers.push(fn);
    };


    Router.prototype.when = function(predicate, handler) {
        this.routes.push({ type: "predicate", predicate: predicate, handler: handler });
    };


    var decode = function(val) {
      if (val) return decodeURIComponent(val);
    };


    Router.prototype.route = function() {
        var self = this;

        return function*(next, routingContext) {
            for(let i = 0; i < self.onRequestHandlers.length; i++) {
                _ = yield* self.onRequestHandlers[i].call(this, next);
            }

            if (self.urlRootRegex.test(routingContext ? routingContext.url : this.request.url)) {

                //Remove the prefix.
                if (routingContext) {
                    routingContext.url = routingContext.url.replace(self.urlRootRegex, '/');
                    routingContext.path = routingContext.path.replace(self.urlRootRegex, '/');
                } else {
                    routingContext = {
                        url: this.url.replace(self.urlRootRegex, '/'),
                        path: this.path.replace(self.urlRootRegex, '/'),
                        method: this.request.method
                    };
                }

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
                            if (route.method === routingContext.method) {
                                var m = route.re.exec(routingContext.path || "");
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
