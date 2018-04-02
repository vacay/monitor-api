/* global __dirname, require, module */

var fs = require('fs');
var path = require('path');

var config;
var config_file = '/home/deploy/apps.json';

if (fs.existsSync(config_file)) {

  config = JSON.parse(fs.readFileSync(config_file));

  var dbs = config.servers.filter(function(s) {
    return s.name === 'all0';
  });

  var workers = config.servers.filter(function(s) {
    return s.normal.toquen.roles.indexOf('worker') > -1;
  });

  var monitor = config.servers.filter(function(s) {
    return s.normal.toquen.roles.indexOf('monitor') > -1;
  })[0];

  var search = config.servers.filter(function(s) {
    return s.normal.toquen.roles.indexOf('search') > -1;
  });

  var vacay = {
    app: {
      strategy: 'http',
      url: 'https://vacay.io/',
      strictSSL: false,
      up: 5,
      down: 5
    },
    api: {
      strategy: 'http',
      url: 'https://localhost:8080/health_check',
      strictSSL: false,
      up: 5,
      down: 5
    },
    websocket: {
      strategy: 'websocket',
      url: 'wss://localhost:8080/socket.io/?transport=polling',
      rejectUnauthorized: false,      
      strictSSL: false,
      up: 5,
      down: 5
    }
  };

  var worker = {};
  for (var w=0; w<workers.length; w++) {
    worker[workers[w].id] = {
      strategy: 'http',
      url: 'http://' + workers[w].internal_ip + '/',
      up: 5,
      down: 10
    };
  }

  var mysql = {};
  for (var d=0; d<dbs.length; d++) {
    mysql[dbs[d].name] = {
      strategy: 'mysql',
      host: dbs[d].normal.toquen.internal_ip,
      user: config.mysql.user,
      password: config.mysql.password,
      database: 'vacay_production',
      sql: 'show tables'
    };
  }

  var redis = {};
  redis['node-' + monitor.name] = {
    strategy: 'redis',
    host: monitor.normal.toquen.internal_ip,
    port: 6379,
    password: config.redis.options.auth_pass
  };

  var elasticsearch_hosts = [];
  var elasticsearch = {};
  for (var e=0; e<search.length; e++) {
    elasticsearch['node-' + search[e].name] = {
      strategy: 'http',
      url: 'http://' + search[e].normal.toquen.internal_ip + ':9200/',
      interval: 10000
    };
  }
  elasticsearch.cluster = {
    strategy: 'elasticsearch',
    url: 'http://' + search[0].normal.toquen.internal_ip + ':9200/_cluster/health',
    interval: 10000
  };

  config.monitor = {
    port: 8000,
    services: {
      vacay: vacay,
      //worker: worker,
      //fingerprint: fingerprint,
      mysql: mysql,
      redis: redis,
      elasticsearch: elasticsearch
    },
    alert: config.alert,
    statsd: config.statsd
  };

} else {

  config = {
    port: 3000,

    monitor: {
      services: {

	vacay: {
	  www: {
	    strategy: 'http',
	    url: 'https://vacay.io/',
	    up: 5,
	    down: 3
	  },
	  api: {
	    strategy: 'http',
	    url: 'https://api.vacay.io:8080/health_check',
	    strictSSL: true,
	    up: 5,
	    down: 3
	  },
	  /* kue: {
	     strategy: 'http',
	     url: 'http://52.90.197.6/',
	     up: 5,
	     down: 3
	     }*/
	  // websocket: {
	  // 	strategy: 'websocket',
	  // 	url: 'ws://localhost:8000/socket.io/?transport=polling',
	  // 	up: 5,
	  // 	down: 3
	  // }
	},

	// 	fp: {
	// 	    api: {
	// 		strategy: 'http',
	// 		url: 'http://localhost:9001/health_check',
	// 		up: 5,
	// 		down: 5
	// 	    },
	// 	    db: {
	// 		strategy: 'mysql',
	// 		host: 'localhost',
	// 		user: 'root',
	// 		database: 'fp_development',
	// 		sql: 'SELECT * FROM tracks LIMIT 1'
	// 	    }
	// 	},

	// 	mysql: {
	// 	    localhost: {
	// 		strategy: 'mysql',
	// 		host: 'localhost',
	// 		user: 'root',
	// 		database: 'vacay_development',
	// 		sql: 'SELECT * FROM users LIMIT 1'
	// 	    }
	// 	},

	// 	redis: {
	// 	    localhost: {
	// 		strategy: 'redis',
	// 		host: 'localhost',
	// 		port: 6379
	// 	    }
	// 	},

	// 	elasticsearch: {
	// 	    localhost: {
	// 		strategy: 'http',
	// 		url: 'http://localhost:9200/',
	// 		interval: 10000
	// 	    },
	// 	    cluster: {
	// 		strategy: 'elasticsearch',
	// 		url: 'http://localhost:9200/_cluster/health',
	// 		interval: 10000
	// 	    }
	// 	}
      },

      log: [ 'up', 'dawn', 'fail' ],

      statsd: {
	host: 'localhost',
	port: 8125
      }
    },

    log: {
      level: 'debug',
      express_format: '[:date] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms ":referrer" :remote-addr'
    }
  };
}

if (!config) {
  throw new Error('Application config missing');
}

module.exports = config;
