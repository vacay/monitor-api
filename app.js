/* global require, module, process */

var Monitor = require('monitor'),
    config = require('config-monitor'),
    log = require('log')(config.log),
    express = require('express'),
    http = require('http'),
    path = require('path');

var monitor = new Monitor();
monitor.initialize(config.monitor, log);
monitor.run();
var app = express();

//TODO: catch incorrect sensor or services
var getResource = function (params) {
    var service = monitor.services[params.service];
    return params.sensor ? service.sensors[params.sensor] : service;
};

app.configure(function(){

    app.use(express.logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded());
    app.use(express.methodOverride());

    app.use(function (req, res, next) { 
	req.query.time = req.query.time || 'min';

	res.locals.monitor = monitor;
	res.locals.services = monitor.services;
	res.locals.path     = req.path;
	res.locals.query    = req.query;
	res.locals.body     = req.body;

	next(); 
    });
    
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler());
});

app.post('/pause', function (req, res, next) {
    monitor.pause();
    res.send(200, { message: 'Paused' });
});

app.post('/run', function (req, res, next) {
    monitor.run();
    res.send(200, { message: 'Running' });
});

app.get('/services', function(req, res) {
    var services = [];
    var isHealthy = true;
    for (var k in monitor.services) {
	var service = monitor.services[k].getInfo();
	if (!service.isHealthy) isHealthy = false;
	services.push(service);
    }
    res.send(200, {
	isHealthy: isHealthy,
	services: services
    });
});

app.get('/services/:service/sensors/:sensor', function(req, res) {
    var sensor = getResource(req.params);
    res.send(200, sensor.getInfo());
});

app.get('/services/:service/sensors/:sensor/health', function (req, res) {
    var sensor = getResource(req.params);
    res.send(sensor.isHealthy ? 200 : 503);
});

app.get('/services/:service', function(req, res) {
    var service = getResource(req.params);
    res.send(service.getInfo());
});

app.get('/services/:service/health', function (req, res) {
    var service = getResource(req.params);
    res.send(service.isHealthy ? 200 : 503);
});

http.createServer(app).listen(8000, function(){
    console.log('Express server listening on port: ', 8000);
});

