
/**
 * Module dependencies.
 */

var express = require('express'),
	routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'mustache');
  app.register(".mustache", require('stache'));
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'magnetic'}));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(routes.checkCookie); //check cookie before routing
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

// Routes
app.get('/', routes.index);

app.get('/login', routes.login);
app.post('/login', routes.auth);
app.get('/logout', routes.logout);

app.get('/signup', routes.signup);
app.post('/signup', routes.createUser);

app.get('/post/:step?', routes.post);
app.post('/post/done', routes.postDone);

app.get('/explore', routes.explore);
app.post('/search', routes.search);

app.get('/profile/:username?/:action?', routes.profileAction);
app.get('/profile/:username?', routes.profile);
app.get('/profile', routes.profileSelf);

app.get('/project/:name/:action?', routes.project);

//API
app.get('/api/tags/:tag', routes.searchTags)

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
