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
        const productsCollection = client.db('eKapor').collection('products');
        const usersCollection = client.db('eKapor').collection('users');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '2h' });
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

        app.get('/categories-name', async (req, res) => {
            const query = {};
            const cursor = categoriesCollection.find(query).project({ category_name: 1 });
            const categories = await cursor.toArray();
            res.send(categories);
        });

        app.post('/create-user', verifyJWT, async (req, res) => {
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

        app.get('/users', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const User = await usersCollection.findOne(userQuery);
            if (User) {
                res.send(User);
            }
            else {
                return res.send([]);
            }
        });

        app.get('/products/:productCategory', verifyJWT, async (req, res) => {
            const categoryID = req.params.productCategory;
            const allProducts = await productsCollection.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'product_sellerID',
                        foreignField: 'uid',
                        as: 'seller_details'
                    }
                }
            ]).toArray();
            const products = allProducts.filter(pd => pd.product_category == categoryID && !pd.isBooked)
            res.send(products);
        })

        app.get('/my-orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const User = await usersCollection.findOne(userQuery);
            if (User) {
                const allProducts = await productsCollection.aggregate([
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'product_sellerID',
                            foreignField: 'uid',
                            as: 'seller_details'
                        }
                    }
                ]).toArray();
                const products = allProducts.filter(pd => pd.isBooked && pd.bookedData.userID == decoded.uid)
                res.send(products);
            }
            else {
                return res.send([]);
            }
        })

        app.get('/sellers', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'admin') {
                const query = { role: 'seller' };
                const cursor = usersCollection.find(query);
                const sellers = await cursor.toArray();
                res.send(sellers);
            }
            else {
                return res.status(401).send({ message: 'unauthorized access' });
            }
        });

        app.get('/buyers', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'admin') {
                const query = { role: 'buyer' };
                const cursor = usersCollection.find(query);
                const sellers = await cursor.toArray();
                res.send(sellers);
            }
            else {
                return res.status(401).send({ message: 'unauthorized access' });
            }
        });

        app.patch('/verify-seller/:id', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'admin') {
                const id = req.params.id;
                const updateVerifyData = req.body;
                const query = { uid: id };
                const options = { upsert: true };
                const updatedUser = {
                    $set: updateVerifyData
                }
                const result = await usersCollection.updateOne(query, updatedUser, options);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'unauthorized access' });
            }
        });

        app.delete('/sellers/:id', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'admin') {
                const id = req.params.id;
                const query = { uid: id };
                const result = await usersCollection.deleteOne(query);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'unauthorized access' });
            }
        })

        app.delete('/buyers/:id', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'admin') {
                const id = req.params.id;
                const query = { uid: id };
                const result = await usersCollection.deleteOne(query);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'unauthorized access' });
            }
        });

        app.delete('/product/:id', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'seller') {
                const id = req.params.id;
                const query = { _id: ObjectId(id) };
                const result = await productsCollection.deleteOne(query);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'unauthorized access' });
            }
        });

        app.post('/add-product', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'seller') {
                const product = req.body;
                const result = await productsCollection.insertOne(product);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'unauthorized access' });
            }
        });

        app.patch('/peoduct-advertise/:id', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'seller') {
                const id = req.params.id;
                const updateAdvertiseData = req.body;
                const query = { _id: ObjectId(id) };
                const options = { upsert: true };
                const advertiseData = {
                    $set: updateAdvertiseData
                }
                const result = await productsCollection.updateOne(query, advertiseData, options);
                res.send(result);
            }
            else {
                return res.status(403).send({ message: 'unauthorized access' });
            }
        });

        app.get('/advertise-product', async (req, res) => {
            const allProducts = await productsCollection.aggregate([
                {
                    $lookup: {
                        from: 'users',
                        localField: 'product_sellerID',
                        foreignField: 'uid',
                        as: 'seller_details'
                    }
                }
            ]).toArray();
            const products = allProducts.filter(pd => pd.isAdvertised == true && !pd.isBooked)
            res.send(products);
        });

        app.patch('/product-booked/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const updateProductData = req.body;
            const query = { _id: ObjectId(id) };
            const options = { upsert: true };
            const updatedProduct = {
                $set: updateProductData
            }
            const result = await productsCollection.updateOne(query, updatedProduct, options);
            res.send(result);
        });

        app.get('/my-products', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            const userQuery = { uid: decoded.uid };
            const checkUser = await usersCollection.findOne(userQuery);
            if (checkUser.role === 'seller') {
                const query = { product_sellerID: decoded.uid };
                const cursor = productsCollection.find(query);
                const myproducts = await cursor.toArray();
                res.send(myproducts);
            }
            else {
                return res.status(401).send({ message: 'unauthorized access' });
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