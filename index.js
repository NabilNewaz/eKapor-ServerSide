const express = require('express');
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.zusdhlj.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const categoriesCollection = client.db('eKapor').collection('categories');

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
    }
    finally {

    }

}

run().catch(err => console.log(err));

app.get('/', async (req, res) => {
    res.send('Resale Market eKapor Server Is Running');
})

app.listen(port, () => console.log(`Resale Market eKapor Server Is Running On ${port}`));