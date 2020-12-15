// load the libs
const express = require('express')
const MongoClient = require('mongodb').MongoClient;
const morgan = require ('morgan')
const url = 'mongodb://localhost:27017' /* connection string */
const bodyParser = require('body-parser');
var multer = require('multer');
var multipart = multer({dest: 'uploads/'});
const fs = require('fs')

const DATABASE = 'covid'
const COLLECTION = 'temperature'

const AWS = require('aws-sdk');
const endpoint = new AWS.Endpoint('fra1.digitaloceanspaces.com');
const config = require('./config.json');
const s3 = new AWS.S3({
    endpoint: endpoint,
    accessKeyId: config.accessKeyId || process.env.ACCESS_KEY,
    secretAccessKey: config.secretAccessKey
    || process.env.SECRET_ACCESS_KEY
});
// for cloud storage using env variables
// const mongourl = `mongodb+srv://${MONGO_USER}:${MONGO_PASSWORD}@cluster0.ow18z.mongodb.net/<dbname>?retryWrites=true&w=majority`

// create a client pool
const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true });    

// configure port
const PORT = parseInt(process.argv[2]) || parseInt(process.env.PORT) || 3000

// to allow searching based on ObjectID
var ObjectId = require('mongodb').ObjectID;

// create an instance of the application
const app = express()
app.use(morgan('combined'))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

//start server
client.connect()
.then(() => {
    app.listen(PORT, () => {
        console.info(`Application started on port ${PORT} at ${new Date()}`)        
    })
})
.catch(e => {
        console.error('canot connect to mongodb: ', e)
})

app.post('/submitDeclaration', async (req, resp) => {

    const NRIC = req.body.NRIC;
    const personalSymptoms = (req.body.personalSymptoms == "yes");
    const householdSymptoms = (req.body.householdSymptoms == "yes");
    const temperature = parseFloat(req.body.temperature);
    const digitalOceanKey = req.body.digitalOceanKey

    try{
        const result = await client.db(DATABASE)
        .collection(COLLECTION)
        .insertOne({
            NRIC: NRIC,
            timeStamp: new Date(),
            personalSymptoms: personalSymptoms,
            householdSymptoms: householdSymptoms,
            temperature: temperature,
            digitalOceanKey: digitalOceanKey
        })

        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        resp.status(500)
        console.info(e)
        resp.json({e})
    }

});

// upload file to S3
app.post('/uploadImage', multipart.single('image-file'),
    (req, resp) => {

        resp.on('finish', () => {
            // delete temp file that multer stores
            fs.unlink(req.file.path, () =>{})
        })

        fs.readFile(req.file.path, async (err, imgFile) => {
            
            // put object configurations

            // post to digital ocean        
            const params = {
                Bucket: 'tfipbucket',
                Key: req.file.filename,
                Body: imgFile,
                ACL: 'public-read',
                ContentType: req.file.mimetype,
                ContentLength: req.file.size,
                Metadata: {
                    originalName: req.file.originalname,
                    author: 'alvin',
                    update: 'temperature image',
                }
            }
            // post to digital ocean continued
            s3.putObject(params, (error, result) => {

                return resp.status(200)
                .type('application/json')
                .json({ 'key': req.file.filename });
            })
        })

    }    
);

app.get('/confirmationDetails/:NRIC', async (req, resp) => {

    const NRIC = req.params['NRIC']
    console.info(NRIC)
    try{
        console.info('here')
        const result = await client.db(DATABASE)
        .collection(COLLECTION)
        .find(
            {
                  NRIC: NRIC
            }
        
        )
        // .project({title:1, price:1, country:1})
        .toArray()
        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

})

app.get('/allDetails', async (req, resp) => {

    try{
        const result = await client.db(DATABASE)
        .collection(COLLECTION)
        .find(
            {
            }        
        )
        // .project({title:1, price:1, country:1})
        .toArray()
        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

})

app.post('/deleteRecord', async (req, resp) => {

    const ObjectID = req.body.objectID;
    try{
        const result = await client.db(DATABASE)
        .collection(COLLECTION)
        .deleteOne(
            {
                _id: ObjectId(ObjectID)          
            }        
        )
        // .project({title:1, price:1, country:1})
        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

});
