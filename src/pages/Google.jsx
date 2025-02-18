import React from 'react';
import { Button } from 'reactstrap';
import GoogleLogo from '../Google.svg';

// Component for handling federated login (Google)
function GoogleLogin(){
  // Function for handling Google login redirect
  const handleGoogleLogin = () => {
    const domain = "n11736062at2.auth.ap-southeast-2.amazoncognito.com";  
    const clientId = "3noqc3ms1qldov01oukvgk8is3";  
    const redirectUri = "http://localhost:5000"; 

    // Redirect URL with Google as the identity provider
    const loginUrl = `https://${domain}/login?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}&identity_provider=Google`;

    // Redirect the user to the Cognito Hosted UI with Google as the IDP
    window.location.href = loginUrl;
  };

  return (
    <div style={{ marginTop: '5px' }}>
      <Button
        className="w-100"
        onClick={handleGoogleLogin}
        style={{
          backgroundColor: 'black', 
          borderColor: '#34A853',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <img
          src={GoogleLogo} 
          alt="Google logo"
          style={{
            width: '20px',
            height: '20px',
            marginRight: '8px' 
          }}
        />
        Login with Google
      </Button>
    </div>
  );
};

export default GoogleLogin;
