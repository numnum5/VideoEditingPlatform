import { useState, useEffect } from "react";
import { Pagination, PaginationItem, PaginationLink, Input, Button, Modal, ModalBody, ModalFooter, ModalHeader, Alert
} from "reactstrap";
import VideoSearchBar from "../components/videoSearchBar";
import '../css/search.css'
import { API_URL } from '../config';
const apiUrl = API_URL;

// Main page for displaying youtube videos
export default function YouTubeSearch({loggedState}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [videos, setVideos] = useState([]);
    const [nextPageToken, setNextPageToken] = useState('');
    const [prevPageToken, setPrevPageToken] = useState('');
    const [loading, setLoading] = useState(false);
    const [modal, setModal] = useState(false);
    const [userPlaylists, setUserPlaylists] = useState([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState('');
    const [loadingVideoId, setLoadingVideoId] = useState(null); 
    const [error, setError] = useState(null);
    const [videoId, setVideoId] = useState(null);
    const [onSuccess, setOnSuccess] = useState(false);
    const toggle = () => setModal(!modal);


    // Function fetching videos given query and pageToken
    const fetchVideos = async (pageToken, query) => {
        const maxResults = 16;
        try {
            // Fetch data
            const response = await fetch(`${apiUrl}/api/youtube/search?limit=${maxResults}&pageToken=${pageToken}&q=${query}`);
            const data = await response.json();
            
            // Handle any errors
            if (!response.ok) {
                throw new Error(data.message);
            }

            
            return {
                // Return data with necessary information
                videos: data.items.map(item => ({
                    id: item.id.videoId,
                    title: item.snippet.title,
                    thumbnail: item.snippet.thumbnails.medium.url,
                })),
                // Set page tokens
                nextPageToken: data.nextPageToken || '',
                prevPageToken: data.prevPageToken || '',
            };
        } catch (error) {
            setError(error);
            return { videos: [], nextPageToken: '', prevPageToken: '' };
        }
    };

    // Function for saving youtube video given id
    const saveYoutubeVideo = (videoId) => {
        setLoadingVideoId(videoId);
        fetch(`${apiUrl}/api/youtube/savev2`, {
            method: 'POST',
            headers: {
                "Content-Type": "application/json",
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ videoId: videoId, playlist_id : selectedPlaylist})
            })
            .then(res => {
                if (!res.ok) {
                  return res.json().then(error => {
                    throw new Error(error.message); 
                }); 
                }
                return res.json(); 
              })
            .then(_ => setOnSuccess(true))
            .catch(err => setError(err))
            .finally(() => setLoadingVideoId(null));
    }


    // Change query
    const handleSearch = (query) => {
        setSearchQuery(query);
        // Reset tokens
        setNextPageToken(''); 
        setPrevPageToken(''); 
        // Load videos
        loadVideos('', query);
    };

    // Function for loading videos
    const loadVideos = async (pageToken, query) => {
        setLoading(true);
        const { videos, nextPageToken, prevPageToken } = await fetchVideos(pageToken, query);
        setVideos(videos);
        setNextPageToken(nextPageToken);
        setPrevPageToken(prevPageToken);
        setLoading(false);
    };


    // Load videos based on pageToken
    const handlePageChange = (pageToken) => {
        loadVideos(pageToken, searchQuery);
    };

    // Get playlists from the user
    useEffect(()=>{
        setLoading(true);
        fetch(`${apiUrl}/api/playlists/${localStorage.getItem('username')}`)
        .then(res => {
            console.log(res);
          if (!res.ok) {
            console.log("erorr");
            return res.json().then(error => {
              throw new Error(error.message); 
          }); 
          }
          return res.json(); 
        })
        .then(data => 
          setUserPlaylists(data))
        .catch(error => setError(error))
        .finally(setLoading(false));
    }, [])


    // If search query is not null load videos 
    useEffect(() => {
        if(searchQuery) {
            loadVideos('', searchQuery);
        }
    }, [searchQuery]);


    if(loading){
        return(
            <p>Loading...</p>
        )
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
            {error.message}
            </Alert>
        );
    }
    return (
        <>
          <Alert
            className="mb-2"
            isOpen={onSuccess}
            toggle={() => setOnSuccess(false)}
            >
            Sucessfully saved video to your repository
            </Alert>
         <div>
            <VideoSearchBar onSearch={handleSearch} />
                {loading && <p>Loading...</p>}
                {videos.length === 0 ? (
                <div style={{textAlign : 'center'}}>
                    <p>No results</p>
                </div>
                ) : (
                <div className="search-container">{
                    videos.map(video => (
                    <div className="video-card" key={video.id}>
                        <a href={`https://www.youtube.com/watch?v=${video.id}`}>
                        <img src={video.thumbnail} alt={video.title} />
                        <p className="youtube-video-title">{video.title}</p>
                        </a>
                        {loggedState && 
                         <div className="button-container">

                         {loadingVideoId === video.id  ? (
                             <Button outline size="sm" disabled aria-label="Loading...">
                             <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                             Saving...
                             </Button>
                         ) : (
                             <Button 
                             outline 
                             onClick={()=>{toggle(); setVideoId(video.id)}} 
                             size="sm" 
                             aria-label="Loading"
                             disabled 
                             >
                             Save
                             </Button>
                         )}
                     </div>
                        }
                        
                    </div>
                    ))}
                </div>
                )}
                <Modal isOpen={modal} toggle={toggle} centered>
                    <ModalHeader toggle={toggle}>Select Playlist to save to</ModalHeader>
                    <ModalBody>
                    <Input
                    type="select"
                    placeholder="Name"
                    bsSize="sm"
                    value={selectedPlaylist}
                    onChange={(e)=>setSelectedPlaylist(e.target.value)}
                    required
                    >
                    <option key='' value='' disabled>
                        Select Playlist
                    </option>
                    {
                        userPlaylists.map(e => <option value={e.id} key={e.id}>{e.name}</option>)
                    }

                </Input>
                </ModalBody>
                <ModalFooter>
                <Button color="primary" outline onClick={()=> {toggle(); saveYoutubeVideo(videoId, selectedPlaylist)}}>
                Save
                </Button>
                </ModalFooter>
            </Modal>

            <Pagination>
            {prevPageToken && (
            <PaginationItem>
            <PaginationLink previous onClick={() => handlePageChange(prevPageToken)}>
            Previous
            </PaginationLink>
            </PaginationItem>
            )}
            {nextPageToken && (
            <PaginationItem>
            <PaginationLink next onClick={() => handlePageChange(nextPageToken)}>
            Next
            </PaginationLink>
            </PaginationItem>
            )}
            </Pagination>
        </div>
        </>
    );
}
