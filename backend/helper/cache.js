// Code for setting up memcache
const Memcached = require('memcached');
const util = require("node:util");
require('dotenv').config();
const memcached = new Memcached(process.env.MEMCACHE);
// Mockey patch
memcached.aGet = util.promisify(memcached.get);
memcached.aSet = util.promisify(memcached.set);

// Helper function for setting cache with default expiration time
async function set(key, value, expiration = 600) {
    try {
        await memcached.aSet(key, value, expiration);
    } catch (error) {
        throw error;
    }
}

// Helper function for getting cache with key
async function get(key) {
    try {
        const value = await memcached.aGet(key);
        return value; 
    } catch (error) {
        throw error; 
    }
}

module.exports = { get, set };