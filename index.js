const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zusdhlj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        const categoriesCollection = client.db('eKapor').collection('categories');
        const usersCollection = client.db('eKapor').collection('users');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '10s' });
            res.send({ token });
        });

        app.get('/categories', async (req, res) => {
            const category_id = req.query.category_id;
            if (category_id) {
                const query = { _id: ObjectId(category_id) };
                const cursor = categoriesCollection.find(query);
                const category = await cursor.toArray();
                res.send(category);
            }
            else {
                const query = {};
                const cursor = categoriesCollection.find(query);
                const categories = await cursor.toArray();
                res.send(categories);
            }
        });

        app.post('/create-user', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const alreadyUser = await usersCollection.findOne(query);
            if (!alreadyUser) {
                const result = await usersCollection.insertOne(user);
                res.send(result);
            }
            if (alreadyUser) {
                res.send(alreadyUser);
            }
        });
    }
    finally {

    }

}

run().catch(err => console.log(err));

app.get('/', async (req, res) => {
    res.send('Resale Market eKapor Server Is Running');
})

app.listen(port, () => console.log(`Resale Market eKapor Server Is Running On ${port}`));