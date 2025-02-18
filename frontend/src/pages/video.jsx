import  {useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaUser } from "react-icons/fa";
import { Input, Button, Form, Alert} from 'reactstrap';
import { FiThumbsUp } from "react-icons/fi";
import VideoItem from '../components/videoItem';
import InfiniteScroll from "react-infinite-scroll-component";
import * as Avatar from '@radix-ui/react-avatar';
import '../css/videoPage.css'
import { API_URL } from '../config';
const apiUrl = API_URL;
// Page for displaying info about individual video as well as features like commenting and liking
function VideoPage({loggedState}) {
    const [noOfLikes, setNoOfLikes] = useState(0);
    const [video, setVideo] = useState(null)
    const [error, setError] = useState(null);
    // Extract video id from url parameter
    const { id } = useParams();
    const url = `${apiUrl}/api/videos/video/${id}`;


    // Handler for toggling like button
    const toggleLikeButton = () =>{
        fetch(`${apiUrl}/api/likes/like/${id}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
            }
          })
            .then(response => {
              if (!response.ok) {
                // If the response is not OK, parse the error data
                return response.json().then(errorData => {
                  // Throw an Error with the error message from the response
                  throw new Error(errorData.message || 'An error occurred');
                });
              }
              // Return the response as JSON if it's OK
              return response.json();
            })
            .then(res => {
            // Decrement or increment like count
                if(res.liked){
                    setNoOfLikes(prev => prev + 1);
                } else{
                    setNoOfLikes(prev => prev - 1)
                }
            })
            .catch(error => {
              // Handle any errors that occurred during the fetch
              setError(error);
            });
    }

    // Fetches video information as well as current number of likes
    useEffect(() => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                    throw new Error(errorData.message); 
                    });
                }
                return response.json();
            })
            .then(response1 => {
                setVideo(response1);
                return fetch(`${apiUrl}/api/likes/${id}`);
            })
            .then(response2 =>{
                if (!response2.ok) {
                    return response2.json().then(errorData => {
                    throw new Error(errorData.message); 
                    });
                }
                return response2.json();
            })
            .then(res => {
                setNoOfLikes(res.count);
            })
            .catch(error => {
                setError(error);
            })
    }, [url]);

    // Handle any errors
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

    console.log("Video:", video);
    return (
    <div className='videoPage'>
        <div className='videoSection'>
        { 
        video != null && 
        <>
            <video key={video.id} controls src={video.url} poster={video.thumbnail || undefined}/>
                <div className='informationSection'>
                <div className='username-like'>
                    <div className="username-section">
                        <Avatar.Root className="AvatarRoot">
                        <Avatar.Fallback className="AvatarFallback" delayMs={600} color='black'>
                        <FaUser style={{ color: 'black', fontSize: '22px' }} />
                        </Avatar.Fallback>
                        </Avatar.Root>
                        <span className="username">{video.username}</span>
                    </div>
                    <div className="like-section">
                        <button outline onClick={toggleLikeButton}>
                        <FiThumbsUp />
                        </button>
                        <label htmlFor='heart'>{noOfLikes}</label>
                    </div>
                </div>
                <div className='video-info-container'>
                    <h2 className='video-title'>{video.title}</h2>
                    <p className='video-description'>{video.description}</p>
                </div>
            </div>
            <CommentSection id={id} loggedState={loggedState}/>
        </>
        }
        </div>
        <div className='videoListSection'>
            <VideoList videoId={id} />
        </div>
    </div>
  );
};


// Component for displaying comment section for a video
function CommentSection({id, loggedState}){
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [comments, setComments] = useState([]);
    const [comment, setComment] = useState('');
    const [error, setError] = useState(null);


    // Handler for posting a comment to the server
    const handleCommentSubmit = (e) => {
        e.preventDefault();
        
        // Post comment
        fetch(`${apiUrl}/api/comments/comment/${id}`, {
            method: "POST", 
            headers: {
              "Content-Type": "application/json",
                'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
            },
            body: JSON.stringify({ comment : comment }),
            })
          .then(response => {
            if (!response.ok) {
                return response.json().then(errorData => {
                throw new Error(errorData.message); // Throw an Error with the error message from the response
                });
            }
            return response.json();
          })
          // Add the new comment to the existing comments
          .then(res => setComments([...comments, res.comment]))
          .catch(error => setError(error))
          .finally(()=> setComment(''))
      };


    
    // Function for fetching comments based on page
    const fetchComments = async (page) => {
        // Delay 1s to allow for better user responsiveness
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await fetch(`${apiUrl}/api/comments/comments/${id}?page=${page}&limit=10`);


        const res = await response.json();

        // Throw any error sent from the server
        if (!response.ok) {
            throw new Error(res.message); 
        }

        const result = res.result;

        let hasMore = page !== res.totalPages;
        if(result.length === 0){
          hasMore = false;
        }
        return { result : result, hasMore : hasMore};
    }  

    

    // Function for loading more comments which is used for the infinite scroll component
    const loadMore = async () => {
        // Increment page number
        const nextPage = page + 1;
        const { result, hasMore } = await fetchComments(nextPage);
        // Set necessary state variables
        setPage(prev => prev + 1);
        setHasMore(hasMore);
        setComments((prevPosts) => [...prevPosts, ...result]);
    };


    // Initial load for comments 
    useEffect(()=>{
        const loadComments = async (page) => {
            const { result, hasMore } = await fetchComments(page);
            setComments(result);
            setHasMore(hasMore);
          };
          const initialPage = 1;
          loadComments(initialPage);
    }, [])


    // Handler for deleting comment given id number
    const handleDelete = async (id) => {
        fetch(`${apiUrl}/api/comments/comment/${id}`, {
            method: "DELETE", 
            headers: {
              "Content-Type": "application/json",
                'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
            }
        })
        .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
            throw new Error(errorData.message); // Throw an Error with the error message from the response
            });
        }
        return response.json();
        })
        .then(res => {
            // Filter out the deleted comment
            const newComments = comments.filter(comment => parseInt(comment.id) !== parseInt(res.id));
            setComments(newComments)
        })
        .catch(error => setError(error))
        .finally(()=> setComment(''))
    }


    // Handle any erors
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

    return(
        <div className='commentSection'>
            <div className='comment-form-container'>
            {/* Disable commenting if user is not logged in */}
            {loggedState ?
                <Form onSubmit={handleCommentSubmit}>
                    <Input 
                    value={comment}
                    onChange={(e) => setComment(e.target.value)} 
                    placeholder="Add a comment"
                    type='textarea'
                    />
                    <Button type="submit" outline>Post Comment</Button>
                </Form>
                : 
                <Form>
                    <Input 
                    placeholder="Please login to comment"
                    type='textarea'
                    disabled
                    />
                    <Button type="submit" outline disabled>Post Comment</Button>
                </Form>
            }
            </div>

            <div>
                <InfiniteScroll
                dataLength={comments.length} 
                next={loadMore}
                hasMore={hasMore}
                loader={<h4>Loading...</h4>}
                endMessage={
                <p>
                <b>End of comments</b>
                </p>
                }
                >
                {comments.map(e => <Comment post={e.post} username={e.username} date={e.created_at} loggedState={loggedState} handleDelete={()=>handleDelete(e.id)}/>)}
                </InfiniteScroll>
            </div>
        </div>
    );
}


// Component for displaying individual comment
function Comment({ post, username, date, handleDelete }) {

    // Calculates time the comment was posted
    const { time, type } = calculateTime(date);

    return (
        <div className='comment-container'>
            <div className='comment-header'>
                <strong className='username'>@{username}</strong>
                <p className='time'>{time} {type} ago</p>
            </div>
            <p className='comment-text'>{post}</p>
            {
            // Only display delete button if user is logged in and username matches the posters' username
            sessionStorage && 
                sessionStorage.getItem('username') === username ?  
                <button className='delete-button' onClick={handleDelete}>Delete</button> 
                :
                <></>
            }
        </div>
    );
}

// Component for displaying a list of videos
function VideoList({videoId}){
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [videos, setVideos] = useState([])
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    
    // Handle navigation when user clicks on a video
    const handleVideoClick = (id) =>{
          navigate(`/video/${id}`);
    }

    // Function for fetching videos give page number
    const fetchVideos = async (page) => {
        try{
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Exclude current video
            const response = await fetch(`${apiUrl}/api/videos/videos?page=${page}&limit=3&exclude=${videoId}`);

            const res = await response.json();
            if (!response.ok) {
                throw new Error(res.message); // Throw an Error with the error message from the response
            }
    
            const result = res.result;
            let hasMore = page !== res.totalPages;
    
            if(result.length === 0){
              hasMore = false;
            }
            return { result : result, hasMore : hasMore};
        }catch(error){
            setError(error);
        }        
    }  

    // Function for loading more videos used for the infinite scroll component below
    const loadMore = async () => {
        const nextPage = page + 1;
        const { result, hasMore } = await fetchVideos(nextPage);
        setPage(prev => prev + 1);
        setHasMore(hasMore);
        setVideos((prevPosts) => [...prevPosts, ...result]);
    };

    // Initial load for videos
    useEffect(()=>{
        const loadVideos = async (page) => {
            const { result, hasMore } = await fetchVideos(page);
            setVideos(result);
            setHasMore(hasMore);
          };
          const initialPage = 1;
          loadVideos(initialPage);
    }, [])

    // Handle any errors
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
        )
    }
    return(        

    <InfiniteScroll
        dataLength={videos.length} 
        next={loadMore}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
        endMessage={
        <p>
            <b>Yay! You have seen it all</b>
        </p>
        }
        >
        {
        videos.map(video=> <VideoItem video={video} handleVideoClick={handleVideoClick}/>)
        }
        </InfiniteScroll>

    );
}

// Function for calculating the when a comment was posted
function calculateTime(date)
{
    // Parse the date
    const now = new Date();
    const pastDate = new Date(date);

    // Calculate difference in mili seconds
    const difference = now - pastDate;

    // Calculate hours
    const differenceInHours = difference / (1000 * 60 * 60);

    // Determine time type
    if(differenceInHours < 1)
    {
        const minutes = difference / (1000 * 60);
        return {time : Math.round(minutes), type : "minutes"}
    }
    return {time : Math.round(differenceInHours), type : differenceInHours === 1 ? "hour" : "hours" };
}

export default VideoPage;
