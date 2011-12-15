Requirements
===
Node.js and MongoDB

How to Run
===
1. import the json files inside 'sample_data' into MongoDB with mongoimport like this:
	
	$ mongoimport -d magnetic -c users users.json

2. from the app root folder, run:

	$ npm install

	$ node app.js
	
3. Go to http://localhost:3000 and log in with:

	email - admin@magnetic.io

	pw - admin