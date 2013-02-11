#!/usr/bin/env node
var fs = require('fs');
var path = require('path');
var request = require('request');
var funkit = require('funkit');
var select = require('soupselect').select;
var htmlparser = require('htmlparser');

var partial = funkit.partial;

function scrape(o) {
    o = funkit.merge({
        output: 'data',
        silent: false
    }, o);
    var year = 2011;
    var industriesLink = 'http://money.cnn.com/magazines/fortune/fortune500/' + year + '/industries/';
    var out = o.silent? funkit.id: console.log;

    getIndustries(industriesLink, function(links) {
        console.log(links);

        // TODO: parse each link in parallel and combine as json

        // funkit.parallel(partial())
    });

    //funkit.parallel(partial(scrapePage, prefix, out), links, funkit.err(partial(writeJSON, o.output, out)));
}
exports.scrape = scrape;

function getIndustries(url, cb) {
    request(url, function(err, response, body) {
        var handler = new htmlparser.DefaultHandler(function(err, dom) {
            if(err) {
                console.warn(err);
            }
            else {
                var elems = select(dom, '#cnnmagFeatData .cnncol2 a');

                cb(elems.map(function(elem) {
                    return elem.attribs.href;
                }));
            }
        });

        var parser = new htmlparser.Parser(handler);
        parser.parseComplete(body);
    });
}
