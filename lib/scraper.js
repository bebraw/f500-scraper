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
        funkit.parallel(partial(getCompanyData, industriesLink), links, funkit.err(partial(writeJSON, o.output, out)));
    });
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
                    return {
                        industry: content(elem),
                        url: elem.attribs.href
                    };
                }));
            }
        });

        var parser = new htmlparser.Parser(handler);
        parser.parseComplete(body);
    });
}

function getCompanyData(prefix, data, cb) {
    request(prefix + data.url, function(err, response, body) {
        var handler = new htmlparser.DefaultHandler(function(err, dom) {
            if(err) {
                console.warn(err);
            }
            else {
                cb(err, select(dom, '#ssi0 tr').map(function(elem) {
                    var name = content(select(elem, '.cnncol2 a')[0]);

                    if(!name) return;

                    return {
                        industry: data.industry,
                        name: name,
                        rank: parseInt(content(select(elem, '.cnncol3')[0]), 10),
                        revenueAmount: parseInt(content(select(elem, '.cnncol4')[0]), 10),
                        revenueChange: parseInt(content(select(elem, '.cnncol5')[0]), 10),
                        profitAmount: parseInt(content(select(elem, '.cnncol6')[0]), 10),
                        profitChange: parseInt(content(select(elem, '.cnncol7')[0]), 10)
                    };
                }).filter(funkit.id));
            }
        });

        var parser = new htmlparser.Parser(handler);
        parser.parseComplete(body);
    });
}

function content(elem) {
    if(elem && elem.children && elem.children.length) {
        return elem.children[0].raw;
    }
}

function writeJSON(filename, out, data) {
    var f = filename + '.json';
    data = funkit.concat(data).filter(funkit.id);

    fs.writeFile(f, JSON.stringify(data, null, 4), function(e) {
        if(e) throw e;

        out('JSON saved to ' + f);
    });
}
