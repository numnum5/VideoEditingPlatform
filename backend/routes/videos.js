// Route for handling video related requests 
const express = require('express');
const path = require('path');
const router = express.Router();
const { uuid } = require('uuidv4');
const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require('@aws-sdk/s3-request-presigner');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
const authorisation = require("../middleware/authorisation");
const {get, set} = require('../helper/cache');
require('dotenv').config();

// s3 client
const s3Client = new S3.S3Client({ 
    region: process.env.REGION}
);
// SQSClient
const sqsClient = new SQSClient({
    region: process.env.REGION
})

// Helper function queueing message to SQS
const sendMessage = async (message) => {
    const command = new SendMessageCommand({
        QueueUrl: process.env.SQSURL,
        DelaySeconds: 5,
        MessageBody: JSON.stringify(message),
    });

    try {
       await sqsClient.send(command);
    } catch (error) {
        throw error;
    }
};

// Function for generating presigned url
const generateDownloadURL = async (key) => { 
    const command = new S3.GetObjectCommand({
        Bucket: process.env.BUCKETNAME,
        Key: key,
    });
    try{
        const presignedUrl = await S3Presigner.getSignedUrl(s3Client, command, {
            expiresIn: 3600, // URL expires in 1 hour
          });
        return presignedUrl;
    }catch(error){
        throw error;
    }
};

// Endpoint for handling video upload to the S3 and RDS database
router.post('/upload', authorisation, async function(req, res, next){
    const format = req.body.format;
    const filename = req.body.filename;
    const title = req.body.title;
    const description = req.body.description;
    const thumbnailFilename = req.body.thumbnail;
    const thumbnailFormat = req.body.thumbnailFormat;
    const playlist_id = req.body.playlist_id || null;
    const size = req.body.size; 
    if(!format){
        res.status(500).json({error : true, message : "Format required"})
        return;
    }
    try{
        const uniqueIdentifier = `${uuid()}-${Date.now()}${path.extname(filename)}`
        const command = new S3.PutObjectCommand({
            Bucket: process.env.BUCKETNAME,
            Key: `videos/${uniqueIdentifier}`,
            ContentType: format 
           })

        const presignedUrl = await S3Presigner.getSignedUrl(s3Client, command, {
            expiresIn: 3600, // URL expires in 1 hour
        });

        let thumbnailPresignedUrl = null;
        let thumbnailUniqueIdentifier = null;

        if(thumbnailFilename && thumbnailFormat){
            thumbnailUniqueIdentifier = `${uuid()}-${Date.now()}${path.extname(thumbnailFilename)}`
            const thumbnailUploadCommand = new S3.PutObjectCommand({
                Bucket: process.env.BUCKETNAME,
                Key: `thumbnails/${thumbnailUniqueIdentifier}`,
                ContentType: thumbnailFormat
               })
            
            
               thumbnailPresignedUrl = await S3Presigner.getSignedUrl(s3Client, thumbnailUploadCommand, {
                expiresIn : 3600,
            })
        }

        req.db.from("videos").insert({
                filename : uniqueIdentifier, 
                description : description,
                title : title, 
                username : req.currentUser.username, 
                thumbnail :thumbnailUniqueIdentifier,
                playlist_id : playlist_id,
                size: size,
                format : format
                })
                .then(_ => 
                    res.status(200).json({presignedUrl : presignedUrl, thumbnailPresignedUrl : thumbnailPresignedUrl})
                )
                .catch(err => {
                    res.status(500).json({ error :  true, message : err.message})
                });  
        }
    catch(error){
        res.status(500).json({error : true, message :  error.message})
    }   
});

// Endpoint for fetched videos for a specifc user with pagination, requires authorisation
router.get('/uservideos/:username', authorisation, async (req, res, next)=>{

    if(!req.isAdmin){
        res.status(500).json({error : true, message : "Admin access required."})
        return;
    }

    const page = req.query.page || 1;
    const limit = req.query.limit || 6;
    const offset = (page - 1) * limit;
    const query = req.query.query || '';
    const playlist_id = req.query.playlist_id || ''; 
    const sortBy = req.query.sortBy || '';    
    const username = req.params.username;
    // Create query with limit and offset to calculat which rows to return
    let databaseQuery = req.db.from("videos")
        .select('*')
        .limit(limit)
        .offset(offset);

    // Apply necessary filters
    if(query !== ''){
        databaseQuery = databaseQuery.where('title', 'like', `%${query}%`)
    }
    if(playlist_id !== ''){
        databaseQuery = databaseQuery.where('playlist_id', playlist_id);
    }

    if(sortBy !== ''){
        if(sortBy === 'title'){
            databaseQuery = databaseQuery.orderBy('title', 'asc');
        }
        else if(sortBy === 'uploadDate'){
            databaseQuery = databaseQuery.orderBy('date', 'asc');
        }
        else if(sortBy === 'editDate'){
            databaseQuery = databaseQuery.orderBy('last_updated', 'asc');
        }
        else if(sortBy === 'duration'){
            databaseQuery = databaseQuery.orderBy('duration', 'asc');
        }
        
    }
    databaseQuery.where('username', username)
    .then(async(videos) =>{
        // Store result
        const result = await Promise.all(videos.map( async (e) => ({ 
            id : e.id,
            title : e.title,
            filename : e.filename,
            description : e.description,
            metadata : e.metadata,
            thumbnail : e.thumbnail && await generateDownloadURL(`thumbnails/${e.thumbnail}`),
            url : await generateDownloadURL(`videos/${e.filename}`)
        })));
    
        // Db query for calculating the total number of rows to return
        let totalDb = req.db.from('videos').where('username', username);
        if(query !== ''){
            totalDb = totalDb.where('title', 'like', `%${query}%`)
        }  
        if(playlist_id !== ''){
            totalDb = totalDb.where('playlist_id', playlist_id);
        }
        
        return totalDb.count('id as total')
            .then(response =>{          
            // Store total  
            const total = response[0].total;
            res.status(200).json({
                page : page,
                limit : limit,
                total : total,
                totalPages : Math.ceil(total/limit),
                result : result,
            })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error : true, message : err.message})
        })
    }) 
    .catch(err => {
        console.log(err);
        res.status(500).json({error : true, message : err.message})
    })
})
// Endpoint for fetched videos for a specifc user with pagination, requires authorisation
router.get('/uservideos', authorisation, async (req, res, next)=>{
    const page = req.query.page || 1;
    const limit = req.query.limit || 6;
    const offset = (page - 1) * limit;
    const query = req.query.query || '';
    const playlist_id = req.query.playlist_id || ''; 
    const sortBy = req.query.sortBy || '';    
    const username = req.currentUser.username;
    // Create query with limit and offset to calculat which rows to return
    let databaseQuery = req.db.from("videos")
        .select('*')
        .limit(limit)
        .offset(offset);

    // Apply necessary filters
    if(query !== ''){
        databaseQuery = databaseQuery.where('title', 'like', `%${query}%`)
    }
    if(playlist_id !== ''){
        databaseQuery = databaseQuery.where('playlist_id', playlist_id);
    }

    if(sortBy !== ''){
        if(sortBy === 'title'){
            databaseQuery = databaseQuery.orderBy('title', 'asc');
        }
        else if(sortBy === 'uploadDate'){
            databaseQuery = databaseQuery.orderBy('date', 'asc');
        }
        else if(sortBy === 'editDate'){
            databaseQuery = databaseQuery.orderBy('last_updated', 'asc');
        }
        else if(sortBy === 'duration'){
            databaseQuery = databaseQuery.orderBy('duration', 'asc');
        }
        
    }
    databaseQuery.where('username', username)
    .then(async(videos) =>{
        // Store result
        const result = await Promise.all(videos.map( async (e) => ({ 
            id : e.id,
            title : e.title,
            filename : e.filename,
            description : e.description,
            metadata : e.metadata,
            thumbnail : e.thumbnail && await generateDownloadURL(`thumbnails/${e.thumbnail}`),
            url : await generateDownloadURL(`videos/${e.filename}`)
        })));
    
        // Db query for calculating the total number of rows to return
        let totalDb = req.db.from('videos').where('username', username);
        if(query !== ''){
            totalDb = totalDb.where('title', 'like', `%${query}%`)
        }  
        if(playlist_id !== ''){
            totalDb = totalDb.where('playlist_id', playlist_id);
        }
        
        return totalDb.count('id as total')
            .then(response =>{          
            // Store total  
            const total = response[0].total;
            res.status(200).json({
                page : page,
                limit : limit,
                total : total,
                totalPages : Math.ceil(total/limit),
                result : result,
            })
        })
        .catch(err => {
            console.log(err);
            res.status(500).json({error : true, message : err.message})
        })
    }) 
    .catch(err => {
        console.log(err);
        res.status(500).json({error : true, message : err.message})
    })
})



// Endpoint for getting all videos locally uploaded to the server with pagination
router.get('/videos', async (req, res, next)=>{

    const page = req.query.page || 1;
    const limit = req.query.limit || 6;
    const offset = (page - 1) * limit;
    const query = req.query.query || null;
    const exclude = parseInt(req.query.exclude) || null;
    const cacheKey = `videos:${page}:${limit}:${query}:${exclude}:${offset}`;
    // Check to see if cache exists for the key

    try{
        const value = await get(cacheKey);
        if (value) {
            res.status(200).json(value);
            return;
        }

    }catch(error){
        res.status(500).json({error : true, message : err.message})
    }

    // Create query
    let databaseQuery = req.db.from("videos")
        .select('*')
        .limit(limit)
        .offset(offset);

    // Apply filters
    if(query)
    {
        databaseQuery = databaseQuery.where('title', 'like', `%${query}%`);
    }
    if(exclude){
        databaseQuery = databaseQuery.where('id', '!=', exclude);
    }

    databaseQuery
        .then(async(videos)=>{
            const result = await Promise.all(videos.map( async (e) => ({ 
                id : e.id,
                title : e.title,
                filename : e.filename,
                description : e.description,
                metadata : e.metadata,
                thumbnail : e.thumbnail && await generateDownloadURL(`thumbnails/${e.thumbnail}`),
                url : await generateDownloadURL(`videos/${e.filename}`)
            })));
            let totaldbQuery = req.db.from('videos');

            if(query){
                totaldbQuery = totaldbQuery.where('title', 'like', `%${query}%`);
            }
            if(exclude){
                databaseQuery = databaseQuery.where('id', '!=', exclude);
            }
            return totaldbQuery.count('filename as total')
            .then(async (response)=>{
                const total = response[0].total;
                const finalResponse = {
                    page : page,
                    limit : limit,
                    total : total,
                    totalPages : Math.ceil(total/limit),
                    result : result
                }
                const cacheKey = `videos:${page}:${limit}:${query}:${exclude}:${offset}`;
                try{
                    const value = await set(cacheKey, finalResponse);
                    if (value) {
                        res.status(200).json(value);
                        return;
                    }
                }catch(error){
                    res.status(500).json({error : true, message : err.message})
                }
                res.status(200).json(finalResponse)
            })
            .catch(err => {
                res.status(500).json({error : true, message : err.message})
            })
        })
        .catch(err => {
            res.status(500).json({error : true, message : err.message})
        })
})

// A post route for handling transcoding requests
router.post('/process', authorisation, async function(req, res, next){
    const socketId = req.body.socketId;
    const taskId = `${uuid()}-${Date.now()}`;
    const inputFormat = req.body.videoName;
    const inputKey = req.body.videoName;
    const {codec, lumaAmount, lumaSizeX, lumaSizeY, translation, model} = req.body.options;
    const [videoName, _] = inputFormat.split('.');
    const outputExt = req.body.options.format.toLowerCase();
    const outputKey = `${uuid()}-${Date.now()}${path.extname(videoName)}.${outputExt}`;
    const videoFilters = [];

    // Apply luma sharpening filter if provided
    if (req.body.sharpenEnabled) {
        const lumaSharpenFilter = `unsharp=luma_msize_x=${lumaSizeX}:luma_msize_y=${lumaSizeY}:luma_amount=${lumaAmount}`;
        videoFilters.push(lumaSharpenFilter);
    }

    // Apply resolution if option is enabled
    if (req.body.options.resolution !== '') {
        const [width, height] = req.body.options.resolution.split('x');
        const resolution = `scale=${width}:${height}`;
        videoFilters.push(resolution);
    }
    // Create a specfication containing options provided by user
    const spec = { 
        inputKey : inputKey, 
        outputKey : outputKey, 
        codec : codec, 
        videoFilters : videoFilters, 
        id : taskId, 
        socketId : socketId 
    };
    try{
        // Send specification message to SQS
        await sendMessage(spec);
        res.status(200).json({message : "Task is being processsed.", taskId : taskId })
    }catch(error){
        res.status(500).json({error :  true, message : "Internal server error occured."});
    }
});
// A endpoint for processing an uploaded video


// Endpoint for getting individual video information
router.get('/video/:id', async function(req, res, next){
    const id = req.params.id;
    if(!id){
        res.status(400).json({error : true, message : 'Video id required in url'})
        return;
    }
    const cacheKey = `video:${id}`;
    // Check to see if cache exists for the key
    try{
        const value = await get(cacheKey);
        if (value) {
            res.status(200).json(value);
            return;
        }
    }
    catch(error){
        res.status(500).json({error : true, message : error.message});
        return;
    }   
    // Query the database 
    req.db.from("videos").select('*').where('id', id)
        .then(async(data) => {
            if(data.length <= 0){
                res.status(404).json({error : true, message : 'Video not found'})
                return;
            };
            const video = data[0];
            
            const result = { 
                id : video.id,
                title : video.title,
                username : video.username,
                filename : video.filename,
                description : video.description,
                thumbnail : video.thumbnail && await generateDownloadURL(`thumbnails/${e.thumbnail}`),
                url : await generateDownloadURL(video.filename)
            };
            // Set cache
            try{
                await set(cacheKey, result, 200);
            }
            catch(error){
                res.status(500).json({error : true, message : error.message});
                return;
            }   
            res.status(200).json(result);
        })
        .catch(err => res.status(500).json({error : true, message : err.message}));
})


// Endpoint for updating video file and its metadata
router.put('/update/:id', authorisation, async function(req, res, next){
    const id = req.params.id;
    const newVideoFilename = req.body.newVideo;
    const previousVideoFilename = req.body.previousVideo;
    const username = req.currentUser.username
    const newTitle = req.body.title;
    const newDescription = req.body.description;
    const playlist_id = req.body.playlist_id || '';

    // Check for id
    if(!id){
        res.status(500).json({error : true, message : "Video id required in url"});
        return;
    }

    // Check for filenames
    if(!newVideoFilename && !previousVideoFilename){
        res.status(500).json({error : true, message : "Video filenames required in body"});
        return;
    }

    req.db.from('videos').select('username', 'filename').where('id', id)
    .then(async(video) => {
        // If no video is found with given id and username
        if (video.length === 0) {
            res.status(404).json({ error: true, message: "Video not found" });
            return;
        }

        const videoData = video[0];

        // Check ownership of video
        if (videoData.username !== username) {
            res.status(403).json({ error: true, message: "You do not have permission to update this video" });
            return;
        }

        // Check if previous video file exists 
        if (videoData.filename !== previousVideoFilename) {
            res.status(400).json({ error: true, message: "Previous video filename does not match" });
            return;
        }

        try{
            // Delete video in s3
            const deleteCommand = await s3Client.send(
                new S3.DeleteObjectCommand({
                    Bucket: process.env.BUCKETNAME,
                    Key: `videos/${previousVideoFilename}`,
                })
            );
            req.db.from("videos")
                .where('id', id)
                .update({
                    filename: newVideoFilename,
                    title : newTitle,
                    description : newDescription,
                    playlist_id : playlist_id !== '' ?  parseInt(playlist_id) : null
                })
                .then(_ => res.status(200).json({ message: 'Video updated successfully.' }))
                .catch(dbErr => {
                    console.error(dbErr);
                    res.status(500).json({ error: true, message : dbErr.message });
                });
        }catch(error){
            res.status(500).json({ error: true, message : error.message });
        }
    })
    .catch(err => {
        res.status(500).json({error : true, message : err.message});
        return;
    })
});


// Endpoint for deleting video given the id of the vide
router.delete('/delete/:id', authorisation, async function(req, res, next){
    const id = req.params.id;
    const filename = req.body.filename;
    // Check for id and filename
    if(!id){
        res.status(400).json({error : true, message : "Video id required in url"});
        return;
    }
    if(!filename){
        res.status(400).json({error : true, message : "Filename required in body"});
        return;
    }

    const username = req.currentUser.username;
    
    // Check database 
    req.db.from("videos").select('username', 'filename').where("id", id)
    .then(async(video) => {
    
        // If no video is found
        if (video.length === 0) {
            res.status(404).json({ error: true, message: "Video not found in database" });
            return;
        }
        const videoData = video[0];

        // If requester's username does not match the video's username
        if (!req.isAdmin || videoData.username !== username) {
            res.status(403).json({ error: true, message: "You do not have permission to delete this video" });
            return;
        }

        // Check if the filename matches the previous filename
        if (videoData.filename !== filename) {
            res.status(400).json({ error: true, message: "Video filename does not match with the database" });
            return;
        }
        try{
            // Delete video in s3
            const deleteCommand = await s3Client.send(
                new S3.DeleteObjectCommand({
                    Bucket: process.env.BUCKETNAME,
                    Key: `videos/${filename}`,
                })
            );
            // Delete the video entry from the database
            req.db.from("videos").where("id", id).del()
                .then(()=>{
                    res.status(200).json({ id: id });
                })
                .catch(err => {
                    res.status(500).json({error : true, messgae : err.message})
                })
        }catch(error){
            res.status(500).json({error : true, messgae : error.message})
        }
    })
    .catch(err =>{
        res.status(500).send({ error: true, message : err.message });
    })    
})


// Endpoint for downloading a file given the filename
router.get('/download/:filename', async (req, res) => {
    const filename = req.params.filename;

    // Check for filename
    if (!filename) {
        res.status(400).json({ error: true, message: "Video id required." });
        return;
    }

    try {
        const presignedUrl = await generateDownloadURL(filename);
        // Redirect the user to the pre-signed URL to download the file
        res.redirect(presignedUrl);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: true, message: "Error generating download link." });
    }
});


module.exports = router;