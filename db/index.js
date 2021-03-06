var mongoose = require('mongoose'),
	Schema = mongoose.Schema;
	
exports.connection = mongoose.connect('mongodb://localhost/magnetic');

//Define Schemas =========

//Tag
var TagSchema = new Schema({
	name: {
		type: String,
		index: { unique: true }
	},
	countUsers: {
		type: Number,
		default: 0
	},
	countProjects: {
		type: Number,
		default: 0
	}
});

//Project
var ProjectSchema = new Schema({
	title: String,
	tags: [{
		type: String,
		index: true
	}],
	uri: String,
	description: String,
	oneliner: String,
	link: String,
	owner: {
		type: Schema.ObjectId,
		ref: 'User'
	},
	collaborators: [{
		type: Schema.ObjectId,
		ref: 'User'
	}],
	postedOn: {
		type: Date,
		default: Date.now
	}
});

//User
var UserSchema = new Schema({
	username: {
		type: String,
		unique: true,
		validate: [
			function (v) {
				console.log(v);
				return /[a-zA-Z0-9]*/.test(v);
			},
			'Username must contain only alphabets and numbers.'
		]
	},
	firstname : String,
	lastname: String,
	tagline: String,
	location: String,
	url: String,
	available: Boolean,
	email : {
		type: String,
		unique: true
	},
	email_hash: String,
	password : String,
	tags: [{
		type: String,
		index: true
	}],
	projectsOwned: [{
		type: Schema.ObjectId,
		ref: 'Project'
	}],
	projectsInvolved: [{
		type: Schema.ObjectId,
		ref: 'Project'
	}]
});

UserSchema.statics.authenticate = function (email, pw, callback) {
	this.findOne({
		email: email,
		password: pw //TODO add hashing and salting
	},
	['username','firstname','lastname','email_hash'], 
	function(err, user){
		if (user) {
			callback({
				status: 'ok',
				user: user
			});
		} else {
			callback({
				status: 'not ok'
			})
		}
	});
};

//Export Models =========
exports.User = mongoose.model('User', UserSchema);
exports.Tag = mongoose.model('Tag', TagSchema);
exports.Project = mongoose.model('Project', ProjectSchema);