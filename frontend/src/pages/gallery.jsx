import { useState, useEffect } from "react";
import { Pagination, PaginationItem, PaginationLink, Alert} from "reactstrap";
import VideoItem from "../components/videoItem"; 
import VideoSearchBar from "../components/videoSearchBar";
import { useNavigate } from "react-router-dom";
import '../css/localVideos.css'
import { API_URL } from '../config';
const apiUrl = API_URL;
// Component for displaying vidoes uploaded to server locally (not from external source)
export default function GalleryPage(){
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

    // Handle query
    const handleSearch = (query) => {
      setSearchQuery(query);
      setCurrentPage(1); 
    };

    // Fetch videos given page numebr limit and query
    const fetchVideos = async (page, limit, query) => {
      try {
        const response = await fetch(`${apiUrl}/api/videos/videos?page=${page}&limit=${limit}&query=${query}`);
    // If the response is not ok, throw an error with the response message
      if (!response.ok) {
        const errorData = await response.json(); // Parse the error response
        throw new Error(errorData.message || 'Failed to fetch videos');
      }
        const data = await response.json();
        return data;
      } catch (error) {
        // Catch any errors
        setError(error);
        return { videos: [], total: 0, totalPages: 0 };
      }
    };
    
    // Intial load for videos when search query or page number changes
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

    // Check for page number
    const handlePageChange = (page) => {
        if (page > 0 && page <= totalPages) {
          setCurrentPage(page);
          }
      };

    
    // Catch any errors
    if(error){
      return(
          <Alert
          color="danger"
          className="mb-2"
          isOpen={error !== null}
          toggle={() => setError(null)}
          >
          {error.message}
          </Alert>
      );      
     } 

    return(
    <div>
      <VideoSearchBar onSearch={handleSearch}/>
      <div className="video-container">
        { (videos && videos.length === 0) ? (
          <p>No result</p>
        ) : (
          videos && videos.map((video) => (
            <VideoItem key={video.id} video={video} handleVideoClick={handleVideoClick} />
          ))
        )}
      </div>
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