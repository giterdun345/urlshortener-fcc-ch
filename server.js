require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongo = require('mongodb')
const mongoose = require('mongoose')

// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());

// inplace of body-parser which has been deprecated
app.use(express.urlencoded({extended:true}));

// per deprecation warning unified topology was used 
mongoose.connect(process.env.MONGO_URI,
                {useNewUrlParser: true, 
                 useUnifiedTopology: true}
                )

// Schema constructed asking mongoose to use $type for interpreting the type of a key instead of the default keyword type
const UrlShort = new mongoose.Schema({
                                original_url: String,
                                short_url: String
                              })

// Validation on the input for the URL
UrlShort.path('original_url')
        .validate((val) => {
          urlRegex = /(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/;
          return urlRegex.test(val);
        }, 'Invalid URL.');

// as per docs for handling errors 
const db = mongoose.connection
db.on('error', console.error.bind(console, 'connection error:'))
// db.once('open', ()=>
// console.log('connected to db'))
const Urls = mongoose.model("Urls", UrlShort)

// root html and css set 
app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// simple hash without other libraries required
const hashCode = s => s.split('').reduce((a,b) => (((a << 5) - a) + b.charCodeAt(0))|0, 0)

// business logic for hashing url and returning the data 
app.post('/api/shorturl/', (req, res)=>{
  const inputUrl = new Urls({
                              original_url: req.body.url,
                              short_url: hashCode(req.body.url)
                            })
// save input data into db hashCode checked as a string to meet criteria of schema
  inputUrl.save((error, data)=>{
                if(error) return console.log(error)
                  res.json({
                    original_url: data.original_url, 
                    short_url: data.short_url
                  })
               })
  })

// using the short url, provide access to the url 
  app.get('/api/shorturl/:shorted', (req, res)=>{
  // find the document of shorted url and push to the original url 
  // not saved as a variable due to asynch promise pending 
    const generatedShort = req.params.shorted
    Urls.find({short_url: generatedShort})
        .then(data=> {
                let foundObj = data[0]
                res.redirect(foundObj.original_url )            
              })
        // .then(obj =>)
        .catch(error => console.log(error))
  })


 // monitor server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`server listening on port ${PORT}`))
