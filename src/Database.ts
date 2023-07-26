import fs from "fs";
import mysql from "mysql2/promise";
import Config from "./Config.js";


// QUERY PARAMTERS
export interface UpdateUser
{
    username: string;
    api_key?: string;
    user_description?: string;
}


// SCHEMAS
export interface User
{
    username: string;
    user_description: string;
}

export interface UserData
{
    username: string;
    api_key: string;
    user_description: string;
}

export interface Message
{
    id: string;
    username: string;
    chatroom_id: string;
    content: string;
    creation_time: Date;
}

export interface Chatroom
{
    id: string;
    topic: string;
    owner_username: string;
}


export default class Database
{
    private static UNDEFINED_CONNECTION_POOL_ERROR = new Error("connection pool was undefined after initialization");

    private config: Config;
    private connectionPool?: mysql.Pool;
    private initPromise: Promise<void>;

    constructor(config: Config)
    {
        this.config = config;
        this.initPromise = this.initialize();
    }

    public async insertUser(user: UserData)
    {
        const response = await this.execute(
            "INSERT INTO users VALUES (?, ?, ?)",
            [user.username, user.api_key, user.user_description]
        );

        return response != undefined;
    }

    public async deleteUser(username: string)
    {
        const response = await this.execute(
            "DELETE FROM users WHERE username=?",
            [username]
        );

        return response != undefined;
    }

    public async updateUser(data: UpdateUser)
    {
        let expressions = "";
        let values = new Array<string>();

        if(data.api_key)
        {
            if(expressions.length) expressions += ",";
            expressions += "api_key=?";
            values.push(data.api_key);
        }

        if(data.user_description)
        {
            if(expressions.length) expressions += ",";
            expressions += "user_description=?";
            values.push(data.user_description);
        }

        values.push(data.username);

        const response = await this.execute(
            "UPDATE users SET " + expressions + " WHERE username=?",
            values
        );

        return response != undefined;
    }

    public async getAllUsers()
    {
        const response = await this.query("SELECT * FROM users");
        return !response ? response : response[0] as User[];
    }

    public async getUser(username: string)
    {
        const response = await this.execute(
            "SELECT username,user_description FROM users WHERE username=?",
            [username]
        );

        return !response ? response : response[0] as User[];
    }

    public async getUserData(username: string)
    {
        const response = await this.execute(
            "SELECT * FROM users WHERE username=?",
            [username]
        );

        return !response ? response : response[0] as UserData[];
    }

    public async insertMessage(message: Message)
    {
        let isoTime = message.creation_time.toISOString();
        isoTime = isoTime.replace("T", " "),
        isoTime = isoTime.replace("Z", "");

        const response = await this.execute(
            "INSERT INTO messages VALUES (?, ?, ?, ?, ?)",
            [message.id, message.username, message.chatroom_id, message.content, isoTime]
        );

        return response != undefined;
    }

    public async deleteMessage(id: string)
    {
        const response = await this.execute(
            "DELETE FROM messages WHERE id=?",
            [id]
        );

        return response != undefined;
    }

    public async deleteMessagesByChatroomId(chatroomId: string)
    {
        const response = await this.execute(
            "DELETE FROM messages WHERE chatroom_id=?",
            [chatroomId]
        );

        return response != undefined;
    }

    public async getMessageById(id: string)
    {
        const response = await this.execute(
            "SELECT * FROM messages WHERE id=?",
            [id]
        );

        return !response ? response : response[0] as Message[];
    }

    public async getMessagesByUsername(username: string)
    {
        const response = await this.execute(
            "SELECT * FROM messages WHERE username=?",
            [username]
        );

        return !response ? response : response[0] as Message[];
    }

    public async getMessagesByChatroomId(chatroomId: string)
    {
        const response = await this.execute(
            "SELECT * FROM messages WHERE chatroom_id=?",
            [chatroomId]
        );

        return !response ? response : response[0] as Message[];
    }

    public async insertChatroom(chatroom: Chatroom)
    {
        const response = await this.execute(
            "INSERT INTO chatrooms VALUES (?, ?, ?)",
            [chatroom.id, chatroom.topic, chatroom.owner_username]
        );

        return response != undefined;
    }

    public async deleteChatroom(id: string)
    {
        const response = await this.execute(
            "DELETE FROM chatrooms WHERE id=?",
            [id]
        );

        return response != undefined;
    }

    public async getChatrooms()
    {
        const response = await this.query("SELECT * FROM chatrooms");
        return !response ? response : response[0] as Chatroom[];
    }

    public async getChatroomById(id: string)
    {
        const response = await this.execute(
            "SELECT * FROM chatrooms WHERE id=?",
            [id]
        );

        return !response ? response : response[0] as Chatroom[];
    }

    public async getChatroomsByOwner(owner_username: string)
    {
        const response = await this.execute(
            "SELECT * FROM chatrooms WHERE owner_username=?",
            [owner_username]
        );

        return !response ? response : response[0] as Chatroom[];
    }

    public async getChatroomByTopic(topic: string)
    {
        const response = await this.execute(
            "SELECT * FROM chatrooms WHERE topic=?",
            [topic]
        );

        return !response ? response : response[0] as Chatroom[];
    }

    private async initialize()
    {
        this.connectionPool = mysql.createPool({
            host: this.config.database.host,
            user: this.config.database.user,
            password: this.config.database.password,
            database: this.config.database.name,
        });

        const usersFileContent = fs.readFileSync("./sql/users.sql", "utf8");
        const messagesFileContent = fs.readFileSync("./sql/messages.sql", "utf8");
        const chatroomsFileContent = fs.readFileSync("./sql/chatrooms.sql", "utf8");

        await this.connectionPool.query(usersFileContent);
        await this.connectionPool.query(messagesFileContent);
        await this.connectionPool.query(chatroomsFileContent);
    }


    private async execute(query: string, parameters: Array<string | number>)
    {
        await this.initPromise;

        if(!this.connectionPool)
            throw Database.UNDEFINED_CONNECTION_POOL_ERROR;

        try
        {
            return await this.connectionPool.execute(query, parameters);
        }
        catch(error)
        {
            return undefined;
        }
    }

    private async query(query: string)
    {
        await this.initPromise;

        if(!this.connectionPool)
            throw Database.UNDEFINED_CONNECTION_POOL_ERROR;

        try
        {
            return await this.connectionPool.query(query);
        }
        catch(error)
        {
            return undefined;
        }
    }
}