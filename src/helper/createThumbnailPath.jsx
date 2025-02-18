import { API_URL } from '../config';
const apiUrl = API_URL;
// Helper function for determining thumbnail path given source
const createThumbnailPath = (thumbnail, source) =>{
    // Determine thumbnail path
    let thumbnailPath;
    if(thumbnail === null){
      thumbnailPath = null;
    }
    // If the video is saved from youtube
    else{
      if(source === 'youtube'){
        thumbnailPath = thumbnail
      }
  
      // If video is from uploaded to the server, access static file from the server
      else if(source === 'local'){
        thumbnailPath =  `${apiUrl}/videos/thumbnails/${thumbnail}`;
      }
    }
    return thumbnailPath;
}

export default createThumbnailPath;