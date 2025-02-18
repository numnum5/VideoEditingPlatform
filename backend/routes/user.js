// Route for handling user related requests
const express = require('express');
const router = express.Router();
const authorisation = require('../middleware/authorisation');
const { AdminDeleteUserCommand, CognitoIdentityProviderClient, ListUsersCommand  } = require('@aws-sdk/client-cognito-identity-provider');
require('dotenv').config();

// Create client
const client = new CognitoIdentityProviderClient({
	region: process.env.COGNITO_REGION,
});

// Endpoint for deleting a user
router.delete('/:username', authorisation, async function(req, res, next){
	const username = req.params.username;

	if(!username){
		res.status(401).json({ error: true, message : "Username required in url"})
		return;
	}
	if(!req.isAdmin){
		res.status(403).json({ error: true, message : "Forbidden, this action requires admin access"})
		return;
	}
	try{
		const response = await deleteUser(username);
		res.status(200).json({message : "User deleted sucessfully"})
	}
	catch(error){
		res.status(500).json({ error : true, message : error.message})
	};
});


router.get('/users', authorisation, async function(req, res, next){
	if(!req.isAdmin){
		res.status(403).json({ message : "Forbidden"})
		return;
	}
	const paginationToken = req.query.paginationToken || null;
	const limit = parseInt(req.query.limit) || 10;
	try{
		const input = { 
			UserPoolId: process.env.COGNITO_USERPOOLID,
			limit: limit,
		  };

		  if(paginationToken){
			input.PaginationToken = paginationToken;
		  }
		  const command = new ListUsersCommand(input);
		  const response = await client.send(command);
		  res.status(200).json({
			users: response.Users,
			nextPaginationToken: response.PaginationToken || null,
		  });
	}catch(error){
		res.status(500).json({ error : true, message : error.message})
	}


});
const deleteUser = async (username) => {
    try {
		const command = {
			UserPoolId: process.env.COGNITO_USERPOOLID,
			Username: username
		};

		const deleteUserCommand = new AdminDeleteUserCommand(command);
        const response = await client.send(deleteUserCommand);
		return response;
    } catch (error) {
        throw new Error(error);
    }
};

module.exports = router;
