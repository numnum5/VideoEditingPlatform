// Route for handling comment related requests
const express = require('express');
const router = express.Router();
const authorisation = require("../middleware/authorisation");
const {get, set} = require('../helper/cache');
require('dotenv').config();

// Endpoint for getting all comments on a video
router.get('/comments/:id', async function (req, res) {
    
    const { id } = req.params;
    // Pagination configuration
    const limit = parseInt(req.query.limit) || 10; 
    const page = parseInt(req.query.page) || 1;    
    const offset = (page - 1) * limit;  
    const cacheKey = `comments:${id}:${page}:${limit}:${offset}`;
    try{
        const value = await get(cacheKey);
        if (value) {
            res.status(200).json(value);
            return;
        }
        
    }catch(error){
        res.status(500).json({error : true, message : err.message})
    }
    // Get comments from database
    req.db.from('comments')
        .where('video_id', id)
        .limit(limit)
        .offset(offset)
        .then(result => {
            const comments = result;

            // Get the total number of comments based on the query
            return req.db.from('comments').where('video_id', id).count('* as total')
            .then(async(response) =>{
                const total = response[0].total;
                const finalResponse = {
                    page : page,
                    limit : limit,
                    total : total,
                    totalPages : Math.ceil(total/limit),
                    result : comments
                };
                try{
                    const value = await set(cacheKey, finalResponse ,200);
                }catch(error){
                    res.status(500).json({error : true, message : error.message})
                }
                res.status(200).json(finalResponse)
            })
            .catch(error =>{console.log(error); res.status(500).json({error : true, message: error.message });})
        })
        .catch(error => res.status(500).json({error : true, message: error.message }))
});


// Endpoint for deleting a comment given id
router.delete('/comment/:id', authorisation, function(req, res, next){
    const id = req.params.id;
    // Checks if comment id in body exists
    if(!id){
        res.status(400).json({ error : true, message: `Comment id is required.`});
        return;
    }

    
    req.db.from('comments').where('id', id)
        .then(result => {
            const comment = result[0];
            // Check if username under the comment matches the current user's username
            if(comment.username !== req.currentUser.username){
                res.status(403).json( { error : true, message : "Forbidden"});
                return;
            }
            
            // If user crendentials matches with the comment delete the row
            req.db
            .from("comments")
            .where('id', id)
            .del()
            .then(_ => {
                res.status(200).json({ message : "Comment sucessfully deleted.", id : id})

            })
            .catch(error => {
                res.status(500).json({error : true, message: error.message });
            });
        })
        .catch(error => {
            res.status(500).json({error : true, message: error.message });
        });
});

// Endpoint for posting a new comment given a video Id
router.post('/comment/:videoId', authorisation, function(req, res, next){
    const id = req.params.videoId;
    const comment = req.body.comment;
    // Checks if comment in body exists
    if (!comment) {
        res.status(400).json({ error : true, message: `Request body incomplete, comment is required.`});
        return;
    }

    const username = req.currentUser.username;

    // Insert comment into the databse
    req.db
        .from("comments")
        .insert({post : comment, username : username, video_id : id})
        .then(id => {
            req.db
                .from("comments")
                .select("*")
                .where("id", id[0])
                .then(response =>{
                    res.status(200).json({ message: `Successfully commented on the video with id ${id}.`, comment : response[0]});
                })
                .catch(error => {
                    res.status(500).json({error : true, message: error.message });
                });
            })

        // Catch any error occuring within the database
        .catch(error => {
            res.status(500).json({error : true, message: error.message });
        });    
});

module.exports = router;