import { Link, NavLink, useNavigate } from "react-router-dom";
import {useContext} from 'react'

// Component for navigation bar
export default function Nav() {
   const [loggedIn, setLoggedIn] = useContext(false) 
  return (

    <nav>
    <p>hello</p>
      {/* Shows different navigation bar depending on loggedIn status */}
      {loggedIn ? (
          <>
            <NavLink to="/" activeClassName="active">Home</NavLink>
            <NavLink to="/volcanoes" activeClassName="active">Volcanoes</NavLink>
            <Link onClick={handleLogout}>Logout</Link>
            <label>User: {localStorage.getItem("username")}</label>
          </>
        ) : (
          <>
            <NavLink to="/" activeClassName="active">Home</NavLink>
            <NavLink to="/volcanoes" activeClassName="active">Volcanoes</NavLink>
            <NavLink to="/register" activeClassName="active">Register</NavLink>
            <NavLink to="/login" activeClassName="active">Login</NavLink>
          </>
        )}
    </nav>
  );
}