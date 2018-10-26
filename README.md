# fs-js-client

[![N|lrucache-nodejs](https://img.shields.io/badge/build%20-passing-green.svg?longCache=true&style=popout-square)](https://github.com/sivsivsree/fs-js-client)

File Service fs-js-client is a nodejs client for FileService Service. This is the library to consume your Fileservice server services. 
The server and detailed info you can find in github.
[![N|lrucache-nodejs](https://img.shields.io/badge/github%20-server-blue.svg?longCache=true&style=popout-square)](https://github.com/sivsivsree/file-service)

### About

fs-js-client uses a number of open source projects to work properly:

* [fs-extra] - File System on Sterioid!
* [amqplib] - RabbitMQ client service.


### Installation

Install the dependencies and start the server.

```sh
$ npm install fs-js-client --save
```

### Usage

```js
var client = require('fs-js-client').FileService;

const CREDENTIALS = {
    API_KEY: <KEY_GENERATED_FROM_CUSTOM_SERVER>,
    USER: <rabbitmq user>,
    PASS: <rabbitmq client>,
    HOST: <rabbitmq host, example- 192.168.1.153>,
    PORT: <PORT ex: 5672>
};

let service = new client(CREDENTIALS).setBucket("<BUCKET NAME>");

service.uploadFile(<path to file>).then((data) => {
    console.log(data);
});

//upload another file 
service.uploadFile("anotherfile.jpg").then((data) => {
    console.log(data);
});

//upload another file with diffrent bucket
service.setBucket("<NEW BUCKET>").uploadFile("anotherfile.jpg").then((data) => {
    console.log(data); //data.file will give you the file key in server which is used to reference the file.
});

//after upload you will get, 
//http://yourserverip/file/<YOUR BUCKET>/<FILENAME>
//will give you the file.
{
    bucket:<BUCKET NAME>,
    filename:<FILENAME>
}

```
 



[![N|lrucache-nodejs](https://img.shields.io/badge/with%20🖤-%20Siv%20S-red.svg?longCache=true&style=popout-square)](http://facebook.com/sivsivsree)
