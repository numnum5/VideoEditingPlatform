import React, { useState, useEffect } from "react";
import { CognitoIdentityProviderClient, 
  AssociateSoftwareTokenCommand, 
  VerifySoftwareTokenCommand,
  RespondToAuthChallengeCommand } from "@aws-sdk/client-cognito-identity-provider";
import {QRCodeSVG} from 'qrcode.react';
import { useNavigate, useLocation } from "react-router-dom";
import {Form, Button, Alert, FormGroup, Label, Input} from "reactstrap";
import { jwtDecode } from "jwt-decode";
import '../css/login.css'

const clientId = "3noqc3ms1qldov01oukvgk8is3";
const client = new CognitoIdentityProviderClient({ region: "ap-southeast-2" });

// Page for multi factor authentication
export default function MFASetup({setLoggedState}){
  const [error, setError] = useState(null);
  const [secretCode, setSecretCode] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaSession, setMfaSession] = useState("");
  const [mfaMessage, setMfaMessage] = useState(null);
  const location = useLocation();
  const { response, type, username } = location.state || {};

  const navigate = useNavigate();

  const setupMfa = async () => {
    // If user already has setup MFA no need for this process
    if(type === "SOFTWARE_TOKEN_MFA"){
      return;
    }
    const command = new AssociateSoftwareTokenCommand({ Session: response.Session });
    try {
      
      const res = await client.send(command);
      setMfaSession(res.Session);
      // Use SecretCode to generate QR Code
      setSecretCode(res.SecretCode); 
    } catch (error) {
      setError(error);
    }
  };
  // When page loads start setupMFA process
  useEffect(()=>{
    setupMfa()
  }, [])
  
  // Function for verifying MFA code
  const verifyMfaCode = async (e) => {
    e.preventDefault();
    try{
      if(type === "SOFTWARE_TOKEN_MFA"){
        // Create param for challenge
        const challengeParams = {
          ChallengeName: response.ChallengeName,
          Session: response.Session,
          ChallengeResponses: {
            USERNAME: username,
            SOFTWARE_TOKEN_MFA_CODE: mfaCode,
        },
          ClientId: clientId,
        };
        // Respond to challenge
        const challengeCommand = new RespondToAuthChallengeCommand(challengeParams);
        const challengeResponse = await client.send(challengeCommand);
        const authResult = challengeResponse.AuthenticationResult;
        const idToken = authResult.IdToken;
        const decoded = jwtDecode(idToken);
        const isAdmin = decoded['cognito:groups']?.includes('Admin');
        const cognitoUsername = decoded["cognito:username"];
        sessionStorage.setItem('username', cognitoUsername || '');
        sessionStorage.setItem("isAdmin", isAdmin);
        sessionStorage.setItem("idToken", authResult.IdToken || '');
        sessionStorage.setItem("accessToken", authResult.AccessToken || '');
        sessionStorage.setItem("refreshToken", authResult.RefreshToken || '');
        setLoggedState(true);
        navigate('/');
        return;
      }
    }catch(error){
      setError(error);
      return;
    }
    // If user has already setup MFA, user only needs to verify 
    const command = new VerifySoftwareTokenCommand({
      Session: mfaSession,
      UserCode: mfaCode,
    });

    try {
      const res = await client.send(command);
      const tokens = res.AuthenticationResult; 
      // If tokens exist
      if(tokens){
        const idToken = tokens.IdToken;
        const decoded = jwtDecode(idToken);
        const isAdmin = decoded['cognito:groups']?.includes('Admin');
        const username = decoded["cognito:username"];
        sessionStorage.setItem('username', username || '');
        sessionStorage.setItem("isAdmin", isAdmin);
        sessionStorage.setItem("idToken", tokens.IdToken || '');
        sessionStorage.setItem("accessToken", tokens.AccessToken || '');
        sessionStorage.setItem("refreshToken", tokens.RefreshToken || '');
      }
      setMfaMessage("MFA setup complete! You're all set.");
      setLoggedState(true);
      navigate('/');
    } catch (error) {
      setError(new Error("Invalid MFA code. Please try again."));
    }
  };

  return (
    <div className="login">
      <Form className="shadow p-4" onSubmit={(e)=>verifyMfaCode(e)}>
      <div className="h4 mb-2 text-center"><label>{"MFA"}</label></div>
      {mfaMessage !== null && error === null &&            
      <Alert
          className="mb-2"
          isOpen={mfaMessage !== null}
          toggle={() => setMfaMessage(null)}
      >
        {mfaMessage}
      </Alert>}
          {error !== null &&            
          <Alert
              color="danger"
              className="mb-2"
              isOpen={error !== null}
              toggle={() => setError(null)}
          >
            {error.message}
          </Alert>}
        <FormGroup>
        {secretCode && (
          <QRCodeSVG
            value={`otpauth://totp/VideoTranscodingApp:${username}?secret=${secretCode}&issuer=VideoTranscodingApp`}
          />
        )}
        </FormGroup>
        <FormGroup>
          <Label className="loginLabel">Verification Code: </Label>
          <Input
            invalid={error !== null}
            type="text"
            value={mfaCode}
            placeholder="Code"
            onChange={(e)=>{setMfaCode(e.target.value)}}
            required
          />
        </FormGroup>
        <Button className="w-100" type="submit">
            {"Verify"}
          </Button>
      </Form>
    </div>
  );
};
