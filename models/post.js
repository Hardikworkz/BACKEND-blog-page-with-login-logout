const mongoose = require('mongoose');

// Define the post schema
const postSchema = mongoose.Schema({
   user: { 
       type: mongoose.Schema.Types.ObjectId, // Specify the type for user
       ref: "user", // Reference to the user model
   },
   date: {
       type: Date,
       default: Date.now
   },
   content: {
       type: String,
   },
   likes: { type: [mongoose.Schema.Types.ObjectId], ref: "User", default: [] },
});


module.exports = mongoose.model('Post', postSchema); 