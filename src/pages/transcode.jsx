import { Card } from "@radix-ui/themes";
import { useEffect, useState } from "react";
import { Input, Label, Col, FormGroup, Button, Form, Row, Progress, Alert} from 'reactstrap';
import InfiniteScroll from "react-infinite-scroll-component";
import CenteredTextCard from "../components/centeredCard";
import { API_URL } from '../config';
import io from 'socket.io-client';
import createThumbnailPath from "../helper/createThumbnailPath";
import '../css/edit.css'
const apiUrl = API_URL;

// Component for displaying video information and thumbnail
function VideoThumbnail({id, title, filename, handleClick, thumbnail, source, url}){
  const thumbnailPath = createThumbnailPath(thumbnail, source);
  return(
    <div className="thumbnail" key={id} onClick={()=>handleClick(filename, thumbnailPath)}>  
      <video 
        key={id} 
        controls 
        src={url} 
        poster={thumbnailPath || undefined} 
        >
      </video>
      <div>
        <strong style={{textAlign : 'right'}}>{title}</strong>
      </div>
    </div>
  );
}  

// Component for displaying information for a video
function InfoBox({metadata}){
  // Youtube videos do not have metadata for size sake
  if(!metadata){
    return(
      <></>
    );
  }

  // Calculate number of megabytes given bytes
  function bytesToMegabytes(bytes) {
    const MB = 1024 * 1024; // 1 MB = 1024 * 1024 bytes
    return (bytes / MB).toFixed(2); // Convert to MB and round to 2 decimal places
  }

  // Get necessary metadata
  const format = metadata.format.format_name;
  const size = bytesToMegabytes(metadata.format.size);
  const duration = Math.round(metadata.streams[0].duration);
  const height = metadata.streams[0].height;
  const width = metadata.streams[0].width;

  return(
    <div className="infoBox">
      <div className="infoLeft">
      <p><strong>Size:</strong> {size}MB</p>
      <p><strong>Format:</strong> {format}</p>
      </div>
      <div className="infoRight">
        <p><strong>Duration:</strong> {duration}s</p>
        <p><strong>Resolution:</strong> {height}x{width}</p>
      </div>
    </div>
  );
}

// Preset options for video transconding, may be implemented in the backend later
const resolutions = [
  "426x240",
  "640x360",
  "854x480",
  "1280x720",
  "1920x1080",
  "2560x1440",
  "3840x2160",
  "7680x4320"
];
const formats = ['MP4', 'AVI', 'WebM', 'MKV', 'WMV', 'MOV', 'FLV'];
const models = ['Small', 'Base', 'Medium', 'Large']
const codecs = ['libx264', 'libx265', 'libvpx', 'libvpx-vp9', 'libaom-av1', 'mpeg2video'];

function VideoList({setSelectedVideo, handleReset, data, setData}){
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [playlists, setPlaylists] = useState([]);
  const [playlist_id, setPlaylist_id] = useState('');
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('');
  const limit = 3;
  // Fetch user playlists
  useEffect(()=>{
    fetch(`${apiUrl}/api/playlists/${sessionStorage.getItem('username')}`)
    .then(res => {
      if (!res.ok) {
        return res.json().then(error => {
          throw new Error(error); 
      }); 
      }
      return res.json(); 
    })
    .then(data => 
      setPlaylists(data))
    .catch(error => {setError(error);});
  }, [])


  // Fetch videos given source, page number and playlist id
  const fetchVideos = async(page, playlist_id, sortBy) => {
  
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const response = await fetch(`${apiUrl}/api/videos/uservideos?page=${page}&playlist=${playlist_id}&limit=${limit}&sortBy=${sortBy}`, {
        method: 'GET',
        headers: {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json(); // Parse the error response
        throw new Error(errorData.message || 'Failed to fetch videos');
      }
      const res = await response.json();
      const result = res.result  || [];
      let hasMore = page !== res.totalPages;

      if(result.length === 0){
        hasMore = false;
      }
      return { result : result, hasMore};
    } catch (error) {
      setError(new Error("Failed to fetch videos."));
      return { result: [], hasMore: false };
    } 
  };


  // Initial load of videos which is triggered again when source or playlist id changes
  useEffect(() => {
    const loadVideos = async (page) => {
      const { result, hasMore } = await fetchVideos(page, playlist_id, sortBy);
      setData(result);
      setHasMore(hasMore);
    };
    const initialPage = 1;
    setPage(1);
    setData([]);
    setHasMore(true);
    loadVideos(initialPage);
  }, [playlist_id, sortBy]);

  // Function for loading more videos
  const loadMore = async () => {
    const nextPage = page + 1;
    const { result, hasMore } = await fetchVideos(nextPage, playlist_id, sortBy);
    setPage(prev => prev + 1);
    setHasMore(hasMore);
    setData((prevPosts) => [...prevPosts, ...result]);
  };

  // Click handler
  const handleClick = (filename) => {
    const selected = data.find(item => item.filename === filename);
    if (selected) {
      handleReset();
      setSelectedVideo(selected);
      
    }
  }

  return(
    <>

    <div className="videoList">
      {error &&
      <Alert
      color="danger"
      className="mb-2"
      isOpen={error !== null}
      toggle={() => setError(null)}
      >
      {error.message}
    </Alert> 
    }  
      <h3>Videos:</h3>
        <div style={{display : 'flex', marginBottom : '10px'}}>
          <div style={{display : 'flex'}}>
            <div style={{width : '50%', marginRight : '5px'}}>
            {/* <Input
              bsSize="sm"
              id="format"
              name="format"
              type="select"
              value={selectedSource}
              onChange={handleSourceChange}
              required
              >
              <option key="" value="" disabled>
              Choose Source
              </option>
              <option key="youtube" value="youtube" >
              YouTube
              </option>
              <option key="local" value="local">
              Local
              </option>
              <option key="all" value="all">
              All
              </option>
            </Input> */}
            </div>
          {/* <div style={{width : '50%', marginLeft : '5px', marginRight : '5px'}}>
            <Input
            bsSize="sm"
            id="format"
            name="playlist"
            type="select"
            value={playlist_id}
            onChange={(e)=>setPlaylist_id(e.target.value)}
            required
            >
            <option value="" disabled>
            Choose Playlist
            </option>
            <option value={0}>
                None
            </option>
            {playlists.map(e => <option key={e.id} value={e.id}>
            {e.name}
            </option>)}
            </Input>
          </div> */}
          {/* <div style={{width : '50%', marginLeft : '5px'}}>
            <Input
            bsSize="sm"
            id="format"
            name="sorting"
            type="select"
            value={sortBy}
            onChange={(e)=>setSortBy(e.target.value)}
            required
            >
            <option key="" value="" disabled>
              Sort By
              </option>
              <option key="Upload_date" value="uploadDate" >
              Upload_date
              </option>
              <option key="Edit_date" value="editDate">
              Edit_date
              </option>
              <option key="Title" value="title">
              Title
              </option>
              <option key="Duration" value="duration">
              Duration
              </option>
            </Input>
          </div> */}
        </div>
      </div>
      {data && 
        <div className="scrollsection"  id="scrollable-container">
        <InfiniteScroll
          scrollableTarget="scrollable-container"
          dataLength={data.length} 
          next={loadMore}
          hasMore={hasMore}
          loader={<h4>Loading...</h4>}
          endMessage={
          <p>
          <b>You have seen all videos</b>
          </p>
          }
          >
          {data.map(e => <VideoThumbnail 
          filename={e.filename} 
          title={e.title} 
          id={e.id} 
          source={e.source}
          handleClick={handleClick} 
          url={e.url}
          thumbnail={e.thumbnail}/>)}
        </InfiniteScroll>
        </div>
      }
    </div>
  </>
  );
}

// Main component for displaying transcode page
export default function Edit({loggedState}) {
    const [completed, setCompleted] = useState(false);

    const [selectedVideo, setSelectedVideo] = useState(null);

    const [progress, setProgress] = useState(0);
    const [whisperProgress, setWhisperProgress] = useState(0);
    const [inProgress, setInProgres] = useState(false);
    const [formError, setFormError] = useState(null);
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
    const [sharpenEnabled, setSharpenEnabled] = useState(false);
    const [editedVideo, setEditedVideo] = useState(null);
    const [data, setData] = useState([]);
    const [error, setError] = useState(null);
    const [socket, setSocket] = useState(null); // State to store socket instance
    // State variable for handling transcoding options
    const [formData, setFormData] = useState({
      format : '',
      resolution : '',
      codec : '',
      model : '',
      translation: '',
      lumaAmount : 1.5,
      lumaSizeX : 5,
      lumaSizeY : 5
    })


  console.log(data);
  // Socket event listeners should be inside a useEffect
  useEffect(() => {
    if (socket) {
      const handleConnectError = (error) => {
        setError(new Error('Error connecting to the server. Please try again later.'));
        setInProgres(false);
      };
  
      const handleConnectTimeout = () => {
        setError(new Error('Connection timed out. Please try again.'));
        setInProgres(false);
      };
      const handleDisconnect = () => {
        setError(new Error('Disconnected from server. Please try again.'));
      };

      socket.on('connect_error', handleConnectError);
      socket.on('connect_timeout', handleConnectTimeout);
      socket.on('disconnect', handleDisconnect);
            // Listen to socket events for progress updates
      const handleProgress = (update) => {
        console.log(update);
        if(update.status === "Pending"){
          setProgress(update.percent);
        }else if(update.status == "Finished"){
          const newVideo = {
            presignedUrl : update.presignedUrl,
            outputKey : update.key
          }
          setEditedVideo(newVideo);
          setInProgres(false);
        }
      };

      const handleWhisperProgress = (percent) => {
        setWhisperProgress(percent);
      };

      
      // Attach event listeners
      socket.on('progress', handleProgress);
      socket.on('whisperProgress', handleWhisperProgress);
      

      // Clean up socket listeners on unmount or when socket changes
      return () => {
        socket.off('connect_error', handleConnectError);
        socket.off('connect_timeout', handleConnectTimeout);
        socket.off('disconnect', handleDisconnect);
        socket.off('progress', handleProgress);
        socket.off('whisperProgress', handleWhisperProgress);
        socket.disconnect();  // Ensure socket is disconnected when the component unmounts or when processing ends
      };
    }
  }, [socket]); // Runs when socket changes

  

  // Funciton handling reset, resets all necssary variables to default state
  const handleReset = () => {
    setEditedVideo(null);
    setSelectedVideo(null);
    setFormData({
      format : '',
      resolution : '',
      codec : '',
      model : '',
      translation: '',
      lumaAmount : 1.5,
      lumaSizeX : 5,
      lumaSizeY : 5
    })
    setWhisperProgress(0);
    setProgress(0);
    setSubtitlesEnabled(false);
    setSharpenEnabled(false);
  }

  // Function for handling form data
  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData({...formData, [name]: value,});
  };


  // Function for handling deleting video
  const handleDelete = (e) => {
    e.preventDefault();
    if(!inProgress && selectedVideo){
      // Delete video
        fetch(`${apiUrl}/api/videos/delete/${selectedVideo.id}`, {
          method: "DELETE", 
          headers: {
              "Content-Type": "application/json",
              'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
          },
          body: JSON.stringify({filename : selectedVideo.filename}),
          })
          .then(response => {
            if(!response.ok){
              return response.json().then(errorData => {
                throw new Error(errorData.message); // Throw an Error with the error message from the response
              });
            }
            return response.json();
          })
          .then(res => {
            // Filter out deleted video
            const newData = data.filter(video => parseInt(video.id) !== parseInt(res.id)); 
            setData(newData);
            // Reset
            handleReset();
          })
          .catch(error => setError(error));
    }
  }

  // Function submitting informatio to the server
    // Function to submit form and start video processing
    const handleSubmit = (e) => {
      e.preventDefault();
  
      if (!inProgress && selectedVideo) {
        setInProgres(true);
  
        // Initialize socket when form is submitted
        const newSocket = io(`${apiUrl}/progress`, {
          reconnection: true,
          reconnectionAttempts: Infinity,
          reconnectionDelay: 1000
        });

        setSocket(newSocket); // Store socket instance in state
  
        newSocket.on('connect', () => {
          fetch(`${apiUrl}/api/videos/process`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${sessionStorage.getItem('idToken')}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              options: formData,
              videoName: selectedVideo.filename,
              socketId: newSocket.id, // Use the connected socket ID here
              sharpenEnabled: sharpenEnabled
            })
          })
            .then((response) => {
              if (!response.ok) {
                return response.json().then((error) => {
                  throw new Error(error.message);
                });
              }
              return response.json();
            })
            .then((response) => {
              // setEditedVideo(response);
            })
            .catch((error) => {
              setFormError(error);
            })
            .finally(() => {
              // setInProgres(false);
            });
        });
      } else {
        setFormError(new Error('Please select a video first.'));
      }
    };

  // Deny access if user is not logged in
  if(!loggedState){
    return(
      <Alert
      color="danger"
      className="mb-2"
      >
      Unauthorised please login.
    </Alert>
    );
  }

  return(
    <>
    {error && <Alert
          color="danger"
          className="mb-2"
          isOpen={error !== null}
          toggle={() => setError(null)}
          >
          {error.message}
    </Alert>}
    <Alert
    className="mb-2"
    isOpen={completed}
    toggle={() => setCompleted(prev => !prev)}
    >
    Sucessfully made changes to video.
    </Alert>
    <div className="edit">
      <VideoList setSelectedVideo={setSelectedVideo} handleReset={handleReset} data={data} setData={setData}/>
        <div className="options">
          {/* Handle error occuring from form data */}
          {formError &&
          <Alert
          color="danger"
          className="mb-2"
          isOpen={formError !== null || selectedVideo === null}
          toggle={() => setFormError(null)}
          >
          {formError.message}
          </Alert>}
          <Card>
          <h3>Edit:</h3>
          {selectedVideo !== null ? 
          <div style={{padding : '5px'}}>
          <video controls src={selectedVideo.url} poster={selectedVideo.thumbnail}>
          </video> 
              <InfoBox metadata={selectedVideo.metadata}/>
        </div>
        : 
        <CenteredTextCard fontSize={18} height={250} message="Select a video to edit"/>}

        <div> 
        <Form onSubmit={handleSubmit}>
        <Row>
        <Col md={4} className="pr-1">
        <FormGroup>
        <Input
        bsSize="sm"
        id="format"
        name="format"
        type="select"
        value={formData.format}
        onChange={handleChange}
        required
        >
        <option value="" disabled>
        Choose Video Format
        </option>
        {formats.map(e => <option value={e}>
        {e}
        </option>)}
        </Input>
        </FormGroup >
        </Col>
        <Col md={4} className="px-1">
        <FormGroup >
        <Input
        bsSize="sm"
        id="resolution"
        name="resolution"
        type="select"
        value={formData.resolution}
        onChange={handleChange}
        >
        <option key="" value="" disabled>
        Change Resolution
        </option>
        {resolutions.map(e => <option key={e} value={e}>
        {e}
        </option>)}
        </Input>
        </FormGroup>
        </Col>
        <Col md={4} className="pl-1">
        <FormGroup>
          <Input
        bsSize="sm"
        id="codec"
        name="codec"
        type="select"
        value={formData.codec}
        onChange={handleChange}
        >
        <option key="" value="" disabled>
        Change Codec
        </option>
        {codecs.map(e => <option  key={e} value={e}>
        {e}
        </option>)}
        </Input>
        </FormGroup>
        </Col>
        </Row>
        <Row>
        <Col md={4} className="pl-1">
        <FormGroup>
        {/* <label style={{fontSize : '14px'}}>
        <input
          type="checkbox"
          id="sharpenEnabled"
          checked={subtitlesEnabled}
          onChange={(e) => setSubtitlesEnabled(e.target.checked)}
          style={{marginRight : '5px', marginLeft : '2px'}}
        />
        Enable Subtitles
        </label> */}
        </FormGroup>
        </Col>
        {/* {subtitlesEnabled && <>
        <Col md={4} className="px-1">
        <FormGroup >
        <Input
        bsSize="sm"
        id="model"
        name="model"
        type="select"
        value={formData.model}
        onChange={handleChange}
        >
        <option key="" value="" disabled>
        Select Model
        </option>
        {models.map(e => <option key={e} value={e}>
        {e}
        </option>)}
        </Input>
        </FormGroup>
        </Col>
        <Col md={4} className="pl-1">
        <FormGroup>
                <Input
        bsSize="sm"
        id="translation"
        name="translation"
        type="select"
        value={formData.translation}
        onChange={handleChange}
        >
        <option key='' value='' disabled>
        Translation
        </option>
        <option key='English' value='English'>
        English
        </option>
        <option key='None' value='None'>
        None
        </option>
        </Input>
        </FormGroup>
        </Col>
        </>} */}
        </Row>
        <Row>
        <Col md={4} className="pl-1">
        <FormGroup>
        <label style={{fontSize : '14px'}}>
        <input
          type="checkbox"
          id="sharpenEnabled"
          checked={sharpenEnabled}
          onChange={(e) => setSharpenEnabled(e.target.checked)}
          style={{marginRight : '5px', marginLeft : '2px'}}
        />
        Enable Sharpening
        </label>
        </FormGroup>
        </Col>
        </Row>
        {sharpenEnabled && <>

        <Row>
        <Col md={4} className="pl-1">
        <FormGroup>
        <Label for="lumaAmount" size="sm">Luma Amount</Label>
        <Input
        type="number"
        id="lumaAmount"
        name="lumaAmount"
        bsSize="sm"
        value={formData.lumaAmount}
        step="0.1"
        onChange={handleChange}
        />
        </FormGroup>
        </Col>
        <Col md={4} className="px-1">
        <FormGroup>
        <Label for="lumaSizeX" size="sm">Luma Matrix Size X</Label>
        <Input
        type="number"
        id="lumaSizeX"
        name="lumaSizeX"
        bsSize="sm"
        value={formData.lumaSizeX}
        onChange={handleChange}
        />
        </FormGroup>
        </Col>
        <Col md={4} className="pr-1">
        <FormGroup>
        <Label for="lumaSizeY" size="sm">Luma Matrix Size Y</Label>
        <Input
        type="number"
        id="lumaSizeY"
        bsSize="sm"
        name="lumaSizeY"
        value={formData.lumaSizeY}
        onChange={handleChange}
        />
        </FormGroup>
        </Col>
        </Row>    
        </>
        }
        <Button type="submit" >Submit</Button>
        {' '}
        <Button color="danger" outline type="button" onClick={handleDelete}>Delete</Button>
        </Form>
        </div>

        </Card>
        </div>
      <div className="result">
        <Card>
          <h3>Result:</h3>
          {subtitlesEnabled && <> <Label>Transcription Progress</Label>
            <Progress value={whisperProgress} style={{marginBottom : '5px'}}/>
            </>}
      
          <Label>Video Progress</Label>
          <Progress value={progress} style={{marginBottom : '5px'}}/>
          {editedVideo ? 

          <Results editedVideo={editedVideo} selectedVideo={selectedVideo} handleReset={handleReset} inProgress={inProgress} setCompleted={setCompleted}/>
          :
          <CenteredTextCard fontSize={15} height={200} message="Result preview will appear here"/>
          }
        </Card>
      </div>
    </div>
    </>
    );
}


// Component for displaying results of the edited video
function Results({editedVideo, selectedVideo, handleReset, inProgress, setCompleted}){
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [playlists, setPlaylists] = useState([]);
  const [playlist, setPlaylist] = useState('');
  const [error, setError] = useState(null);


  // Set the description and title of the edited video
  useEffect(() => {
    setDescription(selectedVideo.description);
    setTitle(selectedVideo.title);
  }, []);


  // Get playlists
  useEffect(()=>{
    fetch(`${apiUrl}/api/playlists/${sessionStorage.getItem('username')}`)
    .then(res => {
      if (!res.ok) {
        return res.json().then(error => {
          throw new Error(error); 
      }); 
      }
      return res.json(); 
    })
    .then(data => {
      console.log(data)
      setPlaylists(data)
    })
    .catch(error => {setError(error);});
  }, [])


  // Function for handling saving edited video
  function handleSave(e){
    e.preventDefault();
    if(!inProgress && !error){


    // Update video
    fetch(`${apiUrl}/api/videos/update/${selectedVideo.id}`, {
      method: 'PUT',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`
      },
      body: JSON.stringify({ previousVideo : selectedVideo.filename, newVideo : editedVideo.filename, title : title, description : description, playlist : playlist})
      })
      .then(response => {
          if (!response.ok) {
              return response.json().then(errorData => {
                  throw new Error(errorData);
              });
          }
          return response.json();
      })
      .then(_ => {
        setCompleted(true);
        handleReset();
      })
      .catch(error => {
        setError(error)
      }).finally();
    }
  }

  // Function for handling download edited video
  function handleDownload(e){
    e.preventDefault();
    if(!inProgress && !error){
      // Fetch the video file from the server
      fetch(`${apiUrl}/api/videos/download/${editedVideo.filename}`) // Convert the response to a Blob (binary large object)
      .then(res => res.blob())
      .then(blob => {

        // Create url
        const url = window.URL.createObjectURL(blob);
         // Create a temporary anchor element
        const a = document.createElement('a');
        a.href = url; // Set the href attribute to the Blob URL
        a.download = editedVideo.filename; 
        // Append the anchor element to the document body
        document.body.appendChild(a);
        // Trigger a click event on the anchor element to start the download
        a.click();
        // Remove achor element
        document.body.removeChild(a);
        // Revoke url
        window.URL.revokeObjectURL(url);
      })
      .catch(err => setError(err));
    }
  }

  // Error handling
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

  console.log(editedVideo.presignedUrl);
  return(      
    <div>
      <div style={{ marginBottom : '10px'}}>
        <video controls src={editedVideo.presignedUrl}>
        </video>
      </div>
        <Form onSubmit={handleSave}>
          <Row>
          <Col md={6} className="pl-1">
          <FormGroup>
          <Label for="playlist" size="sm">Change Playlist</Label>
          <Input
          id="playlist"
          name="playlist"
          type="select"
          value={playlist}
          bsSize="sm"
          className="form-control-sm"
          onChange={(e)=> setPlaylist(e.target.value)}
          >
          <option key='' value='' disabled>
          Change playlist
          </option>
          {
          playlists.map(e => <option key={e.id} value={e.id}>{e.name}</option>)
          }
          </Input>
          </FormGroup>
          </Col>
          <Col md={6} className="pr-1">
          <FormGroup>
          <Label for="title" size="sm">Edit Title</Label>
          <Input
          name="title"
          type="text"
          bsSize="sm"
          value={title}
          onChange={(e)=> setTitle(e.target.value)}
          />
          </FormGroup>
          </Col>
          <Col>
          <FormGroup>
          <Label for="description" size="sm">Edit Description</Label>
          <Input
          name="description"
          bsSize="sm"
          value={description}
          onChange={(e)=> setDescription(e.target.value)}
          type='textarea'
          />
          </FormGroup>
          </Col>
          </Row>
          <Button outline type="submit" size='sm'>
          Save Changes
          </Button> 
          {' '}
          <Button outline size='sm' onClick={(e)=>handleDownload(e)}>
          Download
          </Button>
        </Form>
    </div>
  );
}
