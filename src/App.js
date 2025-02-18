import { useState, useEffect } from 'react'
import { jwtDecode } from "jwt-decode";
import { FaUser } from "react-icons/fa";
import { Link, BrowserRouter, Route, Routes, NavLink} from 'react-router-dom'
import { DropdownMenu } from '@radix-ui/themes';
import * as Avatar from '@radix-ui/react-avatar';
import { Theme } from '@radix-ui/themes';
import Login from './pages/login'
import Edit from './pages/transcode'
import MyVideosPage from './pages/myVideos'
import SearchPage from './pages/search'
import UploadPage from './pages/upload'
import GalleryPage from './pages/gallery'
import VideoPage from './pages/video';
import Home from './pages/home';
// import Register from './pages/register';
import ConfirmUserPage from './pages/confirmUserRegister';
import MFASetup from './pages/setup';
import EditUsers from './pages/editUsers';
import '@radix-ui/themes/styles.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'
// require('dotenv').config()

// Main entry point of the applciation
function App(){
  const [loggedState, setLoggedState] = useState(false);
  function handleLogout(){
    setLoggedState(false)
    // Removes information from local storage
    sessionStorage.clear();
  }

  // Checks if the user's token is expired or not if they reload the application
  useEffect(
    ()=>{

      const token = sessionStorage.getItem('idToken');
      if(token){
        // Decodes token and sets loggedState by comparing expiry data to current time
        const decoded = jwtDecode(token);
        if(decoded.exp > Date.now() / 1000){
          setLoggedState(true);
        }
        else{
          sessionStorage.clear();
          setLoggedState(false);
        }
      }
    },[loggedState])

    useEffect(() => {
      const exchangeCodeForToken = async () => {
        const urlCode = new URLSearchParams(window.location.search);
        const code = urlCode.get('code');  // Extract the authorization code from the URL
        const domain = "n11736062at2.auth.ap-southeast-2.amazoncognito.com"; 
        const clientId = "3noqc3ms1qldov01oukvgk8is3"; 
        const redirectUri = "http://localhost:5000"; 
        const tokenUrl = `https://${domain}/oauth2/token`;
    
        // Create param body with necessary info
        const params = new URLSearchParams();
        params.append("grant_type", "authorization_code");
        params.append("client_id", clientId);
        params.append("code", code);
        params.append("redirect_uri", redirectUri);
    
        try {
            const response = await fetch(tokenUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: params,
            });
    
            if (!response.ok) {
                throw new Error(`Error exchanging code for tokens`);
            }
    
            // Parse response and extract id token
            const tokenData = await response.json();  
            const idToken = tokenData.id_token;
            // Decode id token to see if user is an admin as well as user's username
            const decoded = jwtDecode(idToken);
            const isAdmin = decoded['cognito:groups']?.includes('Admin');
            
            const cognitoUsername = decoded["cognito:username"];

            // Set necessary items in sesionStorage for session
            sessionStorage.setItem('username', cognitoUsername || '');
            sessionStorage.setItem("isAdmin", isAdmin);
            sessionStorage.setItem("idToken", tokenData.id_token || '');
            sessionStorage.setItem("accessToken", tokenData.access_token || '');
            sessionStorage.setItem("refreshToken", tokenData.refresh_token || '');
            setLoggedState(true);
        } catch (error) {
            
        }
    };
  
      // Call the function to exchange the authorization code for tokens
      exchangeCodeForToken();
    }, []);

  return (
      <div className='App'>
        <Theme>
          <BrowserRouter>
          <header>
          <nav>
          {loggedState ? 
          <>
          <NavLink to="/" activeClassName="active">Home</NavLink>
          <NavLink to="/upload" activeClassName="active">Upload</NavLink>
          <NavLink to="/search" activeClassName="active">Search</NavLink>
          <NavLink to="/transcode" activeClassName="active">Edit</NavLink>
          <NavLink to="/gallery" activeClassName="active">Local Videos</NavLink>
          {/* Only show this button when user is admin */}
          {sessionStorage.getItem("isAdmin") === "true" && (
            <NavLink to="/admin" activeClassName="active">Admin</NavLink>
          )}
          </>
          :
          <>
          <NavLink to="/" activeClassName="active">Home</NavLink>
          <NavLink to="/search" activeClassName="active">Search</NavLink>
          <NavLink to="/gallery" activeClassName="active">Local Videos</NavLink>
          </> 
          }

          </nav>
          <div className='profile'>
          <DropdownMenu.Root>
          <DropdownMenu.Trigger>
          {/* <Button variant="ghost"> */}
          <Avatar.Root className="AvatarRoot">
          {/* <Avatar.Image
          className="AvatarImage"
          alt="Colm Tuite"
          /> */}
          <Avatar.Fallback className="AvatarFallback" delayMs={600}>
          <FaUser style={{ color: 'black', fontSize: '22px' }}/>
          </Avatar.Fallback>
          </Avatar.Root>
          {/* </Button> */}
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
          <DropdownMenu.Label>{loggedState ? sessionStorage.getItem('username') : 'Please login'}</DropdownMenu.Label>
          {loggedState ? 
          <>

          <DropdownMenu.Item shortcut="⌘ E" asChild>
          <Link to="/myvideos" className="dropdown-link">My videos</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item shortcut="⌘ D" asChild>
          <Link to="/profile" className="dropdown-link">Profile</Link>
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item asChild>
          <Link to="/" onClick={handleLogout} className="dropdown-link">Logout</Link>
          </DropdownMenu.Item>
          </>
          :
          <>
          <DropdownMenu.Item shortcut="⌘ D" asChild>
          <Link to="/login" className="dropdown-link">Login</Link>
          </DropdownMenu.Item>
          </>
          }
          </DropdownMenu.Content>
          </DropdownMenu.Root>

          </div>
          </header>
          <div>
          <Routes>
          <Route path='/upload' element={<UploadPage/>}/>
          <Route path='/' element={<Home/>}/>
          <Route path='/*' element={<Home/>}/>
          <Route path='/login' element={<Login setLoggedState={setLoggedState}/>}/>
          {/* <Route path='/register' element={<Register loggedState={loggedState}/>}/> */}
          <Route path='/search' element={<SearchPage loggedState={loggedState}/>}/>
          <Route path='/transcode' element={<Edit loggedState={loggedState}/>}/>
          <Route path='/myvideos' element={<MyVideosPage/>}/>
          <Route path='/gallery' element={<GalleryPage/>}/>
          <Route path='/confirm' element={<ConfirmUserPage/>}/>
          <Route path='/admin' element={<EditUsers isAdmin={true}/>}/>
          <Route path='/video/:id' element={<VideoPage loggedState={loggedState}/>}/>
          <Route path='/MFAsetup' element={<MFASetup setLoggedState={setLoggedState}/>}/>
          </Routes>
          </div>
          </BrowserRouter>
        </Theme>
      </div>
  )
}

export default App
