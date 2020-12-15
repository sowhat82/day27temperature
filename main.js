// load the libs
const express = require('express')
const MongoClient = require('mongodb').MongoClient;
const morgan = require ('morgan')
const url = 'mongodb://localhost:27017' /* connection string */
const bodyParser = require('body-parser');

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

app.post('/temperatureDetails', async (req, resp) => {

    const userName = req.body.userName;
    const date = req.body.date;
    const timeStamp = new Date();
    const personalSymptoms = req.body.personalSymptoms;
    const householdSymptoms = req.body.householdSymptoms;
    const temperature = req.body.temperature;

    try{
        const result = await client.db('mydb')
        .collection('temperatures')
        .insertOne({
            userName: userName,
            date: date,
            timeStamp: timeStamp,
            personalSymptoms: personalSymptoms,
            householdSymptoms: householdSymptoms,
            temperature: temperature
        })

        resp.status(200)
        resp.type('application/json')
        resp.json(result)

    }
    catch(e){
        console.info(e)
    }

});
