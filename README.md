<div align="center">
    <a href="https://github.com/jajuoMarketCoder/bla">
        <img src="images/logo.png" />
    </a>
</div>

<details>
    <summary>Table of Contents</summary>
    <ol>
        <li>
            <a href="#about-this-project">About this Project</a>
            <ul>
                <li><a href="#built-with">Built with</a></li>
            </ul>
        </li>
        <li>
            <a href="#getting-started">Getting Started</a>
            <ul>
                <li>
                    <a href="#prerequisites">Prerequisites</a>
                    <ul>
                        <li><a href="#installing-and-setting-up-mariadb-on-debianubuntu">Installing and setting up MariaDB on Debian/Ubuntu</a></li>
                    </ul>
                </li>
                <li><a href="#installation">Installation</a></li>
                <li>
                    <a href="#configuration">Configuration</a>
                    <ul>
                        <li><a href="#port">Port</a></li>
                        <li><a href="#ssl">SSL</a></li>
                        <li><a href="#database">Database</a></li>
                        <li><a href="#websocket">Websocket</a></li>
                        <li><a href="#rate-limiters">Rate Limiters</a></li>
                    </ul>
                </li>
            </ul>
        </li>
        <li>
            <a href="#usage">Usage</a>
            <ul>
                <li><a href="#rest-api">REST API</a></li>
                <li>
                    <a href="#websocket-api">Websocket API</a>
                    <ul>
                        <li>
                            <a href="#channels">Channels</a>
                            <ul>
                                <li><a href="#chatrooms">chatrooms</a></li>
                                <li><a href="#chatrooms.{username}">chatrooms.{username}</a></li>
                                <li><a href="#users.{chatroom_id}">users.{chatroom_id}</a></li>
                                <li><a href="#message.{chatroom_id}">message.{chatroom_id}</a></li>
                                <li><a href="#message.{username}">message.{username}</a></li>
                            </ul>
                        </li>
                    </ul>
                </li>
            </ul>
        </li>
        <li><a href="#roadmap">Roadmap</a></li>
        <li><a href="#contributing">Contributing</a></li>
    </ol>
</details>





## About this Project

Bla is a simple chat server with a basic REST API implementation, as well as a custom implemented websocket event-driven architecture for instant messaging. As of now, it is just a practice project, and I did not design it for real-world usage, so it may have potential security risks.

### Built With
* [![typescript][typescript]][typescript-url]
* [![Node.js][node.js]][node-url]
* [![express][express]][express-url]
* [![mariadb][mariadb]][mariadb-url]
* [![toml][toml]][toml-url]

## Getting Started

### Prerequisites

The following things are needed before starting:
* A MariaDB server installation
* A newly created database
* A MariaDB user with all privileges on the newly created database

#### Installing and setting up MariaDB on Debian/Ubuntu

Install the MariaDB Server with the following command:

```bash
sudo apt install mariadb-server
```

Configure the fresh installation:

```bash
sudo mysql_secure_installation
```

Now, you need a new database and a user. Enter the SQL-Shell as root with the following command:

```bash
sudo mysql -u root
```

Create the new database with the following SQL query:

```sql
CREATE DATABASE bla CHARACTER SET = 'utf8mb4';
```

Note that 'bla' is the name of the database you are creating.

Now, create the new user by executing the following SQL query:

```sql
CREATE USER 'bla'@'localhost' IDENTIFIED BY 'YourPassword';
```

Please replace 'YourPassword' with your chosen password and 'bla' with your preferred username.

Grant all privileges to the newly created user on the newly created database:

```sql
GRANT ALL PRIVILEGES ON bla.* TO 'bla'@'localhost' IDENTIFIED BY 'YourPassword';
```

Apply the changes:

```sql
FLUSH PRIVILEGES;
```

Please make a note of the following acquired data:
* Database Name
* MySQL Username
* MySQL User Password

### Installation

1. Clone this repository:

```bash
git clone https://github.com/jajuoMarketCoder/bla.git
```

2. Install packages
```bash
npm install
```

3. Compile typescript files
```bash
tsc
```

4. Configuration

For configuration details, please refer to [Configuration](#Configuration)

5. Start the *bla* server
```bash
npm start
```

### Configuration

The following configuration variables can be set in config.toml.

#### Port

```toml
port=8192
```

#### SSL

If you have a valid SSL certificate for your domain, enable SSL and set the path to the key and cert files:

```toml
[ssl]
enabled=true
key_file="/path/to/your/key/file"
cert_file="/path/to/your/cert/file"
ca_file="/path/to/your/chain/file"
```

#### Database

Change the variables 'user,' 'password,' and 'name' to the values you specified during your MariaDB configuration. 'name' refers to the database name.

If you installed MariaDB on a different machine, you can set a different host:

```toml
[database]
host="localhost"
user="bla"
password="YourPassword"
name="bla"
charset="utf8mb4"
```

#### Websocket

Modify the URI path of the websocket API:

```toml
[websocket]
path="/realtime"
```

#### Bcrypt

Set the salt rounds of bcrypt. The more salt rounds, the more secure the hash. However, more salt rounds also mean greater computational effort. Please search the web for bcrypt when you don't know what this does.

bcrypt is used for hashing user passwords.

```toml
[bcrypt]
salt_rounds=12
```

#### session

With the session secret, all session cookies are signed. Please generate a long random string and replace the example value. Set the storage duration of sessions with 'cookie_max_age' in milliseconds.

```toml
[session]
secret="YourSessionSecret"
cookie_max_age=86400000
```

#### Rate Limiters

Rate limiting follows a simple logic as follows:

"Maximal {max} requests per {windowMs} milliseconds."

```toml
[rate_limiters]
windowMs = 60000
max = 60
```

The rate-limiting values can be set in the 'rate_limiters' table for all endpoints. Additionally, individual endpoints can be overridden. The table name for a specific endpoint follows this syntax:

```toml
[rate_limiters.{http_method}.{point_separated_path}]
```

Example:

```toml
[rate_limiters.delete.user.username]
```

The HTTP method corresponds to 'delete,' and the endpoint is '/user/:username'.

## Usage

### REST API

Please refer to the [Github Page](https://jajuomarketcoder.github.io/bla/) of this project to view the swagger UI.

### Websocket API

All messages are received and sent in JSON format.

A connection requires authentication using a session ID that refers to an authenticated session. The session ID must be included as a cookie named 'sid' in the WebSocket upgrade request; otherwise, the connection will be closed immediately.

To obtain a session ID, refer to the "/login" endpoint in the [REST API specification](https://jajuomarketcoder.github.io/bla/).

To receive real-time data from a channel, such as a chatroom, it must be subscribed to beforehand:

```json
{
    "topic": "subscribe",
    "payload": {
        "topics": [
            "chatrooms",
            ...
        ]
    }
}
```

A channel can be unsubscribed as follows:

```json
{
    "topic": "unsubscribe",
    "payload": {
        "topics": [
            "chatrooms",
            ...
        ]
    }
}
```

#### Channels

For each channel response, expect to receive a message of this type:

```json
{
    "topic": "topic name",
    "type": "message type",
    "payload": [...]
}
```

where "type" can be one of three types:
* snapshot
* insert
* delete

For the topic "users.{chatroom_id}" expect to receive a snapshot immediately after subscription as initial data.

For other topics, get a initial dataset from the REST API.

"delete" and "insert" will change the initial dataset.


##### chatrooms

Lists all available chatrooms that a user can join.

* topic name: chatrooms

Payload:
```json
[
    {
        "id": "7d77a53c-0e6b-4fd7-bef9-62faef73054a",
        "topic": "How to find a job",
        "owner_username": "AnneWand"
    },
    ...
]
```

##### chatrooms.{username}

Lists all available chatrooms owned by a specific user.

* topic name: chatrooms.{username}
* parameters: username

Payload:
```json
[
    {
        "id": "7d77a53c-0e6b-4fd7-bef9-62faef73054a",
        "topic": "How to find a job",
        "owner_username": "AnneWand"
    },
    ...
]
```

##### users.{chatroom_id}

Lists all users that are subscribed to this channel, too.

* topic name: users.{chatroom_id}
* parameters: chatroom_id

Payload:
```json
[
    {
        "username": "AnneWand",
        "description": "Hello, this is me!"
    },
    ...
]
```

##### message.{chatroom_id}

Lists all messages of a specific chatroom.

* topic name: message.{chatroom_id}
* parameters: chatroom_id

```json
[
  {
    "id": "08584e61-d3a8-4d32-bbb9-af3f80f7331d",
    "username": "AnneWand",
    "chatroom_id": "7e5ad11d-46be-4cb7-a019-b22b8a0a391b",
    "content": "Hello everyone!",
    "creation_time": 1689363578345
  }
]
```

##### message.{username}

Lists all messages of a specific user.

* topic name: message.{username}
* parameters: username

Payload:
```json
[
  {
    "id": "08584e61-d3a8-4d32-bbb9-af3f80f7331d",
    "username": "AnneWand",
    "chatroom_id": "7e5ad11d-46be-4cb7-a019-b22b8a0a391b",
    "content": "Hello everyone!",
    "creation_time": 1689363578345
  }
]
```

## Roadmap

- [x] Simple database design
- [x] MySQL database implementation
- [x] Basic REST API implementation
- [x] Basic websocket EDA
- [ ] Custom in-memory database implementation
- [ ] E-Mail authentification for signing-up
- [ ] Image attachment for messages

## Contributing

If anyone is interested in this project: Criticism, suggestions for improvement, and contributions of any kind are explicitly welcome. Please feel free to highlight any areas where I could improve.




[typescript]: https://img.shields.io/badge/typescript-DD0031?style=for-the-badge&logo=typescript&logoColor=white
[typescript-url]: https://www.typescriptlang.org/
[node.js]: https://img.shields.io/badge/node.js-DD0031?style=for-the-badge&logo=nodedotjs&logoColor=white
[node-url]: https://nodejs.org/
[express]: https://img.shields.io/badge/express.js-DD0031?style=for-the-badge&logo=express&logoColor=white
[express-url]: https://expressjs.com/
[mariadb]: https://img.shields.io/badge/mariadb-DD0031?style=for-the-badge&logo=mariadb&logoColor=white
[mariadb-url]: https://mariadb.org/
[toml]: https://img.shields.io/badge/toml-DD0031?style=for-the-badge&logo=toml&logoColor=white
[toml-url]: https://toml.io/