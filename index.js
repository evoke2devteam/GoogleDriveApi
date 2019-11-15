const express = require('express');
const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const { celebrate, Joi } = require('celebrate');
const GDriveController =  require('./GDriveController');

app.use(cors());
app.use(bodyParser({ limit: '4MB' }));

app.post('/save-image', celebrate({
    body: Joi.object().keys({
        access_token: Joi.string().required(),
        mimeType: Joi.string().required(),
        name: Joi.string().required(),
        image: Joi.string().required(),
        idMission: Joi.string().required(),
        description: Joi.string().required(),
        id_gg: Joi.string().required()
    }).unknown()
}), (err, req, res, next) => {
    res.status(400).send({ status: false, message: 'Missing data to send' });
}, GDriveController.saveImageAPI);

app.listen(3000, () => {
    console.log('Server Run');
});