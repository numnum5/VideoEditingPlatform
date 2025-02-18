
import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {InputGroup, Form, Button, Alert, FormGroup, Label, Input} from "reactstrap";
import { API_URL } from '../config';
const apiUrl = API_URL;
// Class for message
class Message{
  constructor(message){
    this.message = message;
  }
}

// Helper function delaying
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Page for displaying UI related to confirming sign up
const ConfirmUserPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] =useState(null);
  const [username, setUsername] = useState(location.state?.username || '');
  const [confirmationCode, setConfirmationCode] = useState('');

  const [message, setMessage] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {

      
      const param = {
        username : username,
        confirmationCode : confirmationCode
      }
      const response = await fetch(`${apiUrl}/confirm`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(param) // Converts your data to a JSON string
      });

      const data = response.json();
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      // await confirmSignUp(username, confirmationCode);
      setMessage(new Message("Sucessfully created account!, Redirecting to login page"))
      await delay(2000);
      navigate('/login');
    } catch (error) {
      setError(error);
    }
  };

 const handleResendCode = async (e) =>{
  e.preventDefault();
  setError(null);

  try{

    // const test = "https://ylsd878aq0.execute-api.ap-southeast-2.amazonaws.com"
    const param = {
      username : username
    }
    const response = await fetch(`${apiUrl}/resend`, {
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(param) // Converts your data to a JSON string
    });

    const data = response.json();
    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    // await resendConfirmationCode(username);
    setMessage(new Message(`Resent code`));
  }
  catch(error){
    setError(error)
  }
 }
  return (
      <div className="login">
      <Form className="shadow p-4" onSubmit={handleSubmit}>
      <div className="h4 mb-2 text-center"><label>Confirm Account</label></div>
      {message !== null && error === null &&            
          <Alert
              className="mb-2"
              isOpen={message !== null}
              toggle={() => setMessage(null)}
          >
            {message.message}
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
          <Label className="loginLabel">Username</Label>
          <Input
          invalid={error !== null}
            type="text"
            value={username}
            placeholder="Email"
            onChange={(e)=>setUsername(e.target.value)}
            required
          />
        </FormGroup>
        <FormGroup>
          <Label className="loginLabel">Confirmation Code</Label>
          <InputGroup>
          <Input
          invalid={error !== null}
            type="text"
            value={confirmationCode}
            placeholder="Code"
            onChange={(e)=>setConfirmationCode(e.target.value)}
            required
          />
          </InputGroup>
        </FormGroup>
        <Button className="w-100" type="submit">
                  Confirm
          </Button>     
          <div className="d-flex flex-column align-items-end mt-2">
        <FormGroup>
          <Button id="register-button" color="primary" onClick={handleResendCode}>Resend Code</Button>
        </FormGroup>
      </div>
      </Form>
    </div>
  );

};

export default ConfirmUserPage;