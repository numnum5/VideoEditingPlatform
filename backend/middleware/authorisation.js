const jwt = require("aws-jwt-verify");
const Cognito = require("@aws-sdk/client-cognito-identity-provider");
const clientId = '3noqc3ms1qldov01oukvgk8is3';
const userPoolId = 'ap-southeast-2_wX3PpwsPZ';

// Verifiers
const accessVerifier = jwt.CognitoJwtVerifier.create({
	userPoolId: userPoolId,
	tokenUse: 'access',
	clientId: clientId,
  });
  
  const idVerifier = jwt.CognitoJwtVerifier.create({
	userPoolId: userPoolId,
	tokenUse: 'id',
	clientId: clientId,
  });

// A middleware function for authorising user
 const authorisation = async (req, res, next) =>{
	const authHeader = req.headers.authorization
	// Checks if authorisation header exists
	if (!authHeader) {
		res.status(401).json({
			error: true,
			message: "Authorization header is missing",
		});
		return;
	}

	// Check if authorisation header matches the Bearer token pattern
	if (!authHeader.startsWith('Bearer ')) {
		res.status(401).json({ error: true, message: "Authorization header must start with 'Bearer '"});
		return;
	}
	
	// Extracts the token out of the header
	const token = req.headers.authorization.replace(/^Bearer /, '');
	try {

		// console.log(token);
		const decoded = await idVerifier.verify(token);
		// Store current user details in req
		const username = decoded['cognito:username']; // Extracting the username
		const isAdmin = decoded['cognito:groups']?.includes('Admin');
		req.currentUser = { ...decoded, username }; 
		req.isAdmin = isAdmin;
	} catch (err) {
		res.status(401).json({ error: true, message: err.message});
		return;
	}
	next();
}

module.exports = authorisation;
