import  {useCallback, useState, useEffect} from 'react';
import { useDropzone } from 'react-dropzone';
import {Card, Button } from '@radix-ui/themes';
import {Form, FormGroup, Label, Col, Input, InputGroup, Modal, ModalBody, ModalFooter, ModalHeader, Alert} from 'reactstrap';
import CenteredTextCard from '../components/centeredCard';
import { API_URL } from '../config';
import '../css/uploadPage.css'
const apiUrl = API_URL;

export default function UploadPage(){
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [newPlaylist, setNewPlaylist] = useState('');
  const [playlist, setPlaylist] = useState('');
  const [loading, setLoading] = useState(false);
  const [onComplete, setOnComplete] = useState(false);
  const toggle = (e) => {e.preventDefault(); setModal(!modal)};

  
  // Handler for file change
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();

      // Set reader as 
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);

    }
  };

  // Function for handling file dropping
  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    setVideoFile(file);
  }, []);



  // Fetches playlists for currently logged in user and sets new preview with video file changes
  useEffect(() => {
      setLoading(true);
      fetch(`${apiUrl}/api/playlists/${sessionStorage.getItem('username')}`)
      .then(res => {
        if (!res.ok) {
          return res.json().then(error => {
            throw new Error(error.message); 
        }); 
        }
        return res.json(); 
      })
      .then(data => setPlaylists(data))
      .catch(error => setError(error))
      .finally(_ => setLoading(false));
  

    if(videoFile) {
      const previewUrl = URL.createObjectURL(videoFile);
      setVideoPreview(previewUrl);
      // Cleanup the object URL when the component unmounts or when videoFile changes
      return () => URL.revokeObjectURL(previewUrl);
    }
    else {
      setVideoPreview(null);
    }
  }, [videoFile, newPlaylist]);



  // Dropzone component configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/x-msvideo': ['.avi'],
      'video/mpeg': ['.mpeg'],
      'video/quicktime': ['.mov'],
    },
    // Maxsize set to 500mb
    maxSize: 524288000
  });



  // Handler for creating a new playlist 
  const handleCreateNewPlaylist = (e) =>{
    e.preventDefault();


    fetch(`${apiUrl}/api/playlists/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: newPlaylist }),
    }) 
    .then(res => {
      if (!res.ok) {
        return res.json().then(error => {
          throw new Error(error.message); 
      }); 
      }
      return res; 
    })
    .then(_ => {})
    .catch(error => setError(error))
    .finally(()=>{
      setNewPlaylist('');
    });
  }


  // Handler for submitting files
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if(!videoFile){
      setError(new Error("Please select a video"));
      return;
    }

    const filename = videoFile.name;
    const format = videoFile.type;
    const size = videoFile.size;
    setLoading(true);
    try {
      // Request pre-signed URL
      const response = await fetch(`${apiUrl}/api/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('idToken')}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          format, 
          size, 
          filename, 
          thumbnail : thumbnail ? thumbnail.name : null, 
          thumbnailFormat : thumbnail ? thumbnail.type : null,
          description : description,
          title : title }),
      });
  
      if (!response.ok) {
        const res = await response.json();
        console.log(res);
        throw new Error(res.message);
      }
  
      const { presignedUrl, thumbnailPresignedUrl } = await response.json();

      // Upload video file
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: videoFile,
      });
  
      if (!uploadResponse.ok) {
        const uploadJson = await uploadResponse.json();
        throw new Error(uploadJson.message);
      }
  
      if(thumbnailPresignedUrl){
        const thumbnailUploadResponse = await fetch(thumbnailPresignedUrl, {
          method: 'PUT',
          body: thumbnail,
        });

        if (!thumbnailUploadResponse.ok) {
          const thumbnailJson = await thumbnailUploadResponse.json();
          throw new Error(thumbnailJson.message);
        }
      }

      // Reset form state
      setOnComplete(true);
      setThumbnailPreview(null);
      setVideoFile(null);
      setThumbnail(null);
      setTitle('');
      setDescription('');
  
    } catch (error) {
      setError(error);
    } finally {
      setLoading(false);
    }
  };

  return(
        <>
        {/* Alert for displaying sucessful uplaod message */}
          <Alert
          className="mb-2"
          isOpen={onComplete}
          toggle={() => setOnComplete(false)}
          >
          Video uploaded successfully.
          </Alert>
          {/* Modal for creating a new playlist */}
          <Modal isOpen={modal} toggle={toggle} centered>
          <ModalHeader toggle={toggle}>Create new playlist</ModalHeader>
          <ModalBody>
          <Input
          type="text"
          placeholder="Name"
          bsSize="sm"
          value={newPlaylist}
          onChange={(e) => setNewPlaylist(e.target.value)}
          required
          />
          </ModalBody>
          <ModalFooter>
          <Button color="primary" onClick={(e)=> {toggle(e); handleCreateNewPlaylist(e)}}>
          Create
          </Button>
          </ModalFooter>
          </Modal>

        <div className='uploader'>
            <div className='videoForm'>
                <Card>
                <h3>Upload your video:</h3>
                <Form onSubmit={handleSubmit}>
                <div {...getRootProps()} className='dropzone'>
                <input {...getInputProps()} />
                {isDragActive ? (
                <p>Drop the video file here ...</p>
                ) : (
                <p>Drag and drop a video file here, or click to select a file</p>
                )}
                </div>
                <FormGroup>
                <Input
                type="text"
                placeholder="Title"
                bsSize="sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                />
                </FormGroup>
                <FormGroup>
                <Input
                placeholder="Description"
                bsSize="sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                type='textarea'
                />
                </FormGroup>
                <FormGroup row>
                <Label for="playlist" sm={4} className="col-form-label-sm">
                Choose Playlist
                </Label>
                <Col sm={8}>
                <InputGroup>
                <Input
                id="playlist"
                name="playlist"
                type="select"
                value={playlist}
                bsSize="sm"
                className="form-control-sm"
                onChange={(e)=>setPlaylist(e.target.value)}
                >
                <option key='' value='' disabled>
                Select a playlist
                </option>
                {playlists.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </Input>

                <Button color="danger" onClick={toggle}>
                Create New
                </Button>
                </InputGroup>
                </Col>
                </FormGroup>
                    <FormGroup row>
                    <Label for="thumbnail" sm={2} className="col-form-label-sm">
                    Thumbnail
                    </Label>
                        <Col sm={10}>
                        <Input
                        id="thumbnail"
                        name="thumbnail"
                        type="file"
                        accept='image/*'
                        onChange={handleFileChange}
                        className="form-control-sm"
                        />
                        </Col>
                    </FormGroup>
                        <div>
                    </div>
                        {loading ? (
                        <Button  color="primary" type="submit" disabled>
                        Uploading...
                        </Button>
                        ) : (
                        <Button type="submit">Upload Video</Button>
                        )}
                    </Form>
                </Card>

                </div>

                <div className='preview'>

                <Card >
                {error !== null &&            
                <Alert
                color="danger"
                className="mb-2"
                isOpen={error !== null}
                toggle={() => setError(null)}
                >
                {error.message}
                </Alert>}
                <h3>Preview: {videoFile !== null ? videoFile.name : ''}</h3>
                {videoFile ? (
                <Card>
                <video key={videoPreview} controls>
                <source src={videoPreview} />
                Your browser does not support the video tag.
                </video>
                </Card>
                ) : <CenteredTextCard height={300} fontSize={18} message={'Select a video to see preview'}/>}
                </Card>
                {thumbnailPreview &&
                <div className='image-preview'>
                <Card >
                <h4>Thumbnail Preview: {thumbnail ? thumbnail.filename : ''}</h4>
                <img src={thumbnailPreview} alt="Preview" style={{ width: '100%', height: '100%' }} />
                </Card>
                </div>
                }
            </div>
        </div>
        </>
  );
};
