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
        image: Joi.string().required(),
        idMission: Joi.string().required()
    }).unknown()
}), (err, req, res, next) => {
    res.status(400).send({ status: false, message: 'Missing data to send' });
}, (req, res) => {
    const optionalObj = { 'fileName': req.body.name, 'type': 'jpg' };
    base64ToImage(req.body.image, './', optionalObj);
    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({
        access_token: req.body.access_token
    });
    const drive = google.drive({
        version: 'v3',
        auth: authClient
    });
    const filesListResponse = drive.files.list({
        q: "mimeType='application/vnd.google-apps.folder'",
        fields: 'files(id, name)'
    });
    filesListResponse.then(dataList => {
        let folderEvokeId;
        let folderMissionId;
        // Busca en la raíz de la carpeta una carpeta que se Llama Evoke
        if (dataList.data.files.length > 0) {
            for (let i = 0; i < dataList.data.files.length; i++) {
                const element = dataList.data.files[i];
                if (element.name == 'Evoke') {
                    folderEvokeId = element.id;
                }
            }
            // Si no la encuentra la créa, crea la carptea de la misión y sube la evidencia.
            if (!folderEvokeId) {
                const cerateFolderEvokeResponse = drive.files.create({
                    requestBody: {
                        'name': 'Evoke',
                        'mimeType': 'application/vnd.google-apps.folder'
                    }
                });
                cerateFolderEvokeResponse.then(dataFolder => {
                    folderEvokeId = dataFolder.data.id;
                    const createMissionFolder = drive.files.create({
                        requestBody: {
                            'name': req.body.idMission,
                            'mimeType': 'application/vnd.google-apps.folder',
                            'parents': [folderEvokeId]
                        }
                    });
                    createMissionFolder.then(dataMissionFolder => {
                        folderMissionId = dataMissionFolder.data.id;
                        const driveResponse = drive.files.create({
                            requestBody: {
                                name: req.body.name,
                                parents: ["1VatdZaOpKFUJ97Ujud3hbWolc86Gi1_3"]
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
                            fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                if (err) throw err;
                            });
                        }).catch(err => {
                            res.status(err.code).send({ status: false, message: 'Fail to save the imagen', error: err.code });
                        });
                    }).catch(errMissionFolder => {
                        res.status(errMissionFolder.code).send({ status: false, message: 'Fail to create a mission folder in drive', error: errMissionFolder });
                    });
                }).catch(errFolder => {
                    res.status(errFolder.code).send({ status: false, message: 'Fail to create a Evoke folder in drive', error: errFolder });
                });


            } else {
                // Si encuentra la carpeta revisa las carpetas de las misiones
                const listFolderMission = drive.files.list({
                    q: "'" + folderEvokeId + "' in parents and trashed=false and mimeType='application/vnd.google-apps.folder'",
                    fields: 'files(id, name)'
                });
                listFolderMission.then(dataFolderMissions => {
                    for (let i = 0; i < dataFolderMissions.data.files.length; i++) {
                        const element = dataFolderMissions.data.files[i];
                        if (element.name == req.body.idMission) {
                            folderMissionId = element.id
                        }
                    }
                    // Si no existe la mision la crea
                    if (!folderMissionId) {
                        const createMissionFolder = drive.files.create({
                            requestBody: {
                                'name': req.body.idMission,
                                'mimeType': 'application/vnd.google-apps.folder',
                                'parents': [folderEvokeId]
                            }
                        });
                        createMissionFolder.then(dataMissionFolder => {
                            folderMissionId = dataMissionFolder.data.id;
                            const driveResponse = drive.files.create({
                                requestBody: {
                                    name: req.body.name,
                                    parents: [folderMissionId]
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
                                fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                    if (err) throw err;
                                });
                            }).catch(err => {
                                res.status(err.code).send({ status: false, message: 'Fail to save the imagen', error: err.code });
                            });
                        }).catch(errMissionFolder => {
                            res.status(errMissionFolder.code).send({ status: false, message: 'Fail to create a mission folder in drive', error: errMissionFolder });
                        });
                    } else {
                        // Si existe la carpeta de la mision guarda la evidencia
                        const driveResponse = drive.files.create({
                            requestBody: {
                                name: req.body.name,
                                parents: [folderMissionId]
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
                            fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                if (err) throw err;
                            });
                        }).catch(err => {
                            res.status(err.code).send({ status: false, message: 'Fail to save the imagen', error: err.code });
                        });
                    }
                }).catch(errFolderMiission => {
                    res.status(errFolderMiission.code).send({ status: false, message: 'Fail to find a mission folder in drive', error: errFolderMiission });
                });
            }
        } else {
            // Si no se regresa un arreglo, se crea aquí
            const cerateFolderEvokeResponse = drive.files.create({
                requestBody: {
                    'name': 'Evoke',
                    'mimeType': 'application/vnd.google-apps.folder'
                }
            });
            cerateFolderEvokeResponse.then(dataFolder => {
                folderEvokeId = dataFolder.data.id;
                const createMissionFolder = drive.files.create({
                    requestBody: {
                        'name': req.body.idMission,
                        'mimeType': 'application/vnd.google-apps.folder',
                        'parents': [folderEvokeId]
                    }
                });
                createMissionFolder.then(dataMissionFolder => {
                    folderMissionId = dataMissionFolder.data.id;
                    const driveResponse = drive.files.create({
                        requestBody: {
                            name: req.body.name,
                            parents: [folderMissionId]
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
                        fs.unlink(`./${req.body.name}.jpg`, (err) => {
                            if (err) throw err;
                        });
                    }).catch(err => {
                        res.status(err.code).send({ status: false, message: 'Fail to save the imagen', error: err.code });
                    });
                }).catch(errMissionFolder => {
                    res.status(errMissionFolder.code).send({ status: false, message: 'Fail to create a mission folder in drive', error: errMissionFolder });
                });
            }).catch(errFolder => {
                res.status(errFolder.code).send({ status: false, message: 'Fail to create a Evoke folder in drive', error: errFolder });
            });
        }
    }).catch(errFind => {
        res.status(errFind.code).send({ status: false, message: 'Fail to find a Evoke folder in drive', error: errFind });
    });
});

app.listen(3000, () => {
    console.log('Server Run');
});