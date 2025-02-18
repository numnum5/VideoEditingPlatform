import createThumbnailPath from "../helper/createThumbnailPath";
// const apiUrl = import.meta.env.VITE_API_URL;
export default function VideoItem({video, handleVideoClick}){
    const thumbnailPath = createThumbnailPath(video.thumbnail, video.source);
    console.log(video);
    return(
        <div className="video-item" key={video.id} onClick={()=>handleVideoClick(video.id)}>
        <video key={video.id} controls src={video.url} poster={thumbnailPath}>
            Your browser does not support the video tag.
        </video>
        <p>{video.title}</p>
        </div>
    );
}