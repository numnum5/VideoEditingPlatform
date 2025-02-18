import { useState, useEffect } from "react";
import { Pagination, PaginationItem, PaginationLink, Alert} from "reactstrap";
import { useNavigate } from "react-router-dom";
import VideoSearchBar from "../components/videoSearchBar";
import '../css/localVideos.css'
import { API_URL } from '../config';
import createThumbnailPath from "../helper/createThumbnailPath";
const apiUrl = API_URL;

// Component for displaying user videos
export default function MyVideosPage(){

    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [videos, setVideos] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const limit = 6;

    // Navigate user to the selected video page
    const handleVideoClick = (id) =>{
        navigate(`/video/${id}`);
    }

    // handle query
    const handleSearch = (query) => {
      setSearchQuery(query);
      setCurrentPage(1);
    };

    // Function for fetching videos based on page number and search query
    const fetchVideos = async (page, limit, query) => {
      try {
        const response = await fetch(`${apiUrl}/api/videos/uservideos?page=${page}&limit=${limit}&query=${query}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`,
            'Content-Type': 'application/json'
          }});
  
          const res = await response.json();
          if(!response.ok){
                throw new Error(res.message);      
          }
          return res;
      } catch (error) {
        setError(error);
        return { videos: [], total: 0, totalPages: 0 };
      }
    };

    // Load videos when the currentPage or searchQuery changes
    useEffect(() => {
        const loadVideos = async () => {
          setLoading(true);
          const data = await fetchVideos(currentPage, limit, searchQuery);
          setVideos(data.result);
          setTotalPages(data.totalPages);
          setLoading(false);
        };
    
        loadVideos();
      }, [currentPage, searchQuery]);


      // Only change page number when below condition statifies
      const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
          setCurrentPage(page);
        }
      };

    // Handle loading
    if(loading){

      return(
        <p>Loading...</p>
      );
    }


    // Handle error
    if(error){
      return(
        <Alert
        color="danger"
        className="mb-2"
        isOpen={error !== null}
        toggle={() => setError(null)}
        >
        {error}
        </Alert>
      );
    }
    console.log(videos);
    return(
    <div>
        <VideoSearchBar onSearch={handleSearch}/>
          <div className="video-container">
          { 
          videos.length === 0 ? 
          <p>no result</p>
          :
          videos && videos.map(src => (
          <div className="video-item" key={src.id} onClick={()=>handleVideoClick(src.id)}>
            <video controls src={src.url} poster={createThumbnailPath(src.thumbnail, src.source)}>
            </video>
            <p>{src.title}</p>
          </div>
          ))
        }
      </div>
      {/* UI for handling paginated video data */}
        <Pagination>
        <PaginationItem disabled={currentPage === 1}>
        <PaginationLink first onClick={() => handlePageChange(1)} />
        </PaginationItem>
        <PaginationItem disabled={currentPage === 1}>
        <PaginationLink previous onClick={() => handlePageChange(currentPage - 1)} />
        </PaginationItem>
      
        {Array.from({ length: totalPages }, (_, index) => (
              <PaginationItem key={index + 1} active={index + 1 === currentPage}>
                <PaginationLink onClick={() => handlePageChange(index + 1)}>
                  {index + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
        <PaginationItem disabled={currentPage === totalPages}>
        <PaginationLink next onClick={() => handlePageChange(currentPage + 1)} />
        </PaginationItem>
        <PaginationItem disabled={currentPage === totalPages}>
        <PaginationLink last onClick={() => handlePageChange(totalPages)} />
        </PaginationItem>
        </Pagination> 
    </div>
    );
}