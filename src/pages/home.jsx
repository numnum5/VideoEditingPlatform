
import { Button } from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import '../css/home.css';

// Home page
export default function Home() {

    const navigate = useNavigate();

    return (
      <div className="hero-section">
        <div className="hero-content">
          <h1>Share and Edit Videos Seamlessly!</h1>
          <p>Empower your creativity with our all-in-one platform for video sharing and editing. Organize, edit, and share your videos with ease.</p>
          <div className="hero-buttons">
            {/* Navigate user  */}
            <Button outline onClick={()=>navigate('/login')}>Sign in for free</Button>
            <Button outline onClick={()=>navigate('/search')}>Search</Button>
          </div>
          <p className="small-text">Start editing and sharing your videos today. No hidden fees, no credit card required.</p>
        </div>
      </div>
    );
  }