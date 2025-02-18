// Route for handling liking and disliking a video
const express = require('express');
const router = express.Router();
const authorisation = require("../middleware/authorisation");
require('dotenv').config();


// Endpoint for getting like count for a video
router.get('/:id', function(req, res, next){
    const id = req.params.id;

    // Check id
    if(!id){
        res.status(500).json({error : true, message : "Video name required in url"});
        return;
    }
    req.db.from("likes")
        .where("id", id)
        .count('* as count')
        .then(count =>{
            res.status(200).json(count[0])
        })
        .catch(err => res.status(500).json({error : true, message : err.message}))
})

// Endpoint for liking a video
router.post('/like/:id', authorisation, function(req, res){
    const id = req.params.id;
    const username = req.currentUser.username;

    if(!id){
        res.status(400).json({error : true, message : "Video id required in url"})
        return;
    }

    req.db.from('likes').where({video_id : id, username : username}).then(data => {
        // Check if user has already liked the video 
        if(data.length > 0){
            // If user already liked the video, then the delete the entry
            req.db.from('likes').where({video_id : id, username : username}).del()
            .then(()=>{
                res.status(200).json({message : "Sucessfully unliked video", liked : false})
            })
            .catch(err => res.status(500).json({error : true, message : err.message}))
        }
        // If user has not liked the video
        else if(data.length < 1){
            // Insert a new entry to the database
            req.db.from("likes").insert({
                video_id : id, 
                username : username}).then(()=>{
                    res.status(200).json({message : "Sucessfully liked video", liked : true})
                })
                .catch(err => res.status(500).json({error : true, message : err.message}))
        }
    })
    .catch(err => res.status(500).json({error : true, message : err.message}))
})

module.exports = router;