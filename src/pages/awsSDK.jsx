
import { 
  CognitoIdentityProviderClient, 
  InitiateAuthCommand, 
  SignUpCommand,
  ConfirmSignUpCommand, 
  ResendConfirmationCodeCommand,} from "@aws-sdk/client-cognito-identity-provider";
import { jwtDecode } from "jwt-decode";

const clientId = "3noqc3ms1qldov01oukvgk8is3"; 
const region = 'ap-southeast-2'
export const cognitoClient = new CognitoIdentityProviderClient({
  region: region,
});

// Function resending confirmation code to user's email address
export const resendConfirmationCode = async (username) => {
  const params = {
    ClientId: clientId,
    Username: username,
  };

  try{
    const command = new ResendConfirmationCodeCommand(params);
    const response = await cognitoClient.send(command);
    return response;
  }
  catch(error){
    throw error;
  }
}

// Function for loggin in
export const login = async (username, password) => {
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

    console.log(response);
    console.log("authenicat")
    console.log(AuthenticationResult);
    // If any challenges like MFA exists return the response right away
    if (response.ChallengeName) {
      return response;
    }

    // If authetnication is complete
    if (AuthenticationResult) {

      // Decode the id token to extract and group type and username
      const idToken = AuthenticationResult.IdToken;
      const decoded = jwtDecode(idToken);
      const isAdmin = decoded['cognito:groups']?.includes('Admin');
      const username = decoded["cognito:username"];
      // Set necessary variables in session storage
      sessionStorage.setItem('username', username || '');
      sessionStorage.setItem("isAdmin", isAdmin);
      sessionStorage.setItem("idToken", AuthenticationResult.IdToken || '');
      sessionStorage.setItem("accessToken", AuthenticationResult.AccessToken || '');
      sessionStorage.setItem("refreshToken", AuthenticationResult.RefreshToken || '');
      return AuthenticationResult;
    }

  } catch (error) {
    throw error;
  }
};

// Sign Up function
export const signUp = async (email, username, password) => {
  const params = {
    ClientId: clientId,
    Username: username,
    Password: password,
    UserAttributes: [{ Name: "email", Value: email }],
  };
  try {
    const command = new SignUpCommand(params);
    const response = await cognitoClient.send(command);
    return response;
  } catch (error) {
    throw error;
  }
};

// Conforming sign up
export const confirmSignUp = async (username, code) => {
  const params = {
    ClientId: clientId,
    Username: username,
    ConfirmationCode: code,
  };
  try {
    const command = new ConfirmSignUpCommand(params);
    await cognitoClient.send(command);
    return true;
  } catch (error) {
    throw error;
  }
};