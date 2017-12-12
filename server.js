var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");

var exphbs = require("express-handlebars");

// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server
var axios = require("axios");
var cheerio = require("cheerio");


var db = require("./models");

var PORT = 3000;


var app = express();
app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");



app.use(logger("dev"));
// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: false }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

var exphbs = require("express-handlebars");

app.engine("handlebars", exphbs({ defaultLayout: "main" }));
app.set("view engine", "handlebars");




// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
// mongoose.Promise = Promise;
// mongoose.connect("mongodb://heroku_vcg35hd8:g0v03vi9gparrg8jpfg4kv1p0q@ds135926.mlab.com:35926/heroku_vcg35hd8" || "mongodb://localhost/mongoose-scraper",{
  
//   useMongoClient: true
// });

mongoose.Promise = Promise;
var mongoDB = process.env.MONGODB_URI || "mongodb://localhost/mongoose-scraper";
mongoose.connect(mongoDB, function(error) {
    if (error) throw error;
    useMongoClient: true;
    console.log("Mongoose connection is successful!!")

});



// ROUTES

//THIS IS THE INITAL GET ROUTE FOR RENDERING ALL ARTICLES ON THE PAGE

app.get('/', function(req,res){

  console.log("hitting app.get at root");
  res.redirect("/articles");
  
});



// A GET SCRAPING THE ONION WEBSITE
app.get("/scrape", function(req, res) {

  console.log("Scraped website");

  // First, we grab the body of the html with request
  axios.get("http://www.theonion.com/").then(function(response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data);

    // Now, we grab every h2 within an article tag, and do the following:
    $("div.headline--wrapper").each(function(i, element) {
      // Save an empty result object
      var result = {};

      // Add the text and href of every link, and save them as properties of the result object
      result.title = $(this)
        .text();
      result.link = $(this)
       .children("a")
        .attr("href");

   
      db.Article
        .create(result)
        .then(function(dbArticle) {
            // If we were able to successfully scrape and save an Article, send a message to the client
            return res.render("index",{ scrapedArticles: dbArticle});
        })
        .catch(function(err) {
          // If an error occurred, send it to the client
          res.json(err);
        })
        
    });
  });
});


//ROUTE FOR GETTING ALL ARTICLES AND DISPLAYING ON PAGE
app.get("/articles", function(req, res) {

  console.log("Hitting app.get /articles route");
  // Grab every document in the Articles collection
  db.Article
    .find({})
    .then(function(dbArticle) {
      // If we were able to successfully find Articles, send them back to the client
      res.render("index", {scrapedArticles: dbArticle});
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});



app.get("/articles/:id", function(req, res) {
  console.log("Hit app.get /articles/:id route");
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article
    .findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate("savedArt")
    .then(function(dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client
      res.render("Saved", {savedArticle:dbArticle});
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});


app.get('/savedarticles', function(req,res){

  console.log("saved articles get route is working");
  db.Article
  .find({})
  .then(function(dbSaved) {
    // If we were able to successfully find Articles, send them back to the client
    res.render("saved", {savedArticles: dbSaved});
  })
  .catch(function(err) {
    // If an error occurred, send it to the client
    res.json(err);
  });
});



app.post("/savedarticles", function(req, res) {
  // Create a new note and pass the req.body to the entry
  db.Saved
    .create(req.body)
    .then(function(dbSaved) {
      // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
      // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
      // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { Saved: dbSaved._id }, { new: true });
    })
    .then(function(dbArticle) {
      // If we were able to successfully update an Article, send it back to the client
      res.render("saved", {savedArticle: dbArticle});
    })
    .catch(function(err) {
      // If an error occurred, send it to the client
      res.json(err);
    });
});




// Start the server
app.listen(PORT, function() {
  console.log("App running on port " + PORT + "!");
});