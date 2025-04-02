const express = require('express');
const app = express();
const userModel = require("./models/user");
const postModel = require("./models/post");
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const post = require('./models/post');

app.set("view engine", "ejs");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Home Page
app.get('/', (req, res) => {
    res.render("index");
});

// Login Page
app.get('/login', (req, res) => {
    res.render("login");
});

// Profile Page (Protected)
app.get('/profile', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email }).populate("posts");
    res.render('profile', { user });
});

app.get('/like/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");

    if (!post) return res.status(404).send("Post not found");

    // Ensure `likes` array exists
    if (!post.likes) post.likes = [];

    let userId = req.user.userId; // Correct JWT payload field

    let likeIndex = post.likes.indexOf(userId);
    if (likeIndex === -1) {
        post.likes.push(userId); // Add like if not present
    } else {
        post.likes.splice(likeIndex, 1); // Remove like if already present
    }

    await post.save();
    res.redirect('/profile'); // Corrected redirect
});

app.get('/edit/:id', isLoggedIn, async (req, res) => {
    let post = await postModel.findOne({ _id: req.params.id }).populate("user");
    
    res.render("edit", {post});
});

app.post('/update/:id', isLoggedIn, async (req, res) => {
    try {
        let { content } = req.body;

        let post = await postModel.findByIdAndUpdate(req.params.id, { content }, { new: true });

        if (!post) {
            return res.status(404).send("Post not found");
        }

        res.redirect("/profile"); // Redirect back to the profile page after updating
    } catch (error) {
        console.error("Error updating post:", error);
        res.status(500).send("Internal Server Error");
    }
});


app.post('/post', isLoggedIn, async (req, res) => {
    let user = await userModel.findOne({ email: req.user.email });
    let { content } = req.body;

    if (!content) return res.status(400).send("Post content is required.");

    let post = await postModel.create({
        user: user._id,  
        content: content,
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
});

// User Registration
app.post('/register', async (req, res) => {
    let { email, password, username, age, name } = req.body;

    let user = await userModel.findOne({ email });
    if (user) return res.status(400).send("User already registered");

    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, async (err, hash) => {
            let newUser = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash,
            });

            let token = jwt.sign({ email: email, userId: newUser._id }, "shhh");
            res.cookie("token", token);
            res.send("Registered successfully");
        });
    });
});

// User Login
app.post('/login', async (req, res) => {
    let { email, password } = req.body;

    let user = await userModel.findOne({ email });
    if (!user) return res.status(400).send("Invalid email or password");

    bcrypt.compare(password, user.password, function (err, result) {
        if (result) {
            let token = jwt.sign({ email: email, userId: user._id }, "shhh");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        } else {
            res.redirect("/login");
        }
    });
});

// Logout
app.get('/logout', (req, res) => {
    res.cookie("token", "", { maxAge: 0 });
    res.redirect("/login");
});

function isLoggedIn(req, res, next) {
    if (!req.cookies.token) return res.redirect("/login");

    try {
        let data = jwt.verify(req.cookies.token, "shhh");
        req.user = data;
        next();
    } catch (err) {
        return res.redirect("/login");
    }
}

app.listen(3000);