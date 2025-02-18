require('dotenv').config();
const getSecret = require('./helper/secretes')


// For local development
// module.exports = {
// 	client: 'mysql2',
// 	connection: {
// 		host: process.env.DB_HOST,
// 		port: process.env.DB_PORT,
// 		database: process.env.DB_NAME,
// 		user: process.env.DB_USER,
// 		password: process.env.DB_PASSWORD
// 	},
// };

// For deployment on EC2
module.exports = async () => {
	// Get secret username and password for RDS
    const secretName = process.env.RDS_SCRETE_NAME; 
    const secret = await getSecret(secretName);
    const secretJson = JSON.parse(secret);
    return {
        client: 'mysql2',
        connection: {
            host: process.env.RDS_HOST,
            port: process.env.DB_PORT,
            database: process.env.DB_NAME,
            user: secretJson.username,
            password: secretJson.password,
        },
    };
};