import { useState, useEffect } from 'react';
import { API_URL } from '../config'; 
import { Alert, Button } from 'reactstrap';
import InfiniteScroll from 'react-infinite-scroll-component';
import VideoItem from '../components/videoItem';
import '../css/editUsers.css'
const apiUrl = API_URL;
// Component for displaying UI related to editing/deleting and viewing user through Admin role
export default function EditUsers({}){  
    const isAdmin = sessionStorage.getItem('isAdmin');
    // Check if user is Admin and display message
    if(!isAdmin){
        return(
            <p>
                Unauthorised, this page requires admin access.
            </p>
        );
    }
    return (
      <div >
        <UserList/>
      </div>
    );
}

// Component for displaying a list of video given username
function VideoList(username){
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    // Fetch videos given username and page
    const fetchVideos = async(page) => {
      try {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await fetch(`${apiUrl}/api/videos/uservideos/${username.username}?page=${page}`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json",
            'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
          }
        });

      // Jsonify response
      const res = await response.json();
      // Store empty list if result is null
      const result = res.result  || [];
      // Configure hasMore boolean value
      let hasMore = page !== res.totalPages;
      if(result.length === 0){
        hasMore = false;
      }
      return { result : result, hasMore};
    } catch (error) {
      setError(error);
      return { result: [], hasMore: false };
    } 
  };

  // Initial load of videos 
  useEffect(() => {
    // Function for intially loading videos
    const loadVideos = async (page) => {
      const { result, hasMore } = await fetchVideos(page);
      setData(result);
      setHasMore(hasMore);
    };
    const initialPage = 1;
    setPage(1);
    setData([]);
    setHasMore(true);
    loadVideos(initialPage);
  }, [username]);

  // Function for loading more videos
  const loadMore = async () => {
    const nextPage = page + 1;
    const { result, hasMore } = await fetchVideos(nextPage);
    setPage(prev => prev + 1);
    setHasMore(hasMore);
    setData((prevPosts) => [...prevPosts, ...result]);
  };

  // Handler for deleting video given video id and filename
  const handleDeleteVideo = async (videoId, filename) => {
    try {
        const response = await fetch(`${apiUrl}/api/videos/delete/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
            },
            body: JSON.stringify({ filename : filename })
        });
        // Throw error if response is not ok
        if (!response.ok) {
            const res = await response.json();
            throw new Error(res.message);
        }

        // Filter out deleted video
        setData((prevData) => prevData.filter(video => video.id !== videoId));
    } catch (error) {
        setError(error);
    }
    }

  // Empty function needed for prop for child components
  const handleVideoClick = () => {

  }


  return(
    <div>
      <Alert
          color="danger"
          className="mb-2"
          isOpen={error !== null}
          toggle={() => setError(null)}
      >
          {error}
      </Alert>
        <InfiniteScroll
            dataLength={data.length}
            next={loadMore}
            hasMore={hasMore} 
            loader={<h4>Loading...</h4>} 
            endMessage={
              <p>
                  <b>You have viewed all the videos by {username.username}</b>
              </p>
            }
          >
            {data.map(video => (
              <div>
                <VideoItem video={video} handleVideoClick={handleVideoClick}/>
                <Button onClick={()=>handleDeleteVideo(video.id, video.filename)}>Delete Video</Button>
              </div>
            ))}
        </InfiniteScroll>
    </div>
  );
}

// Component for displaying a list of videos
function UserList() {
  const [hasMore, setHasMore] = useState(true); 
  const [paginationToken, setPaginationToken] = useState(null); 
  const [users, setUsers] = useState([]); 
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  // Function for fetching users from AWS Cognito
  const fetchUsers = async (paginationToken = null) => {
      try {
          let url = `${apiUrl}/api/user/users`; 
          if (paginationToken) {
              url += `?paginationToken=${paginationToken}`; 
          }
          // Fetch users with paginationToken
          const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
              }
            });
          
          const res = await response.json();

          if (!response.ok) {
              throw new Error(res.message); 
          }
          const hasMore = res.nextPaginationToken != null;
          return {
              result: res.users, 
              nextPaginationToken: res.nextPaginationToken, 
              hasMore: hasMore
          };
      } catch (error) {
          setError(error); 
          return { result: [], nextPaginationToken: null, hasMore: false }; 
      }
  };

  // Function for loading more users in infinite scroll
  const loadMore = async () => {
      // Fetch users with the current PaginationToken
      const { result, nextPaginationToken, hasMore } = await fetchUsers(paginationToken);
      setPaginationToken(nextPaginationToken);
      setHasMore(hasMore); 
      setUsers((prevUsers) => [...prevUsers, ...result]); 
  };

  // Initial load for users
  useEffect(() => {
      const loadInitialUsers = async () => {
        const { result, nextPaginationToken, hasMore } = await fetchUsers();
        setUsers(result);
        setPaginationToken(nextPaginationToken); 
        setHasMore(hasMore); 
      };
      loadInitialUsers();
  }, []);


  // Handler for deleting a user
  const handleDeleteUser = async () => {
    // Make request to the delete endpoint
      try {
        const response = await fetch(`${apiUrl}/api/user/${selectedUser.Username}`, {
          method: "DELETE", 
          headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
          },
          })
          
          if(!response.ok){
              const responseJson = await response.json();
              throw new Error(responseJson.message);
          }
          // Filter out deleted user from the list
        setUsers(users.filter(user => user.Username !== selectedUser.Username));
      } catch (error) {
        setError(error);
      }
    };
    // Handler for click
    const handleClick = async (user) =>{
        setSelectedUser(user);
    }

    // Error handling
    if(error){
      return (
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

    // Rendering the user list with infinite scroll
    return (
    <div className='user-list'>
      <div style={{width : '40%'}}>
      <InfiniteScroll
      dataLength={users.length} 
      next={loadMore} 
      hasMore={hasMore} 
      loader={<h4>Loading...</h4>}
      endMessage={
          <p>
              <b>You have viewed all users</b>
          </p>
      }
      >
      {users.map(user => (
          <UserItem user={user} handleClick={handleClick} key={user.Username} />
      ))}
    </InfiniteScroll>
        </div>
        <div style={{width : '60%'}}>
            {selectedUser && 
            <div className='user'>
                <p>Username: {selectedUser.Username}</p>
                <p>Email: {selectedUser.Attributes[0].Value}</p>
                <p>User Created Date: {selectedUser.UserCreateDate}</p>
                <p>User Last Modified: {selectedUser.UserLastModifiedDate}</p>
                <p>User Status: {selectedUser.UserStatus}</p>
                <Button onClick={handleDeleteUser}>
                    Delete User
                </Button>
                <VideoList username={selectedUser.Username}/>
            </div>
            }
        </div>
    </div>
  );
}

// Component for displaying user information
function UserItem({ user, handleClick }){
  return (
    <div className="user-item" onClick={() => handleClick(user)}>
        <strong><p>Username: {user.Username}</p></strong>
        <p>Email: {user.Attributes[0].Value}</p>
        <p>User Created Date: {user.UserCreateDate}</p>
        <p>User Last Modified: {user.UserLastModifiedDate}</p>
        <p>User Status: {user.UserStatus}</p>
    </div>
  );
};

