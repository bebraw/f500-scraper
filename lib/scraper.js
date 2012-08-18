#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var funkit = require('funkit');
var Zombie = require('zombie');

var urlPrefix = 'http://www.jyvaskylanseutu.fi/tapahtumat/';

main();

function main() {
    var url = urlPrefix + 'main.php';

    scrape(url, funkit.partial(writeJSON, 'data'));
}

function scrape(url, doneCb) {
    var zombie = new Zombie();

    zombie.visit(url, function(e, browser, status) {
        if(e) throw e;

        browser.fill('hPvm_loppu', getDate()).
            pressButton('Hae', function(e, browser, status) {
                if(e) throw e;

                var eventLinks = browser.queryAll('.tapahtumatiedot a').map(function(k) {
                    return urlPrefix + k.getAttribute('href');
                });

                funkit.parallel(function(k, done) {
                    zombie.visit(k, function(e, browser, status) {
                        if(e) throw e;

                        var info = browser.queryAll('.tapahtumatiedot')[0].innerHTML;
                        var d = {
                            name: browser.queryAll('.tapahtumaotsikko')[0].innerHTML,
                            date: parse.date(info),
                            categories: parse.categories(info),
                            location: parse.location(info),
                            address: parse.address(info),
                            description: parse.description(info),
                            pricing: parse.pricing(info),
                            additionalInformation: parse.additionalInformation(info)
                        };

                        done(null, d);
                    });
                }, eventLinks, function(e, d) {
                    if(e) throw e;

                    doneCb(d);
                });

                // TODO: next page till end
        });
    });
}

var parse = {
    date: function(d) {
        var p = parseField(d, 'Pvm:').split(' - ');

        if(p.length == 2) {
            var b = p[0].trim().split('.');
            var e = p[1].trim().split('.');

            return {
                start: new Date(b[2], b[1], b[0]).toISOString(),
                end: new Date(e[2], e[1], e[0]).toISOString()
            };
        }

        // TODO: can there be other kind of cases?
    },
    categories: function(d) {
        return funkit.rtrim(parseField(d, 'Luokat: '), '; ').split(' ; ').map(funkit.lower);
    },
    location: function(d) {
        var p = parseField(d, 'Paikka:');

        return {
            west: separate(p, 'West=', '&amp;'),
            south: separate(p, 'South=', '&amp;'),
            east: separate(p, 'East=', '&amp;'),
            north: separate(p, 'North=', '&amp;'),
            name: separate(p, '\">', '</a>')
        };
    },
    address: function(d) {
        var p = parseField(d, 'Osoite:').split(', ');

        return {
            street: p[0],
            city: p[1]
        };
    },
    description: function(d) {
        // str
    },
    pricing: function(d) {
        var p = parseField(d, 'Hinnat ja liput:'); // XXX

        // str

        return p;
    },
    additionalInformation: function(d) {
        var p = parseField(d, 'Lisätietoja:'); // XXX: encoding issue?

        // name, phone, email, url

        return p;
    }
};

function parseField(str, name) {
    return separate(str, '<b>' + name + '</b>', '<br>');
}

function separate(str, start, end) {
    var s = str.split(start)[1];

    if(!funkit.isDefined(s)) {
        console.warn('separate: Invalid start!', start);
        return;
    }

    return s.trim().split(end)[0].trim();
}

function getDate() {
    var now = new Date();

    return now.getDay() + '.' + now.getMonth() + '.' + (now.getFullYear() + 1);
}

function writeJSON(filename, data) {
    var f = filename + '.json';

    fs.writeFile(f, JSON.stringify(data, null, 4), function(e) {
        if(e) throw e;

        console.log('JSON saved to ' + f);
    });
}

