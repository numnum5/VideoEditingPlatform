
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineVisibility, MdOutlineVisibilityOff} from "react-icons/md";
import {InputGroup, Form, Button, Alert, FormGroup, Label, Input, InputGroupText} from "reactstrap";
import '../css/login.css'
import { API_URL } from '../config';
import { signUp, login } from "./awsSDK";
import GoogleLogin from "./Google";
const apiUrl = API_URL;
export default function Login() {
  const navigate = useNavigate()
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassowrd] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible);
  };
  // Handler for password and username
  const handlePasswordChange = (event) => {
    setPassword(event.target.value);
  };

  const handleUsernameChange = (event) => {
    setUsername(event.target.value);
  };

  // https://mailtrap.io/blog/javascript-email-validation/
  function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async function handleSignUp(e){
    e.preventDefault();
    setError(null);
    if(!validateEmail(email)){
      setError(new Error("Invalid email format."));
      return;
    }

    if(password !== confirmPassword){
      setError(new Error("Passwords do not match."))
      return;
    }
    try {
      const param = {
        email : email,
        username : username,
        password : password,
      }

      const response = await fetch(`${apiUrl}/signup`, {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(param) // Converts your data to a JSON string
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      // await signUp(email, username, password);
      navigate('/confirm', { state: { username : username } });
    } catch (error) {
      setError(error);
    }
  }

  // Handle login
  async function handleSubmit(e){
      e.preventDefault();

      try{
        const param = {
          username : username,
          password : password
        }
        const response = await fetch(`${apiUrl}/login`, {
          method: 'POST', 
          headers: {
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify(param) // Converts your data to a JSON string
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        // const response = await login(username, password);
        if(data.ChallengeName === "MFA_SETUP" || data.ChallengeName ===  "SOFTWARE_TOKEN_MFA"){
          
          navigate('/mfaSetUp', { state: { response : data, type : data.ChallengeName, username : username} })
        }        
      }catch(error){
        setError(error);
      }

    }

  return (
    <>
     <div className="login">
        <Form className="shadow p-4" onSubmit={isSignUp ? handleSignUp: handleSubmit}>
        <div className="h4 mb-2 text-center"><label>{isSignUp ? "Sign Up" : "Login"}</label></div>
            {error !== null &&            
            <Alert
                color="danger"
                className="mb-2"
                isOpen={error !== null}
                toggle={() => setError(null)}
            >
              {error.message}
            </Alert>}
            {
              isSignUp && 
              <FormGroup>
              <Label>Email</Label>
              <Input
               invalid={error !== null}
                type="email"
                value={email}
                placeholder="Email Address"
                onChange={(e)=> setEmail(e.target.value)}
                required
              />
            </FormGroup>
            }
          <FormGroup>
            <Label className="loginLabel">Username</Label>
            <Input
             invalid={error !== null}
              type="text"
              value={username}
              placeholder="Username"
              onChange={handleUsernameChange}
              required
            />
          </FormGroup>
          <FormGroup>
            <Label className="loginLabel">Password</Label>
            <InputGroup>
            <Input
             invalid={error !== null}
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              placeholder="Password"
              onChange={handlePasswordChange}
              required
            />
              <InputGroupText onClick={togglePasswordVisibility} >
              {
                isPasswordVisible ? <MdOutlineVisibility/> :<MdOutlineVisibilityOff />
              }
      </InputGroupText>
            </InputGroup>
          </FormGroup>
          {
              isSignUp &&
              <FormGroup>
              <Label>Confirm password</Label>
              <InputGroup>
              <Input
               invalid={error !== null}
                type={isPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                placeholder="Confirm Password"
                onChange={(e)=> setConfirmPassowrd(e.target.value)}
                required
              />
              <InputGroupText onClick={togglePasswordVisibility} >
              {
                isPasswordVisible ? <MdOutlineVisibility/> :<MdOutlineVisibilityOff />
              }
      </InputGroupText>
              </InputGroup>
              </FormGroup>
          }
        <Button className="w-100" type="submit">
                  {isSignUp ? "Sign Up" : "Login"}
        </Button>
        <FormGroup>
        <GoogleLogin/>
        </FormGroup>

    <div className="d-flex flex-column align-items-end mt-2">
      <FormGroup>
        <Label for="register-button" className="mb-2 me-2" >{isSignUp ? "Already a member?": "Not a member?"}</Label>
        {
          isSignUp ? 
          <Button id="register-button" color="primary" onClick={()=> {setIsSignUp(false); setError(null)}}>Login</Button>
          : <Button id="register-button" color="primary" onClick={()=> {setIsSignUp(true); setError(null)}}>Register</Button>
        }
      </FormGroup>
    </div>
        </Form>
        
      </div>
    </>
  )
}