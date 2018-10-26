"use strict";
/*

Copyright 2018 Siv S<sivsivsree@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, 
modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the 
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE 
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR 
IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

const amqp = require('amqplib');
const crypto = require('crypto');
const path = require('path');
const fsx = require('fs-extra');
const splitFile = require('./services/file-splitter');

const QUEUE = 'fileservice.queue.presistent';

const Promise = require("bluebird");
const CHUNK_BUFFER = 2e+6;

class FileService {

    constructor(CRED) {
        this.QUEUE_CONNECTION = this._createAMQPCONN(CRED);
        this.API_KEY = CRED.API_KEY;
    }
    _createAMQPCONN(CRED) {
        return 'amqp://' + CRED.USER + ':' + CRED.PASS + '@' + CRED.HOST + ':' + CRED.PORT + '/'
    }

    async _prepareFile(file) {
        console.log(file);
        if (file.chunks.length == 1) {
            try {
                let buffer = await this._getFileBuffer(this._getFile(file));
                let msg = {
                    'bucket': this.bucket || "",
                    'chunks': false,
                    'filename': crypto.createHash('sha256').update(new Date().toString() + Math.random()).digest('hex') + path.extname(file.filename),
                    'apikey': this.API_KEY,
                    'file': buffer
                };
                await this._deleteDirIfExist(this._getFileDir(file.filename));
                return msg;
            } catch (e) {
                console.log(e);
                throw { error: "File prepration failed.", success: false };
            }
        } else if (file.chunks.length > 1) {
            const chunks = file.chunks;
            let msg = {
                'bucket': this.bucket || "",
                'chunks': true,
                'total': file.chunks.length,
                'filename': crypto.createHash('sha256').update(new Date().toString() + Math.random()).digest('hex') + path.extname(file.filename),
                'apikey': this.API_KEY,
            };
            for (let i = 0; i < chunks.length; i++) {
                let buffer = await this._getFileBuffer(this._getFile(file, i));
                msg.file = buffer;
                msg.chunkName = chunks[i];
                await this._sendStream(msg);
            }

            await this._deleteDirIfExist(this._getFileDir(file.filename));
            return msg;

        }
    }

    async _deleteDirIfExist(directory) {
        return await fsx.remove(directory);
    }

    async _getFileBuffer(file) {
        return await fsx.readFile(file);
    }

    _getFile(fileObject, fileIndex = 0) {
        return   this._getFileDir(fileObject.filename) + fileObject.chunks[fileIndex];
    }

    _getFileDir(file) {
        return "." + crypto.createHash('md5').update(file).digest('hex') + "/";
    }

    async _validateFile(file) {
        try {
            let deleted = await this._deleteDirIfExist(this._getFileDir(file))
            let names = await splitFile.splitFileBySize(file, CHUNK_BUFFER);
            let move = 0;
            for (let i = 0; i < names.length; i++) {
                await fsx.move(names[i], this._getFileDir(file) + names[i]);
            }
            return ({ filename: file, chunks: names });
        } catch (e) {
            return ({ error: e, success: false });
        }

    }

    async _openChannel() {
        try {
            this.open = await amqp.connect(this.QUEUE_CONNECTION);
            this.channel = await this.open.createChannel();
        } catch (e) {
            throw { error: "File upload failed.", success: false, err: e };
        }
    }

    async _sendStream(msg) {
        if (this.channel) {
            await this.channel.assertQueue(QUEUE, { durable: true });
            this.channel.sendToQueue(QUEUE, Buffer.from(JSON.stringify(msg)), { persistent: true });
            return;
        } else {
            this._sendStream(msg);
        }
    }

    setBucket(bucket) {
        this.bucket = bucket.replace(/[^\w\s]/gi, "-").split(" ").join("-").substr(0, 15);
        return this;
    }

    async uploadFile(file) {
        let fileId = "Somethign Unexpected happend";
        try {
            await this._openChannel();
            let fileChunks = await this._validateFile(file);
            let payload = await this._prepareFile(fileChunks);
            fileId = payload;

            if (payload && payload.chunks !== true) {
                await this._sendStream(payload);
            }
            fileId.file = "FILE_DATA";
            return {
                bucket:fileId.bucket,
                filename:fileId.filename
            };
        } catch (e) {
            console.log(e);
        }
    }

    close() {
        if (this.open) {
            this.open.close();
        }
    }
}


module.exports = { FileService: FileService };