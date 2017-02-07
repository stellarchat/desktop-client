var NwBuilder = require('nw-builder');
var nw = new NwBuilder({
	files: ['src/**/**', 
	        '!src/node_modules/**/**',
	        'src/node_modules/sjcl/**/**',
	        'src/node_modules/bootstrap/dist/**/**',
	        'src/node_modules/jquery/dist/jquery.min.js',
	        'src/node_modules/angular/angular.min.js',
	        'src/node_modules/angular-route/angular-route.min.js',
	        'src/node_modules/angular-translate/dist/angular-translate.min.js',
	        'src/node_modules/underscore/underscore-min.js',
	        'src/node_modules/stellar-sdk/dist/stellar-sdk.min.js'
	],
	platforms: ['win64', 'osx64'],
	version: '0.20.0'
});

nw.on('log', console.log);

nw.build().then(function(){
	console.log('Build done!');
});

// nwjs version can refer to https://nwjs.io/version.json
// you may need to help nw-builder to find the correct version. :)