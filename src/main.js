
nw.Window.open('app.html', {position: 'center', width: 1024, height: 800, min_width: 800, min_height: 600}, function(win) {
	//win.showDevTools();
	
	win.on('maximize', function () {
		localStorage['windowState'] = "maximized";
	});

	win.on('unmaximize', function () {
		localStorage['windowState'] = 'normal';
	});
	
	win.on('restore', function () {
		localStorage['windowState'] = 'normal';
	});
	
	if (localStorage['windowState'] == 'maximized') {
		win.maximize();
	}
});