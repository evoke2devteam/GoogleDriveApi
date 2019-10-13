const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { celebrate, Joi } = require('celebrate');
const base64ToImage = require('base64-to-image');


app.use(cors());
app.use(bodyParser({ limit: '4MB' }));

app.post('/save-image', celebrate({
    body: Joi.object().keys({
        access_token: Joi.string().required(),
        mimeType: Joi.string().required(),
        name: Joi.string().required(),
        image: Joi.string().required()
    }).unknown()
}), (err, req, res, next) => {
    res.status(400).send({ status: false, message: 'missing data to send' });
}, (req, res) => {
    const optionalObj = { 'fileName': req.body.name, 'type': 'jpg' };
    base64ToImage(req.body.image, './', optionalObj);
    const authClient = new google.auth.OAuth2()
    authClient.setCredentials({
        access_token: req.body.access_token
    });
    const drive = google.drive({
        version: 'v3',
        auth: authClient
    });
    const driveResponse = drive.files.create({
        requestBody: {
            name: req.body.name,
            mimeType: req.body.mimetype
        },
        media: {
            mimeType: req.body.mimeType,
            body: fs.createReadStream(path.join(__dirname, `./${req.body.name}.jpg`))
        }
    });
    driveResponse.then(data => {
        if (data.status == 200) {
            res.status(200).send({ status: true, message: 'Image uploaded successfully' });
        } else {
            res.status(data.status).send({ status: false, message: 'Something failed' });
        }
    }).catch(err => {
        res.status(err.code).send({ status: false, message: 'Fail to save the imagen', error: err.code });
    });
    fs.unlink(`./${req.body.name}.jpg`, (err) => {
        if (err) throw err;
    });
});

app.listen(3000, () => {
    console.log('Server Run');
});