import crypto from "crypto";
import { EventEmitter } from "events";
import express, { Express, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import cors from "cors";
import bcrypt from "bcrypt";
import Database from "./Database.js";
import { ValidationStrategies } from "./Api.js";
import Config from "./Config.js";


// REQUEST SCHEMAS
export interface Login
{
    username: string;
    password: string;
}

export interface CreateUser
{
    username: string;
    password: string;
    description?: string;
}

export interface UpdateUser
{
    old_password?: string;
    password?: string;
    description?: string;
}

export interface DeleteUser
{
    username: string;
}

export interface GetUserByName
{
    username: string;
}

export interface CreateMessage
{
    chatroom_id: string;
    content: string;
}

export interface DeleteMessage
{
    id: string;
}

export interface GetMessageById
{
    id: string;
}

export interface GetMessageByUsername
{
    username: string;
}

export interface GetMessageByChatroomId
{
    chatroom_id: string;
}

export interface CreateChatroom
{
    topic: string;
}

export interface DeleteChatroom
{
    id: string;
}

export interface GetChatrooms
{
    order_by?: string;
    desc?: boolean;
}

export interface GetChatroomsByUsername
{
    username: string;
}


// RESPONSE SCHEMAS
export interface User
{
    username: string;
    description: string;
}

export interface UserData
{
    username: string;
    description: string;
    password_hash: string;
}

export interface Message
{
    id: string;
    username: string;
    chatroom_id: string;
    content: string;
    creation_time: number;
}

export interface Chatroom
{
    id: string;
    topic: string;
    owner_username: string;
    creation_time: number;
}

declare module "express-session"
{
    interface SessionData
    {
        username: string;
    }
}

export declare interface RestAPI
{
    on(event: "create_user", listener: (user: User) => void): this;
    once(event: "create_user", listener: (user: User) => void): this;
    emit(event: "create_user", user: User): boolean;
    on(event: "update_user", listener: (user: User) => void): this;
    once(event: "update_user", listener: (user: User) => void): this;
    emit(event: "update_user", user: User): boolean;
    on(event: "delete_user", listener: (username: string) => void): this;
    once(event: "delete_user", listener: (username: string) => void): this;
    emit(event: "delete_user", username: string): boolean;
    on(event: "post_message", listener: (apiMessage: Message) => void): this;
    once(event: "post_message", listener: (apiMessage: Message) => void): this;
    emit(event: "post_message", apiMessage: Message): boolean;
    on(event: "delete_message", listener: (apiMessage: Message) => void): this;
    once(event: "delete_message", listener: (apiMessage: Message) => void): this;
    emit(event: "delete_message", apiMessage: Message): boolean;
    on(event: "post_chatroom", listener: (apiChatroom: Chatroom) => void): this;
    once(event: "post_chatroom", listener: (apiChatroom: Chatroom) => void): this;
    emit(event: "post_chatroom", apiChatroom: Chatroom): boolean;
    on(event: "delete_chatroom", listener: (apiChatroom: Chatroom) => void): this;
    once(event: "delete_chatroom", listener: (apiChatroom: Chatroom) => void): this;
    emit(event: "delete_chatroom", apiChatroom: Chatroom): boolean;
}

export class RestAPI extends EventEmitter
{
    private config: Config;
    private validationStrategies: ValidationStrategies;
    private database: Database;
    private expressInstance: Express;

    constructor(config: Config, validationStrategies: ValidationStrategies, expressInstance: Express, database: Database)
    {
        super();
        this.config = config;
        this.validationStrategies = validationStrategies;
        this.database = database;
        this.expressInstance = expressInstance;
        this.expressInstance.use(express.json());
        this.expressInstance.use(cors({
            credentials: true,
            origin: true,
            exposedHeaders: ["set-cookie"],
        }));

        const rateLimiterCfg = this.config.rate_limiters;

        // USER ENDPOINTS
        this.expressInstance.post("/login", rateLimit(rateLimiterCfg.post.login ? rateLimiterCfg.post.login : rateLimiterCfg), this.login.bind(this));
        this.expressInstance.post("/logout", rateLimit(rateLimiterCfg.post.logout ? rateLimiterCfg.post.logout : rateLimiterCfg), this.logout.bind(this));
        this.expressInstance.post("/user", rateLimit(rateLimiterCfg.post.user ? rateLimiterCfg.post.user : rateLimiterCfg), this.createUser.bind(this));
        this.expressInstance.put("/user", rateLimit(rateLimiterCfg.put.user ? rateLimiterCfg.put.user : rateLimiterCfg), this.updateUser.bind(this));
        this.expressInstance.delete("/user/:username", rateLimit(rateLimiterCfg.delete.user.username ? rateLimiterCfg.delete.user.username : rateLimiterCfg), this.deleteUser.bind(this) as any);
        this.expressInstance.get("/user", rateLimit(rateLimiterCfg.get.user ? rateLimiterCfg.get.user : rateLimiterCfg), this.getUsers.bind(this) as any);
        this.expressInstance.get("/user/:username", rateLimit(rateLimiterCfg.get.user.username ? rateLimiterCfg.get.user.username : rateLimiterCfg), this.getUserByName.bind(this) as any);

        // MESSAGE ENDPOINTS
        this.expressInstance.post("/message", rateLimit(rateLimiterCfg.post.message ? rateLimiterCfg.post.message : rateLimiterCfg), this.postMessage.bind(this));
        this.expressInstance.delete("/message/:id", rateLimit(rateLimiterCfg.delete.message.id ? rateLimiterCfg.delete.message.id : rateLimiterCfg), this.deleteMessage.bind(this) as any);
        this.expressInstance.get("/message/:id", rateLimit(rateLimiterCfg.get.message.id ? rateLimiterCfg.get.message.id : rateLimiterCfg), this.getMessageById.bind(this) as any);
        this.expressInstance.get("/message/user/:username", rateLimit(rateLimiterCfg.get.message.user.username ? rateLimiterCfg.get.message.user.username : rateLimiterCfg), this.getMessagesByUsername.bind(this) as any);
        this.expressInstance.get("/message/chatroom/:chatroom_id", rateLimit(rateLimiterCfg.get.message.chatroom.chatroom_id ? rateLimiterCfg.get.message.chatroom.chatroom_id : rateLimiterCfg), this.getMessagesByChatroomId.bind(this) as any);

        // CHATROOM ENDPOINTS
        this.expressInstance.post("/chatroom", rateLimit(rateLimiterCfg.post.chatroom ? rateLimiterCfg.post.chatroom : rateLimiterCfg), this.postChatroom.bind(this));
        this.expressInstance.delete("/chatroom/:id", rateLimit(rateLimiterCfg.delete.chatroom.id ? rateLimiterCfg.delete.chatroom.id : rateLimiterCfg), this.deleteChatroom.bind(this) as any);
        this.expressInstance.get("/chatroom", rateLimit(rateLimiterCfg.get.chatroom ? rateLimiterCfg.get.chatroom : rateLimiterCfg), this.getChatrooms.bind(this) as any);
        this.expressInstance.get("/chatroom/:username", rateLimit(rateLimiterCfg.get.chatroom.username ? rateLimiterCfg.get.chatroom.username : rateLimiterCfg), this.getChatroomsByUsername.bind(this) as any);
    }

    // USER OPERATIONS
    private async login(req: Request<any, any, Login>, res: Response<User>)
    {
        const isRequestDataValid = (
            this.validationStrategies.usernameValidationStrategy.validate(req.body.username) &&
            this.validationStrategies.passwordValidationStrategy.validate(req.body.password)
        );

        if(!isRequestDataValid)
            return res.status(401).send();

        const userData = await this.verifyUser(req.body.username, req.body.password, res);
        if(!userData)
            return res.status(401).send();

        req.session.username = userData.username;

        return res.status(200).send({
            username: userData.username,
            description: userData.user_description,
        });
    }

    private async logout(req: Request, res: Response)
    {
        if(!req.session.username)
            return res.status(404).send();

        req.session.username = undefined;

        return res.status(200).send();
    }

    private async createUser(req: Request<any, any, CreateUser>, res: Response<User>)
    {
        const isRequestDataValid = (
            this.validationStrategies.usernameValidationStrategy.validate(req.body.username) &&
            (req.body.description ? this.validationStrategies.descriptionValidationStrategy.validate(req.body.description) : true) &&
            this.validationStrategies.passwordValidationStrategy.validate(req.body.password)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const passwordHash = await this.createPasswordHash(req.body.password);

        const dbUsers = await this.database.getUser(req.body.username);
        if(dbUsers === undefined)
            return res.status(500).send();

        if(dbUsers.length)
            return res.status(409).send();

        let newUser: User = {
            username: req.body.username,
            description: req.body.description ? req.body.description : "",
        };

        const dbInsertionResult = await this.database.insertUser({
            username: newUser.username,
            password_hash: passwordHash,
            user_description: newUser.description,
        });

        if(!dbInsertionResult)
            return res.status(500).send();

        req.session.username = newUser.username;
        this.emit("create_user", newUser);

        return res.status(200).json(newUser);
    }

    private async updateUser(req: Request<any, any, UpdateUser>, res: Response<User>)
    {
        const sessionUsername = req.session.username;

        if(sessionUsername == undefined)
            return res.status(401).send();

        const isRequestDataValid = (
            (req.body.password ? this.validationStrategies.passwordValidationStrategy.validate(req.body.password) : true) &&
            (req.body.description ? this.validationStrategies.descriptionValidationStrategy.validate(req.body.description) : true)
        );

        if(!isRequestDataValid)
            return res.status(400).send();
            
        const dbUserDataResponse = await this.database.getUserData(sessionUsername);
        if(dbUserDataResponse === undefined)
            return res.status(500).send();

        if(!dbUserDataResponse.length)
            return res.status(404).send();
            
        const userData = dbUserDataResponse[0];

        let newPasswordHash: string | undefined = undefined;
        if(req.body.old_password && req.body.password)
        {
            if(!(await this.verifyUser(sessionUsername, req.body.old_password, res)))
                return;

            newPasswordHash = await this.createPasswordHash(req.body.password);
        }

        const dbUpdateResponse = await this.database.updateUser({
            username: sessionUsername,
            password_hash: newPasswordHash,
            user_description: req.body.description,
        });

        if(!dbUpdateResponse)
            return res.status(500).send();

        this.emit("update_user", {
            username: sessionUsername,
            description: req.body.description ? req.body.description : userData.user_description,
        });

        return res.status(200).json({
            username: sessionUsername,
            description: req.body.description ? req.body.description : userData.user_description,
        });
    }

    private async deleteUser(req: Request<DeleteUser>, res: Response)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = this.validationStrategies.usernameValidationStrategy.validate(req.params.username);

        if(!isRequestDataValid)
            return res.status(400).send();

        if(sessionUsername != req.params.username)
            return res.status(401).send();
        
        const dbUserDeletionResponse = await this.database.deleteUser(req.params.username);
        if(!dbUserDeletionResponse)
            return res.status(500).send();

        this.emit("delete_user", req.params.username);

        return res.status(200).send();
    }
    
    private async getUsers(req: Request, res: Response<User[]>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const dbUserListResponse = await this.database.getAllUsers();
        if(dbUserListResponse === undefined)
            return res.status(500).send();

        return res.status(200).json(dbUserListResponse.map(user => {
            let apiFormat: User = {
                username: user.user_description,
                description: user.user_description,
            }

            return apiFormat;
        }));
    }

    private async getUserByName(req: Request<GetUserByName>, res: Response<User>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.usernameValidationStrategy.validate(req.params.username)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const dbUserResponse = await this.database.getUser(req.params.username);
        if(dbUserResponse === undefined)
            return res.status(500).send();

        if(!dbUserResponse.length)
            return res.status(404).send();

        const user = dbUserResponse[0];

        let userApiFormat: User = {
            username: user.username,
            description: user.user_description,
        };

        res.status(200).json(userApiFormat);
    }

    // MESSAGE OPERATIONS
    private async postMessage(req: Request<any, any, CreateMessage>, res: Response)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.uuidValidationStrategy.validate(req.body.chatroom_id) &&
            this.validationStrategies.contentValidationStrategy.validate(req.body.content)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const dbChatroomResponse = await this.database.getChatroomById(req.body.chatroom_id);
        if(dbChatroomResponse === undefined)
            return res.status(500).send();

        if(!dbChatroomResponse.length)
            return res.status(404).send();

        let apiMessage: Message = {
            id: crypto.randomUUID(),
            username: sessionUsername,
            chatroom_id: req.body.chatroom_id,
            content: req.body.content,
            creation_time: Date.now(),
        };

        const dbMessageInsertionResponse = await this.database.insertMessage({
            id: apiMessage.id,
            username: apiMessage.username,
            chatroom_id: apiMessage.chatroom_id,
            content: apiMessage.content,
            creation_time: new Date(apiMessage.creation_time),
        });

        if(!dbMessageInsertionResponse)
            return res.status(500).send();

        this.emit("post_message", apiMessage);

        return res.status(200).json(apiMessage);
    }

    private async deleteMessage(req: Request<DeleteMessage>, res: Response)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.uuidValidationStrategy.validate(req.params.id)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const dbMessageResponse = await this.database.getMessageById(req.params.id);
        if(dbMessageResponse === undefined)
            return res.status(500).send();

        if(!dbMessageResponse.length)
            return res.status(404).send();

        const message = dbMessageResponse[0];
        if(message.username != sessionUsername)
            return res.status(401).send();

        const dbMessageDeletionResponse = await this.database.deleteMessage(message.id);
        if(!dbMessageDeletionResponse)
            return res.status(500).send();

        this.emit("delete_message", {
            id: message.id,
            username: message.username,
            chatroom_id: message.chatroom_id,
            content: message.content,
            creation_time: message.creation_time.getTime(),
        });

        return res.status(200).send();
    }

    private async getMessageById(req: Request<GetMessageById>, res: Response<Message>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.uuidValidationStrategy.validate(req.params.id)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const dbMessageResponse = await this.database.getMessageById(req.params.id);
        if(dbMessageResponse === undefined)
            return res.status(500).send();

        if(!dbMessageResponse.length)
            return res.status(404).send();

        const message = dbMessageResponse[0];

        let apiMessage: Message = {
            id: message.id,
            username: message.username,
            chatroom_id: message.chatroom_id,
            content: message.content,
            creation_time: message.creation_time.getTime(),
        };

        return res.status(200).json(apiMessage);
    }

    private async getMessagesByUsername(req: Request<GetMessageByUsername>, res: Response<Message[]>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.usernameValidationStrategy.validate(req.params.username)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const messages = await this.database.getMessagesByUsername(req.params.username);
        if(messages === undefined)
            return res.status(500).send();

        return res.status(200).json(messages.map(message => {
            let apiMessage: Message = {
                id: message.id,
                username: message.username,
                chatroom_id: message.chatroom_id,
                content: message.content,
                creation_time: message.creation_time.getTime(),
            };

            return apiMessage;
        }));
    }

    private async getMessagesByChatroomId(req: Request<GetMessageByChatroomId>, res: Response<Message[]>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.uuidValidationStrategy.validate(req.params.chatroom_id)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const messages = await this.database.getMessagesByChatroomId(req.params.chatroom_id);
        if(messages === undefined)
            return res.status(500).send();

        return res.status(200).json(messages.map(message => {
            let apiMessage: Message = {
                id: message.id,
                username: message.username,
                chatroom_id: message.chatroom_id,
                content: message.content,
                creation_time: message.creation_time.getTime(),
            };

            return apiMessage;
        }));
    }

    // CHATROOM OPERATIONS
    private async postChatroom(req: Request<any, any, CreateChatroom>, res: Response<Chatroom>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.topicValidationStrategy.validate(req.body.topic)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const dbChatroomByTopicResponse = await this.database.getChatroomByTopic(req.body.topic);
        if(dbChatroomByTopicResponse === undefined)
            return res.status(500).send();
        
        if(dbChatroomByTopicResponse.length)
            return res.status(409).send();
        
        let apiChatroom: Chatroom = {
            id: crypto.randomUUID(),
            owner_username: sessionUsername,
            topic: req.body.topic,
            creation_time: Date.now(),
        };
        
        const dbChatroomInsertionResponse = await this.database.insertChatroom({ ...apiChatroom, creation_time: new Date(apiChatroom.creation_time) });
        if(!dbChatroomInsertionResponse)
            return res.status(500).send();
        
        this.emit("post_chatroom", apiChatroom);
        
        return res.status(200).json(apiChatroom);
    }

    private async deleteChatroom(req: Request<DeleteChatroom>, res: Response)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.uuidValidationStrategy.validate(req.params.id)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const dbChatroomResponse = await this.database.getChatroomById(req.params.id);
        if(dbChatroomResponse === undefined)
            return res.status(500).send();

        if(!dbChatroomResponse.length)
            return res.status(404).send();

        const chatroom = { ...dbChatroomResponse[0], creation_time: dbChatroomResponse[0].creation_time.getTime() };
        if(chatroom.owner_username != sessionUsername)
            return res.status(401).send();

        const dbMessagesDeletionResponse = await this.database.deleteMessagesByChatroomId(req.params.id);
        if(!dbMessagesDeletionResponse)
            return res.status(500).send();

        const dbChatroomDeletionResponse = await this.database.deleteChatroom(req.params.id);
        if(!dbChatroomDeletionResponse)
            return res.status(500).send();

        this.emit("delete_chatroom", chatroom);

        return res.status(200).send();
    }

    private async getChatrooms(req: Request<any, any, any, GetChatrooms>, res: Response<Chatroom[]>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const chatrooms = await this.database.getChatrooms(req.query.order_by, req.query.desc);
        if(chatrooms === undefined)
            return res.status(500).send();

        return res.status(200).json(chatrooms.map(value => {
            return { ...value, creation_time: value.creation_time.getTime() };
        }));
    }

    private async getChatroomsByUsername(req: Request<GetChatroomsByUsername, any, any, GetChatrooms>, res: Response<Chatroom[]>)
    {
        const sessionUsername = req.session.username;

        if(!sessionUsername)
            return res.status(401).send();

        const isRequestDataValid = (
            this.validationStrategies.usernameValidationStrategy.validate(req.params.username)
        );

        if(!isRequestDataValid)
            return res.status(400).send();

        const chatrooms = await this.database.getChatroomsByOwner(req.params.username, req.query.order_by, req.query.desc);
        if(chatrooms === undefined)
            return res.status(500).send();
        
        return res.status(200).json(chatrooms.map(value => {
            return { ...value, creation_time: value.creation_time.getTime() };
        }));
    }

    private async verifyUser(username: string, password: string, res: Response)
    {
        const dbUserResponse = await this.database.getUserData(username);
        if(dbUserResponse === undefined)
        {
            res.status(500).send();
            return undefined;
        }

        if(!dbUserResponse.length)
        {
            res.status(404).send();
            return undefined;
        }

        const userData = dbUserResponse[0];
        const hashComparsionResult = await bcrypt.compare(password, userData.password_hash);
        if(!hashComparsionResult)
        {
            res.status(401).send();
            return undefined;
        }

        return userData;
    }

    private async createPasswordHash(plain: string)
    {
        return await bcrypt.hash(plain, this.config.bcrypt.salt_rounds);
    }
}