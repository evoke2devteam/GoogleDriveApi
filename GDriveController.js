const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const base64ToImage = require('base64-to-image');
const request = require('request');

function listFolders(drive) {
    return new Promise((resolve, reject) => {
        const filesList = drive.files.list({
            q: "mimeType='application/vnd.google-apps.folder'",
            fields: 'files(id, name)'
        });
        filesList.then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

function createFolder(drive, name, path) {
    return new Promise((resolve, reject) => {
        if (name && path) {
            const createMissionFolder = drive.files.create({
                requestBody: {
                    'name': name,
                    'mimeType': 'application/vnd.google-apps.folder',
                    'parents': [path]
                }
            });
            createMissionFolder.then(data => {
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        } else {
            const cerateFolder = drive.files.create({
                requestBody: {
                    'name': 'Evoke',
                    'mimeType': 'application/vnd.google-apps.folder'
                }
            });
            cerateFolder.then(data => {
                resolve(data);
            }).catch(err => {
                reject(err);
            });
        }
    });
}

function createImages(drive, name, idFolder, mimeType) {
    return new Promise((resolve, reject) => {
        const driveResponse = drive.files.create({
            requestBody: {
                name: name,
                parents: [idFolder]
            },
            media: {
                mimeType: mimeType,
                body: fs.createReadStream(path.join(__dirname, `./${name}.jpg`))
            }
        });
        driveResponse.then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

function createPermissions(drive, idImage) {
    return new Promise((resolve, reject) => {
        var permission = {
            'type': 'anyone',
            'role': 'reader',
        };

        drive.permissions.create({
            resource: permission,
            fileId: idImage,
            fields: 'id',
        }, function (err, res) {
            if (err) {
                reject(err)
            } else {
                resolve(res)
            }
        });

    });
}

function createEvidence(){
    return new Promise((resolve, reject) => {
        
    })
}

function saveImageAPI(req, res) {
    let folderMissionId, folderEvokeId;
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
    const listFolder = async () => {
        return await listFolders(drive);
    }
    listFolder.call().then(listEvoke => {
        // Busca la carpeta de Evoke en el drive
        for (let i = 0; i < listEvoke.data.files.length; i++) {
            const element = listEvoke.data.files[i];
            if (element.name == 'Evoke') {
                folderEvokeId = element.id
            }
        }
        // Si no encuentra la carpeta de Evoke la crea
        if (!folderEvokeId) {
            const createEvokeFolder = async () => {
                return await createFolder(drive);
            }
            createEvokeFolder.call().then(dataEvokeFolder => {
                folderEvokeId = dataEvokeFolder.data.id;
                // Busca la carpeta de la mision
                listFolder.call().then(listMission => {
                    for (let i = 0; i < listMission.data.files.length; i++) {
                        const element = listMission.data.files[i];
                        if (element.name == req.body.idMission) {
                            folderMissionId = element.id
                        }
                    }
                    // Si no encuentra el id de la mision lo crea
                    if (!folderMissionId) {
                        const createMissionFolder = async () => {
                            return await createFolder(drive, req.body.idMission, folderEvokeId);
                        }
                        createMissionFolder.call().then(dataMissionFolder => {
                            folderMissionId = dataMissionFolder.data.id;
                            const createImage = async () => {
                                return await createImages(drive, req.body.name, folderMissionId, req.body.mimeType);
                            }
                            // Crea la imagen en google drive
                            createImage.call().then(dataImage => {
                                const permission = async () => {
                                    return await createPermissions(drive, dataImage.data.id);
                                }
                                // Crea los permisos de la imagen
                                permission.call().then(dataPermission => {
                                    res.status(200).send({ status: true, message: 'Image successfully created' });
                                    fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                        if (err) throw err;
                                    });
                                }).catch(err => {
                                    res.status(err.code).send({ status: false, message: 'Fail to create permissions', error: err });
                                });
                            }).catch(err => {
                                res.status(err.code).send({ status: false, message: 'Fail to save image', error: err });
                            });
                        }).catch(err => {
                            res.status(err.code).send({ status: false, message: 'Fail to create mission folder', error: err });
                        });
                    } else {
                        // Si existe el id de la mision crea la imagen en drive
                        const createImage = async () => {
                            return await createImages(drive, req.body.name, folderMissionId, req.body.mimeType);
                        }
                        // Crea la imagen en google drive
                        createImage.call().then(dataImage => {
                            const permission = async () => {
                                return await createPermissions(drive, dataImage.data.id);
                            }
                            // Crea los permisos de la imagen
                            permission.call().then(dataPermission => {
                                res.status(200).send({ status: true, message: 'Image successfully created' });
                                fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                    if (err) throw err;
                                });
                            }).catch(err => {
                                res.status(err.code).send({ status: false, message: 'Fail to create permissions', error: err });
                            });
                        }).catch(err => {
                            res.status(err.code).send({ status: false, message: 'Fail to save image', error: err });
                        });
                    }
                }).catch(err => {
                    res.status(err.code).send({ status: false, message: 'Fail to find mission folder', error: err });
                });
            }).catch(err => {
                res.status(err.code).send({ status: false, message: 'Fail to create Evoke folder', error: err });
            });
        } else {
            // Busca la carpeta de la mision
            listFolder.call().then(listMission => {
                for (let i = 0; i < listMission.data.files.length; i++) {
                    const element = listMission.data.files[i];
                    if (element.name == req.body.idMission) {
                        folderMissionId = element.id
                    }
                }
                // Si no encuentra el id de la mision lo crea
                if (!folderMissionId) {
                    const createMissionFolder = async () => {
                        return await createFolder(drive, req.body.idMission, folderEvokeId);
                    }
                    createMissionFolder.call().then(dataMissionFolder => {
                        folderMissionId = dataMissionFolder.data.id;
                        const createImage = async () => {
                            return await createImages(drive, req.body.name, folderMissionId, req.body.mimeType);
                        }
                        // Crea la imagen en google drive
                        createImage.call().then(dataImage => {
                            //console.log('http://drive.google.com/uc?export=view&id=' + dataImage.data.id);
                            const permission = async () => {
                                return await createPermissions(drive, dataImage.data.id);
                            }
                            // Crea los permisos de la imagen
                            permission.call().then(dataPermission => {
                                res.status(200).send({ status: true, message: 'Image successfully created' });
                                fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                    if (err) throw err;
                                });
                            }).catch(err => {
                                res.status(err.code).send({ status: false, message: 'Fail to create permissions', error: err });
                            });
                        }).catch(err => {
                            res.status(err.code).send({ status: false, message: 'Fail to save image', error: err });
                        });
                    }).catch(err => {
                        res.status(err.code).send({ status: false, message: 'Fail to create mission folder', error: err });
                    });
                } else {
                    // Si existe el id de la mision crea la imagen en drive
                    const createImage = async () => {
                        return await createImages(drive, req.body.name, folderMissionId, req.body.mimeType);
                    }
                    // Crea la imagen en google drive
                    createImage.call().then(dataImage => {
                        const permission = async () => {
                            return await createPermissions(drive, dataImage.data.id);
                        }
                        // Crea los permisos de la imagen
                        permission.call().then(dataPermission => {
                            res.status(200).send({ status: true, message: 'Image successfully created' });
                            fs.unlink(`./${req.body.name}.jpg`, (err) => {
                                if (err) throw err;
                            });
                        }).catch(err => {
                            res.status(err.code).send({ status: false, message: 'Fail to create permissions', error: err });
                        });
                    }).catch(err => {
                        res.status(err.code).send({ status: false, message: 'Fail to save image', error: err });
                    });
                }
            }).catch(err => {
                res.status(err.code).send({ status: false, message: 'Fail to find mission folder', error: err });
            });
        }
    }).catch(err => {
        res.status(err.code).send({ status: false, message: 'Fail to find Evoke folder', error: err });
    })
}


module.exports = {
    saveImageAPI

}