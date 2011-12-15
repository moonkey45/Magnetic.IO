var _ = require('underscore'),
	_s = require('underscore.string'),
	db = require('../db'),
	sechash = require('sechash');
	
//cookie handling middleware
exports.checkCookie = function (req, res, next) {
	if (!req.session.user && req.cookies.magnetic_auth) {
		var cookie =  req.cookies.magnetic_auth,
			div = cookie.indexOf('_'),
			username = cookie.slice(0, div),
			hash = cookie.slice(div+1);
		if (sechash.basicHash('md5', username + 'cookie_salt') == hash) {
			db.User.findOne({
				username:username
			},
			['username','firstname','lastname','email_hash'],
			function (err, doc) {
				if (doc) {
					req.session.user = doc;
					next();
				} else {
					next();
				}
			});
		} else {
			next();
		}
	} else {
		next();
	}
}

//get /
exports.index = function (req, res) {
  	res.render('index', {
		title: 'Magnetic.IO',
		user: req.session.user
	});
};

exports.about = function (req, res) {
	res.render('about', {
		user: req.session.user
	});
}

exports.search = function (req, res) {
	res.render('search', {
		user: req.session.user
	});
}

//get /login
exports.login = function (req, res) {
	if (!req.session.user) {
		var red = req.session.postRedirect;
		req.session.postRedirect = null;
		res.render('login', {
			postRedirect: red
		});
	} else {
		res.redirect('/');
	}
};

//post /login
exports.auth = function (req, res) {
	var email = req.body.email,
		pw = req.body.password,
		remember = req.body.remember;
	db.User.authenticate(email, pw, function(data) {
		if (data.status == 'ok') {
			
			req.session.user = data.user;
			
			if (remember) {
				res.cookie('magnetic_auth', data.user.username + '_' + sechash.basicHash('md5', data.user.username + 'cookie_salt'), { maxAge: 1000*60*60*24*30 })
			}
			
			if (req.body.postRedirect) {
				//post project redirect
				res.redirect('/post');
			} else {
				//normal login
				res.redirect('/profile/' + data.user.username);
			}
		} else {
			res.render('login', {
				error: true
			});
		}
	});
}

//get /signup
exports.signup = function (req, res) {
	if (req.session.user) {
		res.redirect('/');
	} else {
		res.render('signup');
	}
}

//post /signup
exports.createUser = function(req, res) {
	res.send('1');
}

//get /logout
exports.logout = function (req, res) {
	res.clearCookie('magnetic_auth');
	if (req.session.user) {
		req.session.user = null;
		res.redirect('/');
	} else {
		res.redirect('back');
	}
}

//get /profile
exports.profileAction = function (req, res, next) {
	var action = req.params.action;
	if (action == 'settings') {
		res.render('settings', {
			user: req.session.user
		});
	} else {
		next();
	}
}
exports.profile = function (req, res, next) {
	var username = req.params.username;
	if (username) {
		db.User
			.findOne({username:username})
			.populate('projectsOwned')
			.run(function (err, user) {
				if (err) console.log(err);
				if (user) {

					//console.log(user);

					var isOwner = false;
					if (req.session.user)
						isOwner = req.session.user.username == username;

					res.render('profile', {
						user: req.session.user,
						target: user,
						isOwner: isOwner
					});
				} else {
					res.render('profile');
				}
			});
	} else {
		next();
	}
}
exports.profileSelf = function (req, res) {
	if (req.session.user) {
		res.redirect('/profile/' + req.session.user.username);
	} else {
		res.redirect('/signup');
	}
}

exports.post = function (req, res) {
	if (req.session.user) {
		var step = req.params.step;
		if (step) {
			if (step == 'done') {
				res.redirect('/');
			} else {
				res.render('post/'+step, {
					user: req.session.user
				});
			}
		} else {
			res.redirect('/post/guidelines');
		}
	} else {
		req.session.postRedirect = true;
		res.redirect('/login');
	}
}

exports.postDone = function (req, res) {
	var tags = req.body.user.tags,
		newProject = new db.Project({
			title: req.body.title,
			description: req.body.description,
			link: req.body.link,
			tags: tags,
			owner: req.session.user._id,
			uri: _s.trim(req.body.title.toLowerCase()).replace(' ','-')
		});
		
	newProject.save(function (err) {
		
		if (err) console.log(err);
		
		//process the tags
		_.each(tags, function (tag) {
			db.Tag.findOne({ name: tag }, function (err, doc) {
				if (doc) {
					db.Tag.update({ name: tag }, { $inc: { countProjects: 1 }}, function(err){
						if (err) console.log(err);
					});
				} else {
					var newTag = new db.Tag({ name: tag, countProjects: 1 });
					newTag.save(function(err){
						if (err) console.log(err);
					});
				}
			});
		});
		
		//push it to user's projects owned
		db.User.update({ username: req.session.user.username }, { $push: { projectsOwned: newProject._id } }, function(err) {
			if (err) console.log(err);
		});
		
		res.render('post/done', {
			user: req.session.user,
			project: newProject
		});
		
	});
}

exports.explore = function (req, res) {
	db.Project.find({}).limit(4).desc('postedOn').run( function (err, projects) {
		db.Tag.find({}).limit(10).desc('countProjects').run( function (err, ptags) {
			db.Tag.find({}).limit(10).desc('countUsers').run( function (err, utags) {
				var data = {
					latestProjects: projects,
					featuredProjects: projects,
					projectTags: ptags,
					userTags: utags,
					user: req.session.user
				};
				//console.log(data);
				res.render('explore', data);
			});
		});
	});
}

exports.project = function (req, res) {
	var uri = req.params.name;
	db.Project
		.findOne({uri: uri})
		.populate('owner', ['firstname','lastname','username','email_hash'])
		.populate('collaborators', ['firstname','lastname','username','email_hash'])
		.run(function (err, project) {
			console.log(project.owner);
			res.render('single_project', {
				project: project,
				user: req.session.user
			});
		});
}

exports.search = function (req, res) {
	res.render('search', {
		user: req.session.user
	});
}

//for translating input to Models
var searchTypes = {
	Projects: 'Project',
	People: 'User'
};

exports.searchResult = function (req, res) {
	var keyword = req.body.keyword,
		type = searchTypes[req.body.type];
	db[type].where('tags').in([keyword]).run(function (err, docs) {
		var data = {
			user: req.session.user,
			keyword: keyword,
			empty: docs.length == 0,
			type: req.body.type
		};
		data[type] = docs;
		res.render('search', data);
	});
}

//API
exports.suggestTags = function (req, res) {
	var term = req.params.tag;
	db.Tag
	.where('name')
	.regex(new RegExp(term))
	.limit(5)
	.run(function (err, tags) {
		var plainTags = [];
		_.each(tags, function (tag) {
			plainTags.push(tag.name);
		});
		res.contentType('json');
		res.send({
			tags: plainTags
		});
	});
}