// Route for handling playlist related requests
const express = require('express');
const router = express.Router();
const authorisation = require("../middleware/authorisation");
const {get, set} = require('../helper/cache');
require('dotenv').config();

// Endpoint for creating a new playlist
router.post('/create', authorisation, function(req, res, next){

    const name = req.body.name;
    const username = req.currentUser.username;

    // Check name of the playlist
    if(!name){
        res.status(400).json({error : true, message : "Name for playlist required."})
        return;
    }
    
    // Insert the playlist into the database
    req.db.from("playlists").insert({username : username, name : name, })
        .then(()=>{
            res.status(200).json({message : "Successfully created playlist."})
        })
        .catch(err =>{
            res.status(500).json({error : true, message : err.message})
        
    })
});

// Endpoint for getting all the playlists of a specifc user
router.get('/:username', async function(req, res, next){
    const username = req.params.username;
    const cacheKey = `playlists:${username}`;
    try{
        const value = await get(cacheKey);
        if (value) {
            res.status(200).json(value);
            return;
        }
        
    }catch(error){
        res.status(500).json({error : true, message : error.message})
    }
    
    // Check username
    if(!username){
        res.status(400).json({error : true, message : "Username required"})
        return;
    }

    req.db.from("playlists").select('id', 'name').where('username', username)
        .then(async(result)=>{

            try{
                const value = await set(cacheKey, result ,200);
                if (value) {
                    res.status(200).json(value);
                    return;
                }
                
            }catch(error){
                res.status(500).json({error : true, message : error.message})
            }
            res.status(200).json(result)
        })
        .catch(err =>{
            res.status(500).json({error : true, message : err.message})
        
        })
});


module.exports = router;