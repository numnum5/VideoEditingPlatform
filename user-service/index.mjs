
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand, 
  SignUpCommand,
  ConfirmSignUpCommand, 
  ResendConfirmationCodeCommand } from "@aws-sdk/client-cognito-identity-provider";
import { jwtDecode } from "jwt-decode";
// const clientId = process.env.CLIENT_ID;
// const region = process.env.REGION;
const clientId = "3noqc3ms1qldov01oukvgk8is3"; 
const region = 'ap-southeast-2'

const cognitoClient = new CognitoIdentityProviderClient({ 
  region: region,
});

export const handler = async (event) => {
  // Extract http method and path
  const { httpMethod, path } = event;
  try {
    // Excute different functionalites depending on the method type and path
    switch (httpMethod) {
      case "POST":
        switch (path) {
          case "/signup":
            return await signUp(event);
          case "/confirm":
            return await confirmSignUp(event);
          case "/login":
            return await login(event);
          case "/resend":
            return await resendConfirmationCode(event);
          default:
            return {
              statusCode: 404,
              body: JSON.stringify({ error: "Resource not found" }),
            };
        }
      // Handle CORS preflight request
      case "OPTIONS":
        return {
          statusCode: 200,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
          },
          body: JSON.stringify({ message: "CORS preflight success" }),
        };
      
      default:
        return {
          statusCode: 405,
          body: JSON.stringify({ error: "Method not allowed" }),
        };
    }
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Internal Server Error" }),
    };
  }
};


// Resend Confirmation Code function
const resendConfirmationCode = async (event) => {
  const { username } = JSON.parse(event.body);
  const params = {
    ClientId: clientId,
    Username: username,
  };

  try {
    const command = new ResendConfirmationCodeCommand(params);
    const response = await cognitoClient.send(command);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Credentials": true, 
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};


// Function signing up user
const signUp = async (event) => {
  const { email, username, password } = JSON.parse(event.body);
  const params = {
      ClientId: clientId,
      Username: username,
      Password: password,
      UserAttributes: [{ Name: "email", Value: email }],
  };

  try {
      const command = new SignUpCommand(params);
      const response = await cognitoClient.send(command);
      return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "POST, OPTIONS", 
      },
      body: JSON.stringify(response),
      };
  } catch (error) {
      return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
      };
  }
};




// Confirm Sign Up function
const confirmSignUp = async (event) => {
  const { username, code } = JSON.parse(event.body);
  const params = {
    ClientId: clientId,
    Username: username,
    ConfirmationCode: code,
  };

  try {
    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": true,
        "Access-Control-Allow-Methods": "POST, OPTIONS", 
      },
      body: JSON.stringify({ message: "User confirmed successfully" }),
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
    };
  }
};



// Login function
const login = async (event) => {
  const { username, password } = JSON.parse(event.body);
  const params = {
    AuthFlow: "USER_PASSWORD_AUTH",
    AuthParameters: {  
      USERNAME: username,
      PASSWORD: password,
    },
    ClientId: clientId,
  };

  try {
    const command = new InitiateAuthCommand(params);
    const response = await cognitoClient.send(command);
    const AuthenticationResult = response.AuthenticationResult;

    if (response.ChallengeName) {
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*", 
          "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Methods": "POST, DELETE, GET",
          "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With", 
        },
        body: JSON.stringify(response),
      };
    }

    if (AuthenticationResult) {
      const idToken = AuthenticationResult.IdToken;
      const decoded = jwtDecode(idToken);
      const isAdmin = decoded['cognito:groups']?.includes('Admin');
      const username = decoded["cognito:username"];
      
      // Return authentication result with tokens
      return {
        statusCode: 200,
        headers: {
          "Access-Control-Allow-Origin": "*", 
          "Access-Control-Allow-Credentials": true,
          "Access-Control-Allow-Methods": "POST, DELETE, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type", 
        },
        body: JSON.stringify({
          message: "Login successful",
          accessToken: AuthenticationResult.AccessToken,
          idToken: AuthenticationResult.IdToken,
          refreshToken: AuthenticationResult.RefreshToken,
          isAdmin: isAdmin,
          username: username,
        }),
      };
    }
  } catch (error) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: error.message }),
    };
  }
};